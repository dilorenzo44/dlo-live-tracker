(()=>{
if(globalThis.__DLO_FANDUEL_SYNC__)return;globalThis.__DLO_FANDUEL_SYNC__=true;
const onFD=()=>/(^|\.)fanduel\.com$/i.test(location.hostname)&&/\/my-bets/i.test(location.pathname);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function selectWholePage(){
 const sel=getSelection(); if(!sel)return '';
 sel.removeAllRanges();
 try{document.execCommand('selectAll')}catch(_){}
 if(!sel.rangeCount){const r=document.createRange();r.selectNodeContents(document.documentElement);sel.addRange(r)}
 return String(sel.toString()||'').replace(/\r/g,'').trim();
}
async function copyWholePage(){
 const sel=getSelection(),saved=[];
 if(sel)for(let i=0;i<sel.rangeCount;i++)try{saved.push(sel.getRangeAt(i).cloneRange())}catch(_){}
 let selected='';
 try{
   selected=selectWholePage();
   let copied=false;try{copied=document.execCommand('copy')===true}catch(_){}
   // Give the browser clipboard a moment to receive the Select-All copy, then read
   // exactly what was copied. This is intentionally the same workflow as Ctrl+A/Ctrl+C.
   if(copied&&navigator.clipboard?.readText){
     try{await wait(60);const clip=String(await navigator.clipboard.readText()||'').replace(/\r/g,'').trim();if(clip)return clip}catch(_){}
   }
   return selected;
 }finally{
   try{sel.removeAllRanges();for(const r of saved)sel.addRange(r)}catch(_){}
 }
}
async function syncBets(btn){
 const oldLabel=btn.textContent;btn.disabled=true;btn.textContent='COPYING PAGE…';
 try{
  const text=await copyWholePage();
  if(!text)throw Error('FanDuel page copy was empty');
  btn.textContent='PARSING…';
  const d=await chrome.storage.local.get({bets:[]});
  const old=(d.bets||[]).filter(b=>globalThis.DLOParser?.isValidBet?.(b));
  const parsed=globalThis.DLOParser?.parseOpen?.(text,old)||globalThis.DLOParser?.parse?.(text,old)||[];
  const found=parsed.filter(b=>globalThis.DLOParser?.isValidBet?.(b));
  const noOpen=/no\s+(?:open|active)\s+bets|you\s+(?:do not|don['’]t)\s+have\s+any\s+(?:open|active)\s+bets/i.test(text);
  if(!found.length&&!noOpen){
    await chrome.storage.local.set({lastOpenReadText:text,lastOpenReadAt:Date.now(),lastImportError:'Copied full page but parser found 0 valid bets'});
    throw Error('Copied page, but found 0 bets');
  }
  const bets=noOpen?[]:found;
  await chrome.storage.local.set({rawText:text,lastOpenReadText:text,lastOpenReadAt:Date.now(),bets,lastImportSource:'FanDuel full-page Select All + Copy',lastImportAt:Date.now(),lastImportError:'',schemaVersion:400});
  const tickets=new Set(bets.map(b=>b.groupId||globalThis.DLOParser?.fingerprint?.(b)).filter(Boolean));
  btn.textContent=`✓ ${tickets.size} BET${tickets.size===1?'':'S'}`;
  setTimeout(()=>{btn.textContent=oldLabel;btn.disabled=false},2200);
 }catch(e){btn.textContent='! SYNC FAILED';btn.title=String(e?.message||e);setTimeout(()=>{btn.textContent=oldLabel;btn.disabled=false},2600)}
}
function install(){
 if(!onFD())return;
 let stack=document.getElementById('dlo-update-stack');if(!stack){setTimeout(install,250);return}
 let b=document.getElementById('dlo-fd-floating-sync');if(b)return;
 b=document.createElement('button');b.id='dlo-fd-floating-sync';b.type='button';b.className='dlo-fd-sync-btn';b.textContent='↻ SYNC BETS';b.title='Select all, copy the full FanDuel My Bets page, then parse Open Bets';b.setAttribute('data-dlo-ui','1');
 b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();syncBets(b)});document.documentElement.appendChild(b);
}
install();new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true});
})();
