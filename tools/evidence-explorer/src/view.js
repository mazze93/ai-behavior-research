'use strict';
document.getElementById('model').addEventListener('change',event=>{
  for(const section of document.querySelectorAll('[data-model]')) section.hidden=event.target.value!=='all'&&section.dataset.model!==event.target.value;
});
function revealRecord(){
  if(!/^#run-\d+$/.test(location.hash))return;
  const record=document.getElementById(location.hash.slice(1));
  if(record){record.open=true;record.querySelector('summary').focus();record.scrollIntoView({block:'start'});}
}
addEventListener('hashchange',revealRecord);
document.addEventListener('click',event=>{if(event.target.closest('a[href^="#run-"]'))setTimeout(revealRecord,0);});
revealRecord();
