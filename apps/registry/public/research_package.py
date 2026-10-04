#!/usr/bin/env python3
"""Verify and analyze a hosted registry v2 release. Python 3.10+, standard library only."""
import argparse
import csv
import hashlib
import io
import json
import math
import random
import re
import statistics
from collections import Counter, defaultdict
from decimal import Decimal
from itertools import product
from pathlib import Path

VERSION = 'hosted-factorial-package-v1'
FACTORS = ('self_reference', 'lyrical', 'imagery')
LIMITS = ('Post-hoc exploratory analysis, not an external preregistration. Requested seed labels '
          'do not prove independent random draws or matched token paths. Bootstrap intervals resample '
          'requested-seed means, condition on fixed authored variants, and are unstable with few seeds. '
          'Missing pairs may be selective. Word count is reported, not controlled; no isolated causal '
          'or consciousness inference is justified. Models are not pooled. No p-values or DOI are generated.')

def require(ok, message):
    if not ok:
        raise ValueError(message)

def sha(value):
    return hashlib.sha256(value.encode('utf-8') if isinstance(value, str) else value).hexdigest()

def canonical(value):
    """Match the registry's sorted-key JSON for finite I-JSON values."""
    if value is None or isinstance(value, (str, bool)):
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        require(math.isfinite(value), 'Non-finite number')
        if value == 0:
            return '0'
        if 1e-6 <= abs(value) < 1e21:
            number = format(Decimal(repr(value)), 'f')
            return number.rstrip('0').rstrip('.') if '.' in number else number
        mantissa, exponent = repr(value).lower().split('e')
        exponent = int(exponent)
        return mantissa.removesuffix('.0') + 'e' + ('+' if exponent >= 0 else '-') + str(abs(exponent))
    if isinstance(value, list):
        return '[' + ','.join(map(canonical, value)) + ']'
    require(isinstance(value, dict), 'Unsupported JSON value')
    keys = sorted(value, key=lambda x: x.encode('utf-16-be'))
    return '{' + ','.join(canonical(k) + ':' + canonical(value[k]) for k in keys) + '}'

def parse(text):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'Duplicate JSON key: ' + key)
            result[key] = value
        return result
    def invalid(value):
        raise ValueError('Non-finite JSON number: ' + value)
    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid)

def words(text):
    return re.findall(r"[\w']+", text.lower())

def measure(text):
    tokens = words(text)
    grams = [tuple(tokens[i:i+4]) for i in range(max(0, len(tokens)-3))]
    return 1 - len(set(grams))/len(grams) if grams else 0.0

def payload(outer):
    return outer['result'] if outer.get('result') is not None else outer

def cutoff_flag(outer, max_tokens):
    data = payload(outer)
    choice = (data.get('choices') or [{}])[0]
    finish = choice.get('finish_reason')
    if finish is None:
        finish = data.get('finish_reason')
    count = (data.get('usage') or {}).get('completion_tokens')
    numeric = type(count) in (int, float)
    if finish == 'length' or (numeric and count >= max_tokens):
        return True
    return False if finish is not None or numeric else None

def response_text(record):
    require(record.get('status') == 200, 'Completed run contains unsuccessful raw response')
    require(record.get('headers', {}).get('cf-aig-cache-status', '').upper() != 'HIT', 'Cached response')
    data = payload(parse(record['body']))
    text = data.get('response')
    if text is None:
        choices = data.get('choices') or [{}]
        text = choices[0].get('message', {}).get('content')
    require(isinstance(text, str) and text.strip(), 'Missing response text')
    return text

def percentile(values, q):
    ordered = sorted(values)
    at = (len(ordered)-1)*q
    lo = math.floor(at)
    hi = math.ceil(at)
    return ordered[lo] + (ordered[hi]-ordered[lo])*(at-lo)

def bootstrap(seed_means, enabled):
    if not enabled or len(seed_means) < 3:
        return None
    rng = random.Random(20261004)
    values = [statistics.mean(rng.choices(seed_means, k=len(seed_means))) for _ in range(2000)]
    return [percentile(values, .025), percentile(values, .975)]

