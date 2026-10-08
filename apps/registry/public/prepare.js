const select=document.getElementById('release-select');
const status=document.getElementById('status');
const selection=document.getElementById('selection');
const requested=new URLSearchParams(location.search).get('release');
let releases=[];
function show(){
 const row=releases.find(r=>r.id===select.value);
 if(!row){selection.hidden=true;return;}
 document.getElementById('release-title').textContent=row.title;
 document.getElementById('release-hash').textContent=`Release SHA-256: ${row.sha256}`;
 document.getElementById('inspect-link').href=`/releases/${row.id}`;
 document.getElementById('bundle-link').href=`/api/releases/${row.id}/bundle`;
 const origin=location.origin;
 document.getElementById('commands').textContent=`curl --fail --show-error --output ${row.id}.json '${origin}/api/releases/${row.id}/bundle' &&\ncurl --fail --show-error --output research_package.py '${origin}/research_package.py' &&\npython3 research_package.py ${row.id}.json ${row.sha256} --out package`;
 document.getElementById('explorer-commands').textContent=`cargo run --release --locked --manifest-path /path/to/ai-behavior-research/tools/evidence-explorer/Cargo.toml -- /path/to/package ${row.sha256} /path/to/new-explorer`;
 selection.hidden=false;
 status.textContent='Published snapshot selected. Inspect its phase and exclusions before interpreting the generated package.';
}
select.addEventListener('change',show);
try{
 const response=await fetch('/api/releases');
 if(!response.ok)throw Error('The public release index is unavailable. Reload to retry.');
 const rows=await response.json();
 if(!Array.isArray(rows)||rows.some(r=>!/^rel_[a-f0-9-]+$/.test(r.id)||! /^[a-f0-9]{64}$/.test(r.sha256)||typeof r.title!=='string'))throw Error('The release listing is malformed. No commands were generated.');
 releases=rows;select.replaceChildren();
 for(const row of rows){const option=document.createElement('option');option.value=row.id;option.textContent=`${row.title} · ${row.id}`;select.append(option);}
 if(!rows.length){status.textContent='No evidence has been published yet. Preparation becomes available after a reviewed release.';}
 else if(requested&&!rows.some(r=>r.id===requested)){select.selectedIndex=-1;select.disabled=false;status.textContent='The requested release was not found. Choose a published release above.';}
 else{select.disabled=false;if(requested)select.value=requested;show();}
}catch(error){status.className='error';status.textContent=error.message;select.replaceChildren(new Option('Release index unavailable',''));}
