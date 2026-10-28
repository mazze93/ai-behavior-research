//! Regenerates `testdata/envelope-v1.json`, the cross-language test vector a
//! harness signer (e.g. Stele, TypeScript) must reproduce byte-for-byte.
//!
//!     cargo run -p icih-core --example gen_vector > icih-core/testdata/envelope-v1.json
//!
//! The seed is public and fixed. It is a TEST KEY: never configure its
//! public key as a deployment's SIGNER_PUBLIC_KEY.

use ed25519_dalek::{Signer, SigningKey};
use icih_core::envelope::{Envelope, SessionId};
use icih_core::{audit, hex, state::IntegrityState};

fn main() {
    let seed = [7u8; 32];
    let key = SigningKey::from_bytes(&seed);
    let envelope = Envelope {
        session_id: SessionId::parse("MKX1Y2-AB3C").expect("valid id"),
        state: IntegrityState::Unheimlich,
        seq: 42,
        issued_at: 1_800_000_000,
        audit_head: audit::token_sha256(b"stele-audit-head-fixture"),
        egress_token_sha256: audit::token_sha256(b"sandbox-egress-token-fixture"),
    };
    let canonical = envelope.encode();
    let signature = key.sign(canonical.as_bytes());
    let vector = format!(
        "{{\n  \"warning\": \"TEST KEY - public seed, never deploy\",\n  \"seed_hex\": \"{}\",\n  \"public_key_hex\": \"{}\",\n  \"egress_token\": \"sandbox-egress-token-fixture\",\n  \"envelope\": {},\n  \"signature_hex\": \"{}\"\n}}",
        hex::encode(&seed),
        hex::encode(key.verifying_key().as_bytes()),
        json_string(&canonical),
        hex::encode(&signature.to_bytes()),
    );
    println!("{vector}");
}

fn json_string(text: &str) -> String {
    format!(
        "\"{}\"",
        text.replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\n', "\\n")
    )
}
