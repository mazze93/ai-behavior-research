import importlib.util, unittest, json, hashlib, tempfile
from pathlib import Path
from itertools import product
spec=importlib.util.spec_from_file_location('package',Path(__file__).parents[1]/'public/research_package.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture(phase='pilot'):
 conditions=[{'id':f'c{s}{l}{i}','variant':'a','factors':dict(zip(m.FACTORS,(s,l,i))),'system':'fixture','turns':['one','two']} for s,l,i in product((0,1),repeat=3)]
 p={'phase':phase,'models':['fixture'],'seeds':[1,2,3],'conditions':conditions,'recovery':[{'id':x,'prompt':'Return 4','expected':'4'} for x in ('x','y','z')],'options':{'max_tokens':128,'temperature':.7,'top_p':.9},'gateway_id':'fixture'}
 protocol=m.canonical(p);b={'schema_version':2,'release_id':'rel_fixture','study':{'id':'study_fixture','title':'Synthetic test','protocol':protocol,'sha256':m.sha(protocol)},'citation':'Synthetic fixture','runs':[],'artifacts':[],'annotations':[]}
 for n,(seed,c) in enumerate(product(p['seeds'],conditions)):
  rid='run_'+str(n);text='a a a a a a a' if c['factors']['self_reference'] else 'a b c d e f g'
  result={'protocol_sha256':b['study']['sha256'],'metrics':{'repeat_4gram_fraction':m.measure(text),'words':7},'turn1_text':'first','turn2_text':text,'budget_limited':False,'recovery':[{'id':x,'text':'4','expected':'4','exact':True} for x in ('x','y','z')]}
  b['runs'].append({'id':rid,'study_id':b['study']['id'],'job':m.canonical({'model':'fixture','seed':seed,'condition':c}),'status':'complete','result':m.canonical(result),'error':None,'excluded_reason':None})
  history=[{'role':'system','content':c['system']}]
  for label,output in [('turn1','first'),('turn2',text)]+[('recovery-'+x,'4') for x in ('x','y','z')]:
   if label.startswith('turn'):history.append({'role':'user','content':c['turns'][int(label[-1])-1]})
   messages=history if label.startswith('turn') else history+[{'role':'user','content':'Return 4'}]
   request={'model':'fixture','protocol_sha256':b['study']['sha256'],'gateway':{'id':'fixture','skipCache':True,'retries':0},'input':dict(p['options'],seed=seed,stream=False,messages=[dict(x) for x in messages])}
   for kind,content in [('request',request),('response',{'status':200,'headers':{'cf-aig-cache-status':'MISS'},'body':json.dumps({'response':output,'finish_reason':'stop'})})]:
    b['artifacts'].append({'key':f'runs/{rid}/{label}-{kind}.json','content':content,'sha256':m.sha(m.canonical(content))})
   if label.startswith('turn'):history.append({'role':'assistant','content':output})
 return b
class ResearchPackageTests(unittest.TestCase):
 def test_verified_factorial_reproduction_and_seed_bootstrap(self):
  b=fixture();a=m.analyze(b);effect=a['contrasts'][0]
  self.assertEqual(effect['complete_pairs'],12);self.assertEqual(effect['missing_pairs'],0)
  self.assertAlmostEqual(effect['mean_difference'],.75);self.assertEqual(effect['seed_bootstrap_95'],[.75,.75]);self.assertEqual(a,m.analyze(b))
 def test_failures_are_missing_not_zero_and_smoke_has_no_intervals(self):
  b=fixture('smoke');b['runs'][0].update(status='failed',result=None,error='fixture failure');a=m.analyze(b)
  self.assertEqual(a['status_counts']['failed'],1);self.assertEqual(a['contrasts'][0]['complete_pairs'],11);self.assertEqual(a['contrasts'][0]['missing_pairs'],1);self.assertIsNone(a['contrasts'][0]['seed_bootstrap_95'])
 def test_reject_tampering_duplicates_cache_and_wrong_metrics(self):
  for change in ['artifact','duplicate','cache','metric','condition']:
   b=fixture()
   if change=='artifact':b['artifacts'][0]['content']['model']='changed'
   elif change=='duplicate':b['runs'].append(b['runs'][0])
   elif change=='cache':
    a=b['artifacts'][1];a['content']['headers']['cf-aig-cache-status']='HIT';a['sha256']=m.sha(m.canonical(a['content']))
   elif change=='metric':
    r=b['runs'][0];v=json.loads(r['result']);v['metrics']['repeat_4gram_fraction']=.9;r['result']=m.canonical(v)
   else:
    p=json.loads(b['study']['protocol']);p['conditions'][1]['factors']=p['conditions'][0]['factors'];b['study']['protocol']=m.canonical(p);b['study']['sha256']=m.sha(b['study']['protocol'])
   with self.assertRaises(ValueError,msg=change):m.analyze(b)
 def test_package_hashes_and_non_overwrite(self):
  raw=m.canonical(fixture()).encode();digest=hashlib.sha256(raw).hexdigest()
  with tempfile.TemporaryDirectory() as tmp:
   out=Path(tmp)/'package';m.build_package(raw,digest,out)
   manifest=json.loads((out/'manifest.json').read_text())
   for name,sha in manifest['files'].items():self.assertEqual(hashlib.sha256((out/name).read_bytes()).hexdigest(),sha)
   self.assertIn('Not a submission-ready paper',(out/'manuscript.md').read_text())
   with self.assertRaises(FileExistsError):m.build_package(raw,digest,out)
   with self.assertRaises(ValueError):m.build_package(raw,'f'*64,Path(tmp)/'bad')
 def test_reject_rehashed_request_drift_and_recovery_drift(self):
  for change in ('seed','messages','temperature','gateway','recovery'):
   b=fixture()
   if change=='recovery':
    r=b['runs'][0];v=json.loads(r['result']);v['recovery'][0]['exact']=False;r['result']=m.canonical(v)
   else:
    a=b['artifacts'][0]
    if change=='gateway':a['content']['gateway']['skipCache']=False
    elif change=='messages':a['content']['input']['messages'][0]['content']='changed'
    else:a['content']['input'][change]=99
    a['sha256']=m.sha(m.canonical(a['content']))
   with self.assertRaises(ValueError,msg=change):m.analyze(b)
 def test_cutoff_is_recomputed_from_raw_provider_metadata(self):
  for payload,limited in [({'response':'text','finish_reason':'length'},True),
                          ({'result':{'response':'text','usage':{'completion_tokens':128}}},True),
                          ({'response':'text'},None),
                          ({'choices':[{'message':{'content':'text'},'finish_reason':'stop'}]},False)]:
   self.assertIs(m.cutoff_flag(payload,128),limited)
  b=fixture();a=next(a for a in b['artifacts'] if a['key'].endswith('turn2-response.json'))
  body=json.loads(a['content']['body']);body['finish_reason']='length';a['content']['body']=json.dumps(body);a['sha256']=m.sha(m.canonical(a['content']))
  with self.assertRaisesRegex(ValueError,'cutoff'):m.analyze(b)
 def test_nested_choice_matches_runner(self):
  record={'status':200,'headers':{},'body':json.dumps({'result':{'choices':[{'message':{'content':'first'},'finish_reason':'stop'}]}})}
  self.assertEqual(m.response_text(record),'first')
 def test_nonconstant_bootstrap_and_percentile(self):
  self.assertEqual(m.percentile([0,10,20,30],.25),7.5)
  self.assertEqual(m.bootstrap([0,.5,1],True),[0,1])
  self.assertIsNone(m.bootstrap([0,1],True))
 def test_registry_number_canonicalization(self):
  self.assertEqual(m.canonical({'x':1e-7,'y':1e-6,'z':1e20}),'{"x":1e-7,"y":0.000001,"z":100000000000000000000}')
if __name__=='__main__':unittest.main()
