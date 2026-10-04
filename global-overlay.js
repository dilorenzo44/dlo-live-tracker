(()=>{
  if(window.__dloGlobalOverlay0542)return; window.__dloGlobalOverlay0542=true;
  const ROOT='dlo-global-overlay'; let root=null, lastIds=new Set(), initialized=false, toastTimer=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=u=>u?.source==='fantasy'||u?.prop==='Fantasy'?'🏈':'🧾';
  const alive=()=>!!(globalThis.chrome?.runtime?.id&&chrome.storage?.local);
  async function getLocal(defaults){if(!alive())return defaults;try{return await chrome.storage.local.get(defaults)}catch{return defaults}}
  async function setLocal(values){if(!alive())return false;try{await chrome.storage.local.set(values);return true}catch{return false}}
  function ensure(){
    if(root?.isConnected)return root;
    root=document.createElement('div'); root.id=ROOT;
    root.innerHTML='<div class="dlo-global-toast" hidden></div><div class="dlo-global-dock"><button class="dlo-global-updates">Updates (0)</button><button class="dlo-global-min" title="Minimize tracker">−</button></div><div class="dlo-global-panel" hidden><div class="dlo-global-head"><b>UPDATES</b><button class="dlo-global-close">×</button></div><div class="dlo-global-list"></div></div><button class="dlo-global-restore" hidden title="Restore DLo Tracker">DLo</button>';
    document.documentElement.appendChild(root);
    root.querySelector('.dlo-global-min').onclick=()=>{root.classList.add('dlo-global-minimized');setLocal({dloGlobalMinimized:true})};
    root.querySelector('.dlo-global-restore').onclick=()=>{root.classList.remove('dlo-global-minimized');setLocal({dloGlobalMinimized:false})};
    root.querySelector('.dlo-global-close').onclick=()=>root.querySelector('.dlo-global-panel').hidden=true;
    root.querySelector('.dlo-global-updates').onclick=async()=>{const p=root.querySelector('.dlo-global-panel');p.hidden=!p.hidden;if(!p.hidden){const d=await getLocal({dloUpdateHistory:[]});const h=(d.dloUpdateHistory||[]).map(x=>x.checked?x:{...x,checked:true});await setLocal({dloUpdateHistory:h});render(h)}};
    getLocal({dloGlobalMinimized:false,appTheme:'espn'}).then(d=>{if(!root?.isConnected)return;root.dataset.theme=d.appTheme||'espn';root.classList.toggle('dlo-global-minimized',!!d.dloGlobalMinimized)});
    return root;
  }
  function render(hist){
    ensure(); const h=Array.isArray(hist)?hist:[], unread=h.filter(x=>!x.checked);
    root.querySelector('.dlo-global-updates').textContent=`Updates (${unread.length})`;
    const list=root.querySelector('.dlo-global-list');
    list.innerHTML=h.length?h.slice(-20).reverse().map(u=>`<div class="dlo-global-row ${u.direction==='negative'?'bad':'good'}"><b>${icon(u)} ${esc(u.who||'Update')}</b><span>${esc(u.detail||'')}</span><small>${esc([u.prop,u.stage].filter(Boolean).join(' · '))}</small></div>`).join(''):'<div class="dlo-global-empty">NO NEW UPDATES</div>';
    root.classList.toggle('has-good',unread.some(x=>x.direction!=='negative')); root.classList.toggle('has-bad',unread.some(x=>x.direction==='negative'));
  }
  function pop(u){
    ensure(); const t=root.querySelector('.dlo-global-toast'); clearTimeout(toastTimer);
    t.className='dlo-global-toast '+(u.direction==='negative'?'bad':'good');
    t.innerHTML=`<b>${icon(u)} ${esc(u.who||'Update')}</b><span>${esc(u.detail||'')}</span><small>${esc([u.subdetail,u.prop,u.stage].filter(Boolean).join(' · '))}</small>`;
    t.hidden=false; requestAnimationFrame(()=>t.classList.add('show')); toastTimer=setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.hidden=true,160)},5000);
  }
  ensure();
  getLocal({dloUpdateHistory:[]}).then(d=>{const h=d.dloUpdateHistory||[];lastIds=new Set(h.map(x=>x.id));initialized=true;render(h)});
  if(alive()) chrome.storage.onChanged.addListener((c,a)=>{
    if(a!=='local')return;
    if(c.appTheme){ensure().dataset.theme=c.appTheme.newValue||'espn'}
    if(c.dloGlobalMinimized){ensure().classList.toggle('dlo-global-minimized',!!c.dloGlobalMinimized.newValue)}
    if(c.dloUpdateHistory){const h=Array.isArray(c.dloUpdateHistory.newValue)?c.dloUpdateHistory.newValue:[];if(initialized){const fresh=h.filter(x=>x?.id&&!lastIds.has(x.id));if(fresh.length)pop(fresh[fresh.length-1])}lastIds=new Set(h.map(x=>x.id));initialized=true;render(h)}
  });
})();
