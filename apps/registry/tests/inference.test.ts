import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseInference} from '../src/inference';
test('nested Workers AI usage preserves cutoff evidence',()=>{
 const r=parseInference(JSON.stringify({result:{response:'hello',usage:{completion_tokens:256}}}),256);
 assert.equal(r.budget_limited,true);
});
test('missing termination data stays unknown',()=>assert.equal(parseInference('{"response":"hello"}',256).budget_limited,null));
test('OpenAI-shaped completion records stop and length',()=>{
 assert.equal(parseInference('{"choices":[{"message":{"content":"hello"},"finish_reason":"stop"}]}',256).budget_limited,false);
 assert.equal(parseInference('{"choices":[{"message":{"content":"hello"},"finish_reason":"length"}]}',256).budget_limited,true);
});
test('invalid and empty responses cannot become observations',()=>{
 assert.throws(()=>parseInference('{"success":false}',256));
 assert.throws(()=>parseInference('{"response":""}',256));
});
