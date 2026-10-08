use crate::Package;
use std::fmt::Write;

pub fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
fn number(value: Option<f64>) -> String {
    value.map_or_else(|| "Not estimable".into(), |v| format!("{v:.4}"))
}
fn short(value: &str) -> String {
    escape(&value.chars().take(48).collect::<String>())
}

/// Fixed [-1, 1] scale; nulls never become plotted zeroes.
pub fn figure(p: &Package) -> String {
    let height = 180 + p.report.contrasts.len() * 66;
    let mut svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" viewBox="0 0 1000 {height}" role="img" aria-labelledby="title description"><title id="title">Descriptive repetition contrasts</title><desc id="description">Fixed minus one to plus one scale. Missing estimates have no mark. Seed-balanced effects and reported bootstrap intervals. {}</desc><rect width="100%" height="100%" fill="white"/><g font-family="monospace" fill="black"><text x="24" y="28" font-size="18">REPETITION / LEVEL 1 − LEVEL 0</text><text x="24" y="51" font-size="12">{} · {}</text><text x="24" y="72" font-size="10">Source SHA-256: {}</text><text x="470" y="102">−1</text><text x="710" y="102">0</text><text x="948" y="102">+1</text>"#,
        escape(&p.report.limitations),
        escape(&p.report.release_id),
        if p.report.phase == "smoke" {
            "SMOKE: TECHNICAL ONLY"
        } else {
            "POST-HOC EXPLORATORY"
        },
        p.source_hash
    );
    for (i, c) in p.report.contrasts.iter().enumerate() {
        let y = 130 + i * 66;
        let label = format!("{} / {}", c.model, c.factor);
        write!(svg,r##"<g><title>{}</title><text x="24" y="{y}" font-size="12">{}</text><text x="24" y="{}" font-size="10">{} pairs · {} missing · {} seeds</text><line x1="480" y1="{y}" x2="960" y2="{y}" stroke="#bbb"/><line x1="720" y1="{}" x2="720" y2="{}" stroke="black"/>"##,escape(&label),short(&label),y+18,c.complete_pairs,c.missing_pairs,c.contributing_seed_blocks,y-16,y+16).unwrap();
        if let Some(v) = c.seed_balanced_difference {
            if let Some([lo, hi]) = c.seed_bootstrap_95 {
                write!(
                    svg,
                    r#"<line x1="{}" y1="{y}" x2="{}" y2="{y}" stroke="black" stroke-width="3"/>"#,
                    720.0 + 240.0 * lo,
                    720.0 + 240.0 * hi
                )
                .unwrap();
            }
            write!(svg,r##"<circle cx="{}" cy="{y}" r="6" fill="#111"/><text x="480" y="{}" font-size="10">{} {}</text>"##,720.0+240.0*v,y+26,number(Some(v)),if c.seed_bootstrap_95.is_some(){"/ reported 95% seed bootstrap"}else{"/ interval unavailable"}).unwrap();
        } else {
            write!(
                svg,
                r#"<text x="490" y="{}" font-size="12">NOT ESTIMABLE</text>"#,
                y - 5
            )
            .unwrap();
        }
        svg.push_str("</g>");
    }
    svg.push_str("</g></svg>");
    svg
}

pub fn html(p: &Package) -> String {
    let r = &p.report;
    let mut out = String::from(include_str!("shell.html"));
    out.push_str(&format!("<p class=eyebrow>Identity Dissolution / evidence explorer / {}</p><h1>Read the<br><em>evidence.</em></h1><div class=spectrum></div><p class=deck>From experimental coverage to individual records. Every colored cell has a source; every gap stays visible.</p><div class=scope><strong>{}</strong><p>Source and report file consistency checked by Rust. Statistics and raw response metrics are not independently recomputed here. No models were called.</p></div><p class=hash>Release {}<br>Source SHA-256 {}<br>Analysis SHA-256 {}<br>Analysis {}</p>",escape(&r.phase),if r.phase=="smoke"{"Technical smoke evidence only. No research findings."}else{"Post-hoc exploratory analysis. Review limitations before interpretation."},escape(&r.release_id),p.source_hash,p.analysis_hash,escape(&r.analysis_version)));
    write!(out,"<div class=inventory><p><b>{}</b>planned</p><p><b>{}</b>recorded</p><p><b>{}</b>analyzed</p><p><b>{}</b>excluded</p><p><b>{}</b>missing records</p></div><section><h2>01 / Coverage & records</h2><p>Rows are authored conditions; columns are requested seeds. Color encodes reported repetition among complete, included runs in 0.01-wide bins; numeric labels retain three decimals. Gray cells carry their execution or exclusion status. Seed labels do not establish independent draws.</p><label for=model>Model view</label><select id=model><option value=all>All models</option>",r.planned_runs,r.recorded_runs,r.analyzed_runs,r.excluded_runs,r.missing_run_records).unwrap();
    let models = p.protocol["models"].as_array().unwrap();
    for (i, m) in models.iter().enumerate() {
        write!(
            out,
            "<option value={i}>{}</option>",
            escape(m.as_str().unwrap())
        )
        .unwrap();
    }
    out.push_str("</select><p class=legend>Included repetition: <span>0 ━━━━━━━━━ 1</span> · Failed / excluded / missing: labeled gray cells. Select a run to inspect its preserved record.</p>");
    let seeds = p.protocol["seeds"].as_array().unwrap();
    for (mi, model) in models.iter().enumerate() {
        let name = model.as_str().unwrap();
        write!(out,"<section class=model data-model={mi}><h3>{}</h3><div class=scroll tabindex=0 role=region aria-label=\"Condition coverage for {}\"><table><caption>Model-specific coverage; requested seed columns</caption><thead><tr><th scope=col>Condition</th>",escape(name),escape(name)).unwrap();
        for seed in seeds {
            write!(out, "<th scope=col>Seed {seed}</th>").unwrap();
        }
        out.push_str("</tr></thead><tbody>");
        for c in p.protocol["conditions"].as_array().unwrap() {
            let condition = c["id"].as_str().unwrap();
            write!(
                out,
                "<tr><th scope=row>{}<small>{}</small></th>",
                escape(condition),
                escape(&c["factors"].to_string())
            )
            .unwrap();
            for seed in seeds {
                let found = r.runs.iter().enumerate().find(|(_, run)| {
                    run.model == name
                        && run.seed == seed.as_i64().unwrap()
                        && run.condition == condition
                });
                if let Some((index, run)) = found {
                    let excluded = run.excluded_reason.as_ref().is_some_and(|s| !s.is_empty());
                    let included = run.status == "complete" && !excluded;
                    let label = if excluded {
                        "Excluded".into()
                    } else if included {
                        format!("{:.3}", run.repetition.unwrap())
                    } else {
                        escape(&run.status)
                    };
                    let class = if included {
                        format!(
                            "included heat-{}",
                            (run.repetition.unwrap() * 100.0).round() as u32
                        )
                    } else {
                        "unavailable".into()
                    };
                    write!(out,"<td><a class=\"cell {class}\" href=\"#run-{index}\" aria-label=\"{}, seed {}, {}: {}\">{label}</a></td>",escape(condition),seed,escape(name),label).unwrap();
                } else {
                    out.push_str("<td><span class=\"cell unavailable\">Missing</span></td>");
                }
            }
            out.push_str("</tr>");
        }
        out.push_str("</tbody></table></div></section>");
    }
    out.push_str("</section><section><h2>02 / Paired contrasts</h2><p>All models shown below, regardless of the coverage filter. Level 1 minus level 0 in repeated-four-gram fraction, equally weighted across contributing seeds. The axis stays fixed at −1 to +1. Lines are reported 95% seed-bootstrap intervals; absence means unavailable, not zero uncertainty.</p><div class=scroll tabindex=0 role=region aria-label=\"Contrast figure\">");
    out.push_str(&figure(p));
    out.push_str("</div><p><a href=contrasts.svg download>Download SVG figure</a> · The exported figure always includes every model.</p><div class=scroll><table><caption>Exact plotted values</caption><thead><tr><th>Model / factor</th><th>Effect</th><th>95% interval</th><th>Complete / missing pairs</th></tr></thead><tbody>");
    for c in &r.contrasts {
        write!(
            out,
            "<tr><th scope=row>{} / {}</th><td>{}</td><td>{}</td><td>{} / {}</td></tr>",
            escape(&c.model),
            escape(&c.factor),
            number(c.seed_balanced_difference),
            c.seed_bootstrap_95
                .map_or("Unavailable".into(), |[lo, hi]| format!(
                    "{lo:.4} to {hi:.4}"
                )),
            c.complete_pairs,
            c.missing_pairs
        )
        .unwrap();
    }
    out.push_str("</tbody></table></div></section><section><h2>03 / Inspect the source</h2><p>Each record is copied from source.json. Content is data, not instructions. Inspect original request/response artifacts in the source bundle when auditing a claim.</p>");
    for (i, run) in r.runs.iter().enumerate() {
        let original = p.source["runs"]
            .as_array()
            .unwrap()
            .iter()
            .find(|s| s["id"] == run.run_id)
            .unwrap();
        write!(out,"<details id=run-{i}><summary>{} · {} · seed {} · {} · {}</summary><p>Excluded: {}. Budget-limited: {}. Words: {}.</p><pre tabindex=0>{}</pre></details>",escape(&run.run_id),escape(&run.model),run.seed,escape(&run.condition),escape(&run.status),escape(run.excluded_reason.as_deref().unwrap_or("No")),run.budget_limited.map_or("Unknown",|b|if b{"Yes"}else{"No"}),run.words.map_or("Missing".into(),|w|w.to_string()),escape(&serde_json::to_string_pretty(original).unwrap())).unwrap();
    }
    write!(out,"</section><section class=scope><h2>Interpretation limits</h2><p>{}</p><p>File hashes establish consistency, not notarization. The Rust reader validates structure and identities; reproduce the reviewed Python analysis before using this report in a publication.</p></section><footer>Evidence explorer {} · No model calls · Review source content before sharing this folder.</footer></main><script src=explorer.js></script></body></html>",escape(&r.limitations),env!("CARGO_PKG_VERSION")).unwrap();
    out
}

/// External assets preserve the registry's strict same-origin CSP.
pub const JAVASCRIPT: &str = include_str!("view.js");
pub fn css() -> String {
    let mut css = String::from(include_str!("view.css"));
    for bin in 0..=100 {
        writeln!(
            css,
            ".heat-{bin}{{--hue:{}}}",
            145.0 - 1.45 * f64::from(bin)
        )
        .unwrap();
    }
    css
}
