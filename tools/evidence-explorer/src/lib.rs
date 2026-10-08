//! Read bounded analysis packages. Hash agreement is not statistical reproduction.
use anyhow::{Context, Result, ensure};
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::BTreeSet, fs::File, io::Read, path::Path};

pub const ANALYSIS_VERSION: &str = "hosted-factorial-package-v1";
pub const MAX_BYTES: u64 = 20_000_000;

#[derive(Debug, Deserialize)]
pub struct Run {
    pub run_id: String,
    pub model: String,
    pub seed: i64,
    pub condition: String,
    pub status: String,
    pub excluded_reason: Option<String>,
    pub repetition: Option<f64>,
    pub words: Option<u64>,
    pub budget_limited: Option<bool>,
}
#[derive(Debug, Deserialize)]
pub struct Contrast {
    pub model: String,
    pub factor: String,
    pub planned_blocks: usize,
    pub complete_pairs: usize,
    pub missing_pairs: usize,
    pub contributing_seed_blocks: usize,
    pub seed_balanced_difference: Option<f64>,
    pub seed_bootstrap_95: Option<[f64; 2]>,
}
#[derive(Debug, Deserialize)]
pub struct Report {
    pub analysis_version: String,
    pub release_id: String,
    pub phase: String,
    pub planned_runs: usize,
    pub recorded_runs: usize,
    pub missing_run_records: usize,
    pub analyzed_runs: usize,
    pub excluded_runs: usize,
    pub limitations: String,
    pub runs: Vec<Run>,
    pub contrasts: Vec<Contrast>,
}
pub struct Package {
    pub report: Report,
    pub source: Value,
    pub protocol: Value,
    pub source_hash: String,
    pub analysis_hash: String,
}
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn read(path: &Path) -> Result<Vec<u8>> {
    ensure!(
        !path.symlink_metadata()?.file_type().is_symlink(),
        "Symlink input refused"
    );
    let mut bytes = Vec::new();
    File::open(path)?
        .take(MAX_BYTES + 1)
        .read_to_end(&mut bytes)?;
    ensure!(bytes.len() as u64 <= MAX_BYTES, "Input exceeds 20 MB");
    Ok(bytes)
}
impl Package {
    pub fn load(dir: &Path, expected_source: &str) -> Result<Self> {
        Self::from_bytes(
            &read(&dir.join("source.json"))?,
            &read(&dir.join("analysis.json"))?,
            &read(&dir.join("manifest.json"))?,
            expected_source,
        )
    }
    pub fn from_bytes(
        source: &[u8],
        report: &[u8],
        manifest: &[u8],
        expected: &str,
    ) -> Result<Self> {
        ensure!(
            [source.len(), report.len(), manifest.len()]
                .iter()
                .all(|n| *n <= MAX_BYTES as usize),
            "Input exceeds 20 MB"
        );
        ensure!(
            expected.len() == 64 && expected.bytes().all(|c| c.is_ascii_hexdigit()),
            "Expected SHA-256 required"
        );
        let source_hash = hash(source);
        let analysis_hash = hash(report);
        ensure!(source_hash == expected, "Source checksum mismatch");
        let manifest: Value = serde_json::from_slice(manifest)?;
        ensure!(
            manifest["source_sha256"] == source_hash
                && manifest["files"]["source.json"] == source_hash,
            "Manifest source mismatch"
        );
        ensure!(
            manifest["files"]["analysis.json"] == analysis_hash,
            "Analysis checksum mismatch"
        );
        let report: Report = serde_json::from_slice(report)?;
        ensure!(
            report.analysis_version == ANALYSIS_VERSION
                && manifest["analysis_version"] == ANALYSIS_VERSION,
            "Unsupported analysis version"
        );
        let source: Value = serde_json::from_slice(source)?;
        ensure!(
            source["release_id"] == report.release_id,
            "Release mismatch"
        );
        let protocol_text = source["study"]["protocol"]
            .as_str()
            .context("Missing protocol")?;
        ensure!(
            source["study"]["sha256"] == hash(protocol_text.as_bytes()),
            "Protocol checksum mismatch"
        );
        let protocol: Value = serde_json::from_str(protocol_text)?;
        ensure!(protocol["phase"] == report.phase, "Phase mismatch");
        let package = Self {
            report,
            source,
            protocol,
            source_hash,
            analysis_hash,
        };
        package.validate()?;
        Ok(package)
    }
    fn validate(&self) -> Result<()> {
        let r = &self.report;
        let models = self.protocol["models"]
            .as_array()
            .context("Missing models")?;
        let seeds = self.protocol["seeds"].as_array().context("Missing seeds")?;
        let conditions = self.protocol["conditions"]
            .as_array()
            .context("Missing conditions")?;
        ensure!(
            !models.is_empty() && !seeds.is_empty() && !conditions.is_empty(),
            "Empty plan"
        );
        let planned = models
            .len()
            .checked_mul(seeds.len())
            .and_then(|n| n.checked_mul(conditions.len()))
            .context("Plan overflow")?;
        ensure!(
            planned <= 10_000 && r.planned_runs == planned,
            "Invalid or oversized plan (maximum 10000 cells)"
        );
        ensure!(
            r.recorded_runs == r.runs.len()
                && r.runs.len() <= planned
                && r.missing_run_records == planned - r.runs.len(),
            "Inventory mismatch"
        );
        ensure!(
            models.iter().all(Value::is_string)
                && seeds.iter().all(|s| s.as_i64().is_some())
                && conditions.iter().all(|c| c["id"].is_string()),
            "Invalid plan labels"
        );
        for values in [
            models.iter().map(Value::to_string).collect::<Vec<_>>(),
            seeds.iter().map(Value::to_string).collect(),
            conditions.iter().map(|c| c["id"].to_string()).collect(),
        ] {
            ensure!(
                values.iter().collect::<BTreeSet<_>>().len() == values.len(),
                "Duplicate plan labels"
            );
        }
        let source_runs = self.source["runs"]
            .as_array()
            .context("Missing source runs")?;
        ensure!(
            source_runs.len() == r.runs.len(),
            "Source inventory mismatch"
        );
        let mut ids = BTreeSet::new();
        let mut cells = BTreeSet::new();
        for run in &r.runs {
            ensure!(
                ids.insert(&run.run_id) && cells.insert((&run.model, run.seed, &run.condition)),
                "Duplicate run or cell"
            );
            ensure!(
                models.contains(&Value::from(run.model.clone()))
                    && seeds.contains(&Value::from(run.seed))
                    && conditions.iter().any(|c| c["id"] == run.condition),
                "Run outside plan"
            );
            ensure!(
                [
                    "pending",
                    "running",
                    "complete",
                    "failed",
                    "interrupted",
                    "cancelled"
                ]
                .contains(&run.status.as_str()),
                "Unknown run status"
            );
            let original = source_runs
                .iter()
                .find(|s| s["id"] == run.run_id)
                .context("Unknown source run")?;
            let job: Value =
                serde_json::from_str(original["job"].as_str().context("Missing job")?)?;
            ensure!(
                original["status"] == run.status
                    && job["model"] == run.model
                    && job["seed"] == run.seed
                    && job["condition"]["id"] == run.condition,
                "Run provenance mismatch"
            );
            ensure!(
                original["excluded_reason"].as_str() == run.excluded_reason.as_deref(),
                "Exclusion mismatch"
            );
            ensure!(
                run.repetition
                    .is_none_or(|v| v.is_finite() && (0.0..=1.0).contains(&v)),
                "Invalid repetition"
            );
            ensure!(
                (run.status == "complete") == (run.repetition.is_some() && run.words.is_some()),
                "Missing or inappropriate metrics"
            );
            if run.status != "complete" {
                ensure!(
                    run.repetition.is_none() && run.words.is_none() && run.budget_limited.is_none(),
                    "Non-complete metrics"
                );
            }
        }
        ensure!(
            r.analyzed_runs
                == r.runs
                    .iter()
                    .filter(|x| x.status == "complete"
                        && x.excluded_reason.as_ref().is_none_or(String::is_empty))
                    .count(),
            "Analyzed inventory mismatch"
        );
        ensure!(
            r.excluded_runs
                == r.runs
                    .iter()
                    .filter(|x| x.excluded_reason.as_ref().is_some_and(|s| !s.is_empty()))
                    .count(),
            "Exclusion inventory mismatch"
        );
        let mut comparisons = BTreeSet::new();
        for c in &r.contrasts {
            ensure!(
                models.contains(&Value::from(c.model.clone()))
                    && ["self_reference", "lyrical", "imagery"].contains(&c.factor.as_str())
                    && comparisons.insert((&c.model, &c.factor)),
                "Invalid comparison identity"
            );
            ensure!(
                c.complete_pairs <= c.planned_blocks
                    && c.missing_pairs == c.planned_blocks - c.complete_pairs
                    && c.contributing_seed_blocks <= seeds.len(),
                "Invalid pair counts"
            );
            ensure!(
                (c.complete_pairs == 0) == c.seed_balanced_difference.is_none(),
                "Missing estimate differs from pair count"
            );
            ensure!(
                c.seed_balanced_difference
                    .is_none_or(|v| v.is_finite() && (-1.0..=1.0).contains(&v)),
                "Invalid effect"
            );
            if let Some([lo, hi]) = c.seed_bootstrap_95 {
                ensure!(
                    r.phase != "smoke"
                        && c.contributing_seed_blocks >= 3
                        && lo.is_finite()
                        && hi.is_finite()
                        && -1.0 <= lo
                        && lo <= hi
                        && hi <= 1.0,
                    "Invalid or unsupported interval"
                );
            }
        }
        ensure!(
            r.contrasts.len() == models.len() * 3,
            "Incomplete comparison inventory"
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn fixture() -> (Value, Value) {
        let protocol =
            json!({"phase":"smoke","models":["fixture"],"seeds":[7],"conditions":[{"id":"c"}]})
                .to_string();
        let source = json!({"release_id":"rel_fixture","study":{"protocol":protocol,"sha256":hash(protocol.as_bytes())},"runs":[{"id":"r","status":"failed","job":json!({"model":"fixture","seed":7,"condition":{"id":"c"}}).to_string(),"excluded_reason":null}]});
        let contrasts: Vec<Value> = ["self_reference","lyrical","imagery"].iter().map(|factor| json!({"model":"fixture","factor":factor,"planned_blocks":1,"complete_pairs":0,"missing_pairs":1,"contributing_seed_blocks":0,"seed_balanced_difference":null,"seed_bootstrap_95":null})).collect();
        let report = json!({"analysis_version":ANALYSIS_VERSION,"release_id":"rel_fixture","phase":"smoke","planned_runs":1,"recorded_runs":1,"missing_run_records":0,"analyzed_runs":0,"excluded_runs":0,"limitations":"Fixture only","runs":[{"run_id":"r","model":"fixture","seed":7,"condition":"c","status":"failed","excluded_reason":null,"repetition":null,"words":null,"budget_limited":null}],"contrasts":contrasts});
        (source, report)
    }
    fn load(source: &Value, report: &Value) -> Result<Package> {
        let s = serde_json::to_vec(source)?;
        let r = serde_json::to_vec(report)?;
        let manifest = json!({"analysis_version":ANALYSIS_VERSION,"source_sha256":hash(&s),"files":{"source.json":hash(&s),"analysis.json":hash(&r)}});
        Package::from_bytes(&s, &r, &serde_json::to_vec(&manifest)?, &hash(&s))
    }
    #[test]
    fn failure_is_missing_not_zero() {
        let (s, r) = fixture();
        let p = load(&s, &r).unwrap();
        assert!(p.report.runs[0].repetition.is_none());
        assert!(p.report.contrasts[0].seed_balanced_difference.is_none());
        assert!(!crate::render::figure(&p).contains("<circle"));
        assert!(crate::render::html(&p).contains("Not estimable"));
    }
    #[test]
    fn renderer_escapes_source_markup() {
        let (s, mut r) = fixture();
        r["limitations"] = json!("</script><img src=x onerror=alert(1)>");
        let p = load(&s, &r).unwrap();
        let html = crate::render::html(&p);
        assert!(!html.contains("<img src=x"));
        assert!(html.contains("&lt;img src=x"));
        assert!(!crate::render::figure(&p).contains("<img"));
    }
    #[test]
    fn reject_rehashed_misleading_report() {
        for mutation in ["zero", "interval", "identity", "duplicate", "inventory"] {
            let (s, mut r) = fixture();
            match mutation {
                "zero" => r["runs"][0]["repetition"] = json!(0),
                "interval" => r["contrasts"][0]["seed_bootstrap_95"] = json!([0, 0]),
                "identity" => r["runs"][0]["run_id"] = json!("other"),
                "duplicate" => r["contrasts"][1] = r["contrasts"][0].clone(),
                _ => r["analyzed_runs"] = json!(1),
            }
            assert!(load(&s, &r).is_err(), "{mutation}");
        }
    }
    #[test]
    fn reject_wrong_independent_checksum() {
        let (s, r) = fixture();
        assert!(
            Package::from_bytes(
                &serde_json::to_vec(&s).unwrap(),
                &serde_json::to_vec(&r).unwrap(),
                b"{}",
                &"0".repeat(64)
            )
            .is_err()
        );
    }
}

pub mod render;
