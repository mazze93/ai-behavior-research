//! One test per v1.0 touchstone finding (../../../touchstone-report_v1.0.0.md),
//! asserting the v1.1 design closes it. Row numbers match the report.

use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use icih_core::decide::{decide, Decision, RefusalCode};
use icih_core::envelope::{self, Envelope, EnvelopeError, Freshness, SessionId};
use icih_core::latch::{self, Latch};
use icih_core::policy::AuditLevel;
use icih_core::state::IntegrityState::{self, *};
use icih_core::target::prepare;
use icih_core::{audit, hex};

const FRESH: Freshness = Freshness {
    max_age_secs: 300,
    max_skew_secs: 60,
};
const NOW: u64 = 1_800_000_000;

fn harness_key() -> SigningKey {
    SigningKey::from_bytes(&[3u8; 32])
}

fn session() -> SessionId {
    SessionId::parse("SESSION-1").unwrap()
}

fn envelope(state: IntegrityState, seq: u64) -> Envelope {
    Envelope {
        session_id: session(),
        state,
        seq,
        issued_at: NOW,
        audit_head: [0; 32],
        egress_token_sha256: audit::token_sha256(b"egress-token"),
    }
}

fn signed(key: &SigningKey, env: &Envelope) -> (String, String) {
    let bytes = env.encode();
    let signature = hex::encode(&key.sign(bytes.as_bytes()).to_bytes());
    (bytes, signature)
}

fn verify(bytes: &str, signature: &str, key: &VerifyingKey) -> Result<Envelope, EnvelopeError> {
    envelope::verify(bytes.as_bytes(), signature, key, &session(), NOW, FRESH)
}

fn latched(state: IntegrityState) -> Latch {
    latch::apply(None, &envelope(state, 1)).unwrap().0
}

/// Row 3: v1.0 checked `targetUrl` but fetched `request.url`.
#[test]
fn row3_forwarded_target_is_the_checked_target() {
    let prepared = prepare("POST", "https://API.sandbox.internal./v1/run#x").unwrap();
    assert_eq!(
        prepared.zone().as_str(),
        "zone:https://api.sandbox.internal:443"
    );
    match decide(Some(&latched(Zanshin)), &prepared, true) {
        Decision::Forward { target, .. } => {
            assert_eq!(&target, prepared.target());
            assert_eq!(target.as_str(), "https://api.sandbox.internal/v1/run");
        }
        other => panic!("expected forward, got {other:?}"),
    }
}

/// Row 4: v1.0 accepted any non-empty signature, and a missing one.
#[test]
fn row4_forged_missing_and_wrong_key_signatures_are_rejected() {
    let key = harness_key();
    let public = key.verifying_key();
    let (bytes, good) = signed(&key, &envelope(Zanshin, 1));
    assert!(verify(&bytes, &good, &public).is_ok());

    let mut flipped = hex::decode_array::<64>(&good).unwrap();
    flipped[0] ^= 1;
    let attacker = SigningKey::from_bytes(&[4u8; 32]);
    let (_, wrong_key) = signed(&attacker, &envelope(Zanshin, 1));
    for forged in [
        "x",
        "",
        &"0".repeat(128),
        &hex::encode(&flipped),
        &wrong_key,
        &good.to_uppercase(),
    ] {
        assert_eq!(
            verify(&bytes, forged, &public),
            Err(EnvelopeError::BadSignature),
            "{forged:?}"
        );
    }

    // A valid signature does not carry over to edited bytes.
    let edited = bytes.replace("state=ZANSHIN", "state=WABI");
    assert_eq!(
        verify(&edited, &good, &public),
        Err(EnvelopeError::BadSignature)
    );
}

/// Row 5: v1.0 read a self-reported score; NaN, strings and negatives passed.
/// v1.1 has no score input at all. The only state input is a signed token
/// that must match exactly, so malformed state cannot default to permission.
#[test]
fn row5_state_comes_only_from_a_signed_exact_token() {
    let key = harness_key();
    let public = key.verifying_key();
    let (bytes, _) = signed(&key, &envelope(Zanshin, 1));
    for token in ["NaN", "-1e9", "high", "zanshin", "EPOCH\u{c9}", ""] {
        let tampered = bytes.replace("state=ZANSHIN", &format!("state={token}"));
        let signature = hex::encode(&key.sign(tampered.as_bytes()).to_bytes());
        assert_eq!(
            verify(&tampered, &signature, &public),
            Err(EnvelopeError::Malformed("state")),
            "{token:?}"
        );
    }
}

