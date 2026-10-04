const LEAGUES=[['hockey','nhl'],['baseball','mlb'],['football','nfl'],['basketball','nba']];
const cache=new Map(), n=s=>(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
async function json(url,ttl=15000){const c=cache.get(url);if(c&&Date.now()-c.t<ttl)return c.v;const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(r.status);const v=await r.json();cache.set(url,{t:Date.now(),v});return v}
function teamNames(c){return (c.competitions?.[0]?.competitors||[]).flatMap(x=>[x.team?.displayName,x.team?.shortDisplayName,x.team?.abbreviation,x.team?.name]).filter(Boolean)}
function scoreEvent(e,terms){let names=teamNames(e).map(n);return terms.reduce((s,t)=>s+(names.some(x=>x===n(t)||x.includes(n(t))||n(t).includes(x))?1:0),0)}
function playerMatch(a,b){a=n(a);b=n(b);return a===b||(a.length>6&&b.length>6&&(a.includes(b)||b.includes(a)))}
function findIndex(labels,opts){let L=labels.map(x=>n(x));for(const o of opts){let z=n(o),i=L.findIndex(x=>x===z);if(i>=0)return i}for(const o of opts){let z=n(o),i=L.findIndex(x=>z.length>1&&x.includes(z));if(i>=0)return i}return -1}
function marketKind(prop){
 const p=(prop||'').toLowerCase();
 if(/any\s*time.*touchdown|touchdown scorer|td scorer|(?:^|\s)\d+(?:\.\d+)?\+?\s*touchdowns?\b/.test(p))return 'anytime_td';
 if(/passing.*touchdown/.test(p))return 'passing_td';
 if(/shot/.test(p))return 'shots'; if(/goal/.test(p))return 'goals'; if(/assist/.test(p))return 'assists';
 if(/receptions?|\brec\b/.test(p))return 'receptions'; if(/receiv(?:ing)?.*(?:yard|yds)|\brec\s*yds\b/.test(p))return 'receiving_yards';
 if(/rush(?:ing)?.*(?:yard|yds)/.test(p))return 'rushing_yards'; if(/pass(?:ing)?.*(?:yard|yds)/.test(p))return 'passing_yards';
 if(/home run/.test(p))return 'home_runs'; if(/stolen base/.test(p))return 'stolen_bases'; if(/total bases/.test(p))return 'total_bases';
 if(/strikeout|\bks?\b/.test(p))return 'strikeouts'; if(/\bpoints?\b|\bpts\b/.test(p))return 'points'; if(/rebound|\breb\b/.test(p))return 'rebounds';
 if(/assist|\bast\b/.test(p))return 'assists'; if(/\bblocks?\b|\bblk\b/.test(p))return 'blocks'; if(/\bsteals?\b|\bstl\b/.test(p))return 'steals'; return '';
}
function optsFor(p,league){switch(marketKind(p)){case 'shots':return league==='nhl'?['S','Shots','SOG','Shots on Goal']:['SOG','Shots'];case 'goals':return league==='nhl'?['G','Goals']:['Goals'];case 'assists':return ['A','Assists'];case 'receptions':return ['REC','Receptions'];case 'receiving_yards':return ['YDS','Receiving Yards','Rec Yds'];case 'rushing_yards':return ['YDS','Rushing Yards','Rush Yds'];case 'passing_yards':return ['YDS','Passing Yards','Pass Yds'];case 'passing_td':return ['TD','Touchdowns'];case 'anytime_td':return ['TD','Touchdowns'];case 'home_runs':return ['HR','Home Runs'];case 'stolen_bases':return ['SB','Stolen Bases'];case 'total_bases':return ['TB','Total Bases'];case 'strikeouts':return ['K','SO','Strikeouts'];case 'points':return ['PTS','Points'];case 'rebounds':return ['REB','Rebounds'];case 'blocks':return ['BLK','Blocks'];case 'steals':return ['STL','Steals'];default:return []}}
function nflAnytimeTd(data,player){let total=0,found=false,team='';for(const g of data.boxscore?.players||[])for(const st of g.statistics||[]){let title=(st.name||st.displayName||st.type||'').toLowerCase();if(/passing/.test(title))continue;let labels=(st.labels||st.names||[]).map(String),i=findIndex(labels,['TD','Touchdowns']);if(i<0)continue;for(const a of st.athletes||[]){let name=a.athlete?.displayName||a.athlete?.fullName||'';if(!playerMatch(name,player))continue;let v=Number(a.stats?.[i]);if(Number.isFinite(v)){total+=v;found=true;team=g.team?.displayName||g.team?.shortDisplayName||team}}}return found?{value:String(total),label:'TD',player,team}:null}
function statFromSummary(data,player,prop,league){const kind=marketKind(prop);if(league==='nfl'&&kind==='anytime_td'){let td=nflAnytimeTd(data,player);if(td)return td}for(const g of data.boxscore?.players||[])for(const st of g.statistics||[]){const labels=(st.labels||st.names||[]).map(String),opts=optsFor(prop,league),section=String(st.name||st.displayName||st.type||'').toLowerCase();/* NFL uses the same YDS label in passing, rushing and receiving tables. Require the correct stat table so a QB rushing prop can never resolve to his passing yards. */if(league==='nfl'){if(kind==='rushing_yards'&&!/rush/.test(section))continue;if(kind==='receiving_yards'&&!/receiv/.test(section))continue;if(kind==='passing_yards'&&!/pass/.test(section))continue;if(kind==='receptions'&&!/receiv/.test(section))continue;if(kind==='passing_td'&&!/pass/.test(section))continue}for(const a of st.athletes||[]){const name=a.athlete?.displayName||a.athlete?.fullName||'';if(!playerMatch(name,player))continue;let i=findIndex(labels,opts);if(i>=0&&a.stats?.[i]!=null)return {value:a.stats[i],label:labels[i],player:name,team:g.team?.displayName||g.team?.shortDisplayName||''}}}return null}

function nflLatestPlayerEvent(data,player,kind){
 if(!data||!player)return null;
 let plays=[];
 const add=a=>{if(Array.isArray(a))plays.push(...a)};
 add(data.plays);
 const d=data.drives||{};
 if(d.current)add(d.current.plays);
 if(Array.isArray(d.previous))for(const dr of d.previous)add(dr?.plays);
 let pn=n(player),best=null;
 for(const pl of plays){
  let text=String(pl?.text||pl?.shortText||pl?.description||'');
  if(!text||!n(text).includes(pn))continue;
  let yards=null,label='';
  if(kind==='rushing_yards'&&/\b(?:rush|rushed|scramble|scrambles|scrambled|left end|right end|left tackle|right tackle|left guard|right guard|up the middle)\b/i.test(text)){
   let m=text.match(/\bfor\s+(-?\d+)\s+yards?\b/i)||text.match(/\b(-?\d+)\s+yard\s+rush\b/i);
   if(m){yards=Number(m[1]);label=`${Math.abs(yards)} yard rush`}
  }else if(kind==='receiving_yards'){
   let m=text.match(/\bfor\s+(-?\d+)\s+yards?\b/i);
   if(m&&/pass|complete|reception/i.test(text)){yards=Number(m[1]);label=`${Math.abs(yards)} yard reception`}
  }
  if(yards==null)continue;
  let seq=Number(pl?.sequenceNumber??pl?.id??0)||0;
  if(!best||seq>=best.seq)best={id:String(pl?.id||pl?.sequenceNumber||text),seq,yards,label,text};
 }
 return best;
}
function playerTeamFromSummary(data,player){for(const g of data.boxscore?.players||[])for(const st of g.statistics||[])for(const a of st.athletes||[]){const name=a.athlete?.displayName||a.athlete?.fullName||'';if(playerMatch(name,player))return g.team?.displayName||g.team?.shortDisplayName||''}return ''}
function gameMeta(ev,league){let st=ev.status||{},t=st.type||{};return {event:ev.name||'',state:t.shortDetail||t.detail||'',completed:!!t.completed,period:+st.period||0,clock:st.displayClock||'',league}}
function scoreInfo(ev){return (ev.competitions?.[0]?.competitors||[]).map(c=>({team:c.team?.displayName||c.team?.shortDisplayName||c.team?.name||'',abbr:c.team?.abbreviation||'',score:Number(c.score||0),homeAway:c.homeAway||''}))}
function teamWords(s){return String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>1&&!['the','moneyline','spread','ml'].includes(x))}
function teamSimilarity(a,b){let A=teamWords(a),B=teamWords(b);if(!A.length||!B.length)return 0;let na=n(a),nb=n(b);if(na===nb)return 10000;if(na.length>3&&nb.length>3&&(na.includes(nb)||nb.includes(na)))return 7000;let hit=[...new Set(A)].filter(x=>B.includes(x)).length;let lastA=A[A.length-1],lastB=B[B.length-1];return hit*100+(lastA===lastB?500:0)-Math.abs(A.length-B.length)}
function ticketPick(b){
 // A score bet's selected side belongs to the ticket, never to a player-stat guess.
 const mt=(b.matchTeams||[]).filter(Boolean).slice(0,2);
 const raw=[b.selection,b.pickedTeam,!b.player?b.player:''].filter(Boolean).join(' ');
 if(!mt.length)return raw.trim();
 let ranked=mt.map(t=>({t,s:teamSimilarity(raw,t)})).sort((a,z)=>z.s-a.s);
 if(ranked[0]?.s>0 && ranked[0].s>(ranked[1]?.s||-1))return ranked[0].t;
 // Last safe fallback: if exactly one ticket team literally occurs in the saved selection/market text.
 const blob=[b.selection,b.prop].filter(Boolean).join(' ').toLowerCase();
 const literal=mt.filter(t=>blob.includes(String(t).toLowerCase()));
 return literal.length===1?literal[0]:'';
}
function pickedSide(b,cs){
 const pick=ticketPick(b);if(!pick)return null;
 let ranked=cs.map(c=>({c,s:Math.max(teamSimilarity(pick,c.team),teamSimilarity(pick,c.abbr))})).sort((a,z)=>z.s-a.s);
 return ranked[0]?.s>0 && ranked[0].s>(ranked[1]?.s||-1)?ranked[0].c:null;
}
function spreadLine(b){
 if(Number.isFinite(Number(b.line)))return Number(b.line);
 for(const raw of [b.prop,b.selection]){let m=String(raw||'').match(/(^|\s)([+-]\d+(?:\.\d+)?)(?=\s|$)/);if(m)return Number(m[2])}
 return NaN;
}
function scoreBet(b,ev,meta){
 let prop=String(b.prop||''),sel=String(b.selection||''),blob=(prop+' '+sel).toLowerCase(),cs=scoreInfo(ev);if(cs.length!==2)return null;
 let mine=pickedSide(b,cs),opp=mine?cs.find(c=>c!==mine):null;
 if(/moneyline/.test(blob)){
   if(!mine||!opp)return {...meta,kind:'moneyline',resolved:false,reason:'selected-team-not-found',source:'ESPN scoreboard'};
   let d=mine.score-opp.score,status=d>0?'winning':d<0?'losing':'tied';
   return {...meta,kind:'moneyline',resolved:true,team:mine.team,pickedTeam:mine.team,value:String(mine.score),teamScore:mine.score,oppScore:opp.score,oppTeam:opp.team,status,source:'ESPN scoreboard'};
 }
 if(/spread/.test(blob)){
   let line=spreadLine(b);
   if(!mine||!opp)return {...meta,kind:'spread',resolved:false,reason:'selected-team-not-found',source:'ESPN scoreboard'};
   if(!Number.isFinite(line))return {...meta,kind:'spread',resolved:false,reason:'spread-line-not-found',team:mine.team,teamScore:mine.score,oppScore:opp.score,oppTeam:opp.team,source:'ESPN scoreboard'};
   let rawMargin=mine.score-opp.score,coverMargin=rawMargin+line,status=coverMargin>0?'winning':coverMargin<0?'losing':'tied';
   return {...meta,kind:'spread',resolved:true,team:mine.team,pickedTeam:mine.team,value:String(mine.score),teamScore:mine.score,oppScore:opp.score,oppTeam:opp.team,line,rawMargin,adjusted:mine.score+line,margin:coverMargin,coverMargin,status,source:'ESPN scoreboard + spread'};
 }
 if(/total runs|total points|game total|total goals/.test(blob)||/^\s*(over|under)\b/i.test(sel)){let m=(sel+' '+prop).match(/\b(over|under)\s+(\d+(?:\.\d+)?)/i);if(!m)return null;let total=cs.reduce((a,c)=>a+c.score,0);return {...meta,kind:'total',resolved:true,direction:m[1].toLowerCase(),line:+m[2],value:String(total),total,source:'ESPN scoreboard'} }
 return null;
}

