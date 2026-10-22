import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).parents[3]
spec = importlib.util.spec_from_file_location('release_inventory', ROOT / 'scripts/release_inventory.py')
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
PUBLIC = ROOT / 'apps/registry/public'


class AssetsIgnoreTests(unittest.TestCase):
    def tree(self, rules, files):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        base = Path(tmp.name)
        (base / '.assetsignore').write_text(rules)
        for name in files:
            (base / name).parent.mkdir(parents=True, exist_ok=True)
            (base / name).write_text('x')
        return base, inv.parse_rules(rules)

    def test_single_star_does_not_cross_directories(self):
        base, rules = self.tree('**/*\n!/*.css\n', ['a.css', 'deep/b.css'])
        self.assertEqual(inv.deployable(base, rules), ['a.css'])

    def test_file_in_ignored_directory_cannot_be_reincluded(self):
        base, rules = self.tree('**/*\n!/fonts/x.woff2\n', ['fonts/x.woff2'])
        self.assertEqual(inv.deployable(base, rules), [])
        base, rules = self.tree('**/*\n!/fonts/\n!/fonts/x.woff2\n', ['fonts/x.woff2', 'fonts/y.woff2'])
        self.assertEqual(inv.deployable(base, rules), ['fonts/x.woff2'])

    def test_directory_rule_never_matches_a_file(self):
        base, rules = self.tree('**/*\n!/notes/\n', ['notes'])
        self.assertEqual(inv.deployable(base, rules), [])

    def test_last_matching_rule_wins_and_comments_are_ignored(self):
        base, rules = self.tree('# header\n**/*\n!/*.json\n/private.json\n', ['a.json', 'private.json'])
        self.assertEqual(inv.deployable(base, rules), ['a.json'])


class RealInventoryTests(unittest.TestCase):
    def test_inventory_covers_landing_build_and_shared_type(self):
        public, gated = inv.inventory(PUBLIC)
        manifest = json.loads((PUBLIC / 'landing-manifest.json').read_text())['files']
        self.assertTrue(set(manifest) <= set(public))
        for name in ['type.css', 'hub.css', 'style.css', 'prepare.css', 'research-notes.css', 'index.html']:
            self.assertIn(name, public)
        self.assertEqual(gated, {'persona.html': 303})
        self.assertNotIn('persona.html', public)
        self.assertFalse([n for n in public if n.startswith('.') or '/.' in n])


class ResponsePolicyMirrorTests(unittest.TestCase):
    """Same sample paths as tests/response-policy.test.ts, so the mirror cannot drift silently."""

    def test_cacheable_presentation_assets(self):
        for path in ['/hub.css', '/fonts/Basteleur-Bold.woff2', '/fonts/Basteleur-Moonlight.woff2',
                     '/fonts/BodoniModa-Latin.woff2', '/fonts/Manrope-Latin.woff2', '/_astro/client.ab12.js',
                     '/_astro/inline-ab12.css', '/_astro/fonts/ab12.woff2', '/registry.js',
                     '/explorers/rel_aaaa/explorer.css', '/explorers/rel_aaaa/contrasts.svg']:
            self.assertEqual(inv.expected_cache_control(path[1:]), 'public, max-age=300', path)

    def test_everything_else_is_no_store(self):
        for path in ['/persona.html', '/_astro/private.json', '/_astro/src/file.js', '/_astro/client.js.map',
                     '/fonts/BodoniModa-Latin-OFL.txt', '/explorers/rel_aaaa/index.html', '/api/data.css']:
            self.assertEqual(inv.expected_cache_control(path[1:]), 'no-store', path)

    def test_python_downloads_have_no_fixed_media_type(self):
        self.assertIsNone(inv.expected_content_types('analysis.py'))
        self.assertEqual(inv.expected_content_types('type.css'), {'text/css'})


if __name__ == '__main__':
    unittest.main()
