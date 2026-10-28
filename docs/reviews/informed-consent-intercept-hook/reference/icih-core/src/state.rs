//! Integrity states. Mirrors Stele's `src/lib/integrity.ts`
//! (ZANSHIN → UNHEIMLICH → WABI → EPOCHÉ) so a Stele harness can attest
//! directly. Declaration order *is* severity order: `Ord` is escalation.

use serde::{Deserialize, Serialize};

/// Session integrity, least → most restricted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum IntegrityState {
    #[serde(rename = "ZANSHIN")]
    Zanshin,
    #[serde(rename = "UNHEIMLICH")]
    Unheimlich,
    #[serde(rename = "WABI")]
    Wabi,
    #[serde(rename = "EPOCHE")]
    Epoche,
}

impl IntegrityState {
    /// Monotonic escalation: the result is never less severe than `self`.
    /// There is no de-escalation function anywhere in this crate, by design
    /// (Stele ADR-0001: EPOCHÉ is absorbing; recovery means a new session).
    pub fn escalate(self, incoming: Self) -> Self {
        self.max(incoming)
    }

    /// ASCII wire token. EPOCHÉ is spelled `EPOCHE` on the wire so matching
    /// is byte-exact: NFC and NFD forms of `É` cannot yield two spellings of
    /// one state (the lesson of Stele ADR-0006).
    pub fn wire_token(self) -> &'static str {
        match self {
            Self::Zanshin => "ZANSHIN",
            Self::Unheimlich => "UNHEIMLICH",
            Self::Wabi => "WABI",
            Self::Epoche => "EPOCHE",
        }
    }

    /// Exact, case-sensitive match. Anything else is `None`, which every
    /// caller treats as malformed input — never as a default state.
    pub fn from_wire_token(token: &str) -> Option<Self> {
        match token {
            "ZANSHIN" => Some(Self::Zanshin),
            "UNHEIMLICH" => Some(Self::Unheimlich),
            "WABI" => Some(Self::Wabi),
            "EPOCHE" => Some(Self::Epoche),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::IntegrityState::{self, *};

    const ALL: [IntegrityState; 4] = [Zanshin, Unheimlich, Wabi, Epoche];

    #[test]
    fn escalate_never_lowers_severity() {
        for current in ALL {
            for incoming in ALL {
                assert!(current.escalate(incoming) >= current);
                assert!(current.escalate(incoming) >= incoming);
            }
        }
    }

    #[test]
    fn epoche_is_absorbing() {
        for incoming in ALL {
            assert_eq!(Epoche.escalate(incoming), Epoche);
        }
    }

    #[test]
    fn wire_tokens_round_trip_and_reject_variants() {
        for state in ALL {
            assert_eq!(
                IntegrityState::from_wire_token(state.wire_token()),
                Some(state)
            );
        }
        for bad in ["zanshin", "EPOCHÉ", "EPOCHE\u{301}", " WABI", "WABI ", ""] {
            assert_eq!(IntegrityState::from_wire_token(bad), None, "{bad:?}");
        }
    }
}
