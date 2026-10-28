//! Per-session latch: the highest integrity state the harness has attested,
//! plus the replay counter and the bound egress credential. The adapter
//! persists exactly this struct, one per session, behind a single writer.

use crate::envelope::Envelope;
use crate::state::IntegrityState;
use serde::{Deserialize, Serialize};
use subtle::ConstantTimeEq;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Latch {
    pub state: IntegrityState,
    pub seq: u64,
    pub egress_token_sha256: [u8; 32],
}

/// What an accepted envelope did, for the audit chain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Transition {
    pub from: Option<IntegrityState>,
    pub to: IntegrityState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LatchError {
    /// `seq` not greater than the stored counter: a replay or reordering.
    Replay { stored: u64, received: u64 },
    /// The envelope names a different egress credential than the session
    /// was bound to. Credential rotation means a new session.
    CredentialRebind,
}

/// Apply a *verified* envelope. Only verified envelopes may change state:
/// unauthenticated input is refused upstream without touching the latch,
/// so an attacker cannot force a session into EPOCHÉ either.
pub fn apply(
    current: Option<Latch>,
    envelope: &Envelope,
) -> Result<(Latch, Transition), LatchError> {
    let Some(stored) = current else {
        let latch = Latch {
            state: envelope.state,
            seq: envelope.seq,
            egress_token_sha256: envelope.egress_token_sha256,
        };
        return Ok((
            latch,
            Transition {
                from: None,
                to: envelope.state,
            },
        ));
    };
    if envelope.seq <= stored.seq {
        return Err(LatchError::Replay {
            stored: stored.seq,
            received: envelope.seq,
        });
    }
    if !token_hash_matches(&stored, &envelope.egress_token_sha256) {
        return Err(LatchError::CredentialRebind);
    }
    let next = Latch {
        state: stored.state.escalate(envelope.state),
        seq: envelope.seq,
        egress_token_sha256: stored.egress_token_sha256,
    };
    Ok((
        next,
        Transition {
            from: Some(stored.state),
            to: next.state,
        },
    ))
}

/// Constant-time comparison of a presented credential hash against the
/// session's bound hash.
pub fn token_hash_matches(latch: &Latch, presented_sha256: &[u8; 32]) -> bool {
    latch.egress_token_sha256.ct_eq(presented_sha256).into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::envelope::SessionId;
    use IntegrityState::*;

    fn envelope(state: IntegrityState, seq: u64) -> Envelope {
        Envelope {
            session_id: SessionId::parse("S-1").unwrap(),
            state,
            seq,
            issued_at: 0,
            audit_head: [0; 32],
            egress_token_sha256: [9; 32],
        }
    }

    #[test]
    fn first_envelope_creates_the_latch() {
        let (latch, transition) = apply(None, &envelope(Wabi, 1)).unwrap();
        assert_eq!(latch.state, Wabi);
        assert_eq!(
            transition,
            Transition {
                from: None,
                to: Wabi
            }
        );
    }

    #[test]
    fn a_lower_state_never_de_escalates() {
        let (latch, _) = apply(None, &envelope(Epoche, 1)).unwrap();
        let (latch, transition) = apply(Some(latch), &envelope(Zanshin, 2)).unwrap();
        assert_eq!(latch.state, Epoche);
        assert_eq!(
            transition,
            Transition {
                from: Some(Epoche),
                to: Epoche
            }
        );
    }

    #[test]
    fn replayed_or_reordered_seq_is_rejected() {
        let (latch, _) = apply(None, &envelope(Zanshin, 5)).unwrap();
        for seq in [0, 4, 5] {
            assert_eq!(
                apply(Some(latch), &envelope(Zanshin, seq)),
                Err(LatchError::Replay {
                    stored: 5,
                    received: seq
                })
            );
        }
    }

    #[test]
    fn credential_cannot_be_rebound() {
        let (latch, _) = apply(None, &envelope(Zanshin, 1)).unwrap();
        let mut swapped = envelope(Zanshin, 2);
        swapped.egress_token_sha256 = [8; 32];
        assert_eq!(
            apply(Some(latch), &swapped),
            Err(LatchError::CredentialRebind)
        );
    }
}
