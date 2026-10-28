//! `Session` Durable Object: the single writer for one session's latch and
//! audit chain. Durable Object input gates hold other events while this
//! object awaits *storage*, but not while it awaits KV. So `decide` does its
//! KV lookup first and only then reads the latch: the decision always uses
//! the latch as of the moment it is made, never one read before an await.

use crate::wire::{DecideRequest, WireDecision, SESSION_HEADER, SIGNATURE_HEADER};
use ed25519_dalek::VerifyingKey;
use icih_core::audit::{self, AuditEntry, GENESIS};
use icih_core::decide::{decide, Decision, RefusalCode};
use icih_core::envelope::{self, EnvelopeError, Freshness, SessionId, MAX_ENVELOPE_BYTES};
use icih_core::hex;
use icih_core::latch::{self, Latch, LatchError};
use icih_core::target::prepare;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use worker::{durable_object, Date, DurableObject, Env, Request, Response, Result, State};

const LATCH_KEY: &str = "latch";
const AUDIT_HEAD_KEY: &str = "audit:head";
const DEFAULT_MAX_AGE_SECS: u64 = 300;
const DEFAULT_MAX_SKEW_SECS: u64 = 60;

#[derive(Debug, Serialize, Deserialize)]
struct AuditHead {
    n: u64,
    hash: String,
}

/// Whether a refusal is written to the audit chain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Audit {
    Record,
    Skip,
}

#[durable_object(fetch)]
pub struct Session {
    state: State,
    env: Env,
}

impl DurableObject for Session {
    fn new(state: State, env: Env) -> Self {
        Self { state, env }
    }

    async fn fetch(&self, req: Request) -> Result<Response> {
        match req.path().as_str() {
            "/attest" => self.attest(req).await,
            "/decide" => self.decide(req).await,
            _ => Response::error("Not Found", 404),
        }
    }
}

impl Session {
    /// Apply a harness-signed envelope. Signature failures are refused
    /// without being audited (anyone can send garbage; logging it would let
    /// them grow storage). Failures after the signature holds are audited.
    async fn attest(&self, mut req: Request) -> Result<Response> {
        let Some(key) = self.signer_key() else {
            return json_refusal(RefusalCode::Internal, None);
        };
        let session = match req
            .headers()
            .get(SESSION_HEADER)?
            .as_deref()
            .map(SessionId::parse)
        {
            Some(Ok(session)) => session,
            _ => return Response::error("Bad Request", 400),
        };
        let signature = req.headers().get(SIGNATURE_HEADER)?.unwrap_or_default();
        let body = req.bytes().await?;
        if body.len() > MAX_ENVELOPE_BYTES {
            return Response::error("Payload Too Large", 413);
        }

        let verified = envelope::verify(
            &body,
            &signature,
            &key,
            &session,
            now_secs(),
            self.freshness(),
        );
        let envelope = match verified {
            Ok(envelope) => envelope,
            Err(EnvelopeError::BadSignature) => return Response::error("Unauthorized", 401),
            Err(error) => {
                self.append_audit("attest-rejected", format!("{error:?}"))
                    .await?;
                return Response::error("Bad Request", 400);
            }
        };

        let current: Option<Latch> = self.state.storage().get(LATCH_KEY).await?;
        match latch::apply(current, &envelope) {
            Ok((next, transition)) => {
                self.state.storage().put(LATCH_KEY, next).await?;
                let from = transition.from.map_or("NONE", |state| state.wire_token());
                let detail = format!("{from}->{} seq={}", transition.to.wire_token(), next.seq);
                self.append_audit("transition", detail).await?;
                Response::from_json(&serde_json::json!({
                    "state": next.state.wire_token(),
                    "seq": next.seq,
                }))
            }
            Err(error @ LatchError::Replay { .. }) | Err(error @ LatchError::CredentialRebind) => {
                self.append_audit("attest-rejected", format!("{error:?}"))
                    .await?;
                Response::error("Conflict", 409)
            }
        }
    }

