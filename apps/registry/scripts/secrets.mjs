import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// No secret values are written to stdout, argv, or deployment source.
if (process.argv.includes('--rotate')) {
  writeFileSync('.dev.vars', `ADMIN_TOKEN=${randomBytes(48).toString('base64url')}\nSESSION_SECRET=${randomBytes(48).toString('base64url')}\n`, {mode:0o600});
  chmodSync('.dev.vars',0o600);
  console.log('Local credentials replaced. Values retained only in ignored .dev.vars.');
}
if (process.argv.includes('--deploy')) {
  const secrets=Object.fromEntries(readFileSync('.dev.vars','utf8').trim().split('\n').map(line=>{const pos=line.indexOf('=');return [line.slice(0,pos),line.slice(pos+1)];}));
  const r=spawnSync('./node_modules/.bin/wrangler',['secret','bulk','--config','wrangler.jsonc'],{input:JSON.stringify(secrets),encoding:'utf8'});
  // Wrangler reports binding names and success only; redact defensively.
  let output=(r.stdout||'')+(r.stderr||'');
  for(const value of Object.values(secrets))output=output.replaceAll(value,'[REDACTED]');
  console.log(output);process.exitCode=r.status??1;
}
