//! The integrity envelope: the harness's signed statement of a session's
//! state. It replaces v1.0's agent-supplied `dissonanceScore` — the hook
//! only ever acts on state the harness observed and signed.
//!
//! Canonical form (UTF-8, `\n` line endings, final newline, fixed order):
//!
//! ```text
//! icih-envelope/v1
//! session=<[A-Z0-9-]{1,64}>
//! state=<ZANSHIN|UNHEIMLICH|WABI|EPOCHE>
//! seq=<u64, no sign, no leading zeros>
//! issued_at=<unix seconds>
//! audit_head=<64 lowercase hex: harness audit-chain head>
//! egress_token_sha256=<64 lowercase hex: SHA-256 of the sandbox egress token>
//! ```
//!
//! The Ed25519 signature covers these exact bytes. There is no JSON and no
//! canonicalisation step: a parse is accepted only if re-encoding reproduces
//! the input byte-for-byte, so every envelope has exactly one valid spelling.

use crate::hex;
use crate::state::IntegrityState;
use ed25519_dalek::{Signature, VerifyingKey};

pub const ENVELOPE_MAGIC: &str = "icih-envelope/v1";
/// Upper bound on canonical envelope size; adapters reject larger bodies
/// before reading them in full.
pub const MAX_ENVELOPE_BYTES: usize = 512;
const MAX_SESSION_ID_LEN: usize = 64;

/// A session identifier: `[A-Z0-9-]{1,64}`, the alphabet Stele's
/// `generateSessionId()` produces.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SessionId(String);

