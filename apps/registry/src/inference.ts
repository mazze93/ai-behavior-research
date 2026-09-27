import { invariant } from './core';

type Payload={response?:string;choices?:{message?:{content?:string};finish_reason?:string}[];usage?:{completion_tokens?:number};finish_reason?:string};
export function parseInference(raw:string,maxTokens:number){
  const outer=JSON.parse(raw) as Payload & {result?:Payload};
  const p=outer.result??outer;
  const text=p.response??p.choices?.[0]?.message?.content;
  invariant(typeof text==='string'&&text.trim().length>0,'Empty/unrecognized model response; raw response preserved');
  const finish=p.choices?.[0]?.finish_reason??p.finish_reason??null;
  const count=p.usage?.completion_tokens;
  // Missing provider termination metadata is unknown, never a negative cutoff.
  const limited=finish==='length'||(typeof count==='number'&&count>=maxTokens)?true:
    finish!==null||typeof count==='number'?false:null;
  return {text,budget_limited:limited,finish_reason:finish??'not_exposed',completion_tokens:count??null};
}
