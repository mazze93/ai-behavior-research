//! Egress target normalisation. The value checked against the consented
//! zones is the value forwarded to: [`Prepared`] can only be built here, and
//! the decision forwards `Prepared::target` itself. v1.0 checked
//! `targetUrl` and fetched `request.url`; that split is now unrepresentable.

use crate::decide::RefusalCode;
use crate::policy::Method;
use url::Url;

/// KV key for a consented zone: `zone:<scheme>://<host>:<port>`.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ZoneKey(String);

impl ZoneKey {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// A request that has passed normalisation. Fields are private so nothing
/// outside this module can pair a checked key with a different target.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Prepared {
    method: Method,
    target: Url,
    zone: ZoneKey,
}

impl Prepared {
    pub fn method(&self) -> Method {
        self.method
    }
    pub fn target(&self) -> &Url {
        &self.target
    }
    pub fn zone(&self) -> &ZoneKey {
        &self.zone
    }
}

/// Normalise a raw method and target. Fails closed on anything unusual.
pub fn prepare(raw_method: &str, raw_target: &str) -> Result<Prepared, RefusalCode> {
    let method = Method::parse(raw_method).ok_or(RefusalCode::UnsupportedMethod)?;
    let mut target = Url::parse(raw_target).map_err(|_| RefusalCode::MalformedTarget)?;

    if !matches!(target.scheme(), "https" | "http") {
        return Err(RefusalCode::MalformedTarget);
    }
    // Userinfo is a classic allowlist confusion vector and has no place in
    // agent egress.
    if !target.username().is_empty() || target.password().is_some() {
        return Err(RefusalCode::MalformedTarget);
    }
    let host = target.host_str().ok_or(RefusalCode::MalformedTarget)?;
    // The URL parser lowercases domains; a single trailing dot is the one
    // remaining alternate spelling of the same host.
    let trimmed = host.strip_suffix('.').unwrap_or(host).to_owned();
    if trimmed.is_empty() || trimmed.ends_with('.') {
        return Err(RefusalCode::MalformedTarget);
    }
    if trimmed != host {
        target
            .set_host(Some(&trimmed))
            .map_err(|_| RefusalCode::MalformedTarget)?;
    }
    target.set_fragment(None);

    let port = target
        .port_or_known_default()
        .ok_or(RefusalCode::MalformedTarget)?;
    let zone = ZoneKey(format!("zone:{}://{}:{}", target.scheme(), trimmed, port));
    Ok(Prepared {
        method,
        target,
        zone,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn zone(raw: &str) -> String {
        prepare("GET", raw).unwrap().zone().as_str().to_owned()
    }

    #[test]
    fn alternate_spellings_share_one_zone_key() {
        let expected = "zone:https://api.example.com:443";
        for raw in [
            "https://api.example.com/x",
            "https://API.Example.COM/x",
            "https://api.example.com./x",
            "https://api.example.com:443/x#frag",
        ] {
            assert_eq!(zone(raw), expected, "{raw}");
        }
    }

    #[test]
    fn ports_and_schemes_are_distinct_zones() {
        assert_eq!(
            zone("http://sandbox.internal/"),
            "zone:http://sandbox.internal:80"
        );
        assert_eq!(
            zone("https://sandbox.internal:8443/"),
            "zone:https://sandbox.internal:8443"
        );
    }

    #[test]
    fn userinfo_and_odd_schemes_are_refused() {
        for raw in [
            "https://sandbox.internal@evil.example/",
            "https://user:pw@sandbox.internal/",
            "ftp://sandbox.internal/",
            "file:///etc/passwd",
            "https://a../",
            "not a url",
        ] {
            assert_eq!(
                prepare("GET", raw),
                Err(RefusalCode::MalformedTarget),
                "{raw}"
            );
        }
    }

    #[test]
    fn fragment_is_not_forwarded() {
        let prepared = prepare("GET", "https://a.example/p?q=1#secret").unwrap();
        assert_eq!(prepared.target().as_str(), "https://a.example/p?q=1");
    }
}
