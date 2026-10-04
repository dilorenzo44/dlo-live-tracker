(()=>{if(window.__dloFantasyCombined0545)return;window.__dloFantasyCombined0521=true;
const S={fantasyEnabled:true,enabled:true,showOpponentTotal:true,showOpponentPlayers:true,showBenchPlayers:false,showFantasyTeamIcons:true,opponentUpdates:true,fantasyNotifyMode:'every',fantasyMatchup:null,fantasyMyTeamName:''};
let state={...S},panel,button,medianButton,medianPanel,updates=0,timer,hoverCloseTimer=null,medianView='current';
const num=t=>{let n=parseFloat(String(t??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null};
const clean=t=>String(t||'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isFinite(v)?v.toFixed(1):'0.0';
const teamAbbr=t=>clean(t).toLowerCase().replace(/[^a-z0-9]/g,'');
const teamIcon=t=>{const a=teamAbbr(t);return a?`<img class="dlf-team-icon" src="https://a.espncdn.com/i/teamlogos/nfl/500/${esc(a)}.png" alt="" aria-hidden="true">`:''};
function isESPNFantasy(){return location.hostname==='fantasy.espn.com'&&/\/football\/fantasycast/i.test(location.pathname)}
function isESPNScoreboardPage(){return location.hostname==='fantasy.espn.com'&&/\/football\/league\/scoreboard/i.test(location.pathname)}
function isSleeperFantasy(){return /(^|\.)sleeper\.com$/i.test(location.hostname)&&/\/leagues\/[^/]+\/matchup/i.test(location.pathname)}
function isFantasy(){return isESPNFantasy()||isSleeperFantasy()}
function isFantasyDataPage(){return isFantasy()||isESPNScoreboardPage()}
function orientMatchup(raw){
 const wanted=clean(state.fantasyMyTeamName).toLowerCase();
 if(!wanted)return raw;
 const left=clean(raw.myTeam).toLowerCase(),right=clean(raw.oppTeam).toLowerCase();
 if(left===wanted)return raw;
 if(right!==wanted)throw Error('Your selected fantasy team is not in the matchup currently displayed.');
 return {...raw,myTeam:raw.oppTeam,oppTeam:raw.myTeam,myScore:raw.oppScore,oppScore:raw.myScore,myProjected:raw.oppProjected,oppProjected:raw.myProjected,players:(raw.players||[]).map(p=>({...p,side:p.side==='me'?'opp':'me'}))};
}
function parseESPN(){
 const table=document.querySelector('.matchupPointsTable table');if(!table)throw Error('ESPN FantasyCast matchup table is not loaded yet.');
 const headers=[...document.querySelectorAll('.h2h-matchup-header .teamName')].map(x=>clean(x.textContent));
 const headerScores=[...document.querySelectorAll('.h2h-matchup-header .team-score h2')].map(x=>num(x.textContent));
 const teamHeaders=[...document.querySelectorAll('.h2h-matchup-header .team-header')];
 const projFromHeader=h=>{for(const lab of h?.querySelectorAll('.statusLabel')||[]){if(/proj\s*total/i.test(clean(lab.textContent))){const v=num(lab.querySelector('.statusValue')?.textContent||lab.textContent);if(v!=null)return v}}return null};
 const myProj=projFromHeader(teamHeaders[0]),oppProj=projFromHeader(teamHeaders[1]);const players=[];
 for(const tr of table.querySelectorAll('tbody tr')){const slot=clean(tr.querySelector('.slotColumn')?.textContent).toUpperCase();if(!slot||slot==='TOTAL')continue;const cells=[...tr.querySelectorAll(':scope > td')];if(cells.length<5)continue;
  const side=(cell,pointsCell,which)=>{const p=cell?.querySelector('.player__column');if(!p)return;const name=clean(p.getAttribute('title')||p.querySelector('.player-column__athlete')?.getAttribute('title')||p.querySelector('.player-column__athlete')?.textContent);if(!name)return;players.push({name,side:which,slot,starter:!['BENCH','IR'].includes(slot),nflTeam:clean(p.querySelector('.playerinfo__playerteam')?.textContent),pos:clean(p.querySelector('.playerinfo__playerpos')?.textContent),points:num(pointsCell?.textContent)});};
  side(cells[0],cells[1],'me');side(cells[4],cells[3],'opp');}
 const totalRow=[...table.querySelectorAll('tbody tr')].find(r=>r.classList.contains('total-row'));const totalCells=totalRow?[...totalRow.querySelectorAll('.points-column')]:[];
 return orientMatchup({source:'espn',myTeam:headers[0]||'My Team',oppTeam:headers[1]||'Opponent',myScore:num(totalCells[0]?.textContent)??headerScores[0],oppScore:num(totalCells[1]?.textContent)??headerScores[1],myProjected:myProj,oppProjected:oppProj,players,syncedAt:Date.now(),url:location.href});
}
function sleeperPlayer(item,side,slot,starter){
 if(!item)return null;const name=clean(item.querySelector('.player-name > div:first-child')?.textContent);if(!name)return null;
 const posTeam=clean(item.querySelector('.player-pos')?.textContent);const parts=posTeam.split(/\s*-\s*/);const score=num(item.querySelector('.header-row .player-scoring .score')?.textContent);
 return {name,side,slot:clean(slot).toUpperCase()||parts[0]||'',starter,nflTeam:parts[1]||'',pos:parts[0]||'',points:score};
}
function parseSleeper(){
 const head=document.querySelector('.matchup-header-container .matchup-header');if(!head)throw Error('Sleeper matchup is not loaded yet.');
 const owners=[...head.querySelectorAll('.matchup-owner-item')];if(owners.length<2)throw Error('Sleeper matchup teams are not loaded yet.');
 const team=o=>clean(o.querySelector('.meta .name')?.textContent||o.querySelector('.meta .team-name')?.textContent);
 const score=o=>num(o.querySelector('.owner-container .roster-score-and-projection-matchup .score')?.textContent);
 const projection=o=>num(o.querySelector('.owner-container .roster-score-and-projection-matchup .projection')?.textContent||o.querySelector('.roster-score-and-projection-matchup .projection')?.textContent);
 const players=[];
 for(const section of document.querySelectorAll('.player-section')){const starter=!/^bench\b/i.test(clean(section.textContent));for(const row of section.querySelectorAll('.matchup-player-row-container')){const slot=clean(row.querySelector('.player-matchup-body-row > .position')?.textContent)||(starter?'START':'BN');const items=[...row.querySelectorAll('.player-matchup-body-row > .matchup-player-item')];const a=sleeperPlayer(items[0],'me',starter?slot:'BN',starter),b=sleeperPlayer(items[1],'opp',starter?slot:'BN',starter);if(a)players.push(a);if(b)players.push(b)}}
 return orientMatchup({source:'sleeper',myTeam:team(owners[0])||'My Team',oppTeam:team(owners[1])||'Opponent',myScore:score(owners[0]),oppScore:score(owners[1]),myProjected:projection(owners[0]),oppProjected:projection(owners[1]),players,syncedAt:Date.now(),url:location.href});
}
function parsePage(){if(isESPNFantasy())return parseESPN();if(isSleeperFantasy())return parseSleeper();throw Error('Open an ESPN FantasyCast or Sleeper matchup page first.');}

function host(){return document.getElementById('dlo-update-stack')}
function closeFantasy(){clearTimeout(hoverCloseTimer);hoverCloseTimer=null;host()?.classList.remove('dlf-fantasy-open')}
function closeMedian(){host()?.classList.remove('dlf-median-open')}
function scheduleClose(){clearTimeout(hoverCloseTimer);hoverCloseTimer=setTimeout(closeFantasy,1000)}
function positionSyncButton(){
 const stack=host(),btn=stack?.querySelector(':scope > .dlf-sync-btn');if(!stack||!btn)return;
 const dock=stack.querySelector('.dlo-update-bar');let top=dock?.getBoundingClientRect().top??(innerHeight-70);
 const candidates=[stack.querySelector('.dlf-fantasy-panel'),stack.querySelector('.dlf-standings-panel'),stack.querySelector('.dlo-update-panel'),document.getElementById('dlo-all-bets')];
 for(const el of candidates){if(!el)continue;const cs=getComputedStyle(el),r=el.getBoundingClientRect();if(cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>20&&r.height>20)top=Math.min(top,r.top)}
 const bottom=Math.max(64,Math.round(innerHeight-top+10));btn.style.setProperty('bottom',bottom+'px','important');
}
function queueSyncPosition(){requestAnimationFrame(()=>requestAnimationFrame(positionSyncButton))}
function ensureCombined(){
 const stack=host();if(!stack)return false;const bar=stack.querySelector('.dlo-update-bar');if(!bar)return false;
 let syncBtn=stack.querySelector(':scope > .dlf-sync-btn');if(!syncBtn){bar.querySelectorAll('.dlf-sync-btn').forEach(x=>x.remove());syncBtn=document.createElement('button');syncBtn.type='button';syncBtn.className='dlf-sync-btn';syncBtn.title='Sync fantasy players now';syncBtn.setAttribute('aria-label','Sync fantasy');syncBtn.textContent='↻';stack.appendChild(syncBtn);syncBtn.addEventListener('click',e=>{e.stopPropagation();if(isFantasyDataPage())sync(false).then(()=>{syncBtn.textContent='✓';setTimeout(()=>syncBtn.textContent='↻',900)}).catch(()=>{syncBtn.textContent='!';setTimeout(()=>syncBtn.textContent='↻',1200)})})}
 button=bar.querySelector('.dlf-combined-btn');if(!button){button=document.createElement('button');button.type='button';button.className='dlf-combined-btn';button.title='Fantasy matchup';button.innerHTML='🏈 <span>Fantasy</span>';bar.appendChild(button);
  button.addEventListener('click',e=>{e.stopPropagation();clearTimeout(hoverCloseTimer);const opening=!stack.classList.contains('dlf-fantasy-open');closeMedian();if(opening){document.getElementById('dlo-all-bets')?.remove();stack.classList.add('dlo-collapsed');stack.classList.add('dlf-fantasy-open')}else{stack.classList.remove('dlf-fantasy-open')}queueSyncPosition()});
 }
 medianButton=bar.querySelector('.dlf-standings-btn');if(!medianButton){medianButton=document.createElement('button');medianButton.type='button';medianButton.className='dlf-standings-btn';medianButton.title='League median standings';medianButton.innerHTML='📊 <span>Standings</span>';bar.appendChild(medianButton);medianButton.addEventListener('click',e=>{e.stopPropagation();const opening=!stack.classList.contains('dlf-median-open');closeFantasy();document.getElementById('dlo-all-bets')?.remove();stack.classList.add('dlo-collapsed');stack.classList.toggle('dlf-median-open',opening);if(opening){renderMedian(state.fantasyMatchup);if(isESPNScoreboardPage())sync(true)}queueSyncPosition()})}
 medianPanel=stack.querySelector('.dlf-standings-panel');if(!medianPanel){medianPanel=document.createElement('div');medianPanel.className='dlf-standings-panel';medianPanel.innerHTML='<div class="dlf-median"></div>';stack.appendChild(medianPanel)}
 panel=stack.querySelector('.dlf-fantasy-panel');if(!panel){panel=document.createElement('div');panel.className='dlf-fantasy-panel';panel.innerHTML='<div class="dlf-score"></div><div class="dlf-controls"><label class="dlf-team-choice"><span>My team</span><select class="dlf-my-team"><option value="">Choose team…</option></select></label><label><input class="dlf-bench-toggle" type="checkbox"> Bench</label></div><div class="dlf-list"></div>';panel.querySelector('.dlf-bench-toggle').addEventListener('change',e=>chrome.storage.local.set({showBenchPlayers:e.target.checked}));panel.querySelector('.dlf-my-team').addEventListener('change',async e=>{const chosen=clean(e.target.value);state.fantasyMyTeamName=chosen;await chrome.storage.local.set({fantasyMyTeamName:chosen});const current=state.fantasyMatchup;if(current&&chosen){const want=chosen.toLowerCase(),left=clean(current.myTeam).toLowerCase(),right=clean(current.oppTeam).toLowerCase();if(right===want&&left!==want){state.fantasyMatchup={...current,myTeam:current.oppTeam,oppTeam:current.myTeam,myScore:current.oppScore,oppScore:current.myScore,myProjected:current.oppProjected,oppProjected:current.myProjected,players:(current.players||[]).map(p=>({...p,side:p.side==='me'?'opp':'me'}))};await chrome.storage.local.set({fantasyMatchup:state.fantasyMatchup});render()}else if(left===want){render()}}if(isFantasyDataPage())sync(true)});stack.appendChild(panel);
 }
 if(!stack.dataset.dlfBound){stack.dataset.dlfBound='1';stack.addEventListener('click',e=>{if(e.target.closest('.dlo-update-all,.dlo-all-bets-btn')){closeFantasy();closeMedian()}},true)}
 stack.classList.toggle('dlf-fantasy-disabled',state.fantasyEnabled===false);stack.classList.toggle('dlf-bets-disabled',state.enabled===false);stack.classList.toggle('dlf-all-disabled',state.fantasyEnabled===false&&state.enabled===false);
 queueSyncPosition();return true;
}

function parseESPNScoreboardDocument(doc=document){
 const teams=[];
 for(const matchup of doc.querySelectorAll('.matchup-score')){
  const items=[...matchup.querySelectorAll('.ScoreboardScoreCell__Competitors .ScoreboardScoreCell__Item')];
  const statuses=[...matchup.querySelectorAll('.matchupPlayerStatuses .teamPlayerStatus')];
  items.slice(0,2).forEach((item,i)=>{
   const name=clean(item.querySelector('.ScoreCell__TeamName')?.textContent),current=num(item.querySelector('.ScoreCell__Score')?.textContent);
   let projected=null;for(const lab of statuses[i]?.querySelectorAll('.statusLabel')||[]){if(/proj\s*total/i.test(clean(lab.textContent))){projected=num(lab.querySelector('.statusValue')?.textContent||lab.textContent);break}}
   if(name&&current!=null)teams.push({name,current,projected});
  });
 }
 const seen=new Set();return teams.filter(t=>{const k=t.name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true});
}
function parseESPNScoreboard(){return parseESPNScoreboardDocument(document)}
function espnTeamName(t){return clean(t?.name||[t?.location,t?.nickname].filter(Boolean).join(' ')||t?.abbrev||('Team '+t?.id))}
function parseESPNLeagueAPI(data){
 const teams=new Map((data?.teams||[]).map(t=>[Number(t.id),espnTeamName(t)]));
 const period=Number(data?.scoringPeriodId||data?.status?.currentMatchupPeriod||data?.status?.currentScoringPeriod||0);
 let schedule=Array.isArray(data?.schedule)?data.schedule:[];
 if(period)schedule=schedule.filter(g=>Number(g?.matchupPeriodId||period)===period);
 const rows=[];
 for(const g of schedule){for(const side of [g?.away,g?.home]){if(!side||side.teamId==null)continue;const name=teams.get(Number(side.teamId));if(!name)continue;const current=num(side.totalPointsLive??side.totalPoints);const projected=num(side.totalProjectedPointsLive??side.totalProjectedPoints);if(current!=null)rows.push({teamId:Number(side.teamId),name,current,projected});}}
 const seen=new Set();return rows.filter(t=>{const k=t.name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true});
}
let dloLeagueCache={at:0,rows:null};
async function loadESPNLeagueProjections(base){
 if(dloLeagueCache.rows&&Date.now()-dloLeagueCache.at<15000)return dloLeagueCache.rows;
 const fallback=Array.isArray(base)?base:[];
 try{
  const leagueId=new URL(location.href).searchParams.get('leagueId');if(!leagueId)return fallback;
  if(isESPNScoreboardPage()){const direct=parseESPNScoreboardDocument(document);if(direct.some(x=>Number.isFinite(x.projected)))return direct}
  const season=new Date().getFullYear();
  const qs='view=mTeam&view=mScoreboard&view=mBoxscore&view=mLiveScoring';
  const url=`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}?${qs}`;
  const data=await fetch(url,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}).then(async r=>{if(!r.ok)throw Error('ESPN fantasy API '+r.status);const ct=r.headers.get('content-type')||'';if(!/json/i.test(ct))throw Error('ESPN fantasy API did not return JSON');return r.json()});
  const rows=parseESPNLeagueAPI(data);if(rows.length&&rows.some(x=>Number.isFinite(x.projected)))return rows;
 }catch(_){ }
 if(isESPNScoreboardPage()){const direct=parseESPNScoreboardDocument(document);if(direct.length)return direct}
 return fallback;
}
function renderMedian(m){
 const box=medianPanel?.querySelector('.dlf-median');if(!box)return;const rows=m?.leagueStandings||[];box.style.display='block';if(!rows.length){box.innerHTML='<div class="dlf-median-head"><b>MEDIAN STANDINGS</b></div><div class="dlf-median-note">Standings are loading from ESPN. Press ↻ to retry.</div>';return}
 const key=medianView==='projected'?'projected':'current',sorted=[...rows].filter(x=>Number.isFinite(x[key])).sort((a,b)=>b[key]-a[key]);
 const projectedReady=rows.every(x=>Number.isFinite(x.projected));
 box.innerHTML=`<div class="dlf-median-head"><b>MEDIAN STANDINGS</b><div class="dlf-median-toggle"><button data-view="current" class="${medianView==='current'?'on':''}">Current</button><button data-view="projected" class="${medianView==='projected'?'on':''}" ${projectedReady?'':'title="Projected totals are still loading"'}>Projected</button></div></div>${medianView==='projected'&&!projectedReady?'<div class="dlf-median-note">Projected totals are still loading from ESPN. Press ↻ to retry.</div>':''}<div class="dlf-median-rows">${sorted.map((t,i)=>`<div class="dlf-median-row ${i===6?'cut':''} ${t.name===m.myTeam?'mine':''}"><span class="rank">${i+1}</span><span class="name">${esc(t.name)}</span><b>${fmt(t[key])}</b><em>${i<6?'W':'L'}</em></div>`).join('')}</div>`;
 box.querySelectorAll('.dlf-median-toggle button').forEach(b=>b.addEventListener('click',()=>{medianView=b.dataset.view;renderMedian(m)}));
}

function isPlayerLive(p){return p?.gameLive===true}
function render(){
 const stack=host();
 if(!stack||!panel||!panel.isConnected||!button||!button.isConnected)return;
 stack.classList.toggle('dlf-fantasy-disabled',state.fantasyEnabled===false);
 stack.classList.toggle('dlf-bets-disabled',state.enabled===false);
 stack.classList.toggle('dlf-all-disabled',state.fantasyEnabled===false&&state.enabled===false);
 const score=panel.querySelector('.dlf-score');
 const list=panel.querySelector('.dlf-list');
 if(!score||!list)return;
 const m=state.fantasyMatchup||null;
 const benchToggle=panel.querySelector('.dlf-bench-toggle');
 if(benchToggle)benchToggle.checked=state.showBenchPlayers===true;
 const teamSelect=panel.querySelector('.dlf-my-team');
 if(teamSelect){
  const standings=Array.isArray(m?.leagueStandings)?m.leagueStandings:[];
  const names=[...new Set(standings.map(x=>clean(x?.name)).filter(Boolean))];
  const current=clean(state.fantasyMyTeamName);
  teamSelect.innerHTML='<option value="">Choose team…</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  if(names.includes(current))teamSelect.value=current;else teamSelect.value='';
 }
 if(!m){
  score.innerHTML='<div class="dlf-nosync">Fantasy matchup not synced</div>';
  list.innerHTML='<div class="dlf-hint">Open ESPN FantasyCast or Sleeper → Sync Fantasy</div>';
  renderMedian(null);
  return;
 }
 renderMedian(m);
 const myProj=Number.isFinite(m.myProjected)?m.myProjected:null,oppProj=Number.isFinite(m.oppProjected)?m.oppProjected:null;
 const projClass=(mine,theirs)=>!Number.isFinite(mine)||!Number.isFinite(theirs)?'':mine>theirs?'dlf-proj-win':mine<theirs?'dlf-proj-loss':'dlf-proj-tie';
 score.innerHTML=`<div class="dlf-side"><div class="team">${esc(m.myTeam)}</div><div class="dlf-scoreline"><span class="pts">${fmt(m.myScore)}</span><span class="proj ${projClass(myProj,oppProj)}">${myProj!=null?fmt(myProj):'--'}</span></div></div><b class="dlf-vs">–</b><div class="dlf-side dlf-right"><div class="team">${esc(m.oppTeam)}</div><div class="dlf-scoreline"><span class="proj ${projClass(oppProj,myProj)}">${state.showOpponentTotal?(oppProj!=null?fmt(oppProj):'--'):'•••'}</span><span class="pts">${state.showOpponentTotal?fmt(m.oppScore):'•••'}</span></div></div>`;
 const players=Array.isArray(m.players)?m.players:[];
 const shown=players.filter(p=>p&&(p.starter||state.showBenchPlayers===true)&&isPlayerLive(p));
 const row=p=>`<div class="dlf-mini ${p.side==='opp'?'opp':''} ${p.starter?'':'bench'}"><span class="dlf-player"><span class="dlf-player-name">${esc(p.name)}</span><small>${state.showFantasyTeamIcons?`<button type="button" class="dlf-team-stat-icon" data-player="${esc(p.name)}" data-team="${esc(p.nflTeam||'')}" aria-label="Show ${esc(p.name)} stats">${teamIcon(p.nflTeam)}</button>`:''}<span>${esc(p.nflTeam||'')} ${esc(p.pos||'')}</span></small></span><b>${p.side==='opp'&&!state.showOpponentPlayers?'•••':fmt(Number.isFinite(p.points)?p.points:0)}</b></div>`;
 const mine=shown.filter(p=>p.side==='me'),opp=shown.filter(p=>p.side==='opp');
 list.innerHTML=(mine.length||opp.length)?`<div class="dlf-mini-title">MY PLAYERS${state.showBenchPlayers?' · BENCH ON':''}</div>${mine.map(row).join('')}<div class="dlf-mini-title dlf-opp-title">OPPONENT${state.showBenchPlayers?' · BENCH ON':''}</div>${opp.map(row).join('')}`:'<div class="dlf-hint">Synced · no live players</div>';
 bindTeamStatHovers(list);
 renderFantasyPageMarkers();
}

let statTip=null,statHoverToken=0;
function hideStatTip(){statHoverToken++;statTip?.remove();statTip=null}
function showStatTip(anchor,html){hideStatTip();statTip=document.createElement('div');statTip.className='dlf-player-stat-tip';statTip.innerHTML=html;document.documentElement.appendChild(statTip);const r=anchor.getBoundingClientRect(),w=statTip.offsetWidth||210;let left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2)),top=Math.max(8,r.top-(statTip.offsetHeight||70)-7);statTip.style.left=left+'px';statTip.style.top=top+'px'}
function bindTeamStatHovers(root){for(const el of root.querySelectorAll('.dlf-team-stat-icon')){el.addEventListener('mouseenter',async()=>{const token=++statHoverToken,name=el.dataset.player||'',team=el.dataset.team||'';showStatTip(el,`<b>${esc(name)}</b><span>${esc(team)} · Loading live stats…</span>`);try{const r=await chrome.runtime.sendMessage({type:'DLO_NFL_PLAYER_STATS',player:name,team});if(token!==statHoverToken||!el.matches(':hover'))return;const lines=Array.isArray(r?.stats)?r.stats:[];showStatTip(el,`<b>${esc(name)}</b><span>${esc(team)}${r?.status?' · '+esc(r.status):''}</span>${lines.length?`<div>${lines.map(x=>`<span><strong>${esc(x.label)}</strong> ${esc(x.value)}</span>`).join('')}</div>`:'<em>No live stats yet</em>'}`)}catch(_){if(token===statHoverToken)showStatTip(el,`<b>${esc(name)}</b><em>Stats unavailable</em>`)}});el.addEventListener('mouseleave',()=>setTimeout(()=>{if(!el.matches(':hover')&&!statTip?.matches(':hover'))hideStatTip()},100))}}


// Fantasy roster markers on ESPN NFL scoreboards. These are intentionally refreshed only
// when fantasy state refreshes / navigation changes -- never with a whole-page observer.
const dlfNflTeams={
 ARI:['Arizona Cardinals','Cardinals'],ATL:['Atlanta Falcons','Falcons'],BAL:['Baltimore Ravens','Ravens'],BUF:['Buffalo Bills','Bills'],CAR:['Carolina Panthers','Panthers'],CHI:['Chicago Bears','Bears'],CIN:['Cincinnati Bengals','Bengals'],CLE:['Cleveland Browns','Browns'],DAL:['Dallas Cowboys','Cowboys'],DEN:['Denver Broncos','Broncos'],DET:['Detroit Lions','Lions'],GB:['Green Bay Packers','Packers'],HOU:['Houston Texans','Texans'],IND:['Indianapolis Colts','Colts'],JAX:['Jacksonville Jaguars','Jaguars'],KC:['Kansas City Chiefs','Chiefs'],LV:['Las Vegas Raiders','Raiders'],LAC:['Los Angeles Chargers','Chargers'],LAR:['Los Angeles Rams','Rams'],MIA:['Miami Dolphins','Dolphins'],MIN:['Minnesota Vikings','Vikings'],NE:['New England Patriots','Patriots'],NO:['New Orleans Saints','Saints'],NYG:['New York Giants','Giants'],NYJ:['New York Jets','Jets'],PHI:['Philadelphia Eagles','Eagles'],PIT:['Pittsburgh Steelers','Steelers'],SF:['San Francisco 49ers','49ers'],SEA:['Seattle Seahawks','Seahawks'],TB:['Tampa Bay Buccaneers','Buccaneers'],TEN:['Tennessee Titans','Titans'],WAS:['Washington Commanders','Commanders'],WSH:['Washington Commanders','Commanders']
};
function dlfNormAbbr(t){let a=clean(t).toUpperCase().replace(/[^A-Z]/g,'');const aliases={JAC:'JAX',LA:'LAR',WSH:'WAS'};return aliases[a]||a}
function clearFantasyPageMarkers(){document.querySelectorAll('.dlf-page-team-marker,.dlf-page-team-pop').forEach(x=>x.remove())}
function fantasyTeamNode(abbr){const names=dlfNflTeams[abbr]||[];if(!names.length)return null;let best=null,bestLen=1e9;for(const el of document.querySelectorAll('a,button,[role="row"],td,span,div')){if(el.closest('#dlo-update-stack,.dlo-anchor,.dlo-pop,.dlf-page-team-pop'))continue;const t=clean(el.textContent);if(!t||t.length>45)continue;if(names.some(n=>t.toLowerCase()===n.toLowerCase())){if(t.length<bestLen){best=el;bestLen=t.length}}}return best}
function placeFantasyTeamPop(btn,pop){const r=btn.getBoundingClientRect(),w=Math.min(300,innerWidth-16);pop.style.width=w+'px';let left=Math.max(8,Math.min(r.left,innerWidth-w-8)),top=r.bottom+7;pop.style.left=left+'px';pop.style.top=top+'px';pop.style.bottom='auto';pop.style.display='block';const h=pop.getBoundingClientRect().height;if(top+h>innerHeight-8&&r.top-h-7>=8){pop.style.top='auto';pop.style.bottom=(innerHeight-r.top+7)+'px'}}
function compactFantasyStat(raw){
 const s=String(raw||'').toUpperCase().replace(/STATISTICS?/g,'').replace(/\s+/g,' ').trim();
 if(/\bAVG\b|AVERAGE/.test(s))return null;
 const section=/PASS/.test(s)?'PASS':/RUSH/.test(s)?'RUSH':/RECEIV/.test(s)?'REC':'OTHER';
 const tail=s.replace(/^(PASSING|RUSHING|RECEIVING)\s+/,'').trim();
 const map={ATT:'ATT',ATTEMPTS:'ATT',CAR:'CAR',CARRIES:'CAR',CMP:'CMP',COMP:'CMP',COMPLETIONS:'CMP',YDS:'YDS',YARDS:'YDS',TD:'TD',TDS:'TD',TOUCHDOWNS:'TD',INT:'INT',INTERCEPTIONS:'INT',LONG:'LONG',LG:'LONG',REC:'REC',RECEPTIONS:'REC',TGTS:'TGTS',TARGETS:'TGTS',FUM:'FUM',FUMBLES:'FUM'};
 let label=map[tail]||tail;
 if(section==='RUSH'&&label==='ATT')label='CAR';
 return label?{section,label}:null;
}
function fantasyStatGroups(stats){
 const groups={PASS:[],RUSH:[],REC:[],OTHER:[]};
 for(const x of stats||[]){const c=compactFantasyStat(x.label);if(c)groups[c.section].push({label:c.label,value:x.value})}
 return groups;
}
function fantasyStatGroupHtml(groups){
 return ['PASS','RUSH','REC','OTHER'].map(section=>{
  const items=groups[section]||[];if(!items.length)return '';
  const title=section==='OTHER'?'STATS':section;
  return `<div class="dlf-stat-group"><div class="dlf-stat-group-label">${title}</div><div class="dlf-stat-chips">${items.map(x=>`<span class="dlf-stat-chip"><small>${esc(x.label)}</small><b>${esc(x.value)}</b></span>`).join('')}</div></div>`;
 }).join('');
}
async function fillFantasyTeamPop(pop,players){const token=String(Date.now())+Math.random();pop.dataset.token=token;const rows=[];for(const p of players){let stats=[];try{const r=await chrome.runtime.sendMessage({type:'DLO_NFL_PLAYER_STATS',player:p.name,team:p.nflTeam});stats=Array.isArray(r?.stats)?r.stats:[]}catch(_){}if(pop.dataset.token!==token)return;const groups=fantasyStatGroups(stats),body=fantasyStatGroupHtml(groups);rows.push(`<div class="dlf-page-player ${p.side==='opp'?'opp':'me'}"><div class="dlf-page-player-head"><b>${esc(p.name)}</b><span>${p.side==='opp'?'OPPONENT':'MY TEAM'} · ${fmt(Number.isFinite(p.points)?p.points:0)} FPTS</span></div>${body||'<small>No live stats yet</small>'}</div>`)}pop.innerHTML=`<div class="dlf-page-pop-head">FANTASY PLAYERS</div>${rows.join('')}`;}
function makeFantasyPageMarker(abbr,players){const a=document.createElement('span');a.className='dlf-page-team-marker';a.dataset.dloUi='true';const btn=document.createElement('button');btn.type='button';btn.className='dlf-page-team-btn';btn.innerHTML=`🏈${players.length>1?`<span>${players.length}</span>`:''}`;a.appendChild(btn);const pop=document.createElement('div');pop.className='dlf-page-team-pop';pop.dataset.dloUi='true';pop.innerHTML='<div class="dlf-page-pop-head">FANTASY PLAYERS</div><div class="dlf-page-loading">Hover to load live stats…</div>';document.body.appendChild(pop);let closeTimer=null,openTimer=null,pinned=false,overBtn=false,overPop=false,loaded=false;const cancel=()=>{clearTimeout(closeTimer);clearTimeout(openTimer)},show=()=>{cancel();document.querySelectorAll('.dlf-page-team-pop').forEach(x=>{if(x!==pop)x.style.display='none'});placeFantasyTeamPop(btn,pop);if(!loaded){loaded=true;fillFantasyTeamPop(pop,players)}},queueOpen=()=>{clearTimeout(openTimer);openTimer=setTimeout(()=>{if(overBtn)show()},120)},queueClose=()=>{clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(!overBtn&&!overPop&&!pinned)pop.style.display='none'},200)};btn.onmouseenter=()=>{overBtn=true;queueOpen()};btn.onmouseleave=()=>{overBtn=false;queueClose()};pop.onmouseenter=()=>{overPop=true;clearTimeout(closeTimer)};pop.onmouseleave=()=>{overPop=false;queueClose()};btn.onclick=e=>{e.stopPropagation();pinned=!pinned;if(pinned)show();else queueClose()};a._dlfPop=pop;return a}
function renderFantasyPageMarkers(){clearFantasyPageMarkers();if(!state.showFantasyTeamIcons||!state.fantasyEnabled||!/(^|\.)espn\.com$/i.test(location.hostname))return;const players=(state.fantasyMatchup?.players||[]).filter(p=>p.starter&&p.nflTeam);const byTeam=new Map();for(const p of players){const a=dlfNormAbbr(p.nflTeam);if(!dlfNflTeams[a])continue;if(!byTeam.has(a))byTeam.set(a,[]);byTeam.get(a).push(p)}for(const [abbr,ps] of byTeam){const node=fantasyTeamNode(abbr);if(node?.isConnected)node.insertAdjacentElement('afterend',makeFantasyPageMarker(abbr,ps))}}


