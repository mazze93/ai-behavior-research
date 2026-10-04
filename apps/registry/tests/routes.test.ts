import {test} from 'node:test';
import assert from 'node:assert/strict';
import web from '../src/web';
import {session} from '../src/auth';
test('study routes preserve identity evidence and keep the persona studio owner-only',async()=>{
 const env={SESSION_SECRET:'fixture',ASSETS:{fetch:async(req:Request)=>new Response(new URL(req.url).pathname)}} as unknown as WebEnv;
 const get=async(path:string,cookie?:string)=>web.fetch(new Request('https://fixture.example'+path,{headers:cookie?{Cookie:'research_session='+cookie}:{}}),env,{} as ExecutionContext);
 assert.equal(await (await get('/studies/identity-dissolution')).text(),'/identity.html');
 assert.equal(await (await get('/studies/persona-integrity')).text(),'/persona-about.html');
 for(const path of ['/persona.html','/%70ersona.html','/persona%2ehtml','//persona.html'])assert.equal((await get(path)).status,303);
 assert.equal((await get('/persona.html',await session({role:'rater',id:'r'},env.SESSION_SECRET))).status,303);
 assert.equal(await (await get('/persona.html',await session({role:'admin',id:'owner'},env.SESSION_SECRET))).text(),'/persona.html');
 assert.equal(await (await get('/releases/rel_aaaa')).text(),'/release.html');
});
