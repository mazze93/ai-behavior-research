//! Hash-chained audit entries. Each entry's hash covers the previous hash
//! and the entry's canonical line, so a deleted or edited entry breaks every
//! later link. A chain that can be verified only by counting entries is not
//! a chain (cf. Stele `enforcement.ts`).

use sha2::{Digest, Sha256};

/// The hash before the first entry.
pub const GENESIS: [u8; 32] = [0; 32];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditEntry {
    pub n: u64,
    pub at: u64,
    pub kind: &'static str,
    /// Free text built only from hook-controlled values (codes, states,
    /// zone keys) — never from request bodies or agent-chosen strings.
    pub detail: String,
}

impl AuditEntry {
    pub fn line(&self) -> String {
        format!("{}\t{}\t{}\t{}", self.n, self.at, self.kind, self.detail)
    }
}

pub fn link(previous: &[u8; 32], entry: &AuditEntry) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(previous);
    hasher.update(entry.line().as_bytes());
    hasher.finalize().into()
}

/// SHA-256 of an egress token, as bound into envelopes.
pub fn token_sha256(token: &[u8]) -> [u8; 32] {
    Sha256::digest(token).into()
}

/// Re-derive a chain head from its entries.
pub fn replay_head(entries: &[AuditEntry]) -> [u8; 32] {
    entries
        .iter()
        .fold(GENESIS, |head, entry| link(&head, entry))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(n: u64, detail: &str) -> AuditEntry {
        AuditEntry {
            n,
            at: 100 + n,
            kind: "refusal",
            detail: detail.to_owned(),
        }
    }

    #[test]
    fn editing_or_dropping_an_entry_changes_the_head() {
        let entries = vec![entry(0, "a"), entry(1, "b"), entry(2, "c")];
        let head = replay_head(&entries);

        let mut edited = entries.clone();
        edited[1].detail = "B".to_owned();
        assert_ne!(replay_head(&edited), head);

        let dropped = vec![entries[0].clone(), entries[2].clone()];
        assert_ne!(replay_head(&dropped), head);
    }
}
