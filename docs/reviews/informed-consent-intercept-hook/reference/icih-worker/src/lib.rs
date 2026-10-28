//! Cloudflare Workers adapter for the Informed-Consent Intercept Hook v1.1.
//!
//! Public interface:
//!
//! - `POST /v1/sessions/{id}/attest` — harness only. Body: canonical
//!   envelope bytes. Header `x-icih-signature`: Ed25519 signature, hex.
//! - `ANY /v1/egress` — sandbox egress proxy only. Headers: `x-icih-session`,
//!   `x-icih-target`, `authorization: Bearer <egress token>`. The method and
//!   body are the outbound request's own.
//!
//! All policy lives in `icih-core`; this crate moves bytes. Any error on any
//! path is a refusal, never a forward.

mod session;
mod wire;

pub use session::Session;

use icih_core::decide::RefusalCode;
use icih_core::envelope::{SessionId, MAX_ENVELOPE_BYTES};
use icih_core::policy::Method;
use icih_core::{audit, headers, hex};
use wire::{
    DecideRequest, WireDecision, AUDIT_HEADER, SESSION_HEADER, SIGNATURE_HEADER, TARGET_HEADER,
};
use worker::wasm_bindgen::JsValue;
use worker::{
    event, Context, Env, Fetch, Headers, Request, RequestInit, RequestRedirect, Response, Result,
};

const SESSIONS_BINDING: &str = "SESSIONS";

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    match route(req, &env).await {
        Ok(response) => Ok(response),
        Err(_) => refusal(RefusalCode::Internal, None),
    }
}

async fn route(req: Request, env: &Env) -> Result<Response> {
    let path = req.path();
    if let Some(id) = path
        .strip_prefix("/v1/sessions/")
        .and_then(|rest| rest.strip_suffix("/attest"))
    {
        return attest(req, env, id.to_owned()).await;
    }
    if path == "/v1/egress" {
        return egress(req, env).await;
    }
    Response::error("Not Found", 404)
}

/// Relay a harness attestation to its session's Durable Object.
async fn attest(mut req: Request, env: &Env, raw_id: String) -> Result<Response> {
    if req.inner().method() != "POST" {
        return Response::error("Method Not Allowed", 405);
    }
    let Ok(session) = SessionId::parse(&raw_id) else {
        return Response::error("Bad Request", 400);
    };
    let body = req.bytes().await?;
    if body.len() > MAX_ENVELOPE_BYTES {
        return Response::error("Payload Too Large", 413);
    }
    let headers = Headers::new();
    headers.set(SESSION_HEADER, session.as_str())?;
    headers.set(
        SIGNATURE_HEADER,
        &req.headers().get(SIGNATURE_HEADER)?.unwrap_or_default(),
    )?;
    let mut init = RequestInit::new();
    init.with_method(worker::Method::Post)
        .with_headers(headers)
        .with_body(Some(JsValue::from(worker::js_sys::Uint8Array::from(
            body.as_slice(),
        ))));
    session_stub(env, &session)?
        .fetch_with_request(Request::new_with_init("https://session/attest", &init)?)
        .await
}

/// Ask the session for a decision, then forward exactly what it approved.
async fn egress(req: Request, env: &Env) -> Result<Response> {
    let Some(Ok(session)) = req
        .headers()
        .get(SESSION_HEADER)?
        .as_deref()
        .map(SessionId::parse)
    else {
        return refusal(RefusalCode::NoAttestation, None);
    };
    let token = req.headers().get("authorization")?.unwrap_or_default();
    let Some(token) = token
        .strip_prefix("Bearer ")
        .filter(|token| !token.is_empty())
    else {
        return refusal(RefusalCode::Unauthenticated, None);
    };
    let ask = DecideRequest {
        token_sha256: hex::encode(&audit::token_sha256(token.as_bytes())),
        // Raw string on purpose: `worker::Method::from` maps unknown verbs
        // to GET, which would turn a refusal into a permitted read.
        method: req.inner().method(),
        target: req.headers().get(TARGET_HEADER)?.unwrap_or_default(),
    };
    let mut init = RequestInit::new();
    init.with_method(worker::Method::Post)
        .with_body(Some(JsValue::from_str(&serde_json::to_string(&ask)?)));
    let mut decision = session_stub(env, &session)?
        .fetch_with_request(Request::new_with_init("https://session/decide", &init)?)
        .await?;

    match decision.json::<WireDecision>().await? {
        WireDecision::Refuse { code, state } => refusal_from_wire(&code, state),
        WireDecision::Forward {
            method,
            target,
            audit,
        } => forward(req, &method, &target, &audit).await,
    }
}

/// Send the approved request. Redirects are returned to the caller, never
/// followed: following one would leave the consented zone unchecked.
async fn forward(req: Request, method: &str, target: &str, audit_level: &str) -> Result<Response> {
    let Some(method) = Method::parse(method) else {
        return refusal(RefusalCode::Internal, None);
    };
    let outbound_headers = Headers::new();
    for (name, value) in req.headers().entries() {
        if headers::forwardable(&name) {
            outbound_headers.append(&name, &value)?;
        }
    }
    let mut init = RequestInit::new();
    init.with_method(worker_method(method))
        .with_headers(outbound_headers)
        .with_redirect(RequestRedirect::Manual);
    if !method.is_read_only() {
        init.with_body(req.inner().body().map(JsValue::from));
    }
    let upstream = Fetch::Request(Request::new_with_init(target, &init)?)
        .send()
        .await?;
    let response_headers = upstream.headers().clone();
    response_headers.set(AUDIT_HEADER, audit_level)?;
    Ok(upstream.with_headers(response_headers))
}

fn session_stub(env: &Env, session: &SessionId) -> Result<worker::Stub> {
    env.durable_object(SESSIONS_BINDING)?
        .id_from_name(session.as_str())?
        .get_stub()
}

fn worker_method(method: Method) -> worker::Method {
    match method {
        Method::Get => worker::Method::Get,
        Method::Head => worker::Method::Head,
        Method::Post => worker::Method::Post,
        Method::Put => worker::Method::Put,
        Method::Patch => worker::Method::Patch,
        Method::Delete => worker::Method::Delete,
    }
}

fn status_for(code: RefusalCode) -> u16 {
    match code {
        RefusalCode::Unauthenticated | RefusalCode::NoAttestation => 401,
        RefusalCode::Internal => 500,
        _ => 403,
    }
}

fn refusal(code: RefusalCode, state: Option<String>) -> Result<Response> {
    let body = serde_json::json!({ "status": "REFUSED", "code": code.as_str(), "state": state });
    Ok(Response::from_json(&body)?.with_status(status_for(code)))
}

/// A refusal relayed from the Durable Object. An unrecognised code is
/// reported as internal, but it is a refusal either way.
fn refusal_from_wire(code: &str, state: Option<String>) -> Result<Response> {
    let known = [
        RefusalCode::NoAttestation,
        RefusalCode::Unauthenticated,
        RefusalCode::Suspended,
        RefusalCode::UnsupportedMethod,
        RefusalCode::MethodNotPermitted,
        RefusalCode::MalformedTarget,
        RefusalCode::ZoneNotConsented,
        RefusalCode::Internal,
    ];
    let code = known
        .into_iter()
        .find(|known| known.as_str() == code)
        .unwrap_or(RefusalCode::Internal);
    refusal(code, state)
}