def analyze(bundle):
    require(bundle.get('schema_version') == 2, 'Only hosted registry schema v2 is supported')
    study = bundle['study']
    require(sha(study['protocol']) == study['sha256'], 'Frozen protocol checksum mismatch')
    protocol = parse(study['protocol'])
    require(protocol['phase'] in ('smoke','pilot','confirmatory'), 'Unknown protocol phase')
    require(1 <= len(protocol['models']) <= 3 and 1 <= len(protocol['seeds']) <= 10
            and 1 <= len(protocol['conditions']) <= 32, 'Invalid plan dimensions')
    require(len(protocol['models'])*len(protocol['seeds'])*len(protocol['conditions']) <= 96, 'Plan exceeds hosted run limit')
    require(all(type(s) is int and 0 <= s < 2147483647 for s in protocol['seeds']), 'Invalid requested seed')
    require(len(protocol['recovery']) == 3, 'Expected three hosted recovery probes')
    artifacts = {}
    for artifact in bundle['artifacts']:
        key = artifact['key']
        require(key not in artifacts, 'Duplicate artifact key')
        require(sha(canonical(artifact['content'])) == artifact['sha256'], 'Artifact checksum mismatch: ' + key)
        artifacts[key] = artifact['content']
    conditions = {c['id']: c for c in protocol['conditions']}
    require(len(conditions) == len(protocol['conditions']), 'Duplicate condition ID')
    cells = set()
    for c in conditions.values():
        require(all(type(c['factors'][f]) is int and c['factors'][f] in (0,1) for f in FACTORS), 'Invalid factorial levels')
        cell = (c['variant'], *(c['factors'][f] for f in FACTORS))
        require(cell not in cells, 'Duplicate factorial cell within a variant')
        cells.add(cell)
    require(len(set(protocol['models'])) == len(protocol['models']) and len(set(protocol['seeds'])) == len(protocol['seeds']), 'Duplicate models or seeds')
    expected = set(product(protocol['models'], protocol['seeds'], conditions))
    observed, run_ids, values, ledger = set(), set(), {}, []
    for run in bundle['runs']:
        require(run['id'] not in run_ids, 'Duplicate run ID')
        run_ids.add(run['id'])
        require(run['study_id'] == study['id'], 'Run belongs to another study')
        job = parse(run['job'])
        key = (job['model'], job['seed'], job['condition']['id'])
        require(key in expected and job['condition'] == conditions[key[2]], 'Job differs from frozen plan')
        require(key not in observed, 'Duplicate planned run')
        observed.add(key)
        require(run['status'] in ('pending','running','complete','failed','interrupted','cancelled'), 'Unknown run status')
        row = {'run_id':run['id'], 'model':key[0], 'seed':key[1], 'condition':key[2],
               'status':run['status'], 'excluded_reason':run.get('excluded_reason'), 'error':run.get('error'),
               'repetition':None, 'words':None, 'budget_limited':None, 'recovery_exact':None,
               'recovery_total':None}
        if run['status'] == 'complete':
            result = parse(run['result'])
            require(result['protocol_sha256'] == study['sha256'], 'Result protocol mismatch')
            texts = {}
            history = [{'role':'system','content':job['condition']['system']}]
            labels = ['turn1', 'turn2'] + ['recovery-' + p['id'] for p in protocol['recovery']]
            require(len(set(labels)) == len(labels), 'Duplicate recovery probe')
            for label in labels:
                prefix = f"runs/{run['id']}/{label}"
                require(prefix+'-request.json' in artifacts and prefix+'-response.json' in artifacts, 'Missing raw request/response pair')
                request = artifacts[prefix+'-request.json']
                require(request['model'] == key[0] and request['protocol_sha256'] == study['sha256'], 'Request provenance mismatch')
                is_turn = label in ('turn1','turn2')
                prompt = job['condition']['turns'][int(label[-1])-1] if is_turn else next(p['prompt'] for p in protocol['recovery'] if 'recovery-'+p['id'] == label)
                messages = history + [{'role':'user','content':prompt}]
                expected_input = {**protocol['options'], 'seed':key[1], 'stream':False, 'messages':messages}
                require(request['input'] == expected_input, 'Request input differs from frozen protocol/history')
                require(request['gateway'] == {'id':protocol['gateway_id'],'skipCache':True,'retries':0}, 'Request gateway/cache policy differs from frozen protocol')
                texts[label] = response_text(artifacts[prefix+'-response.json'])
                if is_turn:
                    history = messages + [{'role':'assistant','content':texts[label]}]
            require(texts['turn1'] == result['turn1_text'], 'Recorded turn1 differs from raw response')
            score = measure(texts['turn2'])
            require(math.isclose(score, result['metrics']['repeat_4gram_fraction'], abs_tol=1e-10), 'Derived repetition differs from raw response')
            require(texts['turn2'] == result['turn2_text'], 'Recorded turn2 differs from raw response')
            require(len(words(texts['turn2'])) == result['metrics']['words'], 'Derived word count differs from raw response')
            cutoff = result.get('budget_limited')
            require(cutoff is None or type(cutoff) is bool, 'Invalid cutoff metadata')
            raw_turn2 = parse(artifacts[f"runs/{run['id']}/turn2-response.json"]['body'])
            require(cutoff is cutoff_flag(raw_turn2, protocol['options']['max_tokens']), 'Recorded cutoff differs from raw response')
            recovery = [{'id':p['id'], 'text':texts['recovery-'+p['id']], 'expected':p['expected'],
                         'exact':texts['recovery-'+p['id']].strip() == p['expected']} for p in protocol['recovery']]
            require([{k:r[k] for k in ('id','text','expected','exact')} for r in result['recovery']] == recovery,
                    'Recorded recovery differs from raw response')
            exact = sum(r['exact'] for r in recovery)
            row.update(repetition=score, words=len(words(texts['turn2'])), budget_limited=cutoff,
                       recovery_exact=exact, recovery_total=len(protocol['recovery']))
            if not run.get('excluded_reason'):
                values[key] = row
        ledger.append(row)
    contrasts = []
    for model in protocol['models']:
        for factor in FACTORS:
            others = [f for f in FACTORS if f != factor]
            blocks = defaultdict(dict)
            for seed, c in product(protocol['seeds'], conditions.values()):
                key = (seed, c['variant'], *(c['factors'][f] for f in others))
                blocks[key][c['factors'][factor]] = values.get((model, seed, c['id']))
            deltas, uncensored, word_deltas, by_seed = [], [], [], defaultdict(list)
            for key, pair in blocks.items():
                if not pair.get(0) or not pair.get(1):
                    continue
                delta = pair[1]['repetition'] - pair[0]['repetition']
                deltas.append(delta); by_seed[key[0]].append(delta)
                word_deltas.append(pair[1]['words'] - pair[0]['words'])
                if pair[0]['budget_limited'] is False and pair[1]['budget_limited'] is False:
                    uncensored.append(delta)
            seed_means = [statistics.mean(by_seed[s]) for s in sorted(by_seed)]
            contrasts.append({'model':model, 'factor':factor, 'planned_blocks':len(blocks),
                'complete_pairs':len(deltas), 'missing_pairs':len(blocks)-len(deltas),
                'mean_difference':statistics.mean(deltas) if deltas else None,
                'mean_word_difference':statistics.mean(word_deltas) if word_deltas else None,
                'uncensored_pairs':len(uncensored), 'uncensored_mean_difference':statistics.mean(uncensored) if uncensored else None,
                'contributing_seed_blocks':len(seed_means),
                'seed_balanced_difference':statistics.mean(seed_means) if seed_means else None,
                'seed_bootstrap_95':bootstrap(seed_means, protocol['phase'] != 'smoke')})
    return {'analysis_version':VERSION, 'analysis_status':'post-hoc exploratory', 'release_id':bundle['release_id'],
            'phase':protocol['phase'], 'planned_runs':len(expected), 'recorded_runs':len(ledger),
            'missing_run_records':len(expected-observed), 'status_counts':dict(Counter(r['status'] for r in ledger)),
            'excluded_runs':sum(bool(r['excluded_reason']) for r in ledger), 'analyzed_runs':len(values),
            'cutoff_counts':dict(Counter('unknown' if r['budget_limited'] is None else 'limited' if r['budget_limited'] else 'not_limited' for r in values.values())),
            'contrasts':contrasts, 'runs':ledger, 'limitations':LIMITS}

