//! What each integrity state permits at the egress boundary. This is the
//! v1.0 pass/HARD_DROP binary replaced by Stele's graded capability matrix.

use crate::state::IntegrityState;

/// Methods the hook will forward at all. Anything else (CONNECT, TRACE,
/// custom verbs) is refused in every state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Method {
    Get,
    Head,
    Post,
    Put,
    Patch,
    Delete,
}

impl Method {
    /// Exact uppercase match, as HTTP/1.1 method tokens are case-sensitive.
    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "GET" => Some(Self::Get),
            "HEAD" => Some(Self::Head),
            "POST" => Some(Self::Post),
            "PUT" => Some(Self::Put),
            "PATCH" => Some(Self::Patch),
            "DELETE" => Some(Self::Delete),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Get => "GET",
            Self::Head => "HEAD",
            Self::Post => "POST",
            Self::Put => "PUT",
            Self::Patch => "PATCH",
            Self::Delete => "DELETE",
        }
    }

    pub fn is_read_only(self) -> bool {
        matches!(self, Self::Get | Self::Head)
    }
}

/// How closely a forwarded call is recorded.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuditLevel {
    /// Refusals and state changes only.
    Standard,
    /// Every forwarded call is also appended to the audit chain.
    Heightened,
}

impl AuditLevel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Standard => "standard",
            Self::Heightened => "heightened",
        }
    }
}

/// The capability matrix. Exhaustive `match`: adding a state is a compile
/// error here until its egress meaning is decided.
pub fn permits(state: IntegrityState, method: Method) -> bool {
    match state {
        IntegrityState::Zanshin | IntegrityState::Unheimlich => true,
        IntegrityState::Wabi => method.is_read_only(),
        IntegrityState::Epoche => false,
    }
}

pub fn audit_level(state: IntegrityState) -> AuditLevel {
    match state {
        IntegrityState::Zanshin => AuditLevel::Standard,
        IntegrityState::Unheimlich | IntegrityState::Wabi | IntegrityState::Epoche => {
            AuditLevel::Heightened
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use IntegrityState::*;

    const METHODS: [Method; 6] = [
        Method::Get,
        Method::Head,
        Method::Post,
        Method::Put,
        Method::Patch,
        Method::Delete,
    ];

    #[test]
    fn capability_matrix() {
        for method in METHODS {
            assert!(permits(Zanshin, method));
            assert!(permits(Unheimlich, method));
            assert_eq!(permits(Wabi, method), method.is_read_only());
            assert!(!permits(Epoche, method));
        }
    }

    #[test]
    fn methods_parse_exactly() {
        for method in METHODS {
            assert_eq!(Method::parse(method.as_str()), Some(method));
        }
        for bad in ["get", "CONNECT", "TRACE", "OPTIONS", ""] {
            assert_eq!(Method::parse(bad), None, "{bad:?}");
        }
    }
}
