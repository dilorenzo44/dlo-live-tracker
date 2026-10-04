const $=x=>document.getElementById(x); let current=[]; const parse=(t,o=[])=>DLOParser.parse(t,o);
function preview(a){current=a;$('preview').innerHTML='';a.forEach((b,idx)=>{let d=document.createElement('div');d.className='item';d.innerHTML='<div class="itemrow"><div class="itemtext"><b></b><small></small></div><select><option value="inherit">Default</option><option value="milestones">Milestones</option><option value="every">Every change</option><option value="off">Off</option></select></div>';d.querySelector('b').textContent=(b.player||b.selection)+' — '+b.prop;d.querySelector('small').textContent=[b.odds,(b.matchTeams||[]).join(' vs ')].filter(Boolean).join(' · ');let s=d.querySelector('select');s.value=b.notifyMode||'inherit';s.onchange=()=>{current[idx].notifyMode=s.value;chrome.storage.local.set({bets:current})};$('preview').appendChild(d)})}
chrome.storage.local.get({rawText:'',bets:[],enabled:true,notifyMode:'milestones'},async d=>{let clean=(d.bets||[]).filter(b=>DLOParser.isValidBet?.(b));if(clean.length!==(d.bets||[]).length)await chrome.storage.local.set({bets:clean,schemaVersion:392});$('raw').value=d.rawText||'';$('enabled').checked=d.enabled!==false;$('notify').value=d.notifyMode||'milestones';preview(clean)});
$('enabled').onchange=()=>chrome.storage.local.set({enabled:$('enabled').checked});$('notify').onchange=()=>chrome.storage.local.set({notifyMode:$('notify').value});$('raw').oninput=()=>preview(parse($('raw').value,current));
async function saveText(text,source){let before=current||[],found=parse(text,before);if(!found.length){$('status').textContent='No supported bets found on this page.';$('status').className='badStatus';return}let fp=b=>DLOParser.fingerprint?DLOParser.fingerprint(b):JSON.stringify([b.groupId,b.player||b.selection,b.prop,b.matchTeams]),merged=new Map(before.map(b=>[fp(b),b])),added=0;for(const b of found){let f=fp(b);if(!merged.has(f))added++;merged.set(f,{...(merged.get(f)||{}),...b})}let bets=[...merged.values()];await chrome.storage.local.set({rawText:text,bets,enabled:$('enabled').checked,notifyMode:$('notify').value,lastImportSource:source,lastImportAt:Date.now(),schemaVersion:392});current=bets;preview(bets);$('raw').value=text;$('status').className='';$('status').textContent=`✓ ${bets.length} tracked · ${added} new`;}
async function dloDiagnosticCollector(){
  const clean=s=>String(s||'').replace(/\r/g,'').trim();
  const blocks=[];
  const seenText=new Set();
  const add=t=>{t=clean(t);if(t&&!seenText.has(t)){seenText.add(t);blocks.push(t)}};

  // Read what FanDuel already has in memory. Do NOT scroll or move the page.
  // Besides visible DOM, React keeps the complete My Bets result in component/query state
  // even when only a couple ticket cards are mounted by the virtualized list.
  try{
    const clone=document.body?.cloneNode(true);
    if(clone){clone.querySelectorAll?.('.dlo-ui,[data-dlo-ui="true"],#dlo-page-import,#dlo-update-stack,#dlo-all-bets').forEach(x=>x.remove());add(clone.innerText||clone.textContent||'')}
  }catch{}
  try{document.querySelectorAll('*').forEach(el=>{if(el.shadowRoot)add(el.shadowRoot.innerText||el.shadowRoot.textContent||'')})}catch{}

  const seenObj=new WeakSet(); let nodes=0;
  const usefulKey=k=>/bet|wager|stake|selection|market|leg|event|fixture|odds|price|open|ticket|sportsbook/i.test(String(k||''));
  const walk=(v,depth=0,path='')=>{
    if(v==null||depth>9||nodes>70000)return;
    const ty=typeof v;
    if(ty==='string'){if(v.length>2&&(/BET ID|TOTAL WAGER|TO WIN|touchdown|reception|yards?|moneyline|spread|\+\d{2,}|-\d{2,}/i.test(v)||usefulKey(path)))add(v);return}
    if(ty!=='object'&&ty!=='function')return;
    if(seenObj.has(v))return;seenObj.add(v);nodes++;
    let keys=[];try{keys=Object.keys(v)}catch{return}
    // When an object looks bet-related, add a flattened primitive snapshot. This gives
    // the parser the ticket data without depending on the two cards currently mounted.
    if(keys.some(usefulKey)){
      const vals=[];
      for(const k of keys){let x;try{x=v[k]}catch{continue}if(x==null)continue;if(['string','number','boolean'].includes(typeof x)){let z=String(x);if(z.length&&z.length<500)vals.push(`${k}: ${z}`)}}
      if(vals.length>=2)add(vals.join('\n'));
    }
    for(const k of keys){if(/^__react(Fiber|Props|Container)|memoizedProps|memoizedState|state|data|result|query|cache|children/i.test(k)||usefulKey(k)){let x;try{x=v[k]}catch{continue}walk(x,depth+1,path+'.'+k)}}
  };
  try{
    for(const el of document.querySelectorAll('*')){
      for(const k of Object.getOwnPropertyNames(el))if(/^__react(?:Fiber|Props|Container)/.test(k))walk(el[k],0,k);
    }
  }catch{}
  try{
    for(const sc of document.scripts){const t=sc.textContent||'';if(t&&t.length<3000000&&/bet|wager|sportsbook/i.test(t))add(t)}
  }catch{}
  return blocks.join('\n\n--- DLO MEMORY BLOCK ---\n\n');
}
async function readFanDuelRendered(tabId){
  const frames=await chrome.scripting.executeScript({target:{tabId,allFrames:true},func:dloDiagnosticCollector});
  const seen=new Set(),parts=[];
  for(const r of frames||[]){let t=String(r?.result||'').trim();if(t&&!seen.has(t)){seen.add(t);parts.push(t)}}
  return parts.join('\n\n--- DLO FRAME ---\n\n');
}
async function currentFanDuelTab(){
  let [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  let u;try{u=new URL(tab?.url||'')}catch{}
  if(!u||!/(^|\.)fanduel\.com$/i.test(u.hostname)||!/\/my-bets/i.test(u.pathname))throw Error('Go to FanDuel → My Bets → Open, then press Sync Open Bets.');
  if(!tab?.id)throw Error('Could not read this FanDuel tab.');
  if(/^(settled|history)$/i.test(u.searchParams.get('tab')||''))throw Error('You are not on Open. Switch to Open yourself, then sync.');
  return tab;
}
async function getStoredRead(){let d=await chrome.storage.local.get({lastOpenReadText:'',rawText:''});return d.lastOpenReadText||d.rawText||''}
async function syncCopiedBets(statusId='status'){
  const out=$(statusId);out.className='';out.textContent='Reading copied FanDuel page…';
  try{
    const text=String(await navigator.clipboard.readText()||'').replace(/\r/g,'').trim();
    if(!text)throw Error('Clipboard is empty. On FanDuel press Ctrl+A, Ctrl+C, then click Sync Bets.');
    if(!/BET ID:|TOTAL WAGER|TOTAL PAYOUT|Cash out|Reuse selection|My Bets/i.test(text))throw Error('That does not look like copied FanDuel My Bets text. Press Ctrl+A, Ctrl+C on My Bets → Open first.');
    const store=await chrome.storage.local.get({bets:[]});
    const old=(store.bets||[]).filter(b=>DLOParser.isValidBet?.(b));
    const found=(DLOParser.parseOpen?.(text,old)||DLOParser.parse(text,old)||[]).filter(b=>DLOParser.isValidBet?.(b));
    const noOpen=/no\s+(?:open|active)\s+bets|you\s+(?:do not|don['’]t)\s+have\s+any\s+(?:open|active)\s+bets/i.test(text);
    if(!found.length&&!noOpen)throw Error(`Copied ${text.length.toLocaleString()} characters, but no supported open bets were found. Nothing was erased.`);
    const bets=noOpen?[]:found;
    await chrome.storage.local.set({rawText:text,lastOpenReadText:text,lastOpenReadAt:Date.now(),bets,lastImportSource:'FanDuel copied page',lastImportAt:Date.now(),schemaVersion:397});
    current=bets;preview(current);$('raw').value=text;
    const tickets=new Set(bets.map(b=>b.groupId||DLOParser.fingerprint?.(b)).filter(Boolean));
    out.className='';out.textContent=noOpen?'✓ Open has no bets.':`✓ Synced ${tickets.size} ticket${tickets.size===1?'':'s'} · ${bets.length} leg${bets.length===1?'':'s'}`;
    return {tickets:tickets.size,legs:bets.length};
  }catch(e){out.className='badStatus';out.textContent=String(e?.message||e||'Sync failed');throw e}
}
$('pageImport').onclick=()=>syncCopiedBets('status').catch(()=>{});
$('showRead').onclick=async()=>{let text=await getStoredRead();$('raw').value=`--- FAN DUEL READ ---\n${text}\n--- END FAN DUEL READ ---`;document.querySelector('details:last-of-type').open=true;$('status').className='';$('status').textContent=text?`Showing ${text.length.toLocaleString()} captured characters below.`:'No FanDuel read captured yet. Press Sync Open Bets first.'};
$('copyRead').onclick=async()=>{let text=await getStoredRead();if(!text){$('status').className='badStatus';$('status').textContent='No FanDuel read captured yet. Press Sync Open Bets first.';return}let wrapped=`--- FAN DUEL READ ---\n${text}\n--- END FAN DUEL READ ---`;try{await navigator.clipboard.writeText(wrapped);$('status').className='';$('status').textContent=`✓ Copied ${text.length.toLocaleString()} FanDuel characters.`}catch{$('raw').value=wrapped;document.querySelector('details:last-of-type').open=true;$('raw').select();$('status').textContent='Read shown below. Press Ctrl+C to copy.'}};
$('import').onclick=()=>saveText($('raw').value,'pasted text');$('clear').onclick=async()=>{$('raw').value='';current=[];await chrome.storage.local.set({rawText:'',bets:[]});$('status').className='';$('status').textContent='Cleared.';preview([])};

async function sendTestUpdate(direction){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id){$('status').className='badStatus';$('status').textContent='No active sports tab found.';return}
  try{
    await chrome.tabs.sendMessage(tab.id,{type:'DLO_TEST_UPDATE',direction});
    $('status').className='';$('status').textContent=`${direction==='positive'?'✓ Good':'✓ Bad'} test update sent.`;
  }catch(e){$('status').className='badStatus';$('status').textContent='Refresh the sports page once, then test again.'}
}
$('testGood').onclick=()=>sendTestUpdate('positive');
$('testBad').onclick=()=>sendTestUpdate('negative');