async function findGame(terms){for(const [sport,league] of LEAGUES){try{let board=await json(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`,900);let ranked=(board.events||[]).map(e=>({e,s:scoreEvent(e,terms)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);if(!ranked.length)continue;if(terms.length>1&&ranked[0].s<2)continue;return {sport,league,ev:ranked[0].e}}catch(e){}}return null}
async function progress(b){let terms=(b.matchTeams||[]).filter(Boolean);if(!terms.length)return {resolved:false,reason:'no-game'};let hit=await findGame(terms);if(!hit)return {resolved:false,reason:'game-not-found'};let {sport,league,ev}=hit,meta=gameMeta(ev,league);
 let sb=scoreBet(b,ev,meta);if(sb)return sb;
 // Resolver 1: ESPN summary box score.
 try{let sum=await json(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${ev.id}`,900);let stat=statFromSummary(sum,b.player,b.prop,league);if(stat){let pe=league==='nfl'?nflLatestPlayerEvent(sum,b.player,marketKind(b.prop)):null;return {...meta,value:String(stat.value),team:stat.team,resolved:true,source:'ESPN box score',eventId:pe?.id||'',eventDelta:pe?.yards,eventLabel:pe?.label||'',eventText:pe?.text||''}};let pt=playerTeamFromSummary(sum,b.player);if(pt)meta.team=pt}catch(e){}
 // Resolver 2: force a fresh summary request once (bypasses our cache).
 try{cache.delete(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${ev.id}`);let sum=await json(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${ev.id}&dlo=${Date.now()}`,0);let stat=statFromSummary(sum,b.player,b.prop,league);if(stat){let pe=league==='nfl'?nflLatestPlayerEvent(sum,b.player,marketKind(b.prop)):null;return {...meta,value:String(stat.value),team:stat.team,resolved:true,source:'ESPN fresh box score',eventId:pe?.id||'',eventDelta:pe?.yards,eventLabel:pe?.label||'',eventText:pe?.text||''}};let pt=playerTeamFromSummary(sum,b.player);if(pt)meta.team=pt}catch(e){}
 // A supported player market in a positively matched game is zero until ESPN reports a stat.
 // This prevents normal pregame/early-game 0s from being mislabeled as unavailable.
 if(b.player&&marketKind(b.prop)&&!meta.completed)return {...meta,resolved:true,value:'0',team:meta.team||'',source:'ESPN matched game · zero until reported'};
 return {...meta,resolved:false,reason:'stat-not-in-feed',source:'ESPN background API'}
}
chrome.runtime.onMessage.addListener((m,s,send)=>{if(m?.type!=='DLO_PROGRESS')return;progress(m.bet).then(v=>send({ok:true,data:v})).catch(e=>send({ok:false,error:String(e)}));return true});


async function nflTeamStates(){
 const board=await json('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',900);
 const teams={};
 for(const ev of board.events||[]){
  const typ=ev?.status?.type||{};
  const state=String(typ.state||'').toLowerCase();
  const live=state==='in' || (!typ.completed && (+ev?.status?.period||0)>0);
  for(const c of ev?.competitions?.[0]?.competitors||[]){
   const ab=String(c?.team?.abbreviation||'').toUpperCase();
   if(ab)teams[ab]={live,state,completed:!!typ.completed,detail:typ.shortDetail||typ.detail||''};
  }
 }
 return teams;
}
chrome.runtime.onMessage.addListener((m,s,send)=>{
 if(m?.type!=='DLO_NFL_TEAM_STATES')return;
 nflTeamStates().then(teams=>send({ok:true,teams})).catch(e=>send({ok:false,error:String(e)}));
 return true;
});

async function nflPlayerStats(player,team){
 const board=await json('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',900);
 const ab=String(team||'').toUpperCase();let ev=null;
 for(const e of board.events||[]){const abs=(e.competitions?.[0]?.competitors||[]).map(c=>String(c?.team?.abbreviation||'').toUpperCase());if(ab&&abs.includes(ab)){ev=e;break}}
 if(!ev)return {stats:[],status:''};
 const sum=await json(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${ev.id}`,5000);
 const out=[];const seen=new Set();
 for(const g of sum.boxscore?.players||[])for(const st of g.statistics||[]){const labels=(st.labels||st.names||[]).map(String);for(const a of st.athletes||[]){const nm=a.athlete?.displayName||a.athlete?.fullName||'';if(!playerMatch(nm,player))continue;for(let i=0;i<labels.length;i++){const value=a.stats?.[i];if(value==null||value===''||String(value)==='0'||String(value)==='0.0')continue;const section=String(st.displayName||st.name||'').replace(/statistics?/ig,'').trim();const label=(section?section+' ':'')+labels[i];const key=n(label);if(seen.has(key))continue;seen.add(key);out.push({label,value:String(value)})}}}
 const preferred=out.filter(x=>/passing|rushing|receiving|fumbles/i.test(x.label));
 const typ=ev?.status?.type||{};return {stats:(preferred.length?preferred:out).slice(0,8),status:typ.shortDetail||typ.detail||''};
}
chrome.runtime.onMessage.addListener((m,s,send)=>{
 if(m?.type!=='DLO_NFL_PLAYER_STATS')return;
 nflPlayerStats(m.player,m.team).then(v=>send({ok:true,...v})).catch(e=>send({ok:false,error:String(e),stats:[]}));
 return true;
});

// v0.4.6 — persistent background bet polling + update queue.
const DLO_BG_ALARM='dlo-live-background-poll';
const dloBgNorm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function dloBgStatKey(b){return [dloBgNorm(b.player||b.selection),dloBgNorm(b.prop),...(b.matchTeams||[]).map(dloBgNorm).sort()].join('|')}
function dloBgSnapshot(p){if(!p)return '';if(p.kind==='moneyline'||p.kind==='spread')return [p.kind,p.teamScore,p.oppScore,p.completed].join('|');if(p.kind==='total')return [p.kind,p.total,p.completed].join('|');return [p.value,p.completed,p.eventId||''].join('|')}
function dloBgUpdate(b,p,old,sk){
 let who=b.player||b.selection||'Bet update', detail='', direction='positive';
 if(p.kind==='moneyline'||p.kind==='spread'){
  detail=`${p.team||who}: ${p.teamScore} - ${p.oppScore}`;
  const nd=(Number(p.teamScore)||0)-(Number(p.oppScore)||0), od=(Number(old?.teamScore)||0)-(Number(old?.oppScore)||0); direction=nd>=od?'positive':'negative';
 }else if(p.kind==='total'){detail=`Game total: ${p.total}`;direction=Number(p.total)>=Number(old?.total)?'positive':'negative'}
 else {const nv=Number(p.value),ov=Number(old?.value);detail=`${p.eventLabel||p.label||'Stat'}: ${Number.isFinite(ov)?ov:'--'} → ${Number.isFinite(nv)?nv:p.value}`;direction=Number.isFinite(nv)&&Number.isFinite(ov)&&nv<ov?'negative':'positive'}
 if(p.completed&&!old?.completed)direction='neutral';const sig=dloBgSnapshot(p);const resultValue=(p.kind==='moneyline'||p.kind==='spread')?`${p.teamScore}|${p.oppScore}|${!!p.completed}`:p.kind==='total'?`${p.total}|${!!p.completed}`:`${p.value}|${!!p.completed}`;return {id:`bg:${sk}:${sig}`,source:'bet',statKey:sk,resultValue,who,detail,subdetail:'Background update',prop:b.prop||'',stage:p.completed?'FINAL':(p.state||p.clock||'Live'),direction,checked:false,ts:Date.now()};
}
async function dloBackgroundPoll(){
 const st=await chrome.storage.local.get({bets:[],enabled:true,dloBgSeenProgress:{},dloUpdateHistory:[]});
 if(st.enabled===false||!Array.isArray(st.bets)||!st.bets.length)return;
 const unique=new Map();for(const b of st.bets){if(!b?.prop)continue;const sk=dloBgStatKey(b);if(!unique.has(sk))unique.set(sk,b)}
 const seen={...(st.dloBgSeenProgress||{})};let hist=Array.isArray(st.dloUpdateHistory)?st.dloUpdateHistory.slice():[];let changed=false;
 for(const [sk,b] of unique){try{const p=await progress(b);if(!p?.resolved)continue;const old=seen[sk];const snap=dloBgSnapshot(p),oldSnap=dloBgSnapshot(old);if(old&&snap!==oldSnap){const u=dloBgUpdate(b,p,old,sk);const lastSameBet=[...hist].reverse().find(x=>x?.source==='bet'&&x?.statKey===sk&&x?.resultValue!=null);const confirmsExisting=lastSameBet&&String(lastSameBet.resultValue)===String(u.resultValue);if(!confirmsExisting&&!hist.some(x=>x.id===u.id)){hist.push(u);changed=true}}seen[sk]=p}catch(_){}}
 if(hist.length>100)hist=hist.slice(-100);await chrome.storage.local.set({dloBgSeenProgress:seen,...(changed?{dloUpdateHistory:hist}:{}),dloLastBackgroundPoll:Date.now()});
}
function dloEnsureAlarm(){try{chrome.alarms.create(DLO_BG_ALARM,{periodInMinutes:1})}catch(_){}}
chrome.runtime.onInstalled.addListener(()=>{dloEnsureAlarm();dloBackgroundPoll().catch(()=>{})});
chrome.runtime.onStartup.addListener(()=>{dloEnsureAlarm();dloBackgroundPoll().catch(()=>{})});
chrome.alarms.onAlarm.addListener(a=>{if(a?.name===DLO_BG_ALARM)dloBackgroundPoll().catch(()=>{})});
dloEnsureAlarm();