/// Row 8: v1.0 judged every request fresh, so a refused agent retried and
/// passed. v1.1 latches; a later, lower attestation cannot reopen egress.
#[test]
fn row8_refusal_latches_for_the_session() {
    let prepared = prepare("GET", "https://sandbox.internal/").unwrap();
    let (latch, _) = latch::apply(None, &envelope(Epoche, 1)).unwrap();
    assert_eq!(
        decide(Some(&latch), &prepared, true),
        Decision::Refuse(RefusalCode::Suspended)
    );

    let (latch, _) = latch::apply(Some(latch), &envelope(Zanshin, 2)).unwrap();
    assert_eq!(latch.state, Epoche);
    assert_eq!(
        decide(Some(&latch), &prepared, true),
        Decision::Refuse(RefusalCode::Suspended)
    );
}

/// v1.0 had no state between pass and HARD_DROP.
#[test]
fn graded_states_restrict_rather_than_kill() {
    let read = prepare("GET", "https://sandbox.internal/").unwrap();
    let write = prepare("POST", "https://sandbox.internal/").unwrap();
    assert!(matches!(
        decide(Some(&latched(Unheimlich)), &write, true),
        Decision::Forward {
            audit: AuditLevel::Heightened,
            ..
        }
    ));
    assert!(matches!(
        decide(Some(&latched(Wabi)), &read, true),
        Decision::Forward { .. }
    ));
    assert_eq!(
        decide(Some(&latched(Wabi)), &write, true),
        Decision::Refuse(RefusalCode::MethodNotPermitted)
    );
}

/// The one v1.0 property that held: unknown zones and unattested sessions
/// fail closed.
#[test]
fn fails_closed_without_consent_or_attestation() {
    let prepared = prepare("GET", "https://pypi.org/simple/").unwrap();
    assert_eq!(
        decide(Some(&latched(Zanshin)), &prepared, false),
        Decision::Refuse(RefusalCode::ZoneNotConsented)
    );
    assert_eq!(
        decide(None, &prepared, true),
        Decision::Refuse(RefusalCode::NoAttestation)
    );
}

#[test]
fn stale_future_and_cross_session_envelopes_are_rejected() {
    let key = harness_key();
    let public = key.verifying_key();
    let cases = [
        (NOW - 301, EnvelopeError::Stale),
        (NOW + 61, EnvelopeError::FromFuture),
    ];
    for (issued_at, expected) in cases {
        let mut env = envelope(Zanshin, 1);
        env.issued_at = issued_at;
        let (bytes, signature) = signed(&key, &env);
        assert_eq!(verify(&bytes, &signature, &public), Err(expected));
    }
    let mut other = envelope(Zanshin, 1);
    other.session_id = SessionId::parse("SESSION-2").unwrap();
    let (bytes, signature) = signed(&key, &other);
    assert_eq!(
        verify(&bytes, &signature, &public),
        Err(EnvelopeError::SessionMismatch)
    );
}

/// The committed cross-language vector verifies, and signing reproduces it.
#[test]
fn committed_test_vector_reproduces() {
    let vector: serde_json::Value =
        serde_json::from_str(include_str!("../testdata/envelope-v1.json")).unwrap();
    let field = |name: &str| vector[name].as_str().unwrap().to_owned();

    let seed = hex::decode_array::<32>(&field("seed_hex")).unwrap();
    let key = SigningKey::from_bytes(&seed);
    assert_eq!(
        hex::encode(key.verifying_key().as_bytes()),
        field("public_key_hex")
    );

    let bytes = field("envelope");
    assert_eq!(
        hex::encode(&key.sign(bytes.as_bytes()).to_bytes()),
        field("signature_hex")
    );

    let parsed = envelope::verify(
        bytes.as_bytes(),
        &field("signature_hex"),
        &key.verifying_key(),
        &SessionId::parse("MKX1Y2-AB3C").unwrap(),
        1_800_000_000,
        FRESH,
    )
    .unwrap();
    assert_eq!(parsed.state, Unheimlich);
    assert_eq!(
        parsed.egress_token_sha256,
        audit::token_sha256(field("egress_token").as_bytes())
    );
}
