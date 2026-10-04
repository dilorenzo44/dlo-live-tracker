if(!globalThis.__DLO_TRACKER_ACTIVE__){globalThis.__DLO_TRACKER_ACTIVE__=true;
let dloAppTheme='espn';function dloApplyTheme(){const theme=dloAppTheme==='sleeper'?'sleeper':'espn';document.documentElement.dataset.dloTheme=theme;document.querySelectorAll('#dlo-update-stack,#dlo-all-bets,.dlo-pop,.dlo-anchor').forEach(el=>el.dataset.dloTheme=theme)}
// Own every long-lived callback so an unpacked-extension reload can shut the old world down cleanly.
let cfg={bets:[],enabled:true,notifyMode:'milestones'},timer,progress={},seenProgress={},rendering=false,renderQueued=false;
let dloDead=false;
const dloIntervals=new Set(),dloTimeouts=new Set();
function dloContextAlive(){if(dloDead)return false;try{if(typeof chrome==='undefined'||!chrome.runtime||!chrome.runtime.id){dloDead=true;return false}return true}catch(_){dloDead=true;return false}}
function dloLater(fn,ms){if(dloDead)return null;const id=setTimeout(()=>{dloTimeouts.delete(id);if(!dloContextAlive())return;try{const r=fn();if(r&&typeof r.catch==='function')r.catch(e=>{if(/context invalidated|receiving end does not exist/i.test(String(e?.message||e)))dloKillStale()})}catch(e){if(/context invalidated|receiving end does not exist/i.test(String(e?.message||e)))dloKillStale()}},ms);dloTimeouts.add(id);return id}
function dloEvery(fn,ms){if(dloDead)return null;const id=setInterval(()=>{if(!dloContextAlive()){dloKillStale();return}try{const r=fn();if(r&&typeof r.catch==='function')r.catch(e=>{if(/context invalidated|receiving end does not exist/i.test(String(e?.message||e)))dloKillStale()})}catch(e){if(/context invalidated|receiving end does not exist/i.test(String(e?.message||e)))dloKillStale()}},ms);dloIntervals.add(id);return id}
function dloKillStale(){
  if(dloDead&&dloIntervals.size===0&&dloTimeouts.size===0)return;
  dloDead=true;clearTimeout(timer);clearTimeout(dloPushTimer);
  for(const id of dloIntervals)clearInterval(id);for(const id of dloTimeouts)clearTimeout(id);
  dloIntervals.clear();dloTimeouts.clear();
  try{document.querySelectorAll('.dlo-anchor,.dlo-pop,#dlo-page-import,#dlo-update-stack,#dlo-all-bets').forEach(x=>x.remove())}catch(_){}
}
async function dloSend(msg){if(!dloContextAlive())return null;try{return await chrome.runtime.sendMessage(msg)}catch(e){if(/context invalidated|receiving end does not exist/i.test(String(e?.message||e)))dloKillStale();return null}}
async function dloGet(def){if(!dloContextAlive())return def;try{return await chrome.storage.local.get(def)}catch(e){if(/context invalidated/i.test(String(e?.message||e)))dloKillStale();return def}}
async function dloSet(obj){if(!dloContextAlive())return false;try{await chrome.storage.local.set(obj);return true}catch(e){if(/context invalidated/i.test(String(e?.message||e)))dloKillStale();return false}}
const clean=s=>(s||'').replace(/\s+/g,' ').trim(), norm=s=>clean(s).toLowerCase().replace(/[^a-z0-9 ]/g,'');
const alias={
 'new york yankees':['new york yankees','yankees','nyy'],'tampa bay rays':['tampa bay rays','rays','tb'],'boston red sox':['boston red sox','red sox'],
 'boston bruins':['boston bruins','bruins'],'minnesota wild':['minnesota wild','wild'],'buffalo sabres':['buffalo sabres','sabres'],'chicago blackhawks':['chicago blackhawks','blackhawks'],
 'montreal canadiens':['montreal canadiens','canadiens'],'pittsburgh penguins':['pittsburgh penguins','penguins'],'ottawa senators':['ottawa senators','senators'],'toronto maple leafs':['toronto maple leafs','maple leafs'],
 'seattle kraken':['seattle kraken','kraken'],'edmonton oilers':['edmonton oilers','oilers'],'carolina hurricanes':['carolina hurricanes','hurricanes'],'philadelphia flyers':['philadelphia flyers','flyers'],
 'utah mammoth':['utah mammoth','mammoth'],'columbus blue jackets':['columbus blue jackets','blue jackets'],'washington capitals':['washington capitals','capitals'],'tampa bay lightning':['tampa bay lightning','lightning'],
 'atlanta braves':['atlanta braves','braves'],'los angeles dodgers':['los angeles dodgers','dodgers'],'san diego padres':['san diego padres','padres'],'milwaukee brewers':['milwaukee brewers','brewers'],
 'chicago white sox':['chicago white sox','white sox'],'cleveland guardians':['cleveland guardians','guardians']};
const teamColors={
 'boston bruins':['#ffb81c','#000000'],'minnesota wild':['#154734','#a6192e'],'buffalo sabres':['#003087','#ffb81c'],'chicago blackhawks':['#cf0a2c','#000000'],
 'montreal canadiens':['#af1e2d','#192168'],'pittsburgh penguins':['#fcb514','#000000'],'ottawa senators':['#c52032','#000000'],'toronto maple leafs':['#003e7e','#ffffff'],
 'seattle kraken':['#001628','#99d9d9'],'edmonton oilers':['#041e42','#ff4c00'],'carolina hurricanes':['#cc0000','#000000'],'philadelphia flyers':['#f74902','#000000'],
 'utah mammoth':['#69b3e7','#010101'],'columbus blue jackets':['#002654','#ce1126'],'washington capitals':['#041e42','#c8102e'],'tampa bay lightning':['#000000','#002868'],
 'new york yankees':['#0c2340','#c4ced3'],'tampa bay rays':['#092c5c','#8fbce6'],'boston red sox':['#bd3039','#0c2340'],'atlanta braves':['#ce1141','#13274f'],
 'los angeles dodgers':['#005a9c','#ffffff'],'san diego padres':['#2f241d','#ffc425'],'milwaukee brewers':['#12284b','#ffc52f'],'chicago white sox':['#27251f','#c4ced4'],'cleveland guardians':['#00385d','#e50022'],
 'new england patriots':['#002244','#c60c30'],'buffalo bills':['#00338d','#c60c30'],'new york jets':['#125740','#ffffff'],'chicago bears':['#0b162a','#c83803'],
 'dallas cowboys':['#041e42','#869397'],'houston texans':['#03202f','#a71930'],'philadelphia eagles':['#004c54','#a5acaf'],'green bay packers':['#203731','#ffb612'],
 'tampa bay buccaneers':['#d50a0a','#34302b'],'tennessee titans':['#0c2340','#4b92db'],'baltimore ravens':['#241773','#000000'],'jacksonville jaguars':['#006778','#d7a22a'],
 'cincinnati bengals':['#fb4f14','#000000'],'miami dolphins':['#008e97','#fc4c02'],'minnesota vikings':['#4f2683','#ffc62f'],'kansas city chiefs':['#e31837','#ffb81c'],
 'las vegas raiders':['#000000','#a5acaf'],'los angeles chargers':['#0080c6','#ffc20e'],'seattle seahawks':['#002244','#69be28'],'denver broncos':['#fb4f14','#002244'],
 'san francisco 49ers':['#aa0000','#b3995d'],'detroit lions':['#0076b6','#b0b7bc'],'carolina panthers':['#0085ca','#101820'],'atlanta falcons':['#a71930','#000000'],
 'new orleans saints':['#d3bc8d','#101820'],'indianapolis colts':['#002c5f','#ffffff'],'washington commanders':['#5a1414','#ffb612'],'arizona cardinals':['#97233f','#000000'],
 'new york giants':['#0b2265','#a71930'],'los angeles rams':['#003594','#ffd100']};
function palette(team){let q=norm(team);for(const [k,v] of Object.entries(teamColors))if(norm(k)===q||variants(k).some(x=>norm(x)===q))return v;return null}
function ownedTeamsForBet(b){let p=progress[key(b)]||{};if(p.team)return [p.team];let sel=b.selection||'';if(palette(sel))return [sel];if(!b.player&&/(total|over|under)/i.test((b.prop||'')+' '+sel))return (b.matchTeams||[]).filter(Boolean);return []}
function gradientForBets(items){let pals=items.flatMap(b=>ownedTeamsForBet(b).map(palette).filter(Boolean));if(!pals.length)return ['#253247','#60728d'];if(pals.length===1)return pals[0];let common=pals[0].find(c=>pals.every(x=>x.includes(c)));if(common){let sides=pals.map(x=>x.find(c=>c!==common)).filter(Boolean);return [...new Set([sides[0],common,...sides.slice(1)])]}return [...new Set(pals.flat())].slice(0,5)}
function applyPopColors(pop,items){let cols=gradientForBets(items);pop.style.setProperty('--dlo-gradient',`linear-gradient(90deg,${cols.join(',')})`)}
function closeOtherPops(except){document.querySelectorAll('.dlo-anchor').forEach(x=>{if(x!==except)x._dloClose?.()})}
function variants(t){let q=norm(t);for(const [k,v] of Object.entries(alias))if(norm(k)===q||v.some(x=>norm(x)===q))return v;let parts=clean(t).split(' ').filter(Boolean),last=parts[parts.length-1]||'';return last.length>=4&&parts.length>1?[t,last]:[t]}
function contains(text,team){let a=' '+norm(text)+' ';return variants(team).some(v=>{let x=norm(v);return x.length>3&&a.includes(' '+x+' ')})}
function target(prop,storedTarget){let saved=Number(storedTarget);if(Number.isFinite(saved)&&saved>0)return saved;prop=prop||'';let m=prop.match(/(\d+(?:\.\d+)?)\s*\+/);if(m)return +m[1];if(/anytime|to hit a home run|to record a stolen base|td scorer|touchdown/i.test(prop))return 1;let o=prop.match(/over\s+(\d+(?:\.\d+)?)/i);return o?Math.floor(+o[1])+1:null}
function goalForBet(b){let g=target(b.prop,b.target);if(g)return g;let raw=String(cfg.rawText||'');if(!raw||!b.player)return null;let pos=raw.toLowerCase().indexOf(String(b.player).toLowerCase());if(pos<0)return null;let chunk=raw.slice(pos,Math.min(raw.length,pos+260));let kind=(b.prop||'').toLowerCase(),patterns=[];if(/rush/.test(kind))patterns=[/(\d+(?:\.\d+)?)\+[^\n]{0,45}(?:rush|rushing)(?:ing)?\s*(?:yards?|yds)?/i,/(?:rush|rushing)[^\n]{0,45}?(\d+(?:\.\d+)?)\+/i];else if(/receiv|reception/.test(kind))patterns=[/(\d+(?:\.\d+)?)\+[^\n]{0,45}(?:receiv|reception)/i,/(?:receiv|reception)[^\n]{0,45}?(\d+(?:\.\d+)?)\+/i];else if(/pass/.test(kind))patterns=[/(\d+(?:\.\d+)?)\+[^\n]{0,45}pass/i,/pass[^\n]{0,45}?(\d+(?:\.\d+)?)\+/i];for(const re of patterns){let m=chunk.match(re);if(m){let n=Number(m[1]);if(Number.isFinite(n)&&n>0)return n}}let any=chunk.match(/\b(\d+(?:\.\d+)?)\+/);return any?Number(any[1]):null}
function repairStoredBet(b){if(!b||!b.player)return b;let fixedPlayer=globalThis.DLOParser?.cleanOpenPlayerName?.(b.player)||String(b.player||'').trim();fixedPlayer=String(fixedPlayer||'').replace(/^\s*(?:(?:\d{1,2}:)?\d{1,2}\s*)?(?:AM|PM)\s*ET(?=[A-Z])\s*/i,'').replace(/^\s*(?:AM|PM)\s*ET(?=[A-Z])\s*/i,'').trim();let out=fixedPlayer!==b.player?{...b,player:fixedPlayer}:b;let g=goalForBet(out);if(g&&!target(out.prop,out.target)&&/(yards?|yds|receptions?|shots?|total bases|goals?|touchdowns?)/i.test(out.prop||''))out={...out,target:g,prop:(g+'+ '+String(out.prop||'').replace(/^\d+(?:\.\d+)?\+\s*/,''))};return out}
function clear(){document.querySelectorAll('.dlo-anchor,[data-dlo-anchor]').forEach(x=>{if(x._dloPop)x._dloPop.remove();x.remove()});document.querySelectorAll('body > .dlo-pop').forEach(x=>x.remove())}
function nodesFor(team){let sel='a,button,[role=button],[role=row],td,th,span,div';let all=[...document.querySelectorAll(sel)],hits=[];for(let e of all){if(hits.length>80)break;if(e.closest('.dlo-anchor,.dlo-pop'))continue;let t=clean(e.textContent);if(t&&t.length<100&&contains(t,team))hits.push(e)}return hits.sort((a,b)=>clean(a.textContent).length-clean(b.textContent).length)}
function gameContext(node,teams){let e=node;while(e&&e!==document.body){let txt=clean(e.innerText);if(txt.length>40&&txt.length<2500&&teams.filter(t=>contains(txt,t)).length>=Math.min(2,teams.length))return e;e=e.parentElement}return node.parentElement||node}
function key(b){return [b.groupId||'single',b.player||b.selection||'',b.prop||'',b.odds||'',(b.matchTeams||[]).join('/')].join('|')}
function statKey(b){return [b.player||b.selection||'',b.prop||'',(b.matchTeams||[]).join('/')].join('|')}
function displayCase(s){s=clean(s);if(!s)return s;const keep=new Set(['a','an','and','at','by','for','in','of','on','or','the','to','vs']);return s.toLowerCase().split(' ').map((w,i)=>{if(/^\d/.test(w)||/[+\-]/.test(w))return w.toUpperCase();if(['sog','td','mlb','nba','nfl','nhl'].includes(w))return w.toUpperCase();return (i&&!keep.has(w))?w.charAt(0).toUpperCase()+w.slice(1):i?w:w.charAt(0).toUpperCase()+w.slice(1)}).join(' ')}
function placePop(btn,pop){let r=btn.getBoundingClientRect(),gap=7,w=Math.min(330,window.innerWidth-16);pop.style.width=w+'px';let left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));let top=r.bottom+gap;pop.style.maxHeight=Math.max(120,window.innerHeight-16)+'px';pop.style.left=left+'px';pop.style.top=top+'px';pop.style.bottom='auto';pop.style.display='block';let h=pop.getBoundingClientRect().height;if(top+h>window.innerHeight-8&&r.top-h-gap>=8){pop.style.top='auto';pop.style.bottom=(window.innerHeight-r.top+gap)+'px'}}
function elapsedFraction(p){if(!p||p.completed)return p?.completed?1:null;let per=+p.period||0,clock=p.clock||'',m=clock.match(/(\d+):(\d+)/),left=m?(+m[1]*60+ +m[2]):null;if(p.league==='nfl'){if(!per)return 0;let q=Math.min(per,4),secLeft=left==null?900:left;return Math.max(0,Math.min(1,((q-1)*900+(900-secLeft))/3600))}if(p.league==='nhl'){if(!per)return 0;let q=Math.min(per,3),secLeft=left==null?1200:left;return Math.max(0,Math.min(1,((q-1)*1200+(1200-secLeft))/3600))}if(p.league==='nba'){if(!per)return 0;let q=Math.min(per,4),secLeft=left==null?720:left;return Math.max(0,Math.min(1,((q-1)*720+(720-secLeft))/2880))}if(p.league==='mlb'){return per?Math.max(.01,Math.min(1,per/9)):0}return null}
function pageStat(b){let prop=(b.prop||'').toLowerCase(),opts=[];if(/shot/.test(prop))opts=['S','SOG','SHOTS'];else if(/goal/.test(prop))opts=['G','GOALS'];else if(/reception/.test(prop))opts=['REC','RECEPTIONS'];else if(/rushing.*yard/.test(prop))opts=['YDS','RUSH YDS','RUSHING YARDS'];else if(/receiving.*yard/.test(prop))opts=['YDS','REC YDS','RECEIVING YARDS'];else if(/passing.*yard/.test(prop))opts=['YDS','PASS YDS','PASSING YARDS'];else if(/touchdown|td scorer/.test(prop))opts=['TD','TOUCHDOWNS'];else if(/home run/.test(prop))opts=['HR'];else if(/stolen base/.test(prop))opts=['SB'];else if(/total bases/.test(prop))opts=['TB'];else return null;let name=norm(b.player);for(const tr of document.querySelectorAll('tr')){let cells=[...tr.querySelectorAll('th,td')];if(!cells.length||!norm(tr.innerText).includes(name))continue;let table=tr.closest('table'),heads=table?[...table.querySelectorAll('thead th')].map(x=>clean(x.innerText).toUpperCase()):[];if(heads.length===cells.length){for(let i=0;i<heads.length;i++)if(opts.some(o=>heads[i]===o||heads[i].includes(o))){let v=parseFloat(clean(cells[i].innerText));if(Number.isFinite(v))return {value:String(v),source:'Page box score'}}}let nums=cells.map(x=>clean(x.innerText));for(const o of opts){let idx=nums.findIndex(x=>x.toUpperCase()===o);if(idx>=0&&Number.isFinite(parseFloat(nums[idx+1])))return {value:String(parseFloat(nums[idx+1])),source:'Page box score'}}}return null}
function gameStage(p){if(!p)return '';if(p.completed)return 'FINAL';let per=+p.period||0,clock=clean(p.clock||''),st=clean(p.state||'');const addClock=label=>label+(clock?' · '+clock:'');if(p.league==='nhl'){if(per>=4||/\bOT\b|overtime/i.test(st))return addClock(per<=4?'OT':`${per-3}OT`);return per?addClock(`P${per}`):(st||clock)}if(p.league==='nfl'||p.league==='nba'){if(per>=5||/\bOT\b|overtime/i.test(st))return addClock(per<=5?'OT':`${per-4}OT`);return per?addClock(`Q${per}`):(st||clock)}if(p.league==='mlb'){if(/top|bottom|mid|end/i.test(st))return st;return per?`Inning ${per}`:st}return st||clock}
function statusFor(b,p){let goal=goalForBet(b);if(p&&!p.resolved&&b.player){let pg=pageStat(b);if(pg)p={...p,...pg,resolved:true}}if(!p||p.value==null){let txt=p?.completed?'Stat Unavailable · Final':p?.reason==='game-not-found'?'Game Not Found · Retrying':'Stat Unavailable · Retrying';return {cls:'',text:txt,label:'Live'}}
 let stage=gameStage(p);
 if(p.kind==='moneyline'){let score=`${p.teamScore}–${p.oppScore}`;if(p.completed)return p.status==='winning'?{cls:'dlo-good',text:`${score} · FINAL`,label:'Won ✓'}:{cls:'dlo-bad',text:`${score} · FINAL`,label:'Lost ✕'};return p.status==='winning'?{cls:'dlo-good',text:`${score}${stage?' · '+stage:''}`,label:'Winning'} : p.status==='losing'?{cls:'dlo-bad',text:`${score}${stage?' · '+stage:''}`,label:'Losing'}:{cls:'dlo-mid',text:`${score}${stage?' · '+stage:''}`,label:'Tied'}}
 if(p.kind==='spread'){let score=`${p.teamScore}–${p.oppScore}`,line=`${p.line>0?'+':''}${p.line}`,m=Number(p.coverMargin??p.margin),amt=Number.isFinite(m)?Math.abs(m):0,progress=m>0?`Covering by ${amt}`:m<0?'':'On the number';if(!p.period&&!p.completed)return {cls:'',text:`${score} · ${line}${progress?' · '+progress:''}${stage?' · '+stage:''}`,label:'Pregame'};if(p.completed)return p.status==='winning'?{cls:'dlo-good',text:`${score} · ${line} · Covered by ${amt} · FINAL`,label:'Won ✓'}:p.status==='losing'?{cls:'dlo-bad',text:`${score} · ${line} · Missed by ${amt} · FINAL`,label:'Lost ✕'}:{cls:'dlo-mid',text:`${score} · ${line} · FINAL`,label:'Push'};return p.status==='winning'?{cls:'dlo-good',text:`${score} · ${line}${progress?' · '+progress:''}${stage?' · '+stage:''}`,label:'Covering'}:p.status==='losing'?{cls:'dlo-bad',text:`${score} · ${line}${progress?' · '+progress:''}${stage?' · '+stage:''}`,label:'Not Covering'}:{cls:'dlo-mid',text:`${score} · ${line}${progress?' · '+progress:''}${stage?' · '+stage:''}`,label:'Push'}}
 if(p.kind==='total'){let hit=p.direction==='over'?p.total>p.line:p.total<p.line;if(p.completed)return {cls:hit?'dlo-good':'dlo-bad',text:`${p.total} total · FINAL`,label:hit?'Won ✓':'Lost ✕'};return {cls:'dlo-mid',text:`${p.total} total${stage?' · '+stage:''}`,label:`${p.direction==='over'?'Over':'Under'} ${p.line}`}}
 let v=parseFloat(p.value);if(!Number.isFinite(v))return {cls:'',text:`Live: ${p.value}${stage?' · '+stage:''}`,label:'Live'};if(!goal)return {cls:'',text:`${p.value}${stage?' · '+stage:''}`,label:'Live'};if(v>=goal)return {cls:'dlo-hit',text:`Live: ${goal} / ${goal}${stage&&!p.completed?' · '+stage:''}`,label:'Hit ✓'};if(p.completed)return {cls:'dlo-bad',text:`Live: ${p.value} / ${goal} · FINAL`,label:'Lost ✕'};if(goal===1)return {cls:'dlo-mid',text:`Live: ${p.value} / 1${stage?' · '+stage:''}`,label:'Live'};let f=elapsedFraction(p);if(f==null||f<=0)return {cls:'',text:`Live: ${p.value} / ${goal}${stage?' · '+stage:''}`,label:'Live'};let expected=goal*f,pace=expected>0?v/expected:99,cls;if(f<.10&&v===0)cls='dlo-mid';else if(pace>=1.15)cls='dlo-good';else if(pace>=.80)cls='dlo-mid';else if(pace>=.50)cls='dlo-warn';else cls='dlo-bad';let paceTxt=pace>=1.15?'Ahead':pace>=.80?'On Pace':pace>=.50?'Behind':'Well Behind';return {cls,text:`Live: ${p.value} / ${goal}${stage?' · '+stage:''}`,label:paceTxt}}
