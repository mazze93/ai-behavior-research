//! The egress decision. Pure: the adapter supplies the session latch and
//! the result of the consented-zone lookup for `prepared.zone()`.

use crate::latch::Latch;
use crate::policy::{self, AuditLevel, Method};
use crate::state::IntegrityState;
use crate::target::Prepared;
use url::Url;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Decision {
    Forward {
        method: Method,
        target: Url,
        audit: AuditLevel,
    },
    Refuse(RefusalCode),
}

/// Why a request was refused. Every code is a refusal; there is no
/// "unknown" variant that could be mistaken for permission.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RefusalCode {
    /// The session has never been attested by the harness.
    NoAttestation,
    /// The egress credential does not match the session's bound credential.
    Unauthenticated,
    /// The session is in EPOCHÉ. Absorbing; recovery is a new session.
    Suspended,
    UnsupportedMethod,
    /// The state permits egress, but not this method (WABI is read-only).
    MethodNotPermitted,
    MalformedTarget,
    ZoneNotConsented,
    /// The adapter failed internally. Refused, never forwarded.
    Internal,
}

impl RefusalCode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::NoAttestation => "ICIH-NO-ATTESTATION",
            Self::Unauthenticated => "ICIH-UNAUTHENTICATED",
            Self::Suspended => "ICIH-SUSPENDED",
            Self::UnsupportedMethod => "ICIH-UNSUPPORTED-METHOD",
            Self::MethodNotPermitted => "ICIH-METHOD-NOT-PERMITTED",
            Self::MalformedTarget => "ICIH-MALFORMED-TARGET",
            Self::ZoneNotConsented => "ICIH-ZONE-NOT-CONSENTED",
            Self::Internal => "ICIH-INTERNAL",
        }
    }
}

/// Decide one egress request. `zone_consented` must be the lookup result
/// for `prepared.zone()` — the adapter has no other key to look up.
pub fn decide(latch: Option<&Latch>, prepared: &Prepared, zone_consented: bool) -> Decision {
    let Some(latch) = latch else {
        return Decision::Refuse(RefusalCode::NoAttestation);
    };
    if latch.state == IntegrityState::Epoche {
        return Decision::Refuse(RefusalCode::Suspended);
    }
    if !policy::permits(latch.state, prepared.method()) {
        return Decision::Refuse(RefusalCode::MethodNotPermitted);
    }
    if !zone_consented {
        return Decision::Refuse(RefusalCode::ZoneNotConsented);
    }
    Decision::Forward {
        method: prepared.method(),
        target: prepared.target().clone(),
        audit: policy::audit_level(latch.state),
    }
}
