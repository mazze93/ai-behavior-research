//! Pure decision core for the Informed-Consent Intercept Hook, spec v1.1.0.
//!
//! The architecture in one sentence: the harness *decides* session integrity
//! and signs it; this crate *enforces* it at the egress boundary. Nothing here
//! reads a value the governed agent can write.
//!
//! No I/O lives in this crate. The Workers adapter (`icih-worker`) supplies
//! clock, storage and KV lookups; every policy decision is a pure function
//! here so it can be tested natively. Module map:
//!
//! - [`state`]    — the four integrity states and monotonic escalation
//! - [`envelope`] — the harness-signed attestation: canonical bytes + Ed25519
//! - [`latch`]    — per-session state that only escalates and rejects replay
//! - [`target`]   — egress target normalisation and the consented-zone key
//! - [`policy`]   — what each state permits
//! - [`decide`]   — the egress decision itself
//! - [`headers`]  — which request headers may cross the boundary
//! - [`audit`]    — hash-chained audit entries
//! - [`hex`]      — strict lowercase hex for wire fields

pub mod audit;
pub mod decide;
pub mod envelope;
pub mod headers;
pub mod hex;
pub mod latch;
pub mod policy;
pub mod state;
pub mod target;
