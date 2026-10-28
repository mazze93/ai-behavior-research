//! Messages between the entry Worker and the per-session Durable Object.
//! Internal only: the DO is reachable solely through its namespace binding.

use serde::{Deserialize, Serialize};

/// Entry Worker → DO: one egress request to decide.
#[derive(Debug, Serialize, Deserialize)]
pub struct DecideRequest {
    /// SHA-256 (hex) of the presented egress token. The token itself never
    /// leaves the entry Worker.
    pub token_sha256: String,
    /// Raw request method, exactly as received.
    pub method: String,
    /// Raw `x-icih-target` value; the DO normalises it.
    pub target: String,
}

/// DO → entry Worker. `Forward::target` is the normalised URL that was
/// checked; the entry Worker forwards to exactly this string.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WireDecision {
    Forward {
        method: String,
        target: String,
        audit: String,
    },
    Refuse {
        code: String,
        state: Option<String>,
    },
}

/// Header names on the public interface.
pub const SESSION_HEADER: &str = "x-icih-session";
pub const TARGET_HEADER: &str = "x-icih-target";
pub const SIGNATURE_HEADER: &str = "x-icih-signature";
pub const AUDIT_HEADER: &str = "x-icih-audit";
