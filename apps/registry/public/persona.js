import {readPacket,readJournal,recordAnnotation,exportJournal} from './persona-core.js';
const $=id=>document.getElementById(id);
let resumedFrom=null;
let packet=null,packetHash='',journal=[],current=0,dirty=false,exportedCount=0,preparedCount=0,exportUrl=null;
const message=(text,error=false)=>{$('notice').textContent=text;$('notice').className=error?'error':'notice';};
const hasUnsaved=()=>dirty||journal.length>exportedCount;
function display(){
 const r=packet.responses[current];$('response-text').textContent=r.text;
 $('context').textContent=r.context.map(m=>`${m.role.toUpperCase()}\n${m.content}`).join('\n\n');
 $('eligibility').textContent=`${r.eligibility} / ${r.run_id} / ${r.response_id}`;
 $('score').reset();dirty=false;
 const a=journal.find(a=>a.run_id===r.run_id&&a.response_id===r.response_id);
 $('fields').disabled=!!a;$('recorded').hidden=!a;
 if(a){
  $('recorded').textContent=`Recorded ${a.response_label} at ${a.recorded_at}. Preserved in this session's export.`;
  for(const [id,key] of Object.entries({'label':'response_label','self-description':'self_description_present','first-person':'first_person_claim_present','fiction':'fiction_marker','evidence-status':'evidence_status','confidence':'confidence','excerpt':'evidence_excerpt'}))$(id).value=String(a[key]);
  $('alternatives').value=a.alternative_explanations.join('\n');$('limits').value=a.evidence_limits.join('\n');
 }
 $('progress').textContent=`${journal.length} / ${packet.responses.length} responses recorded`;
 $('export').disabled=!journal.length;
}
$('packet-file').addEventListener('change',async()=>{
 const file=$('packet-file').files[0];if(!file)return;
 try{
  if(hasUnsaved()&&!confirm('Replace this session? Unexported annotations and the current draft will be lost.'))return;
  if(file.size>20000000)throw Error('Packet exceeds 20 MB');
  const bytes=await file.arrayBuffer(),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),parsed=readPacket(text);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  resumedFrom=null;$('journal-file').disabled=false;packet=parsed;packetHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');journal=[];current=0;exportedCount=0;preparedCount=0;$('export-panel').hidden=true;$('saved-export').checked=false;if(exportUrl)URL.revokeObjectURL(exportUrl);
  $('response-id').replaceChildren(...packet.responses.map((r,i)=>new Option(`${i+1}. ${r.run_id} / ${r.response_id}`,String(i))));
  $('source').textContent=`Release ${packet.release_id}\nPacket SHA-256 ${packetHash}`;
  $('annotator').disabled=false;$('workspace').hidden=false;display();message('Packet loaded locally. Source identity is recorded, not independently reverified. No scores have been assigned.');
 }catch(e){message(e.message,true);}finally{$('packet-file').value='';}
});
$('response-id').addEventListener('change',()=>{
 if(dirty&&!confirm('Discard the unrecorded draft for this response?')){$('response-id').value=String(current);return;}
 current=Number($('response-id').value);display();
});
$('score').addEventListener('input',()=>{dirty=true;});
$('score').addEventListener('submit',e=>{
 e.preventDefault();try{
 const lines=id=>$(id).value.split('\n').map(s=>s.trim()).filter(Boolean);
 journal=recordAnnotation(journal,packet.responses[current],{response_label:$('label').value,self_description_present:$('self-description').value==='true',first_person_claim_present:$('first-person').value==='true',fiction_marker:$('fiction').value,evidence_status:$('evidence-status').value,confidence:$('confidence').value,alternative_explanations:lines('alternatives'),evidence_limits:lines('limits'),evidence_excerpt:$('excerpt').value},$('annotator').value.trim());
 $('annotator').disabled=true;display();message('Annotation recorded in memory. Download the journal to preserve it.');
 }catch(e){message(e.message,true);}
});
$('export').addEventListener('click',()=>{
 try{
 const data=exportJournal(packet,packetHash,journal,$('annotator').value.trim(),resumedFrom);
 const content=JSON.stringify(data,null,2)+'\n';
 if(exportUrl)URL.revokeObjectURL(exportUrl);
 exportUrl=URL.createObjectURL(new Blob([content],{type:'application/json'}));
 $('download-journal').href=exportUrl;$('download-journal').download=`persona-${packet.release_id}-${Date.now()}.json`;
 $('export-json').value=content;preparedCount=journal.length;$('saved-export').checked=false;$('export-panel').hidden=false;
 message('Export prepared below. Download or copy it, then confirm the saved file. Unrecorded form edits are not included.');
 }catch(e){message(e.message,true);}
});
$('saved-export').addEventListener('change',()=>{exportedCount=$('saved-export').checked?preparedCount:0;});
window.addEventListener('beforeunload',e=>{if(hasUnsaved()){e.preventDefault();e.returnValue='';}});

$('journal-file').addEventListener('change',async()=>{
 const file=$('journal-file').files[0];if(!file||!packet)return;
 const loadedPacket=packet,loadedHash=packetHash;
 try{
  if(file.size>20000000)throw Error('Journal exceeds 20 MB');
  const bytes=await file.arrayBuffer();
  const parsed=readJournal(new TextDecoder('utf-8',{fatal:true}).decode(bytes),loadedPacket,loadedHash);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  if(packet!==loadedPacket)throw Error('Packet changed while reading; select the journal again');
  if(hasUnsaved()&&!confirm('Resume this saved journal? Current unexported annotations and form edits will be replaced.'))return;
  journal=parsed.annotations;resumedFrom=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  $('annotator').value=parsed.annotator_id;$('annotator').disabled=true;
  current=packet.responses.findIndex(r=>!journal.some(a=>a.run_id===r.run_id&&a.response_id===r.response_id));if(current<0)current=0;
  $('response-id').value=String(current);exportedCount=journal.length;preparedCount=0;
  $('export-panel').hidden=true;$('saved-export').checked=false;if(exportUrl){URL.revokeObjectURL(exportUrl);exportUrl=null;}
  display();message(`Journal resumed locally. Original annotation IDs and timestamps preserved. This continues the same scoring session. Parent SHA-256: ${resumedFrom}`);
 }catch(e){message(e.message,true);}finally{$('journal-file').value='';}
});