function teamAbbr(team){let words=clean(team).split(' ').filter(Boolean);let known={'boston bruins':'BOS','minnesota wild':'MIN','tampa bay lightning':'TBL','buffalo sabres':'BUF','chicago blackhawks':'CHI','montreal canadiens':'MTL','pittsburgh penguins':'PIT','ottawa senators':'OTT','toronto maple leafs':'TOR','seattle kraken':'SEA','edmonton oilers':'EDM','carolina hurricanes':'CAR','philadelphia flyers':'PHI','washington capitals':'WSH','columbus blue jackets':'CBJ','new york yankees':'NYY','tampa bay rays':'TB','boston red sox':'BOS','atlanta braves':'ATL','los angeles dodgers':'LAD','san diego padres':'SD','milwaukee brewers':'MIL'};return known[norm(team)]||words.map(x=>x[0]).join('').slice(0,3).toUpperCase()}
function updateCards(b){let k=key(b),p=progress[k];document.querySelectorAll('.dlo-bet').forEach(d=>{if(d.dataset.dloKey!==k)return;let s=statusFor(b,p);d.classList.remove('dlo-hit','dlo-good','dlo-mid','dlo-warn','dlo-bad');if(s.cls)d.classList.add(s.cls);let pr=d.querySelector('.dlo-progress-text'),pill=d.querySelector('.dlo-status-text');if(pr)pr.textContent=s.text;if(pill){pill.textContent=s.label||'Live';pill.className='dlo-status-text '+(s.cls||'')}})}
const nflLogoAbbr={
'arizona cardinals':'ari','atlanta falcons':'atl','baltimore ravens':'bal','buffalo bills':'buf','carolina panthers':'car','chicago bears':'chi','cincinnati bengals':'cin','cleveland browns':'cle','dallas cowboys':'dal','denver broncos':'den','detroit lions':'det','green bay packers':'gb','houston texans':'hou','indianapolis colts':'ind','jacksonville jaguars':'jax','kansas city chiefs':'kc','las vegas raiders':'lv','los angeles chargers':'lac','los angeles rams':'lar','miami dolphins':'mia','minnesota vikings':'min','new england patriots':'ne','new orleans saints':'no','new york giants':'nyg','new york jets':'nyj','philadelphia eagles':'phi','pittsburgh steelers':'pit','san francisco 49ers':'sf','seattle seahawks':'sea','tampa bay buccaneers':'tb','tennessee titans':'ten','washington commanders':'wsh'};
function betTeamLogo(team){let a=nflLogoAbbr[norm(team)];return a?`<img class="dlo-bet-team-icon" src="https://a.espncdn.com/i/teamlogos/nfl/500/${a}.png" alt="" aria-hidden="true">`:''}
function teamNameStyle(team){let t=norm(team);if(/yankees|red sox|rays|braves|dodgers|padres|brewers|white sox|guardians/.test(t))return 'baseball';if(/bruins|wild|sabres|blackhawks|canadiens|penguins|senators|maple leafs|kraken|oilers|hurricanes|flyers|mammoth|blue jackets|capitals|lightning/.test(t))return 'hockey';if(/patriots|bills|jets|bears|cowboys|texans|eagles|packers|buccaneers|titans|ravens|jaguars|bengals|dolphins|vikings|chiefs|raiders|chargers|seahawks|broncos|49ers|lions|panthers|falcons|saints|colts|commanders|cardinals|giants|rams/.test(t))return 'football';return 'standard'}
function betCard(b,compact=false){let d=document.createElement('div'),p=progress[key(b)],s=statusFor(b,p),team=p?.team||ownerTeam(b)||'',cols=palette(team)||['#263449','#263449'];d.style.setProperty('--dlo-team-primary',cols[0]);d.style.setProperty('--dlo-team-secondary',cols[1]||cols[0]);d.className='dlo-bet '+(s.cls||'')+(compact?' dlo-compact':'');d.dataset.dloKey=key(b);d.innerHTML='<div class="dlo-team-header"><div class="dlo-player-line"><span class="dlo-player-icon"></span><div class="dlo-player"></div></div><div class="dlo-team-name"></div></div><div class="dlo-bet-body"><div class="dlo-prop"></div><div class="dlo-live-row"><span class="dlo-progress-text"></span><span class="dlo-status-text"></span></div><div class="dlo-meta"></div></div>';d.querySelector('.dlo-player').textContent=(b.player?globalThis.DLOParser?.cleanOpenPlayerName?.(b.player):b.selection)||b.player||b.selection;d.querySelector('.dlo-player-icon').innerHTML=betTeamLogo(team);d.querySelector('.dlo-team-name').textContent=team||'';d.querySelector('.dlo-prop').textContent=displayCase(b.prop||'Bet');d.querySelector('.dlo-progress-text').textContent=s.text;let pill=d.querySelector('.dlo-status-text');pill.textContent=s.label||'Live';pill.className='dlo-status-text '+(s.cls||'');d.querySelector('.dlo-meta').textContent=[b.odds,b.wager?('$'+b.wager):'',(b.matchTeams||[]).join(' vs ')].filter(Boolean).join(' · ');return d}
function make(items,allBets){
 let a=document.createElement('span');a.className='dlo-anchor';a.dataset.dloAnchor='1';a.dataset.dloUi='true';let btn=document.createElement('button');btn.className='dlo-fire';btn.innerHTML='🔥'+(items.length>1?`<span class="dlo-count">${items.length}</span>`:'');a.appendChild(btn);
 let pop=document.createElement('div');pop.className='dlo-pop';pop.dataset.dloUi='true';pop._dloItems=items;pop.innerHTML='<div class="dlo-head">MY BETS</div>';
 // Match All Bets behavior: one card per unique prop, with a compact count when that prop lives in multiple tickets.
 let propGroups=new Map();for(const b of items){let sk=statKey(b);if(!propGroups.has(sk))propGroups.set(sk,[]);propGroups.get(sk).push(b)}
 for(const [sk,localLegs] of propGroups){let first=localLegs[0],allLegs=allBets.filter(x=>statKey(x)===sk);let wrap=document.createElement('div');wrap.className='dlo-prop-group';wrap.dataset.dloUi='true';wrap.appendChild(betCard(first));if(allLegs.length>1){let toggle=document.createElement('button');toggle.type='button';toggle.className='dlo-prop-legs-toggle';toggle.textContent=`In ${allLegs.length} bet legs ▾`;let detail=document.createElement('div');detail.className='dlo-prop-legs-detail';allLegs.forEach((b,i)=>{let row=document.createElement('div');row.className='dlo-prop-leg-row';row.textContent=[`Bet ${i+1}`,b.odds||'',b.wager?('$'+b.wager):''].filter(Boolean).join(' · ');detail.appendChild(row)});toggle.onclick=e=>{e.stopPropagation();let open=detail.classList.toggle('dlo-show');toggle.textContent=open?`Hide ${allLegs.length} bet legs ▴`:`In ${allLegs.length} bet legs ▾`;placePop(btn,pop)};wrap.append(toggle,detail)}pop.appendChild(wrap)}
 let gids=[...new Set(items.map(x=>x.groupId).filter(Boolean))];let related=allBets.filter(b=>gids.includes(b.groupId)&&!items.some(x=>key(x)===key(b)));
 if(related.length){let toggle=document.createElement('button');toggle.className='dlo-parlay-toggle';toggle.textContent=`View Full Parlay (${related.length} more) ▾`;let extra=document.createElement('div');extra.className='dlo-parlay-extra';related.forEach(b=>extra.appendChild(betCard(b,true)));toggle.onclick=e=>{e.stopPropagation();let open=extra.classList.toggle('dlo-show');toggle.textContent=open?`Hide Full Parlay ▴`:`View Full Parlay (${related.length} more) ▾`;placePop(btn,pop)};pop.append(toggle,extra)}
 document.body.appendChild(pop);let closeTimer=null,openTimer=null,pinned=false,overBtn=false,overPop=false;const cancelOpen=()=>{if(openTimer){clearTimeout(openTimer);openTimer=null}},cancelClose=()=>{if(closeTimer){clearTimeout(closeTimer);closeTimer=null}},show=()=>{cancelOpen();closeOtherPops(a);cancelClose();placePop(btn,pop)},closeNow=()=>{cancelOpen();if(!pinned)pop.style.display='none'},queueOpen=()=>{cancelOpen();openTimer=setTimeout(()=>{openTimer=null;if(overBtn&&!pinned)show()},120)},queueClose=()=>{cancelOpen();cancelClose();closeTimer=setTimeout(()=>{if(!overBtn&&!overPop&&!pinned)closeNow()},200)};
 btn.addEventListener('mouseenter',()=>{overBtn=true;queueOpen()});btn.addEventListener('mouseleave',()=>{overBtn=false;queueClose()});pop.addEventListener('mouseenter',()=>{overPop=true;cancelClose();pop.style.display='block'});pop.addEventListener('mouseleave',()=>{overPop=false;queueClose()});btn.addEventListener('click',e=>{e.stopPropagation();pinned=!pinned;if(pinned)show();else queueClose()});pop.addEventListener('click',e=>e.stopPropagation());a._dloPop=pop;a._dloClose=()=>{cancelOpen();cancelClose();pinned=false;overBtn=false;overPop=false;pop.style.display='none'};return a
}
function notifyModeFor(b){return b.notifyMode&&b.notifyMode!=='inherit'?b.notifyMode:(cfg.notifyMode||'milestones')}
let dloUpdateHistory=[];
function dloPersistUpdates(){dloSet({dloUpdateHistory:dloUpdateHistory.slice(-100)}).catch(()=>{})}
function dloMergeUpdates(rows){const added=[];for(const u of (rows||[])){if(u?.id&&!dloUpdateHistory.some(x=>x.id===u.id)){dloUpdateHistory.push(u);added.push(u)}}if(dloUpdateHistory.length>100)dloUpdateHistory=dloUpdateHistory.slice(-100);return added}
function updateDirection(b,p,old){
 const stateRank=x=>x==='dlo-hit'?4:x==='dlo-good'?3:x==='dlo-mid'?2:x==='dlo-warn'?1:x==='dlo-bad'?0:null;
 const nr=stateRank(statusFor(b,p).cls),or=stateRank(statusFor(b,old).cls);
 if(nr!=null&&or!=null&&nr!==or)return nr>or?'positive':'negative';
 if(p?.kind==='moneyline'){
  let nd=(Number(p.teamScore)||0)-(Number(p.oppScore)||0),od=(Number(old?.teamScore)||0)-(Number(old?.oppScore)||0);
  return nd>od?'positive':nd<od?'negative':'neutral';
 }
 if(p?.kind==='total'){
  let under=/under/i.test((b.prop||'')+' '+(b.selection||'')),nv=Number(p.total),ov=Number(old?.total);
  if(Number.isFinite(nv)&&Number.isFinite(ov)&&nv!==ov)return under?(nv<ov?'positive':'negative'):(nv>ov?'positive':'negative');
 }
 let nv=Number(p?.value),ov=Number(old?.value);
 if(Number.isFinite(nv)&&Number.isFinite(ov)&&nv!==ov){
  let under=/\bunder\b/i.test((b.prop||'')+' '+(b.selection||''));
  return under?(nv<ov?'positive':'negative'):(nv>ov?'positive':'negative');
 }
 if(p?.completed&&!old?.completed)return statusFor(b,p).cls==='dlo-bad'?'negative':'positive';
 return 'neutral';
}
function updateSummary(b,p,old,direction){
 let who=b.player||b.selection||'Bet',prop=displayCase(b.prop||'Bet'),stage=gameStage(p),detail='';
 if(p?.kind==='moneyline'){
  let score=`${p.teamScore}–${p.oppScore}`, label=statusFor(b,p).label||'Live';
  detail=`${label} · ${score}`;
 }else if(p?.kind==='spread'){
  let score=`${p.teamScore}–${p.oppScore}`,line=`${p.line>0?'+':''}${p.line}`,m=Number(p.coverMargin??p.margin),amt=Number.isFinite(m)?Math.abs(m):0;
  detail=m>0?`Covering by ${amt} · ${score} · ${line}`:m<0?`Short by ${amt} · ${score} · ${line}`:`Push · ${score} · ${line}`;
 }else if(p?.kind==='total'){
  let label=statusFor(b,p).label||'Live'; detail=`${label} · ${p.total} total`;
 }else{
  let nv=parseFloat(p?.value),ov=parseFloat(old?.value),goal=goalForBet(b),hit=Number.isFinite(nv)&&goal&&nv>=goal;
  if(Number.isFinite(nv)&&Number.isFinite(ov)&&nv!==ov){
   if(/shot/i.test(b.prop||'')) detail=`Shot on goal · ${Math.min(nv,goal)} of ${goal}`;
   else if(/goal|home run|touchdown|td scorer/i.test(b.prop||'')&&goal===1) detail='Scored';
   else if(/reception/i.test(b.prop||'')) detail=`Reception · ${Math.min(nv,goal)} of ${goal}`;
   else if(/(?:yards?|yds?)/i.test(b.prop||'')){let d=nv-ov;let eventD=Number(p?.eventDelta),eventLabel=String(p?.eventLabel||'');if(eventLabel&&Number.isFinite(eventD))detail=eventLabel;else detail=`${Math.abs(d)} yard ${/rush/i.test(b.prop||'')?'rush':'gain'}`;return {id:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),who,prop,detail,subdetail:`${nv} of ${goal}`,stage,time:Date.now(),direction}}
   else detail=`${Math.min(nv,goal)} of ${goal}`;
  }else detail=(statusFor(b,p).label||'Live')+(stage?` · ${stage}`:'');
 }
 return {id:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),who,prop,detail,stage,time:Date.now(),direction};
}
async function clearBetGroup(statKeyToClear){
 const before=Array.isArray(cfg.bets)?cfg.bets:[];
 const kept=before.filter(b=>statKey(b)!==statKeyToClear);
 if(kept.length===before.length)return;
 cfg.bets=kept;
 for(const k of Object.keys(progress)){if(!kept.some(b=>key(b)===k))delete progress[k]}
 delete seenProgress[statKeyToClear];
 await dloSet({bets:kept});
 if(dloMarkerHost)schedule(20);
 const box=document.getElementById('dlo-all-bets');if(box){box.remove();toggleAllBets()}
}
function toggleAllBets(){
 let old=document.getElementById('dlo-all-bets');if(old){old.remove();return}
 // All Bets is grouped by the actual selection/prop, not by sportsbook ticket. Round-robin
 // copies of the same leg therefore appear once, with the tickets using that leg underneath.
 let dock=document.getElementById('dlo-update-stack');if(dock){dock.classList.add('dlo-collapsed');dock.classList.remove('dlf-fantasy-open')}
 document.querySelectorAll('.dlo-anchor').forEach(x=>x._dloClose?.());
 let box=document.createElement('div');box.id='dlo-all-bets';box.className='dlo-all-bets';box.dataset.dloUi='true';box.dataset.dloTheme=dloAppTheme||'espn';
 let head=document.createElement('div');head.className='dlo-all-bets-head';head.innerHTML='<b>ALL BETS</b><button type="button" aria-label="Close all bets">×</button>';head.querySelector('button').onclick=e=>{e.stopPropagation();box.remove()};box.appendChild(head);
 let groups=new Map();for(const b of (cfg.bets||[])){let sk=statKey(b);if(!groups.has(sk))groups.set(sk,[]);groups.get(sk).push(b)}
 if(!groups.size){let empty=document.createElement('div');empty.className='dlo-all-bets-empty';empty.textContent='No bets currently loaded.';box.appendChild(empty)}
 for(const legs of groups.values()){
   let first=legs[0],wrap=document.createElement('div');wrap.className='dlo-prop-group';wrap.dataset.dloUi='true';let card=betCard(first,true),clearBtn=document.createElement('button');clearBtn.type='button';clearBtn.className='dlo-clear-bet';clearBtn.title='Clear this bet';clearBtn.setAttribute('aria-label','Clear this bet');clearBtn.textContent='×';clearBtn.onclick=e=>{e.stopPropagation();clearBetGroup(statKey(first))};card.appendChild(clearBtn);wrap.appendChild(card);
   if(legs.length>1){let toggle=document.createElement('button');toggle.type='button';toggle.className='dlo-prop-legs-toggle';toggle.textContent=`In ${legs.length} bet legs ▾`;let detail=document.createElement('div');detail.className='dlo-prop-legs-detail';legs.forEach((b,i)=>{let row=document.createElement('div');row.className='dlo-prop-leg-row';let bits=[`Bet ${i+1}`,b.odds||'',b.wager?('$'+b.wager):''].filter(Boolean);row.textContent=bits.join(' · ');detail.appendChild(row)});toggle.onclick=e=>{e.stopPropagation();let open=detail.classList.toggle('dlo-show');toggle.textContent=open?`Hide ${legs.length} bet legs ▴`:`In ${legs.length} bet legs ▾`};wrap.append(toggle,detail)}
   box.appendChild(wrap)
 }
 box.addEventListener('click',e=>{hidePushUpdate();e.stopPropagation()});document.body.appendChild(box);if(dock){const r=dock.getBoundingClientRect();box.style.setProperty('bottom',Math.max(0,Math.round(innerHeight-r.top)+5)+'px','important')}dloApplyTheme()
}
function ensureUpdateCenter(){
 let stack=document.getElementById('dlo-update-stack');
 // Extension reloads can leave DOM from an older content-script instance behind.
 // Reuse it only if the complete current structure exists; otherwise rebuild it.
 if(stack){
  const ok=stack.querySelector('.dlo-update-bar')&&stack.querySelector('.dlo-update-all')&&stack.querySelector('.dlo-all-bets-btn')&&stack.querySelector('.dlo-update-panel')&&stack.querySelector('.dlo-update-list')&&stack.querySelector('.dlo-update-clear');
  if(ok)return stack;
  stack.remove();
 }
 stack=document.createElement('div');stack.id='dlo-update-stack';stack.className='dlo-update-stack dlo-collapsed';stack.dataset.dloUi='true';stack.dataset.dloTheme=dloAppTheme||'espn';
 let bar=document.createElement('div');bar.className='dlo-update-bar';bar.innerHTML='<button type="button" class="dlo-all-bets-btn" title="See all bets" aria-label="See all bets">Bets</button><button type="button" class="dlo-update-all"><span class="dlo-update-label">Updates (0)</span></button>';
 let panel=document.createElement('div');panel.className='dlo-update-panel';
 let list=document.createElement('div');list.className='dlo-update-list';
 let actions=document.createElement('div');actions.className='dlo-update-actions';actions.innerHTML='<button type="button" class="dlo-update-clear">Clear updates</button>';
 panel.append(list,actions);stack.append(bar,panel);document.body.appendChild(stack);
 stack.addEventListener('click',e=>{if(!e.target.closest('.dlo-push-toast'))hidePushUpdate()},true);
 let hoverCloseTimer=null;
 const cancelHoverClose=()=>{if(hoverCloseTimer){clearTimeout(hoverCloseTimer);hoverCloseTimer=null}};
 const open=()=>{cancelHoverClose();document.getElementById('dlo-all-bets')?.remove();stack.classList.remove('dlf-fantasy-open');stack.classList.remove('dlo-collapsed')};
 const close=()=>{cancelHoverClose();stack.classList.add('dlo-collapsed')};
 const closeEverything=()=>{cancelHoverClose();stack.classList.add('dlo-collapsed');stack.classList.remove('dlf-fantasy-open');document.getElementById('dlo-all-bets')?.remove();document.querySelectorAll('.dlo-anchor').forEach(x=>x._dloClose?.())};
 stack._dloCloseEverything=closeEverything;
 /* Click opens/closes. Hover NEVER opens; once open, hovering holds it open and leaving gives a 1s grace period. */
 bar.querySelector('.dlo-update-all').onclick=e=>{e.stopPropagation();const isOpen=!stack.classList.contains('dlo-collapsed');if(isOpen){close()}else{open();markUpdatesChecked()}};
 actions.querySelector('.dlo-update-clear').onclick=e=>{e.stopPropagation();dloUpdateHistory=[];dloPersistUpdates();renderUpdateHistory();updateUnreadFlash();};
 bar.querySelector('.dlo-all-bets-btn').onclick=e=>{e.stopPropagation();toggleAllBets()};
 return stack;
}
function fireTestUpdate(direction='positive'){
 const positive=direction!=='negative';
 const u={id:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),who:'TEST · David Pastrnak',prop:'3+ Shots on Goal',detail:positive?'Shot on goal · 3 of 3':'Minnesota scored · Bruins now trailing',stage:'P3 · 14:06',time:Date.now(),direction:positive?'positive':'negative'};
 dloUpdateHistory.push(u);if(dloUpdateHistory.length>50)dloUpdateHistory.shift();
 let stack=ensureUpdateCenter();renderUpdateHistory();updateUnreadFlash();
}
try{chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{if(msg?.type==='DLO_TEST_UPDATE'){fireTestUpdate(msg.direction);sendResponse({ok:true});return true}})}catch(_){};
function removeUpdate(id){dloUpdateHistory=dloUpdateHistory.filter(u=>u.id!==id);dloPersistUpdates();renderUpdateHistory();updateUnreadFlash()}
let dloPushTimer=null;
function hidePushUpdate(){
  clearTimeout(dloPushTimer);dloPushTimer=null;
  const toast=document.querySelector('#dlo-update-stack > .dlo-push-toast');
  if(!toast)return;
  toast.classList.remove('dlo-push-show');
  dloLater(()=>{if(toast.isConnected&&!toast.classList.contains('dlo-push-show'))toast.remove()},120);
}
function dloUpdateSourceIcon(u){return u?.source==='fantasy'||u?.prop==='Fantasy'?'🏈':'🧾'}
function renderRecentUpdates(){
  const stack=ensureUpdateCenter();
  const u=dloUpdateHistory[dloUpdateHistory.length-1];
  if(!u)return;
  let toast=stack.querySelector('.dlo-push-toast');
  if(!toast){
    toast=document.createElement('div');
    toast.className='dlo-push-toast';
    toast.dataset.dloUi='true';
    toast.innerHTML='<button class="dlo-toast-x" type="button" aria-label="Close notification">×</button><b></b><span></span><em></em><small></small>';toast.querySelector('.dlo-toast-x').addEventListener('click',e=>{e.stopPropagation();hidePushUpdate()});
    stack.insertBefore(toast,stack.firstChild);
  }
  toast.className='dlo-push-toast dlo-update-'+(u.direction||'neutral')+' dlo-push-show';
  toast.querySelector('b').textContent=dloUpdateSourceIcon(u)+' '+(u.who||'Bet update');
  toast.querySelector('span').textContent=u.detail||'';
  toast.querySelector('em').textContent=u.subdetail||'';
  toast.querySelector('em').style.display=u.subdetail?'block':'none';
  toast.querySelector('small').textContent=[u.prop,u.stage].filter(Boolean).join(' · ');
  clearTimeout(dloPushTimer);
  dloPushTimer=dloLater(()=>{if(!toast.isConnected)return;toast.classList.remove('dlo-push-show');dloLater(()=>{if(toast.isConnected)toast.remove()},220)},5000);
}
function unreadUpdates(){return dloUpdateHistory.filter(u=>!u.checked)}
function updateUnreadFlash(){
 const stack=ensureUpdateCenter(),btn=stack.querySelector('.dlo-update-all'),u=unreadUpdates();
 stack.classList.remove('dlo-unread-good','dlo-unread-bad','dlo-unread-mixed','dlo-unread-neutral');
 if(!u.length)return;
 const neutral=u.some(x=>x.direction==='neutral'),good=u.some(x=>x.direction==='positive'),bad=u.some(x=>x.direction==='negative');
 stack.classList.add(neutral?'dlo-unread-neutral':good&&bad?'dlo-unread-mixed':bad?'dlo-unread-bad':'dlo-unread-good');
}
function markUpdatesChecked(){
 let changed=false;dloUpdateHistory=dloUpdateHistory.map(u=>u.checked?u:(changed=true,{...u,checked:true}));
 if(changed)dloPersistUpdates();updateUnreadFlash();
}
function renderUpdateHistory(){
 const stack=ensureUpdateCenter(),list=stack.querySelector('.dlo-update-list'),panel=stack.querySelector('.dlo-update-panel');if(!list||!panel)return;
 list.innerHTML='';
 if(!dloUpdateHistory.length){
  const empty=document.createElement('div');empty.className='dlo-update-empty-state';empty.innerHTML='<b>NO NEW UPDATES</b>';list.appendChild(empty);
 }else{
  dloUpdateHistory.slice().reverse().forEach((u,i)=>{let r=document.createElement('div');r.className='dlo-update-history-row dlo-update-'+u.direction+(i===0?' dlo-update-latest':'');r.dataset.dloUi='true';r.innerHTML='<button type="button" class="dlo-update-dismiss" title="Dismiss this update" aria-label="Dismiss this update">×</button><b></b><span></span><em></em><small></small>';r.querySelector('b').textContent=dloUpdateSourceIcon(u)+' '+u.who;r.querySelector('span').textContent=u.detail;r.querySelector('em').textContent=u.subdetail||'';r.querySelector('em').style.display=u.subdetail?'block':'none';r.querySelector('small').textContent=[u.prop,u.stage].filter(Boolean).join(' · ');r.querySelector('.dlo-update-dismiss').onclick=e=>{e.stopPropagation();removeUpdate(u.id)};list.appendChild(r)});
 }
 const ub=stack.querySelector('.dlo-update-all'),ul=ub?.querySelector('.dlo-update-label');if(ul)ul.textContent=`Updates (${unreadUpdates().length})`;else if(ub)ub.textContent=`Updates (${unreadUpdates().length})`;
 panel.classList.toggle('dlo-update-empty',dloUpdateHistory.length===0);updateUnreadFlash();
}
function toast(b,p,old){let mode=notifyModeFor(b);if(mode==='off'||!old)return;let becameFinal=!!p?.completed&&!old?.completed,should=becameFinal;if(!becameFinal&&(p?.kind==='moneyline'||p?.kind==='spread')){should=p.teamScore!==old.teamScore||p.oppScore!==old.oppScore}else if(!becameFinal&&p?.kind==='total'){should=p.total!==old.total}else if(!becameFinal){if(p?.value==null)return;let v=parseFloat(p.value),ov=parseFloat(old?.value),goal=goalForBet(b);if(!Number.isFinite(v)||!goal)return;if(Number.isFinite(ov)&&ov>=goal)return;/* Once a threshold bet is hit, extra stats do not create overload updates. */if(mode==='every')should=Number.isFinite(ov)&&v!==ov;else if(Number.isFinite(ov)){let marks=[.25,.5,.75,1];should=marks.some(m=>ov/goal<m&&v/goal>=m)}}if(!should)return;
 let direction=becameFinal?'neutral':updateDirection(b,p,old);if(direction==='neutral'&&!becameFinal){let ns=statusFor(b,p).cls;direction=ns==='dlo-bad'?'negative':'positive'}
 let u=updateSummary(b,p,old,direction);const sk=statKey(b);u.id='live:'+sk+':'+JSON.stringify([p?.value,p?.teamScore,p?.oppScore,p?.total,p?.completed,p?.eventId||'']);u.source='bet';u.statKey=sk;u.resultValue=(p?.kind==='moneyline'||p?.kind==='spread')?`${p?.teamScore}|${p?.oppScore}|${!!p?.completed}`:p?.kind==='total'?`${p?.total}|${!!p?.completed}`:`${p?.value}|${!!p?.completed}`;u.checked=false;if(!dloUpdateHistory.some(x=>x.id===u.id)){dloUpdateHistory.push(u);if(dloUpdateHistory.length>100)dloUpdateHistory=dloUpdateHistory.slice(-100);dloPersistUpdates();ensureUpdateCenter();renderUpdateHistory();updateUnreadFlash();renderRecentUpdates();}}
