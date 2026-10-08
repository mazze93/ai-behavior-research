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
BINARY = ROOT/'tools/evidence-explorer/target/debug/evidence-explorer'

class ExplorerRoundtrip(unittest.TestCase):
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
            self.assertEqual(page.count('<details id=run-'),24)
            again=subprocess.run([str(BINARY),str(root/'package'),digest,str(root/'view')],capture_output=True)
            self.assertNotEqual(again.returncode,0)
            for file,sha in manifest['files'].items():self.assertEqual(m.sha((root/'view'/file).read_bytes()),sha)
            report=root/'package/analysis.json';report.write_text(report.read_text()+' ')
            tampered=subprocess.run([str(BINARY),str(root/'package'),digest,str(root/'tampered')],capture_output=True)
            self.assertNotEqual(tampered.returncode,0);self.assertFalse((root/'tampered').exists())
if __name__=='__main__':unittest.main()