function confetti(toastEl){if(!toastEl)return;const r=toastEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,c=document.createElement('div');c.className='dlf-confetti';for(let i=0;i<72;i++){const x=document.createElement('i'),a=Math.random()*Math.PI*2,dist=70+Math.random()*150,dx=Math.cos(a)*dist,dy=Math.sin(a)*dist+(Math.random()*34-17);x.style.left=cx+'px';x.style.top=cy+'px';x.style.setProperty('--dx',dx+'px');x.style.setProperty('--dy',dy+'px');x.style.setProperty('--rot',(360+Math.random()*900)+'deg');x.style.setProperty('--delay',(Math.random()*.10)+'s');x.style.color=['#4cff8b','#fff176','#65baff','#ff79c6','#ff9f43','#ffffff'][i%6];c.appendChild(x)}document.documentElement.appendChild(c);requestAnimationFrame(()=>c.classList.add('dlf-go'));setTimeout(()=>c.remove(),1700)}
function toast({side,name,delta,total,td=false,event}){if(!state.fantasyEnabled||state.fantasyNotifyMode==='off'||(side==='opp'&&!state.opponentUpdates))return;if(state.fantasyNotifyMode==='td'&&!td)return;if(state.fantasyNotifyMode==='big'&&!td&&Math.abs(delta)<3)return;ensureCombined();let good=(side==='me'&&delta>0)||(side==='opp'&&delta<0);updates++;const uid='fantasy:'+side+':'+name.toLowerCase()+':'+String(total)+':'+String(delta);chrome.storage.local.get({dloUpdateHistory:[]},d=>{let h=Array.isArray(d.dloUpdateHistory)?d.dloUpdateHistory.slice():[];if(!h.some(x=>x.id===uid)){h.push({id:uid,source:'fantasy',resultValue:String(total),who:name+(side==='opp'?' · OPPONENT':''),detail:td?(good?'TOUCHDOWN!':'OPPONENT TOUCHDOWN'):(event||`${delta>0?'+':''}${delta.toFixed(2)} fantasy points`),subdetail:`${delta>0?'+':''}${delta.toFixed(2)} fantasy pts · ${fmt(total)} total`,prop:'Fantasy',stage:'Live',direction:good?'positive':'negative',checked:false,ts:Date.now()});chrome.storage.local.set({dloUpdateHistory:h.slice(-100)})}})}

