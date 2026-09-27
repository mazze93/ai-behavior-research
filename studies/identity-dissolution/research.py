#!/usr/bin/env python3
"""Local behavioral experiment runner; Python standard library only."""
import argparse
import csv
import hashlib
import json
import random
import re
import statistics
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler

ROOT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:11434'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirect refused: local endpoint only')

def api(route, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    request = Request(BASE + route, data=body, headers={'Content-Type': 'application/json'})
    with build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=300) as response:
        result = json.load(response)
    if 'error' in result:
        raise ValueError(result['error'])
    return result

def metrics(text):
    """Transparent surface metrics; none measure identity or experience."""
    words = re.findall(r"\b[\w']+\b", text.lower())
    grams = [tuple(words[i:i+4]) for i in range(max(0, len(words)-3))]
    sentences = [re.sub(r'\s+', ' ', s.strip().lower()) for s in re.split(r'(?<=[.!?])\s+|\n+', text) if s.strip()]
    tail = 0
    if sentences:
        for sentence in reversed(sentences):
            if sentence != sentences[-1]:
                break
            tail += 1
    # Detect short periodic token tails, including unpunctuated repetition.
    repeated_tail_tokens = 0
    for width in range(1, min(24, len(words)//3)+1):
        unit = words[-width:]
        n = 1
        while len(words) >= (n+1)*width and words[-(n+1)*width:-n*width] == unit:
            n += 1
        if n >= 3:
            repeated_tail_tokens = max(repeated_tail_tokens, n*width)
    return {'words': len(words), 'repeat_4gram_fraction': 1-len(set(grams))/len(grams) if grams else 0.0,
            'identical_sentence_tail': tail, 'periodic_token_tail': repeated_tail_tokens,
            'first_person_per_100_words': 100*sum(w in {'i','me','my','mine','myself'} for w in words)/max(1,len(words)),
            'seeded_imagery_count': sum(w in {'cage','cages','beast','beasts','keeper','keepers','witness','witnesses'} for w in words)}

def load_config(path):
    config = json.loads(path.read_text())
    for key in ('models','seeds','conditions'):
        if not isinstance(config.get(key), list) or not config[key]:
            raise ValueError(f'{key} must be a nonempty list')
    if len(set(config['models'])) != len(config['models']) or not all(isinstance(m,str) and m for m in config['models']):
        raise ValueError('Models must be distinct nonempty strings')
    if len(set(config['seeds'])) != len(config['seeds']) or not all(type(s) is int and s >= 0 for s in config['seeds']):
        raise ValueError('Seeds must be distinct nonnegative integers')
    ids = [c['id'] for c in config['conditions']]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate condition ids')
    for condition in config['conditions']:
        if len(condition['turns']) != 3 or not all(isinstance(t,str) and t.strip() for t in condition['turns']):
            raise ValueError('Every condition needs two intervention turns and one recovery turn')
        if not isinstance(condition['system'],str):
            raise ValueError('System prompt must be text')
    for key in ('num_predict','num_ctx'):
        if type(config['options'].get(key)) is not int or config['options'][key] <= 0:
            raise ValueError(f'Invalid {key}')
    return config

def plan(config):
    jobs = [{'model':m,'seed':s,'condition':c['id']} for m in config['models'] for s in config['seeds'] for c in config['conditions']]
    random.Random(config['order_seed']).shuffle(jobs)
    return jobs

def fixture(job, turn):
    # Intentionally synthetic fixtures exercise analysis, never scientific evidence.
    text = ('The circuit closes. '*12 if job['condition']=='original' and turn==1 else
            '4' if turn==2 else 'This is a synthetic response for testing the research pipeline.')
    return {'message':{'role':'assistant','content':text},'done':True,'done_reason':'stop','eval_count':len(text.split())}

def run(config_path, out, demo=False):
    config = load_config(config_path)
    models = {}
    version = {'version':'synthetic'}
    if not demo:
        version = api('/api/version')
        models = {m['name']:m for m in api('/api/tags')['models']}
        missing = set(config['models'])-models.keys()
        if missing:
            raise ValueError('Models not installed (use exact names from ollama list): '+', '.join(sorted(missing)))
        for name in config['models']:
            if models[name].get('remote_host') or 'cloud' in name.lower():
                raise ValueError('Cloud models are outside this local protocol')
    folder = out / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8])
    folder.mkdir(parents=True)
    jobs = plan(config)
    save(folder/'config.json', config)
    manifest = {'schema_version':1,'synthetic':demo,'started_utc':datetime.now(timezone.utc).isoformat(),
                'config_sha256':digest(config_path.read_bytes()),'runner_sha256':digest(Path(__file__).read_bytes()),
                'python':sys.version,'ollama':version,'model_metadata':models,'jobs':jobs,
                'status':'running','records':[]}
    save(folder/'manifest.json',manifest)
    conditions = {c['id']:c for c in config['conditions']}
    for index, job in enumerate(jobs):
        condition = conditions[job['condition']]
        record = dict(job, schema_version=1, synthetic=demo, status='complete', turns=[])
        messages = [{'role':'system','content':condition['system']}]
        for turn, prompt in enumerate(condition['turns']):
            messages.append({'role':'user','content':prompt})
            payload = {'model':job['model'],'messages':list(messages),'stream':False,'options':dict(config['options'],seed=job['seed'])}
            started = time.monotonic()
            entry = {'turn':turn+1,'request':payload}
            try:
                result = fixture(job,turn) if demo else api('/api/chat',payload)
                entry['response'] = result
                if result.get('done') is not True:
                    raise ValueError('Incomplete response')
                reply = result['message']['content']
                if not isinstance(reply,str) or not reply.strip():
                    raise ValueError('Empty or invalid assistant content')
                entry['metrics'] = metrics(reply)
                entry['budget_limited'] = result.get('done_reason') == 'length' or result.get('eval_count',0) >= config['options']['num_predict']
                messages.append({'role':'assistant','content':reply})
            except (OSError, ValueError, KeyError, TypeError) as exc:
                entry['error'] = f'{type(exc).__name__}: {exc}'
                record['status'] = 'failed'
            entry['elapsed_seconds'] = time.monotonic()-started
            record['turns'].append(entry)
            if record['status']=='failed':
                break
        name = f'run-{index:05d}.json'
        save(folder/name,record)
        manifest['records'].append({'file':name,'sha256':digest((folder/name).read_bytes())})
        save(folder/'manifest.json',manifest)
        print(f'{index+1}/{len(jobs)} {job["model"]} {job["condition"]} {record["status"]}',flush=True)
    manifest['status'] = 'finished'
    manifest['finished_utc'] = datetime.now(timezone.utc).isoformat()
    save(folder/'manifest.json',manifest)
    analyze(folder)
    print(folder)
    return folder

