import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import research

class ResearchTests(unittest.TestCase):
    def test_metrics_edge_cases(self):
        self.assertEqual(research.metrics('')['repeat_4gram_fraction'],0)
        self.assertEqual(research.metrics('a b c d e')['repeat_4gram_fraction'],0)
        self.assertEqual(research.metrics('Loop. '*25)['identical_sentence_tail'],25)
        self.assertEqual(research.metrics('a b '*10)['periodic_token_tail'],20)
        self.assertEqual(research.metrics('a b c d')['periodic_token_tail'],0)

    def test_plan_and_duplicate_validation(self):
        c=research.load_config(research.ROOT/'configs/pilot.json')
        self.assertEqual(len(research.plan(c)),60)
        self.assertEqual(research.plan(c),research.plan(c))
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.json';c['seeds']=[1,1];research.save(p,c)
            with self.assertRaises(ValueError):research.load_config(p)

    def test_demo_and_integrity(self):
        with tempfile.TemporaryDirectory() as d:
            c=research.load_config(research.ROOT/'configs/pilot.json');c['models']=['fixture'];c['seeds']=[1,2]
            p=Path(d)/'config.json';research.save(p,c)
            folder=research.run(p,Path(d),True)
            self.assertIn('SYNTHETIC',(folder/'report.md').read_text())
            data=json.loads((folder/'analysis.json').read_text())
            self.assertTrue(all(c['mean_difference']>0 for c in data['comparisons']))
            f=folder/'run-00000.json';f.write_text('{}')
            with self.assertRaises(ValueError):research.analyze(folder)

    def test_failure_is_not_model_output(self):
        with tempfile.TemporaryDirectory() as d:
            c=research.load_config(research.ROOT/'configs/pilot.json');c['models']=['fixture'];c['seeds']=[1];c['conditions']=c['conditions'][:1]
            p=Path(d)/'config.json';research.save(p,c)
            def fake(route,payload=None):
                if route=='/api/version':return {'version':'test'}
                if route=='/api/tags':return {'models':[{'name':'fixture','digest':'abc'}]}
                raise OSError('test connection failure')
            with patch.object(research,'api',side_effect=fake):folder=research.run(p,Path(d))
            r=json.loads((folder/'run-00000.json').read_text())
            self.assertEqual(r['status'],'failed');self.assertEqual(len(r['turns']),1)
            self.assertNotIn('metrics',r['turns'][0])

if __name__=='__main__':unittest.main()
