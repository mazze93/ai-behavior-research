import {test} from 'node:test';
import assert from 'node:assert/strict';
import {responsePolicy} from '../src/response-policy';
test('public asset caching does not extend to credentials, HTML, API responses or errors',()=>{
 const policy=(path:string,headers:HeadersInit={},status=200)=>responsePolicy(new Request('https://research.example'+path,{headers}),new Response('fixture',{status}));
 for(const path of ['/hub.css','/registry.js','/explorers/rel_aaaa/explorer.css','/explorers/rel_aaaa/contrasts.svg'])assert.equal(policy(path).headers.get('Cache-Control'),'public, max-age=300');
 for(const path of ['/','/persona.html','/explorers/rel_aaaa/index.html','/api/studies','/api/data.css','/api/releases/rel_aaaa/bundle'])assert.equal(policy(path).headers.get('Cache-Control'),'no-store');
 for(const headers of [{Cookie:'research_session=fixture'},{Authorization:'Bearer fixture'}])assert.equal(policy('/hub.css',headers).headers.get('Cache-Control'),'no-store');
 assert.equal(policy('/hub.css',{},404).headers.get('Cache-Control'),'no-store');
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