impl SessionId {
    pub fn parse(raw: &str) -> Result<Self, EnvelopeError> {
        let valid_len = !raw.is_empty() && raw.len() <= MAX_SESSION_ID_LEN;
        let valid_chars = raw
            .bytes()
            .all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'-');
        if valid_len && valid_chars {
            Ok(Self(raw.to_owned()))
        } else {
            Err(EnvelopeError::Malformed("session id"))
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Envelope {
    pub session_id: SessionId,
    pub state: IntegrityState,
    /// Harness-side monotonic counter; the latch rejects any seq it has
    /// already seen or passed.
    pub seq: u64,
    pub issued_at: u64,
    pub audit_head: [u8; 32],
    /// Binds the sandbox's egress credential to this session. The token
    /// itself never appears here, and the agent never holds it.
    pub egress_token_sha256: [u8; 32],
}

/// Accepted age window for an envelope, in seconds.
#[derive(Debug, Clone, Copy)]
pub struct Freshness {
    pub max_age_secs: u64,
    pub max_skew_secs: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnvelopeError {
    BadSignature,
    Malformed(&'static str),
    SessionMismatch,
    Stale,
    FromFuture,
}

impl Envelope {
    /// The canonical bytes a harness signs.
    pub fn encode(&self) -> String {
        format!(
            "{ENVELOPE_MAGIC}\nsession={}\nstate={}\nseq={}\nissued_at={}\naudit_head={}\negress_token_sha256={}\n",
            self.session_id.as_str(),
            self.state.wire_token(),
            self.seq,
            self.issued_at,
            hex::encode(&self.audit_head),
            hex::encode(&self.egress_token_sha256),
        )
    }

    /// Strict parse: fixed field order, exact keys, canonical round-trip.
    pub fn parse(text: &str) -> Result<Self, EnvelopeError> {
        let body = text
            .strip_suffix('\n')
            .ok_or(EnvelopeError::Malformed("missing final newline"))?;
        let mut lines = body.split('\n');
        if lines.next() != Some(ENVELOPE_MAGIC) {
            return Err(EnvelopeError::Malformed("magic"));
        }
        let mut field = |key: &'static str| -> Result<&str, EnvelopeError> {
            lines
                .next()
                .and_then(|line| line.strip_prefix(key))
                .and_then(|rest| rest.strip_prefix('='))
                .ok_or(EnvelopeError::Malformed(key))
        };
        let envelope = Self {
            session_id: SessionId::parse(field("session")?)?,
            state: IntegrityState::from_wire_token(field("state")?)
                .ok_or(EnvelopeError::Malformed("state"))?,
            seq: parse_u64(field("seq")?, "seq")?,
            issued_at: parse_u64(field("issued_at")?, "issued_at")?,
            audit_head: hex::decode_array(field("audit_head")?)
                .ok_or(EnvelopeError::Malformed("audit_head"))?,
            egress_token_sha256: hex::decode_array(field("egress_token_sha256")?)
                .ok_or(EnvelopeError::Malformed("egress_token_sha256"))?,
        };
        if lines.next().is_some() {
            return Err(EnvelopeError::Malformed("trailing fields"));
        }
        // One spelling only: rejects "+5", "05", and anything else that
        // parses but would not re-encode to the signed bytes.
        if envelope.encode() != text {
            return Err(EnvelopeError::Malformed("non-canonical"));
        }
        Ok(envelope)
    }
}

fn parse_u64(text: &str, key: &'static str) -> Result<u64, EnvelopeError> {
    text.parse().map_err(|_| EnvelopeError::Malformed(key))
}

/// Verify a signed envelope. The signature is checked over the raw bytes
/// *before* anything is parsed, so unauthenticated input never reaches the
/// parser's logic. `verify_strict` rejects malleable and small-order-key
/// signatures.
pub fn verify(
    bytes: &[u8],
    signature_hex: &str,
    key: &VerifyingKey,
    expected_session: &SessionId,
    now: u64,
    freshness: Freshness,
) -> Result<Envelope, EnvelopeError> {
    if bytes.len() > MAX_ENVELOPE_BYTES {
        return Err(EnvelopeError::Malformed("too large"));
    }
    let signature_bytes: [u8; 64] =
        hex::decode_array(signature_hex).ok_or(EnvelopeError::BadSignature)?;
    key.verify_strict(bytes, &Signature::from_bytes(&signature_bytes))
        .map_err(|_| EnvelopeError::BadSignature)?;

    let text = std::str::from_utf8(bytes).map_err(|_| EnvelopeError::Malformed("utf-8"))?;
    let envelope = Envelope::parse(text)?;
    if envelope.session_id != *expected_session {
        return Err(EnvelopeError::SessionMismatch);
    }
    if envelope.issued_at > now.saturating_add(freshness.max_skew_secs) {
        return Err(EnvelopeError::FromFuture);
    }
    if now.saturating_sub(envelope.issued_at) > freshness.max_age_secs {
        return Err(EnvelopeError::Stale);
    }
    Ok(envelope)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Envelope {
        Envelope {
            session_id: SessionId::parse("MKX1Y2-AB3C").unwrap(),
            state: IntegrityState::Unheimlich,
            seq: 7,
            issued_at: 1_800_000_000,
            audit_head: [0x11; 32],
            egress_token_sha256: [0x22; 32],
        }
    }

    #[test]
    fn encode_parse_round_trip() {
        let envelope = sample();
        assert_eq!(Envelope::parse(&envelope.encode()), Ok(envelope));
    }

    #[test]
    fn rejects_non_canonical_spellings() {
        let canonical = sample().encode();
        for variant in [
            canonical.replace("seq=7", "seq=07"),
            canonical.replace("seq=7", "seq=+7"),
            canonical.replace('\n', "\r\n"),
            canonical.trim_end().to_owned(),
            format!("{canonical}extra=1\n"),
            canonical.replace("state=UNHEIMLICH", "state=unheimlich"),
            canonical.replace("session=", "Session="),
        ] {
            assert!(Envelope::parse(&variant).is_err(), "{variant:?}");
        }
    }

    #[test]
    fn session_ids_are_restricted() {
        for bad in ["", "lower", "A B", "A/B", &"A".repeat(65)] {
            assert!(SessionId::parse(bad).is_err(), "{bad:?}");
        }
        assert!(SessionId::parse(&"A".repeat(64)).is_ok());
    }
}
