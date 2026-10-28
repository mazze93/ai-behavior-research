//! Which inbound headers may cross the boundary. An allowlist, not a
//! denylist: v1.0 forwarded every header verbatim, credentials included.
//! Anything the sandbox sends to the hook itself (`authorization`,
//! `x-icih-*`), every cookie, and all Cloudflare/proxy metadata stop here.

const FORWARDABLE: [&str; 9] = [
    "accept",
    "accept-encoding",
    "accept-language",
    "content-encoding",
    "content-language",
    "content-type",
    "if-modified-since",
    "if-none-match",
    "user-agent",
];

pub fn forwardable(name: &str) -> bool {
    FORWARDABLE
        .iter()
        .any(|allowed| allowed.eq_ignore_ascii_case(name))
}

#[cfg(test)]
mod tests {
    use super::forwardable;

    #[test]
    fn credentials_and_metadata_do_not_cross() {
        for name in [
            "Authorization",
            "Cookie",
            "Proxy-Authorization",
            "X-ICIH-Session",
            "X-ICIH-Target",
            "CF-Connecting-IP",
            "X-Forwarded-For",
            "Host",
            "Content-Length",
        ] {
            assert!(!forwardable(name), "{name}");
        }
    }

    #[test]
    fn ordinary_content_headers_do() {
        for name in ["Content-Type", "accept", "User-Agent"] {
            assert!(forwardable(name), "{name}");
        }
    }
}
