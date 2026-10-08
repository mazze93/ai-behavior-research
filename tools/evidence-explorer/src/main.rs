use anyhow::{Result, ensure};
use evidence_explorer::{Package, hash, render};
use std::{env, fs, path::Path};
fn main() -> Result<()> {
    let args: Vec<_> = env::args().skip(1).collect();
    ensure!(
        args.len() == 3,
        "Usage: evidence-explorer PACKAGE_DIR EXPECTED_SOURCE_SHA256 NEW_OUTPUT_DIR"
    );
    let package = Package::load(Path::new(&args[0]), &args[1])?;
    let html = render::html(&package);
    let svg = render::figure(&package);
    let css = render::css();
    let manifest = serde_json::json!({"renderer_version":env!("CARGO_PKG_VERSION"),"renderer_source_sha256":evidence_explorer::compiled_source_hash(),"source_sha256":package.source_hash,"analysis_sha256":package.analysis_hash,"analysis_version":package.report.analysis_version,"release_id":package.report.release_id,"scope":"all models; unfiltered","verification":"file consistency and report structure; statistics not recomputed","files":{"index.html":hash(html.as_bytes()),"contrasts.svg":hash(svg.as_bytes()),"explorer.css":hash(css.as_bytes()),"explorer.js":hash(render::JAVASCRIPT.as_bytes())}});
    let destination = Path::new(&args[2]);
    fs::create_dir(destination)?;
    fs::write(destination.join("index.html"), html)?;
    fs::write(destination.join("contrasts.svg"), svg)?;
    fs::write(destination.join("explorer.css"), css)?;
    fs::write(destination.join("explorer.js"), render::JAVASCRIPT)?;
    fs::write(
        destination.join("view-manifest.json"),
        serde_json::to_vec_pretty(&manifest)?,
    )?;
    println!(
        "Created local explorer. Review included source records before sharing. Nothing published."
    );
    Ok(())
}
