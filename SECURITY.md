# Security Policy

This repository runs a public research site and a private study registry at
https://research.mazzeleczzare.com: a Cloudflare Worker with D1, R2 evidence
storage, owner and rater authentication, and static pages. It follows the
account-wide policy at
[mazze93/.github](https://github.com/mazze93/.github/blob/main/SECURITY.md)
for response times, coordinated disclosure, CVE handling and safe harbor. This
file narrows the scope to what this service actually ships.

## Scope

**In scope:**

- Authentication or session bypass: owner or rater access without a valid token, session cookie forgery, or reaching `/persona.html`, `/console.html` features or `/api/*` writes anonymously
- Cross-site request forgery against state-changing API routes
- Exposure of private study material: raw transcripts, annotation journals, unreleased runs or R2 objects outside a published release
- Evidence integrity: altering a published release, its bundle or its checksum, or making the site serve bytes that differ from the recorded release
- Injection into D1 queries, stored or reflected script injection in rendered evidence, or bypass of the Content-Security-Policy
- Secrets committed to this repository's history, or workflow permissions that grant more than they declare

**Out of scope:**

- Denial of service and volumetric attacks on Cloudflare infrastructure
- Findings in Cloudflare, GitHub or upstream dependencies; report those upstream (Dependabot tracks advisories here)
- Model behaviour recorded as research evidence; that is the subject of study, not a vulnerability
- Theoretical issues without a realistic path, and scanner output without proof of exploitability

## Supported versions

| Version | Supported |
|---|---|
| `main` and the deployed production version | Yes |
| Older tags and releases | No |

## Reporting a vulnerability

**Do not open a public issue.**

Report privately through GitHub: this repository's **Security** tab → **Report a
vulnerability**. Reports become private security advisories visible only to the
maintainer. Other channels are listed in the account policy.

Acknowledgement within **72 hours**, as set by the account policy. Severity
response times and the 90-day default disclosure window are defined there too.

## What to include

- The URL, route or file affected
- Steps to reproduce, using your own test data; do not access or retain other people's study material
- Impact, and a suggested fix if you have one