    async fn decide(&self, mut req: Request) -> Result<Response> {
        let ask: DecideRequest = req.json().await?;
        let prepared = match prepare(&ask.method, &ask.target) {
            Ok(prepared) => prepared,
            Err(code) => return self.refuse(code, Audit::Skip).await,
        };
        // KV first: it is the only non-storage await in this handler.
        let consented = self
            .env
            .kv("BOUNDARIES_KV")?
            .get(prepared.zone().as_str())
            .text()
            .await
            .map_err(|error| worker::Error::RustError(error.to_string()))?
            .is_some_and(|value| value == "true");

        // Unauthenticated callers are refused without writing anything:
        // otherwise any caller could grow storage, or create it for any
        // session name, just by asking.
        let current: Option<Latch> = self.state.storage().get(LATCH_KEY).await?;
        let Some(stored) = current else {
            return self.refuse(RefusalCode::NoAttestation, Audit::Skip).await;
        };
        let presented = hex::decode_array::<32>(&ask.token_sha256).unwrap_or([0; 32]);
        if !latch::token_hash_matches(&stored, &presented) {
            return self.refuse(RefusalCode::Unauthenticated, Audit::Skip).await;
        }

        match decide(Some(&stored), &prepared, consented) {
            Decision::Refuse(code) => self.refuse(code, Audit::Record).await,
            Decision::Forward {
                method,
                target,
                audit,
            } => {
                if audit == icih_core::policy::AuditLevel::Heightened {
                    self.append_audit(
                        "forward",
                        format!("{} {}", method.as_str(), prepared.zone().as_str()),
                    )
                    .await?;
                }
                Response::from_json(&WireDecision::Forward {
                    method: method.as_str().to_owned(),
                    target: target.to_string(),
                    audit: audit.as_str().to_owned(),
                })
            }
        }
    }

    /// Return a refusal, auditing it only for an authenticated caller. The
    /// state is included so the caller can tell "suspended" from "never
    /// attested".
    async fn refuse(&self, code: RefusalCode, audit: Audit) -> Result<Response> {
        if audit == Audit::Record {
            self.append_audit("refusal", code.as_str().to_owned())
                .await?;
        }
        let current: Option<Latch> = self.state.storage().get(LATCH_KEY).await?;
        Response::from_json(&WireDecision::Refuse {
            code: code.as_str().to_owned(),
            state: current.map(|latch| latch.state.wire_token().to_owned()),
        })
    }

    /// Append one hash-chained entry. Entry and head are written in one
    /// `put_multiple` so the chain never has an entry without its head.
    async fn append_audit(&self, kind: &'static str, detail: String) -> Result<()> {
        let storage = self.state.storage();
        let head: Option<AuditHead> = storage.get(AUDIT_HEAD_KEY).await?;
        let (n, previous) = match head {
            Some(head) => (
                head.n + 1,
                hex::decode_array::<32>(&head.hash).unwrap_or(GENESIS),
            ),
            None => (0, GENESIS),
        };
        let entry = AuditEntry {
            n,
            at: now_secs(),
            kind,
            detail,
        };
        let hash = hex::encode(&audit::link(&previous, &entry));
        let mut writes: HashMap<String, serde_json::Value> = HashMap::new();
        writes.insert(
            format!("audit:{n:020}"),
            serde_json::json!({ "line": entry.line(), "hash": hash }),
        );
        writes.insert(
            AUDIT_HEAD_KEY.to_owned(),
            serde_json::json!({ "n": n, "hash": hash }),
        );
        storage.put_multiple(writes).await
    }

    /// `None` (and therefore every attestation refused) when the key is
    /// missing or malformed. There is deliberately no default key.
    fn signer_key(&self) -> Option<VerifyingKey> {
        let raw = self.env.var("SIGNER_PUBLIC_KEY").ok()?.to_string();
        let bytes = hex::decode_array::<32>(raw.trim())?;
        VerifyingKey::from_bytes(&bytes).ok()
    }

    fn freshness(&self) -> Freshness {
        Freshness {
            max_age_secs: self.var_u64("MAX_ENVELOPE_AGE_SECS", DEFAULT_MAX_AGE_SECS),
            max_skew_secs: self.var_u64("MAX_CLOCK_SKEW_SECS", DEFAULT_MAX_SKEW_SECS),
        }
    }

    /// A configured-but-unparseable bound falls back to the stricter default
    /// rather than to "unbounded".
    fn var_u64(&self, name: &str, default: u64) -> u64 {
        self.env
            .var(name)
            .ok()
            .and_then(|value| value.to_string().parse::<u64>().ok())
            .map_or(default, |value| value.min(default))
    }
}

fn now_secs() -> u64 {
    Date::now().as_millis() / 1000
}

fn json_refusal(code: RefusalCode, state: Option<String>) -> Result<Response> {
    Response::from_json(&WireDecision::Refuse {
        code: code.as_str().to_owned(),
        state,
    })
}
