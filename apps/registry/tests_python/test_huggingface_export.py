import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from test_research_package import fixture, m

spec = importlib.util.spec_from_file_location('export_huggingface', Path(__file__).parents[3]/'scripts/export_huggingface.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class HuggingFaceExportTests(unittest.TestCase):
    def prepare(self, directory, bundle):
        bundle['release_id'] = 'rel_aaaa'
        raw = m.canonical(bundle).encode()
        source = directory/'sources'; source.mkdir()
        (source/'rel_aaaa.json').write_bytes(raw)
        selection = directory/'selection.json'
        selection.write_text(json.dumps({'schema_version':1, 'origin':exporter.ORIGIN,
                                       'releases':[{'id':'rel_aaaa','sha256':m.sha(raw)}]}))
        return selection, source

    def test_known_effect_and_private_fields_are_not_mirrored(self):
        bundle = fixture()
        bundle.update(license='No additional reuse license granted.', annotations=[{'private':'SECRET_ANNOTATION'}],
                      private_notes='SECRET_NOTES', citation='SECRET_CITATION')
        bundle['study']['title'] = 'SECRET_TITLE'
        bundle['runs'][0]['error'] = 'SECRET_ERROR'
        bundle['runs'][0]['excluded_reason'] = 'SECRET_EXCLUSION'
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); selection, source = self.prepare(root,bundle)
            (source/'unselected-private.json').write_text('SECRET_UNSELECTED')
            out = root/'export'; manifest = exporter.export(selection,source,out)
            bodies = b''.join(p.read_bytes() for p in out.rglob('*') if p.is_file())
            self.assertNotIn(b'SECRET_',bodies)
            runs = [json.loads(r) for r in (out/'data/rel_aaaa/runs.jsonl').read_text().splitlines()]
            contrasts = [json.loads(r) for r in (out/'data/rel_aaaa/contrasts.jsonl').read_text().splitlines()]
            self.assertEqual(len(runs),24)
            self.assertTrue(runs[0]['excluded']); self.assertFalse(runs[0]['included_in_analysis'])
            self.assertEqual(runs[0]['repetition'],0)
            self.assertEqual(contrasts[0]['seed_balanced_difference'],.75)
            self.assertEqual(contrasts[0]['complete_pairs'],11)
            self.assertEqual(contrasts[0]['bootstrap_95_lower'],.75)
            self.assertTrue(all(r['model_revision'] is None for r in runs))
            for name, digest in manifest['files'].items():
                self.assertEqual(m.sha((out/name).read_bytes()),digest)
            self.assertEqual(set(manifest['files'])|{'manifest.json'},
                             {p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file()})

    def test_smoke_missing_failed_and_zero_stay_distinct(self):
        bundle = fixture('smoke'); bundle['runs'].pop()
        bundle['runs'][0].update(status='failed',result=None,error='Private provider error')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); selection, source = self.prepare(root,bundle)
            out = root/'export'; exporter.export(selection,source,out)
            runs = [json.loads(r) for r in (out/'data/rel_aaaa/runs.jsonl').read_text().splitlines()]
            self.assertEqual(len(runs),24)
            self.assertEqual(runs[0]['status'],'failed'); self.assertIsNone(runs[0]['repetition'])
            self.assertEqual(runs[-1]['status'],'missing'); self.assertIsNone(runs[-1]['run_id'])
            self.assertEqual(runs[1]['repetition'],0); self.assertEqual(runs[1]['status'],'complete')
            contrasts = [json.loads(r) for r in (out/'data/rel_aaaa/contrasts.jsonl').read_text().splitlines()]
            self.assertTrue(all(r['bootstrap_95_lower'] is None and r['technical_only'] for r in contrasts))

    def test_card_configs_and_scoped_license_preserve_source_terms(self):
        bundle = fixture('smoke'); bundle['license'] = '<script>untrusted</script>\n---'
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); selection, source = self.prepare(root,bundle)
            out = root/'export'; exporter.export(selection,source,out)
            card = (out/'README.md').read_text(); metadata = json.loads(card.split('---\n',2)[1])
            self.assertEqual(metadata['license'],'cc-by-4.0')
            self.assertNotIn('<script>',card); self.assertIn('&lt;script&gt;',card)
            self.assertIn('Persona Integrity',card)
            for config in metadata['configs']:
                self.assertEqual(config['data_files'][0]['split'],'observations')
                self.assertTrue((out/config['data_files'][0]['path']).is_file())
            provenance = json.loads((out/'provenance.json').read_text())
            self.assertEqual(provenance['releases'][0]['recorded_license'],bundle['license'])
            self.assertIsNone(provenance['hub_revision'])
            self.assertEqual(provenance['publication_status'],'local_draft_not_uploaded')
            self.assertEqual(provenance['redistribution_review'],'required')
            self.assertEqual(provenance['export_license'],'cc-by-4.0')
            self.assertTrue(provenance['source_terms_unmodified'])
            self.assertIn('does not\nrelicense the original evidence bundles',(out/'LICENSE.md').read_text())
            self.assertIn('private source repository and its code are outside',(out/'LICENSE.md').read_text())

    def test_bad_selection_or_rehashed_wrong_metrics_write_nothing(self):
        for change in ('hash','traversal','duplicate','metric','wrong_release','wrong_origin'):
            with self.subTest(change=change), tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp); bundle=fixture(); selection, source=self.prepare(root,bundle)
                data=json.loads(selection.read_text())
                if change=='hash':data['releases'][0]['sha256']='0'*64
                elif change=='traversal':data['releases'][0]['id']='rel_../../private'
                elif change=='duplicate':data['releases'].append(data['releases'][0])
                elif change=='wrong_origin':data['origin']='https://attacker.invalid'
                else:
                    if change=='metric':
                        r=bundle['runs'][0]; result=m.parse(r['result']);result['metrics']['repeat_4gram_fraction']=.9;r['result']=m.canonical(result)
                    else:bundle['release_id']='rel_bbbb'
                    raw=m.canonical(bundle).encode();(source/'rel_aaaa.json').write_bytes(raw)
                    data['releases'][0]['sha256']=m.sha(raw)
                selection.write_text(json.dumps(data)); out=root/'export'
                with self.assertRaises(ValueError):exporter.export(selection,source,out)
                self.assertFalse(out.exists())

    def test_deterministic_non_overwrite_and_symlink_refusal(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); selection, source=self.prepare(root,fixture())
            a,b=root/'a',root/'b'; exporter.export(selection,source,a);exporter.export(selection,source,b)
            for p in a.rglob('*'):
                if p.is_file():self.assertEqual(p.read_bytes(),(b/p.relative_to(a)).read_bytes())
            with self.assertRaises(FileExistsError):exporter.export(selection,source,a)
            broken=root/'broken';broken.symlink_to(root/'missing')
            with self.assertRaises(FileExistsError):exporter.export(selection,source,broken)
            src=source/'rel_aaaa.json';src.rename(source/'actual.json');src.symlink_to(source/'actual.json')
            with self.assertRaises(ValueError):exporter.export(selection,source,root/'c')


if __name__=='__main__':
    unittest.main()
