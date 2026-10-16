import {test} from 'node:test';
import assert from 'node:assert/strict';
import {responsePolicy} from '../src/response-policy';
test('public asset caching does not extend to credentials, HTML, API responses or errors',()=>{
 const policy=(path:string,headers:HeadersInit={},status=200)=>responsePolicy(new Request('https://research.example'+path,{headers}),new Response('fixture',{status}));
 for(const path of ['/hub.css','/fonts/Basteleur-Bold.woff2','/fonts/Basteleur-Moonlight.woff2','/fonts/BodoniModa-Latin.woff2','/fonts/Manrope-Latin.woff2','/_astro/client.ab12.js','/_astro/inline-ab12.css','/_astro/fonts/ab12.woff2','/registry.js','/explorers/rel_aaaa/explorer.css','/explorers/rel_aaaa/contrasts.svg'])assert.equal(policy(path).headers.get('Cache-Control'),'public, max-age=300');
 for(const path of ['/','/persona.html','/_astro/private.json','/_astro/src/file.js','/_astro/client.js.map','/fonts/BodoniModa-Latin-OFL.txt','/explorers/rel_aaaa/index.html','/api/studies','/api/data.css','/api/releases/rel_aaaa/bundle'])assert.equal(policy(path).headers.get('Cache-Control'),'no-store');
 for(const headers of [{Cookie:'research_session=fixture'},{Authorization:'Bearer fixture'}])assert.equal(policy('/hub.css',headers).headers.get('Cache-Control'),'no-store');
 assert.equal(policy('/hub.css',{},404).headers.get('Cache-Control'),'no-store');
 for(const path of ['/_astro/client.ab12.js','/fonts/Manrope-Latin.woff2']){
  assert.equal(policy(path,{Cookie:'fixture=x'}).headers.get('Cache-Control'),'no-store');
  assert.equal(policy(path,{Authorization:'Bearer fixture'}).headers.get('Cache-Control'),'no-store');
  assert.equal(policy(path,{},404).headers.get('Cache-Control'),'no-store');
 }
 const cookie=responsePolicy(new Request('https://research.example/hub.css'),new Response('x',{headers:{'Set-Cookie':'fixture=x'}}));assert.equal(cookie.headers.get('Cache-Control'),'no-store');
});
test('security headers preserve CSP and restrict indexing of private surfaces',()=>{
 for(const path of ['/console.html','/%70ersona.html','/api/studies']){
  const r=responsePolicy(new Request('https://research.example'+path),new Response('x'));
  assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.equal(r.headers.get('Strict-Transport-Security'),'max-age=31536000');
  assert.match(r.headers.get('Permissions-Policy')!,/camera=\(\)/);
  assert.doesNotMatch(r.headers.get('Content-Security-Policy')!,/unsafe-inline/);
 }
 const publicPage=responsePolicy(new Request('https://research.example/'),new Response('x'));assert.equal(publicPage.headers.get('X-Robots-Tag'),null);
});