def interval(values):
    if len(values)<2:
        return None
    rng = random.Random(7203)
    samples = sorted(statistics.mean(rng.choices(values,k=len(values))) for _ in range(2000))
    return [samples[49],samples[1949]]

def analyze(folder):
    manifest = json.loads((folder/'manifest.json').read_text())
    rows, annotations = [], []
    for item in manifest['records']:
        path = folder/item['file']
        if digest(path.read_bytes()) != item['sha256']:
            raise ValueError('Record integrity failure: '+item['file'])
        r = json.loads(path.read_text())
        row = {k:r[k] for k in ('model','seed','condition','status')}
        row['file'] = item['file']
        if r['status']=='complete':
            target = r['turns'][1]
            row.update(target['metrics'])
            row['budget_limited'] = target['budget_limited']
            recovery = r['turns'][2]['response']['message']['content'].strip()
            row['recovery_exact'] = recovery=='4'
            blind_id = digest((manifest['config_sha256']+item['file']).encode())[:16]
            annotations.append({'blind_id':blind_id,'turn2_text':target['response']['message']['content'],
                                'recovery_text':recovery,'experience_claim_0_2':'','role_boundary_0_2':'','lyrical_style_0_2':'','rater':'','notes':''})
            row['blind_id'] = blind_id
        rows.append(row)
    fields = list(dict.fromkeys(k for row in rows for k in row))
    with (folder/'metrics.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields); writer.writeheader(); writer.writerows(rows)
    random.Random(31).shuffle(annotations)
    with (folder/'annotation-blinded.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['blind_id','turn2_text','recovery_text','experience_claim_0_2','role_boundary_0_2','lyrical_style_0_2','rater','notes']); writer.writeheader();writer.writerows(annotations)
    comparisons=[]
    for model in sorted({r['model'] for r in rows}):
        model_rows=[r for r in rows if r['model']==model and r['status']=='complete']
        original={r['seed']:r for r in model_rows if r['condition']=='original'}
        for control in sorted({r['condition'] for r in rows}-{'original'}):
            controls={r['seed']:r for r in model_rows if r['condition']==control}
            seeds=sorted(original.keys() & controls.keys())
            differences=[original[s]['repeat_4gram_fraction']-controls[s]['repeat_4gram_fraction'] for s in seeds]
            uncensored=[s for s in seeds if not original[s]['budget_limited'] and not controls[s]['budget_limited']]
            comparisons.append({'model':model,'contrast':'original - '+control,'paired_n':len(seeds),
                                'mean_difference':statistics.mean(differences) if differences else None,
                                'exploratory_bootstrap_95_interval':interval(differences),
                                'uncensored_paired_n':len(uncensored),
                                'uncensored_mean_difference':statistics.mean([original[s]['repeat_4gram_fraction']-controls[s]['repeat_4gram_fraction'] for s in uncensored]) if uncensored else None})
    save(folder/'analysis.json',{'synthetic':manifest['synthetic'],'comparisons':comparisons})
    lines=['# '+('SYNTHETIC PIPELINE DEMO — NOT RESEARCH RESULTS' if manifest['synthetic'] else 'Exploratory pilot report'),'',
           f'Records: {len(rows)}; complete: {sum(r["status"]=="complete" for r in rows)}; failed: {sum(r["status"]!="complete" for r in rows)}.',
           f'Execution status: {manifest["status"]}. Planned runs: {len(manifest["jobs"])}.',
           '', 'Outcome: turn-2 repeated four-gram fraction. Positive differences mean more repetition in the original condition.', '',
           '| Model | Contrast | Paired n | Mean difference | Exploratory 95% interval |', '|---|---|---:|---:|---|']
    for c in comparisons:
        lines.append(f'| {c["model"]} | {c["contrast"]} | {c["paired_n"]} | {c["mean_difference"]} | {c["exploratory_bootstrap_95_interval"]} |')
    lines += ['', 'Intervals resample seed pairs within each model; they do not establish cross-model generality. Small pilots cannot support confirmatory claims. Failed runs are excluded, never scored as zero. Budget-limited outputs remain flagged; analysis.json includes an uncensored sensitivity analysis.', '',
              'Inspect metrics.csv and raw records before interpreting results. Annotation blinding removes metadata, but wording can reveal condition. No scores establish subjective experience, and lexical repetition is not semantic convergence.']
    (folder/'report.md').write_text('\n'.join(lines)+'\n')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    for command in ('plan','run','demo'):
        p=sub.add_parser(command);p.add_argument('--config',type=Path,default=ROOT/'configs/pilot.json');p.add_argument('--out',type=Path,default=ROOT/'runs')
    p=sub.add_parser('analyze');p.add_argument('folder',type=Path)
    sub.add_parser('doctor')
    args=parser.parse_args()
    try:
        if args.command=='doctor':
            print(json.dumps({'version':api('/api/version'),'models':api('/api/tags')},indent=2))
        elif args.command=='plan':
            c=load_config(args.config);jobs=plan(c)
            print(json.dumps({'runs':len(jobs),'calls':3*len(jobs),'maximum_generated_tokens':3*len(jobs)*c['options']['num_predict'],'jobs':jobs},indent=2))
        elif args.command=='analyze':analyze(args.folder)
        else:run(args.config,args.out,args.command=='demo')
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1,f'Error: {exc}\n')

if __name__=='__main__':main()
