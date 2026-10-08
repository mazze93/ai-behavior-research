"""Cross-language check using the real Python analysis builder; no model calls."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'apps/registry/tests_python'))
from test_research_package import fixture, m
sys.path.insert(0, str(ROOT/'scripts'))
from build_explorer_gallery import build
BINARY = ROOT/'tools/evidence-explorer/target/debug/evidence-explorer'

class ExplorerRoundtrip(unittest.TestCase):
    def test_gallery_is_pinned_and_omits_unselected_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); sources=root/'sources';sources.mkdir()
            bundle=fixture('smoke');bundle['release_id']='rel_aaaa'
            raw=m.canonical(bundle).encode();digest=m.sha(raw)
            (sources/'rel_aaaa.json').write_bytes(raw)
            (sources/'private.json').write_text('NEVER INCLUDED')
            config={'schema_version':1,'origin':'https://research.mazzeleczzare.com','releases':[{'id':'rel_aaaa','sha256':digest}]}
            manifest=root/'releases.json';manifest.write_text(json.dumps(config))
            rows=build(manifest,sources,root/'gallery',BINARY)
            self.assertEqual(rows[0]['phase'],'smoke')
            self.assertFalse((root/'gallery/private.json').exists())
            self.assertFalse((root/'gallery/rel_aaaa/source.json').exists())
            proof=json.loads((root/'gallery/build-manifest.json').read_text())
            for name,sha in proof['files'].items():self.assertEqual(m.sha((root/'gallery'/name).read_bytes()),sha)
            with self.assertRaises(FileExistsError):build(manifest,sources,root/'gallery',BINARY)
            config['releases'][0]['sha256']='0'*64;manifest.write_text(json.dumps(config))
            with self.assertRaises(ValueError):build(manifest,sources,root/'bad',BINARY)
            self.assertFalse((root/'bad').exists())
    def test_python_package_rust_render_and_nonoverwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); raw=m.canonical(fixture()).encode(); digest=m.sha(raw)
            m.build_package(raw,digest,root/'package')
            result=subprocess.run([str(BINARY),str(root/'package'),digest,str(root/'view')],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            manifest=json.loads((root/'view/view-manifest.json').read_text())
            for file,sha in manifest['files'].items():self.assertEqual(m.sha((root/'view'/file).read_bytes()),sha)
            tree=ET.fromstring((root/'view/contrasts.svg').read_bytes())
            marks=tree.findall('.//{http://www.w3.org/2000/svg}circle')
            self.assertEqual(len(marks),3)
            self.assertAlmostEqual(float(marks[0].attrib['cx']),900.0) # .75 on fixed [-1,1] scale
            page=(root/'view/index.html').read_text()
            self.assertNotIn('<style',page)
            self.assertNotIn('style=',page)
            self.assertNotIn('<script>',page)
            self.assertIn('src=explorer.js',page)
            self.assertIn('heat-75',page)
            self.assertIn('.heat-75{--hue:36.25}',(root/'view/explorer.css').read_text())
            self.assertEqual(page.count('<details id=run-'),24)
            again=subprocess.run([str(BINARY),str(root/'package'),digest,str(root/'view')],capture_output=True)
            self.assertNotEqual(again.returncode,0)
            for file,sha in manifest['files'].items():self.assertEqual(m.sha((root/'view'/file).read_bytes()),sha)
            report=root/'package/analysis.json';report.write_text(report.read_text()+' ')
            tampered=subprocess.run([str(BINARY),str(root/'package'),digest,str(root/'tampered')],capture_output=True)
            self.assertNotEqual(tampered.returncode,0);self.assertFalse((root/'tampered').exists())
if __name__=='__main__':unittest.main()
