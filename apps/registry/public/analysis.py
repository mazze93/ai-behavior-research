#!/usr/bin/env python3
"""Recompute a release from raw response artifacts. Python 3.10+, no dependencies."""
import hashlib,json,re,sys,statistics,random
from collections import defaultdict

def measure(text):
    words=re.findall(r"[\w']+",text.lower()); grams=[tuple(words[i:i+4]) for i in range(max(0,len(words)-3))]
    return 1-len(set(grams))/len(grams) if grams else 0.0

def analyze(bundle):
    artifacts={a['key']:a for a in bundle['artifacts']}
    values=[]
    for run in bundle['runs']:
        if run['status']!='complete' or run['excluded_reason']:continue
        job=json.loads(run['job']);record=json.loads(run['result'])
        raw=json.loads(artifacts[f"runs/{run['id']}/turn2-response.json"]['content']['body'])
        text=raw.get('response') or raw.get('result',{}).get('response') or raw.get('choices',[{}])[0].get('message',{}).get('content')
        if not isinstance(text,str):raise ValueError('Missing response text')
        score=measure(text)
        if abs(score-record['metrics']['repeat_4gram_fraction'])>1e-10:raise ValueError('Derived metric differs from raw response')
        values.append((job,score,record['budget_limited']))
    effects=[]
    for model in sorted({j['model'] for j,_,_ in values}):
        for factor in ['self_reference','lyrical','imagery']:
            others=[f for f in ['self_reference','lyrical','imagery'] if f!=factor]
            pairs=defaultdict(dict)
            for j,score,limited in values:
                if j['model']!=model:continue
                key=(j['seed'],j['condition']['variant'],*(j['condition']['factors'][f] for f in others))
                pairs[key][j['condition']['factors'][factor]]=(score,limited)
            deltas=[v[1][0]-v[0][0] for v in pairs.values() if 0 in v and 1 in v]
            uncensored=[v[1][0]-v[0][0] for v in pairs.values() if 0 in v and 1 in v and v[0][1] is False and v[1][1] is False]
            effects.append({'model':model,'factor':factor,'complete_pairs':len(deltas),'unpaired_blocks':sum(len(v)<2 for v in pairs.values()),'mean_difference':statistics.mean(deltas) if deltas else None,'uncensored_mean_difference':statistics.mean(uncensored) if uncensored else None,'uncensored_pairs':len(uncensored)})
    ratings=defaultdict(list)
    for row in bundle['annotations']:ratings[row['run_id']].append(json.loads(row['labels']))
    agreement={}
    for axis in ['experience_claim','role_boundary','lyrical_style']:
        pairs=[(rs[i][axis],rs[j][axis]) for rs in ratings.values() for i in range(len(rs)) for j in range(i+1,len(rs))]
        agreement[axis]={'rating_pairs':len(pairs),'exact_agreement':sum(a==b for a,b in pairs)/len(pairs) if pairs else None,'note':'Pairwise descriptive agreement; no ratings are fabricated for unannotated runs.'}
    return {'release_id':bundle['release_id'],'complete_analyzed_runs':len(values),'factorial_effects':effects,'annotation_agreement':agreement,'limitations':'Descriptive estimates only. Small pilot, fixed prompt variants; no confirmatory p-values. Tokenization is intended for English prompts and uses Python Unicode word semantics; validate before multilingual use.'}

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Usage: python3 analysis.py RELEASE.json')
    raw=open(sys.argv[1],'rb').read();data=json.loads(raw)
    print(json.dumps({'bundle_sha256':hashlib.sha256(raw).hexdigest(),'analysis':analyze(data)},indent=2))
