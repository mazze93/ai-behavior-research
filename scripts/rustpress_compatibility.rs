// Optional integration test: copy into a separate RustPress checkout's tests/.
// See docs/research-hub/rustpress-integration.md for the pinned revision and command.
use rustpress::content;
use std::collections::BTreeMap;

#[test]
fn generated_research_brief_passes_real_corpus_policy() {
    let path = std::env::var("RESEARCH_EXPORT_HTML").expect("explicit research fixture path");
    let bytes = std::fs::read(path).unwrap();
    let corpus = content::compile(
        BTreeMap::from([("evidence.html".into(), bytes)]),
        2_000_000,
    ).unwrap();
    let brief = corpus.entries.iter().find(|entry| entry.source == "evidence.html").unwrap();
    assert!(brief.metadata.title.as_ref().unwrap().contains("evidence brief"));
    assert!(corpus.entries.iter().any(|entry| entry.source == "(generated index)"));
    content::validate_pressed(&corpus.entries, &corpus.tree).unwrap();
}
