import importlib.util
from html.parser import HTMLParser
from pathlib import Path
import tempfile
import unittest
from test_research_package import fixture, m
spec=importlib.util.spec_from_file_location('export_rustpress',Path(__file__).parents[3]/'scripts/export_rustpress.py')
exporter=importlib.util.module_from_spec(spec);spec.loader.exec_module(exporter)
class Elements(HTMLParser):
 def __init__(self):super().__init__();self.elements=[]
 def handle_starttag(self,tag,attrs):self.elements.append((tag,dict(attrs)))
class RustPressExportTests(unittest.TestCase):
 def test_brief_preserves_scope_identity_and_policy_boundary(self):
  b=fixture('smoke');b['study']['title']='<script>alert(1)</script>';b['citation']='https://research.example.test/<img src=x>';raw=m.canonical(b).encode()
  with tempfile.TemporaryDirectory() as tmp:
   out=Path(tmp)/'export';manifest=exporter.export(raw,m.sha(raw),out);page=(out/'corpus/evidence.html').read_text();parsed=Elements();parsed.feed(page)
   self.assertIn('Technical smoke evidence only',page);self.assertIn(m.sha(raw),page);self.assertIn('&lt;script&gt;',page)
   self.assertFalse(any(tag in ('script','svg','iframe','form') or 'href' in attrs or 'style' in attrs for tag,attrs in parsed.elements))
   self.assertEqual(manifest['publication_status'],'not_staged_or_published')
   self.assertEqual(manifest['files']['corpus/evidence.html'],m.sha(page))
   with self.assertRaises(FileExistsError):exporter.export(raw,m.sha(raw),out)
 def test_invalid_bundle_writes_nothing(self):
  raw=m.canonical(fixture()).encode()
  with tempfile.TemporaryDirectory() as tmp:
   out=Path(tmp)/'bad'
   with self.assertRaises(ValueError):exporter.export(raw,'0'*64,out)
   self.assertFalse(out.exists())
if __name__=='__main__':unittest.main()