async function fetchProgress(items){let lost=new Set(),needsRender=false,unique=new Map();for(const b of items){if(!b.prop)continue;if(!b.player&&!/(moneyline|spread|total runs|total points|game total|total goals)/i.test((b.prop||'')+' '+(b.selection||'')))continue;let sk=statKey(b);if(!unique.has(sk))unique.set(sk,[]);unique.get(sk).push(b)}for(const legs of unique.values()){let b=legs[0],sk=statKey(b);try{let r=await dloSend({type:'DLO_PROGRESS',bet:b});if(r?.data){let old=seenProgress[sk],hadTeam=legs.some(x=>progress[key(x)]?.team);for(const leg of legs){let k=key(leg);progress[k]=r.data;updateCards(leg);let st=statusFor(leg,r.data);if(r.data.completed&&st.cls==='dlo-bad'&&r.data.value!=null)lost.add(k)}if(r.data.team&&!hadTeam)needsRender=true;if(old)toast(b,r.data,old);seenProgress[sk]=r.data}}catch(e){}}if(needsRender)schedule(40);/* One live-stat fetch + one notification per unique prop. Duplicate RR/parlay copies share the same progress. */}
function ownerTeam(b){let pt=progress[key(b)]?.team;if(pt)return pt;let sel=b.selection||'';if(palette(sel))return sel;if(!b.player&&/(total|over|under)/i.test((b.prop||'')+' '+sel))return '';return b.team||''}
function bestTeamNode(team,matchTeams){let candidates=nodesFor(team);if(!candidates.length)return null;let exact=candidates.filter(n=>{let t=norm(clean(n.textContent));return variants(team).some(v=>t===norm(v))});return (exact[0]||candidates[0])}
function render(){
 if(!dloContextAlive())return;
 if(rendering){renderQueued=true;return}rendering=true;
 try{
  if(!cfg.enabled||!cfg.bets?.length){clear();return}
  let buckets=new Map(),nodeIds=new WeakMap(),nodeSeq=0;
  for(const b of cfg.bets){let teams=(b.matchTeams||[]).filter(Boolean);if(!teams.length)continue;let gameKey=teams.map(norm).sort().join('|'),owner=ownerTeam(b),node=owner?bestTeamNode(owner,teams):null;if(!node){let candidates=nodesFor(teams[0]);node=candidates.find(n=>{let c=gameContext(n,teams),txt=clean(c.innerText);return teams.every(t=>contains(txt,t))})||candidates[0]}if(!node)continue;if(!nodeIds.has(node))nodeIds.set(node,++nodeSeq);let bucketKey=gameKey+'::node'+nodeIds.get(node),g=buckets.get(bucketKey);if(!g){g={node,items:[]};buckets.set(bucketKey,g)}if(!g.items.some(x=>key(x)===key(b)))g.items.push(b)}
  // Resolve the complete model first, then swap markers in one synchronous pass.
  // This prevents the temporary 🔥1 / 🔥2 / 🔥3 cascade during page hydration.
  clear();
  for(const [bucketKey,g] of buckets){if(!g.node?.isConnected)continue;let anchor=make(g.items,cfg.bets);anchor.dataset.dloBucket=bucketKey;g.node.insertAdjacentElement('afterend',anchor)}
 }finally{rendering=false;if(renderQueued){renderQueued=false;schedule(40)}}
}
function schedule(ms=900){clearTimeout(timer);timer=setTimeout(render,ms)}
const dloAllowedHost=true;
const dloMarkerHost=/(^|\.)espn\.com$/i.test(location.hostname);
if(!dloMarkerHost)clear(); // 🔥 markers belong to ESPN only; never decorate FanDuel or other sites.
if(dloAllowedHost){ensureUpdateCenter();renderUpdateHistory();}
(async()=>{let d=await dloGet({bets:[],enabled:true,notifyMode:'milestones',rawText:'',schemaVersion:0,dloUpdateHistory:[]});if(!dloContextAlive())return;let valid=(d.bets||[]).filter(b=>globalThis.DLOParser?.isValidBet?.(b));if(valid.length!==(d.bets||[]).length||d.schemaVersion<390){d={...d,bets:valid,schemaVersion:390};await dloSet({bets:valid,schemaVersion:390})}cfg=d;dloMergeUpdates(d.dloUpdateHistory||[]);let repaired=(cfg.bets||[]).map(repairStoredBet),changed=repaired.some((b,i)=>b.player!==cfg.bets[i]?.player||b.target!==cfg.bets[i]?.target||b.prop!==cfg.bets[i]?.prop);if(changed){cfg.bets=repaired;await dloSet({bets:repaired,schemaVersion:393})}if(dloMarkerHost)render()})().catch(()=>{});
try{chrome.storage.onChanged.addListener(c=>{
 if(!dloContextAlive())return;
 let markerChanged=false;
 if(c.bets){cfg.bets=(c.bets.newValue||[]).filter(b=>globalThis.DLOParser?.isValidBet?.(b));markerChanged=true}
 if(c.enabled){cfg.enabled=c.enabled.newValue!==false;markerChanged=true}
 if(c.notifyMode)cfg.notifyMode=c.notifyMode.newValue||'milestones';
 if(c.dloUpdateHistory){const added=dloMergeUpdates(c.dloUpdateHistory.newValue||[]);try{renderUpdateHistory();updateUnreadFlash();if(added.length)renderRecentUpdates()}catch(_){}}
 if(dloMarkerHost&&markerChanged)schedule(80)
})}catch(_){};
document.addEventListener('click',()=>{document.querySelectorAll('.dlo-anchor').forEach(x=>x._dloClose?.())},{passive:true});
// Performance rule: never observe the host page's full DOM. ESPN/React can mutate thousands of nodes per second.
// Markers refresh on init, relevant storage changes, and SPA URL changes only.
let dloPollBusy=false;async function dloLivePoll(){if(!dloContextAlive()||dloPollBusy||!cfg.enabled||!cfg.bets?.length)return;dloPollBusy=true;try{await fetchProgress(cfg.bets)}finally{dloPollBusy=false}}
if(dloMarkerHost){dloLater(dloLivePoll,1000);dloEvery(dloLivePoll,4000)}

// Cheap SPA navigation check. No DOM observer and no sub-second polling.
let dloLastUrl=location.href;if(dloMarkerHost)dloEvery(()=>{if(location.href!==dloLastUrl){dloLastUrl=location.href;schedule(80)}},2000);
// FanDuel import intentionally lives in popup.js only. No FanDuel content-script path.

try{chrome.storage.local.get({appTheme:'espn'},d=>{dloAppTheme=d.appTheme||'espn';dloApplyTheme()});chrome.storage.onChanged.addListener(ch=>{if(ch.appTheme){dloAppTheme=ch.appTheme.newValue||'espn';dloApplyTheme()}})}catch(_){}
}