function detectTD(name){const feed=clean(document.body.innerText),i=feed.toLowerCase().lastIndexOf(name.toLowerCase());return i>=0&&/touchdown|\btd\b/i.test(feed.slice(Math.max(0,i-140),i+220))}
function matchupSig(m){if(!m)return '';return JSON.stringify([m.myTeam,m.oppTeam,m.myScore,m.oppScore,(m.leagueStandings||[]).map(t=>[t.name,t.current,t.projected]),(m.players||[]).map(p=>[p.side,p.name,p.slot,p.starter,p.points,p.gameLive])])}
async function sync(silent=false){try{
 if(isESPNScoreboardPage()){
  const rows=parseESPNScoreboardDocument(document);if(!rows.length)throw Error('ESPN Scoreboard matchups are not loaded yet.');
  const old=state.fantasyMatchup||{};const byName=new Map(rows.map(x=>[clean(x.name).toLowerCase(),x]));
  const selected=clean(state.fantasyMyTeamName||old.myTeam).toLowerCase();const mine=byName.get(selected),opp=byName.get(clean(old.oppTeam).toLowerCase());
  const next={...old,leagueStandings:rows,syncedAt:Date.now()};
  if(Number.isFinite(mine?.projected))next.myProjected=mine.projected;if(Number.isFinite(opp?.projected))next.oppProjected=opp.projected;
  state.fantasyMatchup=next;await chrome.storage.local.set({fantasyMatchup:next});render();return next;
 }
 let next=parsePage();
 if(isESPNFantasy()){
  const chosen=clean(state.fantasyMyTeamName).toLowerCase();
  if(chosen&&clean(next.myTeam).toLowerCase()!==chosen){throw Error('Selected fantasy team is not the matchup currently displayed. Keeping your saved team matchup.')}
  next.leagueStandings=await loadESPNLeagueProjections(parseESPNScoreboard());
  const prior=state.fantasyMatchup?.leagueStandings||[];if(!next.leagueStandings?.some(x=>Number.isFinite(x.projected))&&prior.some(x=>Number.isFinite(x.projected)))next.leagueStandings=prior;
  const byName=new Map((next.leagueStandings||[]).map(x=>[clean(x.name).toLowerCase(),x]));const mine=byName.get(clean(next.myTeam).toLowerCase()),opp=byName.get(clean(next.oppTeam).toLowerCase());
  if(!Number.isFinite(next.myProjected)&&Number.isFinite(mine?.projected))next.myProjected=mine.projected;if(!Number.isFinite(next.oppProjected)&&Number.isFinite(opp?.projected))next.oppProjected=opp.projected;
 }
 try{const r=await chrome.runtime.sendMessage({type:'DLO_NFL_TEAM_STATES'}),teams=r?.ok?r.teams:{};for(const p of next.players){const key=String(p.nflTeam||'').trim().toUpperCase();p.gameLive=!!teams?.[key]?.live}}catch(_){for(const p of next.players)p.gameLive=false}
 let old=state.fantasyMatchup;if(old){let map=new Map((old.players||[]).map(p=>[p.side+'|'+p.name,p]));for(const p of next.players){let o=map.get(p.side+'|'+p.name);if(!p.starter||!o||p.points==null||o.points==null)continue;let d=+(p.points-o.points).toFixed(2);if(Math.abs(d)>=.01)toast({side:p.side,name:p.name,delta:d,total:p.points,td:Math.abs(d)>=3.5&&detectTD(p.name),event:`${d>0?'+':''}${d.toFixed(2)} fantasy points`})}}const changed=matchupSig(next)!==matchupSig(old);if(changed){state.fantasyMatchup=next;await chrome.storage.local.set({fantasyMatchup:next});render()}return changed?next:(old||next)}catch(e){if(!silent)throw e}}