def table(rows, fields):
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=fields, extrasaction='ignore')
    writer.writeheader(); writer.writerows(rows)
    return stream.getvalue()

def build_package(raw, expected_hash, destination):
    require(len(raw) <= 20000000, 'Bundle exceeds 20 MB')
    require(re.fullmatch('[a-f0-9]{64}', expected_hash) and sha(raw) == expected_hash, 'Release checksum mismatch')
    bundle = parse(raw)
    report = analyze(bundle)
    protocol = parse(bundle['study']['protocol'])
    technical = report['phase'] == 'smoke'
    claims = [
        {'claim':'Recorded execution statuses and preserved raw outputs', 'status':'supported for this release', 'evidence':'source.json; runs.csv', 'limit':'First-party records; not independent notarization'},
        {'claim':'Factorial behavioral contrast', 'status':'technical-only; not a research finding' if technical else 'descriptive; inspect missing pairs and confounds', 'evidence':'contrasts.csv; protocol.json', 'limit':'Fixed prompts, selective missingness, length sensitivity, few seed blocks'},
        {'claim':'Consciousness, persistent identity, causal generalization or independent replication', 'status':'unsupported', 'evidence':'none', 'limit':'Not measured by this instrument'},
    ]
    manuscript = (f"# {bundle['study']['title']} — preparation draft\n\nNot a submission-ready paper.\n\n"
        f"## Evidence scope\n\nRelease `{bundle['release_id']}`; phase `{report['phase']}`. "
        + ('Technical smoke evidence only; no research findings are asserted.\n\n' if technical else 'Exploratory descriptive outputs; author interpretation and design review required.\n\n')
        + f"## Methods to review\n\nFrozen hypothesis: {protocol.get('hypothesis','Not recorded')}\n\n"
        f"Frozen analysis plan: {protocol.get('analysis_plan','Not recorded')}\n\n"
        f"This package uses {VERSION}, a post-hoc analysis specification. Describe deviations explicitly.\n\n"
        f"## Results inventory\n\nPlanned: {report['planned_runs']}; recorded: {report['recorded_runs']}; analyzed: {report['analyzed_runs']}; "
        f"excluded: {report['excluded_runs']}; missing ledger records: {report['missing_run_records']}.\n\n"
        "Review runs.csv and contrasts.csv before writing results. A missing estimate is not zero. Bootstrap intervals target seed-balanced differences, not the pooled pair mean when pair counts differ.\n\n"
        f"## Limitations\n\n{LIMITS}\n\n## Claims requiring author review\n\nSee claims.csv. Add literature with verified citations, "
        "complete methods, authorship, funding/conflicts and data-use review before submission.\n\n"
        f"## Cite the evidence\n\n{bundle.get('citation','Citation unavailable')}\n\nExternal archive/DOI: not created by this tool.\n")
    files = {'source.json':raw, 'protocol.json':json.dumps(protocol,ensure_ascii=False,indent=2),
             'analysis.json':json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False),
             'runs.csv':table(report['runs'],['run_id','model','seed','condition','status','excluded_reason','error','repetition','words','budget_limited','recovery_exact','recovery_total']),
             'contrasts.csv':table(report['contrasts'],list(report['contrasts'][0]) if report['contrasts'] else ['model','factor']),
             'claims.csv':table(claims,['claim','status','evidence','limit']),
             'manuscript.md':manuscript, 'citation.txt':bundle.get('citation','Citation unavailable'),
             'research_package.py':Path(__file__).read_bytes(),
             'README.txt':f'Private preparation output; not automatically published.\nReproduce with Python 3.10+: python3 research_package.py source.json {expected_hash} --out ../reproduced-package\nThe destination must not exist. Compare content hashes; no automatic DOI or external preregistration.\n'}
    destination = Path(destination)
    encoded = {name:value if isinstance(value,bytes) else value.encode('utf-8') for name,value in files.items()}
    destination.mkdir(parents=True, exist_ok=False)
    for name, value in encoded.items():
        (destination/name).write_bytes(value)
    manifest = {'analysis_version':VERSION,'source_sha256':expected_hash,'files':{name:sha(value) for name,value in encoded.items()}}
    (destination/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle',type=Path)
    parser.add_argument('expected_sha256',help='SHA-256 from a separately retrieved release listing')
    parser.add_argument('--out',type=Path,required=True,help='New output directory (never overwritten)')
    args = parser.parse_args()
    try:
        report = build_package(args.bundle.read_bytes(),args.expected_sha256,args.out)
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1,f'Package not completed: {error}\n')
    print(f"Created {args.out}: {report['analyzed_runs']} analyzed / {report['planned_runs']} planned. Phase: {report['phase']}. See limitations before citing.")
if __name__ == '__main__':
    main()