function watch(){if(!isFantasyDataPage())return;clearInterval(timer);timer=setInterval(()=>sync(true),isESPNScoreboardPage()?10000:5000)}
ensureCombined();render();
chrome.storage.local.get(S,d=>{state={...S,...d};ensureCombined();render();watch();if(isFantasyDataPage())setTimeout(()=>sync(true),120)});
window.addEventListener('resize',queueSyncPosition);let dlfLastUrl=location.href;setInterval(()=>{if(location.href!==dlfLastUrl){dlfLastUrl=location.href;setTimeout(renderFantasyPageMarkers,120)}},2000);const stackForPos=host();if(stackForPos)new MutationObserver(queueSyncPosition).observe(stackForPos,{childList:true,attributes:true,attributeFilter:['class']});
chrome.storage.onChanged.addListener(ch=>{
 const renderKeys=new Set(['fantasyEnabled','enabled','showOpponentTotal','showOpponentPlayers','showBenchPlayers','opponentUpdates','fantasyNotifyMode','fantasyMatchup','fantasyMyTeamName','showFantasyTeamIcons']);
 let uiChanged=false;
 for(const [k,v] of Object.entries(ch)){if(renderKeys.has(k)){state[k]=v.newValue;uiChanged=true}}
 if(uiChanged){ensureCombined();render();queueSyncPosition()}
});
chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m?.type==='DLO_FANTASY_SYNC'){sync(false).then(x=>{const mm=(x&&typeof x==='object')?x:state.fantasyMatchup;const ps=Array.isArray(mm?.players)?mm.players:[];reply({ok:true,players:ps.length,starters:ps.filter(p=>p.starter).length,matchup:mm})}).catch(e=>reply({ok:false,error:String(e.message||e)}));return true}if(m?.type==='DLO_FANTASY_TEST'){toast({side:m.side,name:m.side==='me'?'My Player':'Opponent Player',delta:6,total:18.4,td:true});reply({ok:true})}});
})();
