(function(g){
const clean=s=>(s||'').replace(/\s+/g,' ').trim();
const TEAMS=['New York Yankees','Tampa Bay Rays','Chicago White Sox','Cleveland Guardians','Atlanta Braves','Los Angeles Dodgers','San Diego Padres','Milwaukee Brewers','Boston Red Sox','Boston Bruins','Minnesota Wild','Montreal Canadiens','Pittsburgh Penguins','Ottawa Senators','Toronto Maple Leafs','Chicago Blackhawks','Buffalo Sabres','Seattle Kraken','Edmonton Oilers','Carolina Hurricanes','Philadelphia Flyers','Utah Mammoth','Columbus Blue Jackets','Washington Capitals','Tampa Bay Lightning','New York Rangers','Anaheim Ducks','San Jose Sharks','Green Bay Packers','New England Patriots','Pittsburgh Steelers','Cleveland Browns','Buffalo Bills','New York Jets','Chicago Bears','Dallas Cowboys','Houston Texans','Philadelphia Eagles','Tampa Bay Buccaneers','Tennessee Titans','Baltimore Ravens','Jacksonville Jaguars','Cincinnati Bengals','Miami Dolphins','Minnesota Vikings','Kansas City Chiefs','Las Vegas Raiders','Los Angeles Chargers','Seattle Seahawks','Denver Broncos','San Francisco 49ers','Detroit Lions','Carolina Panthers','Atlanta Falcons','New Orleans Saints','Indianapolis Colts','Washington Commanders','Arizona Cardinals','New York Giants','Los Angeles Rams'];
const stripPitcher=s=>clean(s).replace(/\s*\([^)]*\)\s*$/,''),isTeam=s=>TEAMS.includes(stripPitcher(s)),baseTeam=stripPitcher;
const isOdds=s=>/^[+-]\d{2,7}$/.test(s),isMoney=s=>/^\$\d+(?:\.\d{1,2})?$/.test(s);
// Accept sportsbook-style market labels, not arbitrary page/search text that merely contains words like 'passing' or 'points'.
const isProp=s=>/^(?:player to record\s+)?(?:\d+\+\s+)?(?:shots? on goal|receptions?|receiving yards?|rushing yards?|passing yards?|passing touchdowns?|touchdowns?|tds?|strikeouts?|points?|rebounds?|assists?|blocks?|steals?|total bases|home runs?|stolen bases?|goals?|rush(?:ing)? yds|rec(?:eiving)? yds|pass(?:ing)? yds)(?:\b.*)?$|^(?:anytime\s+)?(?:goal|touchdown|td) scorer(?:\b.*)?$|^moneyline$|^spread(?:\b.*)?$|^(?:alternate\s+)?run line(?:s)?(?:\b.*)?$|^(?:over|under)\s+\d+(?:\.\d+)?\s+total runs(?:\b.*)?$/i.test(clean(s));
const bad=s=>/^(my bets|open|settled|saved|box score|play-by-play|go to event|cash out|reuse|share bet|total wager|total payout|max returns|placed:|bet id:|finished|top \d|bottom \d|\d+(st|nd|rd|th))/i.test(s);
function playerish(s){return s.length>2&&s.length<55&&!bad(s)&&!isOdds(s)&&!isMoney(s)&&!isTeam(s)&&!isProp(s)&&/^[A-Za-zÀ-ÿ.'’-]+(?:\s+[A-Za-zÀ-ÿ.'’-]+){1,3}$/.test(s)}
function matchupLine(s){let p=s.split(/\s+@\s+/);if(p.length!==2)return null;let a=stripPitcher(p[0]),b=stripPitcher(p[1]);return isTeam(a)&&isTeam(b)?[a,b]:null}
function nearbyTeams(lines,i,limit=30){for(let j=i+1;j<Math.min(lines.length,i+limit);j++){if(/^BET ID:/i.test(lines[j]))break;let m=matchupLine(lines[j]);if(m)return m}let t=[];for(let j=i+1;j<Math.min(lines.length,i+limit);j++){if(/^BET ID:/i.test(lines[j]))break;if(isTeam(lines[j])){let x=baseTeam(lines[j]);if(!t.includes(x))t.push(x);if(t.length===2)break}}return t}
function priorTeams(lines,i){for(let j=i-1;j>=Math.max(0,i-30);j--){if(/^BET ID:/i.test(lines[j]))break;let m=matchupLine(lines[j]);if(m)return m}let t=[];for(let j=i-1;j>=Math.max(0,i-30);j--){if(/^BET ID:/i.test(lines[j]))break;if(isTeam(lines[j])){let x=baseTeam(lines[j]);if(!t.includes(x))t.unshift(x);if(t.length===2)break}}return t}
function groupAt(lines,i){
// A sportsbook ticket's BET ID is printed at the END of that ticket. Looking backward
// accidentally assigns legs to the previous ticket, which can make dead RR/parlay legs vanish.
for(let j=i;j<Math.min(lines.length,i+180);j++){
 if(/^BET ID:/i.test(lines[j]))return 'bet:'+lines[j].replace(/^BET ID:\s*/i,'').trim();
}
// Fallback for pages that do not expose IDs: use the nearest ticket heading above the leg.
for(let j=i;j>=Math.max(0,i-100);j--)if(/^(Round Robin|\d+ leg parlay|Same Game Parlay)/i.test(lines[j]))return 'grp:'+j;
return 'single:'+i
}

function fingerprint(b){return [b.groupId||'',b.player||b.selection||'',b.prop||'',b.odds||'',(b.matchTeams||[]).join('|')].map(clean).join('~').toLowerCase()}
function isValidBet(b){if(b?.source==='FanDuel Open'){if(!b.prop||!b.groupId)return false;if(b.player)return playerish(cleanOpenPlayerName(b.player));if(b.selection)return !isOdds(b.selection)&&!isMoney(b.selection)&&!isProp(b.selection)&&String(b.selection).trim().length>1;return false}let teams=(b?.matchTeams||[]).map(baseTeam).filter(Boolean);if(teams.length!==2||teams[0]===teams[1]||!teams.every(isTeam))return false;if(!b?.prop||!isProp(b.prop))return false;let blob=[b.player,b.selection,b.prop].filter(Boolean).join(' ');if(/rainbet|plinko|slots?|google search|passing game targets/i.test(blob))return false;if(b.player)return playerish(b.player);return !!(b.selection&&(/moneyline|spread|run lines?|total runs/i.test(b.prop)))}
function parse(txt,old=[]){let oldMode=new Map(old.map(b=>[[b.player||b.selection,b.prop,(b.matchTeams||[]).join('|')].join('~').toLowerCase(),b.notifyMode]));let l=txt.split(/\r?\n/).map(clean).filter(Boolean),out=[];
for(let i=0;i<l.length;i++){if(!playerish(l[i]))continue;let odds='',pi=i+1;if(isOdds(l[pi])){odds=l[pi];pi++}if(!isProp(l[pi])||/moneyline|run lines?|total runs/i.test(l[pi]))continue;let prop=l[pi],teams=nearbyTeams(l,pi,24);if(teams.length<2)teams=priorTeams(l,i);let wager='';for(let j=pi+1;j<Math.min(l.length,pi+70);j++){if(/^BET ID:/i.test(l[j]))break;if(/^TOTAL WAGER$/i.test(l[j])&&j>0&&isMoney(l[j-1])){wager=l[j-1].slice(1);break}}let b={player:l[i],prop,odds,wager,matchTeams:teams,groupId:groupAt(l,i)};let k=[b.player,b.prop,b.matchTeams.join('|')].join('~').toLowerCase();b.notifyMode=oldMode.get(k)||'inherit';out.push(b)}
for(let i=0;i<l.length-2;i++){let sel=l[i],od=isOdds(l[i+1])?l[i+1]:'';if(!od)continue;let prop=l[i+2];if(!/(moneyline|run lines?|total runs)/i.test(prop))continue;let teams=nearbyTeams(l,i+2,24);if(teams.length<2&&isTeam(sel))teams=[baseTeam(sel),...teams.filter(x=>x!==baseTeam(sel))];out.push({player:'',selection:sel,prop,odds:od,wager:'',matchTeams:teams,groupId:groupAt(l,i),notifyMode:'inherit'})}
let seen=new Set();return out.filter(isValidBet).filter(b=>{let k=[b.groupId,b.player||b.selection,b.prop,b.matchTeams.join('|')].join('~').toLowerCase();if(seen.has(k))return false;seen.add(k);return true})}
function parseSettledTickets(txt,lookbackHours=24){
 const lines=txt.split(/\r?\n/).map(clean).filter(Boolean),out=[];
 const money=x=>{let m=String(x||'').match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);return m?parseFloat(m[1].replace(/,/g,'')):null};
 const now=Date.now(),cutoff=now-(Math.max(1,Number(lookbackHours)||24)*3600000);
 const ids=[];for(let i=0;i<lines.length;i++)if(/^BET ID\s*:/i.test(lines[i]))ids.push(i);
 const pretty=s=>clean(s).replace(/\bTO\b/g,'To').replace(/\bRECORD\b/g,'Record').replace(/\bA\b/g,'a').replace(/\bSTOLEN BASES?\b/gi,m=>m.toLowerCase().replace(/^./,c=>c.toUpperCase())).replace(/\bFIRST GOAL SCORER\b/gi,'First Goal Scorer').replace(/\bANYTIME GOAL SCORER\b/gi,'Anytime Goal Scorer').replace(/\bMONEYLINE\b/gi,'Moneyline').replace(/\bALTERNATE RUN LINES\b/gi,'Alternate Run Line').replace(/\bTOTAL RUNS\b/gi,'Total Runs').replace(/\b4TH INNING HITS\b/gi,'4th Inning Hits').replace(/\bTO HIT A MOONSHOT\b/gi,'To Hit a Moonshot');
 for(let n=0;n<ids.length;n++){
  const i=ids[n],prev=n?ids[n-1]+2:0,next=n+1<ids.length?ids[n+1]:lines.length;
  const block=lines.slice(prev,Math.min(next,i+3)),id=lines[i].replace(/^BET ID\s*:\s*/i,'').trim();
  const placed=lines.slice(i+1,Math.min(next,i+4)).find(x=>/^PLACED\s*:/i.test(x))||block.find(x=>/^PLACED\s*:/i.test(x))||'';
  let dm=placed.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})(?:\s+(\d{1,2}:\d{2})(?:\s*)?(AM|PM)?)?/i),placedAt=now;
  if(dm){let ds=dm[1]+(dm[2]?' '+dm[2]+' '+(dm[3]||''):'');let t=Date.parse(ds);if(Number.isFinite(t))placedAt=t}
  if(placedAt<cutoff)continue;
  let wager=null,payout=null,result='';
  for(let j=0;j<block.length;j++){
   if(/^TOTAL WAGER$/i.test(block[j])&&j>0){let v=money(block[j-1]);if(v!=null)wager=v}
   if(/^(?:WON ON FANDUEL|RETURNED|TOTAL PAYOUT|PAYOUT|RETURNS?|WINNINGS?)$/i.test(block[j])&&j>0){let v=money(block[j-1]);if(v!=null)payout=v}
   if(/^WON ON FANDUEL$/i.test(block[j]))result='won';
  }
  if(!result&&Number.isFinite(wager)&&Number.isFinite(payout)) result=payout>wager?'won':payout===0?'lost':payout===wager?'void':'cashed';
  if(!result||!Number.isFinite(wager)||!Number.isFinite(payout))continue;
  const profit=result==='lost'?-wager:result==='void'?0:payout-wager;
  // Describe the wager itself, never FanDuel's settlement label.
  let title='',detail='';
  let head=-1;
  for(let j=0;j<block.length;j++)if(/^(?:Same Game Parlay(?:™)?|Round Robin|\d+\s*leg parlay)/i.test(block[j])){head=j;break}
  if(head>=0){
    title=displayTicketTitle(block[head]).replace(/\s*x(\d+)\s*wagers?/i,' ×$1');
    let summary=block[head+1]||'';
    if(summary&&!isOdds(summary)&&!/^TOTAL WAGER|WON ON FANDUEL|RETURNED/i.test(summary))detail=pretty(summary);
  }else{
    // For singles: selection/player is followed by odds, then the market label.
    for(let j=0;j<block.length-2;j++){
      const candidate=block[j],market=block[j+2]||'';
      const ui=/^(?:bet|betslip|bonus bet|won on fanduel|returned|total wager|settled|open|saved)$/i.test(candidate);
      if(!ui&&(playerish(candidate)||isTeam(candidate)||/^[A-Za-z].*[-+]\d+(?:\.\d+)?$/.test(candidate))&&isOdds(block[j+1])&&isProp(market)){
        title=pretty(candidate); detail=pretty(market); break;
      }
    }
  }
  if(!title)title='Settled Bet';
  out.push({ticketId:id,title,detail,result,wager,payout,profit,placed:dm?.[1]||'',day:new Date(placedAt).toISOString().slice(0,10),placedAt,archivedAt:Date.now()});
 }
 return out;
}
function openBetsText(txt){
 const lines=String(txt||'').split(/\r?\n/).map(clean).filter(Boolean);
 // Sportsbook My Bets pages commonly render Open and Settled in the same DOM.
 // Active bets MUST come only from the Open/Active region; settled/history text is never active.
 const isOpen=x=>/^(?:open(?: bets?)?|active(?: bets?)?)$/i.test(x);
 const isClosed=x=>/^(?:settled|settled bets|closed|closed bets|completed|completed bets|history|past bets)$/i.test(x);
 let starts=[]; for(let i=0;i<lines.length;i++) if(isOpen(lines[i])) starts.push(i);
 if(starts.length){
   const start=starts[starts.length-1]+1;
   let end=lines.length; for(let i=start;i<lines.length;i++){if(isClosed(lines[i])){end=i;break}}
   return lines.slice(start,end).join('\n');
 }
 // If the page explicitly exposes a settled/history tab but no Open section, it contains zero active bets.
 if(lines.some(isClosed)) return '';
 // Fallback for an Open-Bets-only page whose DOM omits the tab label.
 return lines.join('\n');
}
function normalizeOpenMarket(title,descriptor){
 const t=clean(title),d=clean(descriptor),blob=(t+' '+d).toLowerCase();
 let threshold='';
 let tm=t.match(/(\d+(?:\.\d+)?\+)\s*(?:yards?|yds?|receptions?|rec|shots?|sog|points?|pts|rebounds?|reb|assists?|ast|blocks?|blk|steals?|stl|strikeouts?|ks?|total bases|tb)\b/i)
      ||d.match(/(\d+(?:\.\d+)?\+)\b/);
 if(tm)threshold=tm[1];
 let kind='';
 if(/any\s*time.*touchdown|touchdown scorer|td scorer/.test(blob))kind='Any Time Touchdown Scorer';
 else if(/first.*touchdown/.test(blob))kind='First Touchdown Scorer';
 else if(/rush(?:ing)?\s*(?:yards?|yds)/.test(blob))kind='Rushing Yards';
 else if(/receiv(?:ing)?\s*(?:yards?|yds)|\brec\s*yds\b/.test(blob))kind='Receiving Yards';
 else if(/pass(?:ing)?\s*(?:yards?|yds)/.test(blob))kind='Passing Yards';
 else if(/receptions?|\brec\b/.test(blob))kind='Receptions';
 else if(/shots?\s*on\s*goal|\bsog\b/.test(blob))kind='Shots on Goal';
 else if(/passing.*touchdowns?|pass\s*tds?/.test(blob))kind='Passing Touchdowns';
 else if(/strikeouts?|\bks?\b/.test(blob))kind='Strikeouts';
 else if(/total\s*bases?|\btb\b/.test(blob))kind='Total Bases';
 else if(/home\s*runs?|\bhr\b/.test(blob))kind='Home Runs';
 else if(/stolen\s*bases?|\bsb\b/.test(blob))kind='Stolen Bases';
 else if(/\bpoints?|\bpts\b/.test(blob))kind='Points';
 else if(/rebounds?|\breb\b/.test(blob))kind='Rebounds';
 else if(/assists?|\bast\b/.test(blob))kind='Assists';
 else if(/blocks?|\bblk\b/.test(blob))kind='Blocks';
 else if(/steals?|\bstl\b/.test(blob))kind='Steals';
 else if(/\bgoals?\b/.test(blob))kind='Goals';
 else if(/moneyline/.test(blob))kind='Moneyline';
 else if(/spread/.test(blob))kind='Spread';
 if(!kind)return '';
 if(threshold&&!/touchdown scorer|moneyline|spread/i.test(kind))return threshold+' '+kind;
 return kind;
}
function playerFromOpenTitle(title,descriptor){
 const d=clean(descriptor),t=clean(title);
 let dm=d.match(/^([A-Z][A-Z .'’-]{3,45}?)\s*-\s*(?:ALT(?:ERNATE)?\s+)?(?:RUSH|RUSHING|REC|RECEIVING|PASS|PASSING|PLAYER|ANY)/i);
 if(dm)return clean(dm[1]).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
 let x=t.replace(/\s+\d+(?:\.\d+)?\+\s*(?:yards?|yds?|receptions?|rec|shots?|sog|points?|pts|rebounds?|reb|assists?|ast|blocks?|blk|steals?|stl|strikeouts?|ks?|total bases|tb)\b.*$/i,'');
 let m=x.match(/([A-Z][A-Za-zÀ-ÿ.'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ.'’-]+){1,3})\s*$/);return m?clean(m[1]):'';
}
function inferOpenTeams(text){
 const z=String(text||'').toLowerCase(),hits=[];
 for(const t of TEAMS){
   let i=z.indexOf(t.toLowerCase());
   if(i>=0)hits.push({t,i});
 }
 hits.sort((a,b)=>a.i-b.i||b.t.length-a.t.length);
 const out=[];
 for(const h of hits){
   if(!out.some(x=>normOpenId(x)===normOpenId(h.t)))out.push(h.t);
   if(out.length===2)break;
 }
 return out;
}
function cleanOpenPlayerName(s){
 s=clean(s);
 // FanDuel can glue schedule/market text directly onto the player name in flattened DOM text.
 // Remove only known LEADING UI/market debris, preserving the actual player name.
 let prev='';
 while(s!==prev){
   prev=s;
   s=s.replace(/^\s*(?:(?:\d{1,2}:)?\d{1,2}\s*)?(?:AM|PM)\s*ET(?=[A-Z])\s*/i,'').trim();
   s=s.replace(/^\s*(?:AM|PM)\s*ET(?=[A-Z])\s*/i,'').trim();
   s=s.replace(/^\s*ET(?=[A-Z])\s*/,'').trim();
   s=s.replace(/^\s*(?:ALT(?:ERNATE)?\s+)?(?:PASS(?:ING)?|RUSH(?:ING)?|REC(?:EIVING)?)\s+(?:TDS?|TOUCHDOWNS?|YARDS?|YDS?)\s*(?=[A-Z])/i,'').trim();
   s=s.replace(/^\s*(?:ANY\s*TIME|ANYTIME|FIRST)\s+TOUCHDOWN(?:\s+SCORER)?\s*(?=[A-Z])/i,'').trim();
   s=s.replace(/^\s*(?:PLAYER\s+TO\s+RECORD\s+)?\d+(?:\.\d+)?\+\s+(?:PASSING\s+TOUCHDOWNS?|RECEPTIONS?|RUSHING\s+YARDS?|RECEIVING\s+YARDS?|PASSING\s+YARDS?|TOTAL\s+BASES|SHOTS?\s+ON\s+GOAL)\s*(?=[A-Z])/i,'').trim();
 }
 return s;
}
function parseCopiedOpenTickets(raw,old=[]){
 const lines=String(raw||'').split(/\r?\n/).map(clean).filter(Boolean),out=[];
 const oldMode=new Map(old.map(b=>[[b.player||b.selection,b.prop].join('~').toLowerCase(),b.notifyMode]));
 let start=0;
 for(let end=0;end<lines.length;end++){
  const idm=lines[end].match(/^BET ID:\s*(.+)$/i); if(!idm)continue;
  const block=lines.slice(start,end),gid='bet:'+clean(idm[1]); start=end+1;
  let wager='';for(let j=0;j<block.length;j++)if(/^TOTAL WAGER$/i.test(block[j])&&j>0){let m=block[j-1].match(/^\$([\d,]+(?:\.\d{1,2})?)$/);if(m)wager=m[1].replace(/,/g,'')}
  for(let i=1;i<block.length-1;i++){
   if(!isOdds(block[i]))continue;
   const title=clean(block[i-1]),descriptor=clean(block[i+1]);
   if(/(?:leg parlay|round robin|same game parlay)/i.test(title))continue;
   let prop=normalizeOpenMarket(title,descriptor);
   let tm=(title+' '+descriptor).match(/(\d+(?:\.\d+)?\+)\s*(?:passing\s+)?(?:touchdowns?|tds?)/i);
   if(tm){prop=tm[1]+' '+(/passing/i.test(title+' '+descriptor)?'Passing Touchdowns':'Touchdowns')}

   if(!prop)continue;
   let player=cleanOpenPlayerName(playerFromOpenTitle(title,descriptor));
   if(!player){let m=title.match(/^(.+?)(?:\s+\d+(?:\.\d+)?\+\s+(?:yards?|yds?|receptions?|touchdowns?|passing touchdowns?))?$/i);player=cleanOpenPlayerName(m?m[1]:title)}
   if(!player||isTeam(player))continue;
   let teams=[];
   for(let j=i+2;j<Math.min(block.length,i+18);j++){
    if(isOdds(block[j])||/^TOTAL WAGER$/i.test(block[j]))break;
    if(isTeam(block[j])){let t=baseTeam(block[j]);if(!teams.includes(t))teams.push(t);if(teams.length===2)break}
   }
   if(teams.length<2)continue;
   out.push({player,selection:'',prop,odds:block[i],wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([player,prop].join('~').toLowerCase())||'inherit',source:'FanDuel Open'});
  }
 }
 return out;
}
function parseFanDuelTicketsById(raw,old=[]){
 // FanDuel prints BET ID at the end of every real slip. Parse each slip independently.
 // Within a slip, a real leg has a stable local shape: selection -> price(s) -> market -> game.
 // This deliberately does NOT scan across ticket boundaries or infer legs from summaries.
 const lines=String(raw||'').split(/\r?\n/).map(clean).filter(Boolean),out=[];
 const idRows=[];for(let i=0;i<lines.length;i++){const m=lines[i].match(/^BET ID:\s*(.+)$/i);if(m)idRows.push({i,id:clean(m[1])})}
 if(!idRows.length)return {bets:[],ticketCount:0,complete:false};
 const oldMode=new Map(old.map(b=>[[normOpenId(b.player||b.selection||''),normOpenId(b.prop||'')].join('|'),b.notifyMode]));
 let prev=-1;
 for(const row of idRows){
   let block=lines.slice(prev+1,row.i);prev=row.i;
   // PLACED belongs to the preceding ticket and can sit at the front of the next block.
   const lastPlaced=block.map((x,i)=>/^PLACED\s*:/i.test(x)?i:-1).filter(i=>i>=0).pop();
   if(lastPlaced!=null)block=block.slice(lastPlaced+1);
   const gid='bet:'+row.id;
   let wager='';for(let j=1;j<block.length;j++)if(/^TOTAL WAGER$/i.test(block[j])&&isMoney(block[j-1])){wager=block[j-1].slice(1);break}
   const ticketBets=[];
   for(let i=0;i<block.length;i++){
     if(!isOdds(block[i]))continue;
     // Boosted singles/tickets show original odds then boosted odds. Use the LAST price in the run.
     let first=i,last=i;while(last+1<block.length&&isOdds(block[last+1]))last++;
     if(i!==first)continue;
     const title=clean(block[first-1]||''),descriptor=clean(block[last+1]||'');
     i=last;
     if(!title||!descriptor)continue;
     if(/(?:leg parlay|round robin|same game parlay)/i.test(title))continue;
     let prop=normalizeOpenMarket(title,descriptor);
     if(/(?:to\s+score\s+)?2\+\s+touchdowns?/i.test(title+' '+descriptor))prop='2+ Touchdowns';
     if(!prop)continue;
     let teams=[];
     for(let j=last+2;j<Math.min(block.length,last+24);j++){
       if(/^TOTAL WAGER$/i.test(block[j])||/^BET ID:/i.test(block[j]))break;
       if(isTeam(block[j])){const t=baseTeam(block[j]);if(!teams.includes(t))teams.push(t);if(teams.length===2)break}
     }
     if(teams.length<2)continue;
     const odds=block[last];
     if(/moneyline/i.test(prop)){
       if(!isTeam(title))continue;
       const selection=baseTeam(title);
       const b={player:'',selection,prop:'Moneyline',odds,wager,matchTeams:teams,groupId:gid,source:'FanDuel Open'};
       b.notifyMode=oldMode.get([normOpenId(selection),normOpenId(b.prop)].join('|'))||'inherit';ticketBets.push(b);continue;
     }
     let player=cleanOpenPlayerName(playerFromOpenTitle(title,descriptor));
     if(!player||!playerish(player))continue;
     const b={player,selection:'',prop,odds,wager,matchTeams:teams,groupId:gid,source:'FanDuel Open'};
     const tm=prop.match(/^(\d+(?:\.\d+)?)\+/);if(tm)b.target=Number(tm[1]);
     b.notifyMode=oldMode.get([normOpenId(player),normOpenId(prop)].join('|'))||'inherit';ticketBets.push(b);
   }
   // One semantic copy per slip. RR/parlay copies across DIFFERENT BET IDs are preserved.
   const seen=new Set();for(const b of ticketBets){const k=[normOpenId(b.player||b.selection),normOpenId(b.prop)].join('|');if(!seen.has(k)){seen.add(k);out.push(b)}}
 }
 const groups=new Set(out.map(b=>String(b.groupId).toLowerCase()));
 return {bets:out.filter(isValidBet),ticketCount:idRows.length,complete:groups.size===idRows.length};
}
function parseOpen(txt,old=[]){
 // FanDuel exposes the same Open Bets page in multiple simultaneous text shapes.
 // Never choose one parser and abandon the rest of the page: merge every parser's
 // discoveries, then dedupe at the end. This prevents one easy-to-read player prop
 // from causing team markets / later tickets / alternate layouts to disappear.
 const copied=parseCopiedOpenTickets(txt,old);
 // Sync Open is explicit: the user is already on FanDuel's Open tab. Use the visible page text directly.
 // Do NOT slice between the Open/Settled tab labels; those labels sit next to each other before the tickets.
 const raw=String(txt||''),lines=raw.split(/\r?\n/).map(clean).filter(Boolean);
 const oldMode=new Map(old.map(b=>[[b.player||b.selection,b.prop].join('~').toLowerCase(),b.notifyMode]));
 const strict=parseFanDuelTicketsById(raw,old);
 // If every visible BET ID produced at least one locally parsed leg, this is authoritative.
 // Do not run legacy/flattened parsers afterward; that is what manufactured phantom bets.
 if(strict.ticketCount&&strict.complete)return strict.bets;
 const oldByGroup=new Map(old.filter(b=>b?.groupId).map(b=>[String(b.groupId).toLowerCase(),b]));
 const oldExact=new Map(old.filter(b=>b?.groupId).map(b=>[[String(b.groupId).toLowerCase(),String(b.odds||''),normOpenId(b.prop||'')].join('|'),b]));
 const out=[...copied];
 const money=x=>{let m=String(x||'').match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);return m?m[1].replace(/,/g,''):''};
 // Generic FLAT FanDuel ticket parser. FanDuel frequently concatenates an entire ticket
 // with zero line breaks. Treat BET ID as the ticket boundary, then identify universal
 // fields inside each ticket instead of hard-coding one bet type.
 const flatAll=clean(raw);
 const teamAlt=TEAMS.slice().sort((a,b)=>b.length-a.length).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const matchupRe=new RegExp('('+teamAlt+')\\s*@\\s*('+teamAlt+')','i');
 const marketPatterns=[
   ['Anytime Touchdown Scorer',/(?:ANY\s*TIME|ANYTIME)\s+TOUCHDOWN\s+SCORER/i],
   ['First Touchdown Scorer',/FIRST\s+TOUCHDOWN\s+SCORER/i],
   ['Moneyline',/MONEYLINE/i],
   ['Spread',/SPREAD/i],
   ['Shots on Goal',/(?:PLAYER\s+TO\s+RECORD\s+)?\d+\+?\s+SHOTS?\s+ON\s+GOAL/i],
   ['Receptions',/(?:PLAYER\s+TO\s+RECORD\s+)?\d+\+?\s+RECEPTIONS?/i],
   ['Receiving Yards',/(?:[A-Z .'-]+\s*-\s*)?(?:ALT(?:ERNATE)?\s+)?REC(?:EIVING)?\s+(?:YARDS?|YDS?)/i],
   ['Rushing Yards',/(?:[A-Z .'-]+\s*-\s*)?(?:ALT(?:ERNATE)?\s+)?RUSH(?:ING)?\s+(?:YARDS?|YDS?)/i],
   ['Passing Yards',/(?:[A-Z .'-]+\s*-\s*)?(?:ALT(?:ERNATE)?\s+)?PASS(?:ING)?\s+(?:YARDS?|YDS?)/i],
   ['Passing Touchdowns',/(?:PLAYER\s+TO\s+RECORD\s+)?\d+\+?\s+PASSING\s+TOUCHDOWNS?/i],
   ['Total Bases',/(?:PLAYER\s+TO\s+RECORD\s+)?\d+\+?\s+TOTAL\s+BASES/i],
   ['Home Runs',/(?:PLAYER\s+TO\s+RECORD\s+)?\d+\+?\s+HOME\s+RUNS?/i],
   ['Strikeouts',/(?:PLAYER\s+TO\s+RECORD\s+)?\d+\+?\s+STRIKEOUTS?/i],
   ['Goals',/(?:PLAYER\s+TO\s+RECORD\s+)?\d+\+?\s+GOALS?/i]
 ];
 function flatSelection(beforeOdds){
   let z=beforeOdds.replace(/.*(?:OpenSettledSaved|My Bets|TOTAL PAYOUT|Share bet|PLACED:[^$]*?ET)/i,'');
   // Team selections are safest and can contain city/name words.
   let team='';for(const t of TEAMS)if(z.toLowerCase().endsWith(t.toLowerCase())&&t.length>team.length)team=t;if(team)return team;
   // Player names: take the final 2-4 title-cased words immediately before the price.
   let m=z.match(/([A-Z][A-Za-zÀ-ÿ.'’-]+(?:\s+[A-Z][A-Za-zÀ-ÿ.'’-]+){1,3})\s*$/);return m?clean(m[1]):'';
 }
 const ids=[...flatAll.matchAll(/BET ID:\s*([A-Za-z0-9:_\/-]+)/gi)];
 let prevEnd=0;
 for(const idm of ids){
   // BET ID is the reliable END boundary of a FanDuel ticket. Do not depend on
   // whether FanDuel inserts whitespace before PLACED; that changes between renders.
   const ticketEnd=idm.index;
   const block=flatAll.slice(prevEnd,ticketEnd);
   const gid='bet:'+idm[1];
   prevEnd=idm.index+idm[0].length;
   // Strip the previous ticket's PLACED metadata if it is carried into this block.
   // We keep everything after the LAST PLACED timestamp because that is the next ticket.
   const placedMatches=[...block.matchAll(/PLACED:\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?:AM|PM)\s+ET/gi)];
   const ticket=placedMatches.length?block.slice(placedMatches[placedMatches.length-1].index+placedMatches[placedMatches.length-1][0].length):block;
   if(/\b(?:WON|LOST|SETTLED|RETURNED)\b/i.test(ticket))continue;
   const mm=ticket.match(matchupRe);let teams=mm?[clean(mm[1]),clean(mm[2])]:inferOpenTeams(ticket);if(teams.length<2){const prior=oldByGroup.get(gid.toLowerCase());if(prior?.matchTeams?.length>=2)teams=prior.matchTeams.slice(0,2)}if(teams.length<2)continue;
   const wagerM=ticket.match(/\$([\d,]+(?:\.\d{1,2})?)TOTAL WAGER/i),wager=wagerM?wagerM[1].replace(/,/g,''):'';

   // Multi-leg team Moneyline parlays: FanDuel's ticket summary is often the only
   // stable place where every selected side is stated together. Parse ALL
   // "<team> Moneyline" selections in this ticket instead of letting the generic
   // flat parser collapse the whole ticket to its final MONEYLINE occurrence.
   // A single selected team is sufficient for the ESPN resolver to locate its game;
   // when the opponent is visible nearby, inferOpenTeams supplies the pair later.
   const mlSummary=[];
   for(const tm of TEAMS){
     const re=new RegExp(tm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+Moneyline\\b','ig');
     if(re.test(ticket))mlSummary.push(tm);
   }
   if(mlSummary.length>=2){
     for(const selected of mlSummary){
       const esc=selected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
       let legOdds='';
       const om=ticket.match(new RegExp(esc+'\\s+Moneyline\\s*([+-]\\d{2,7})','i')) ||
                ticket.match(new RegExp(esc+'[^]{0,90}?([+-]\\d{2,7})[^]{0,30}?Moneyline','i'));
       if(om)legOdds=om[1];
       // Prefer a matchup containing this selected team when the rendered ticket exposes one.
       let legTeams=[];
       const pos=ticket.toLowerCase().indexOf(selected.toLowerCase());
       if(pos>=0)legTeams=inferOpenTeams(ticket.slice(Math.max(0,pos-80),Math.min(ticket.length,pos+260)));
       if(!legTeams.includes(selected))legTeams.unshift(selected);
       legTeams=[...new Set(legTeams)].slice(0,2);
       out.push({player:'',selection:selected,prop:'Moneyline',odds:legOdds,wager,matchTeams:legTeams,groupId:gid,notifyMode:oldMode.get([selected,'Moneyline'].join('~').toLowerCase())||'inherit',source:'FanDuel Open'});
     }
     // The ticket has been fully represented by its team legs. Do not run the
     // one-market generic parser below and accidentally add only the last team again.
     continue;
   }

   const firstTeamPos=teams.length?Math.min(...teams.map(t=>ticket.toLowerCase().indexOf(t.toLowerCase())).filter(i=>i>=0)):ticket.length;
   const pre=ticket.slice(0,mm?mm.index:firstTeamPos);let marketHit=null,marketLabel='';
   for(const [label,re] of marketPatterns){let hits=[...pre.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];if(hits.length){let h=hits[hits.length-1];if(!marketHit||h.index>marketHit.index){marketHit=h;marketLabel=label}}}
   if(!marketHit){
     // Generic ticket fallback: nearest American price before the matchup divides the
     // visible selection title from FanDuel's market descriptor. This is deliberately
     // market-agnostic so new ALT/abbreviated labels do not require a new ticket parser.
     const omatches=[...pre.matchAll(/([+-]\d{2,7})/g)];
     const om=omatches.length?omatches[omatches.length-1]:null;
     if(om){
       const odds=om[1],before=pre.slice(0,om.index),descriptor=clean(pre.slice(om.index+om[0].length));
       let title=before.replace(/.*(?:PLACED:[^$]*?ET|OpenSettledSaved|My Bets)/i,'');
       title=clean(title);
       const prop=normalizeOpenMarket(title,descriptor);
       let selection='',player='';
       if(prop){
         if(/^Spread$/i.test(prop)){
           let lm=title.match(/(.+?)\s*([+-]\d+(?:\.\d+)?)\s*$/);if(lm){selection=clean(lm[1]);let best='';for(const tt of TEAMS)if(selection.toLowerCase().endsWith(tt.toLowerCase())&&tt.length>best.length)best=tt;selection=best||selection;out.push({player:'',selection,prop:'Spread '+lm[2],odds,wager,matchTeams:teams,groupId:gid,notifyMode:'inherit',source:'FanDuel Open'});continue}
         }else if(/^Moneyline$/i.test(prop)){
           let best='';for(const tt of TEAMS)if(title.toLowerCase().endsWith(tt.toLowerCase())&&tt.length>best.length)best=tt;if(best){out.push({player:'',selection:best,prop,odds,wager,matchTeams:teams,groupId:gid,notifyMode:'inherit',source:'FanDuel Open'});continue}
         }else{
           player=cleanOpenPlayerName(playerFromOpenTitle(title,descriptor));
           if(player){out.push({player,selection:'',prop,odds,wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([player,prop].join('~').toLowerCase())||'inherit',source:'FanDuel Open'});continue}
         }
       }
     }
     continue;
   }
   const marketText=clean(marketHit[0]);const around=pre.slice(Math.max(0,marketHit.index-120),marketHit.index+marketHit[0].length+40);
   let odds='',selection='',prop=marketText;
   if(marketLabel==='Spread'){
     let m=pre.slice(Math.max(0,marketHit.index-120),marketHit.index).match(/([A-Za-z][A-Za-z .'-]{2,40}?)[^A-Za-z0-9+$-]{0,16}([+-]\d+(?:\.\d+)?)([+-]\d{2,5})\s*$/);
     if(m){selection=clean(m[1]);let best='';for(const t of TEAMS)if(selection.toLowerCase().endsWith(t.toLowerCase())&&t.length>best.length)best=t;selection=best||selection;prop='Spread '+m[2];odds=m[3]}
   }else{
     let before=pre.slice(0,marketHit.index),om=before.match(/([+-]\d{2,5})\s*$/);if(!om){let after=pre.slice(marketHit.index+marketHit[0].length,marketHit.index+marketHit[0].length+30);om=after.match(/^\s*([+-]\d{2,5})/)}
     if(om){odds=om[1];let cut=before.slice(0,Math.max(0,before.length-(before.match(/([+-]\d{2,5})\s*$/)?.[0].length||0)));selection=flatSelection(cut);if(!selection)selection=playerFromOpenTitle(cut,marketText)}
   }
   if(!selection||!odds)continue;
   let player=isTeam(selection)?'':selection,sel=isTeam(selection)?selection:'';
   out.push({player,selection:sel,prop,odds,wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([selection,prop].join('~').toLowerCase())||'inherit',source:'FanDuel Open'});
 }
 // FanDuel often exposes the useful My Bets text as ONE continuous string with no line breaks.
 // Parse the literal single-ticket spread shape from that flattened text before line-based fallbacks.
 // Example: Indianapolis Colts-4.5-112SPREADIndianapolis Colts @ Washington Commanders9:30am ET$5.00TOTAL WAGER...
 const flat=clean(raw);
 const spreadRe=/([A-Za-z][A-Za-z .'-]{2,40}?)[^A-Za-z0-9+$-]{0,16}([+-]\d+(?:\.\d+)?)([+-]\d{2,5})SPREAD\1\s*@\s*([A-Za-z][A-Za-z .'-]{2,40}?)(?=\d{1,2}:\d{2}(?:am|pm)\s*ET|\$)/gi;
 let sm;
 while((sm=spreadRe.exec(flat))){
   const selection=clean(sm[1]),line=sm[2],odds=sm[3],opp=clean(sm[4]);
   if(!isTeam(selection)||!isTeam(opp))continue;
   const tail=flat.slice(sm.index,Math.min(flat.length,sm.index+700));
   const wm=tail.match(/\$([\d,]+(?:\.\d{1,2})?)TOTAL WAGER/i);
   const idm=tail.match(/BET ID:\s*([^\s]+?)(?=PLACED:|$)/i);
   const prop='Spread '+line;
   const gid=idm?'bet:'+idm[1]:'single-spread:'+normOpenId(selection+line+opp);
   out.push({player:'',selection,prop,odds,wager:wm?wm[1].replace(/,/g,''):'',matchTeams:[selection,opp],groupId:gid,notifyMode:oldMode.get([selection,prop].join('~').toLowerCase())||'inherit',source:'FanDuel Open'});
 }

 const ticketHeads=[];for(let i=0;i<lines.length;i++)if(/^(?:\d+\s*leg parlay|Same Game Parlay(?:™)?|Round Robin)/i.test(lines[i]))ticketHeads.push(i);
 for(let h=0;h<ticketHeads.length;h++){
   const start=ticketHeads[h],end=h+1<ticketHeads.length?ticketHeads[h+1]:lines.length,block=lines.slice(start,end);
   let gid='';for(const x of block)if(/^BET ID\s*:/i.test(x)){gid='bet:'+x.replace(/^BET ID\s*:\s*/i,'').trim();break}
   if(!gid)gid='open:'+start+':'+normOpenId(block[0]);
   let wager='';for(let j=0;j<block.length;j++)if(/^TOTAL WAGER$/i.test(block[j])){wager=money(block[j-1])||money(block[j+1])||'';break}
   let summary='';for(let j=1;j<Math.min(block.length,5);j++){if(/moneyline|shots?|receptions?|yards?|touchdown|strikeouts?|home run|total bases|goals?/i.test(block[j])&&!isOdds(block[j])){summary=block[j];break}}
   if(summary){
     const picks=summary.split(/\s*,\s*/).map(clean).filter(Boolean);
     for(const pick of picks){
       let selection=pick,prop='';
       let m=pick.match(/^(.*?)\s+(Moneyline)$/i);if(m){selection=clean(m[1]);prop='Moneyline'}
       else {m=pick.match(/^(.*?)\s+((?:\d+\+\s+)?(?:shots? on goal|receptions?|receiving yards?|rushing yards?|passing yards?|passing touchdowns?|touchdowns?|strikeouts?|total bases|home runs?|stolen bases?|goals?).*)$/i);if(m){selection=clean(m[1]);prop=clean(m[2])}}
       if(!prop)continue;
       let odds='',teams=[];
       for(let j=0;j<block.length;j++){
         if(normOpenId(block[j])!==normOpenId(selection))continue;
         for(let k=j+1;k<Math.min(block.length,j+5);k++)if(isOdds(block[k])){odds=block[k];break}
         const candidates=[];for(let k=Math.max(0,j-3);k<Math.min(block.length,j+14);k++){let x=block[k];if(x===selection||isOdds(x)||/^MONEYLINE$|^LIVE$|^TOTAL WAGER$|^TOTAL PAYOUT$|^Cash out/i.test(x)||/^\d+$/.test(x))continue;if(/^[A-Za-z][A-Za-z .'-]{2,35}$/.test(x)&&!bad(x)&&!isProp(x)&&!candidates.includes(x))candidates.push(x)}
         if(candidates.length){teams=[selection,...candidates.filter(x=>normOpenId(x)!==normOpenId(selection))].slice(0,2)}
         break;
       }
       let b={player:'',selection,prop,odds,wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([selection,prop].join('~').toLowerCase())||'inherit',source:'FanDuel Open'};out.push(b)
     }
   }
 }
 // FanDuel single spread tickets are rendered as: "TEAM -4.5" / "SPREAD" / odds / matchup.
 // Parse that literal visible-text shape directly instead of trying to infer a richer DOM model.
 for(let i=0;i<lines.length;i++){
   // FanDuel's visual columns do not guarantee DOM text order. The odds may appear
   // before or after SPREAD, so only require SPREAD somewhere immediately nearby.
   const m=lines[i].match(/^(.*?)\s+([+-]\d+(?:\.\d+)?)$/);
   if(!m)continue;
   const selection=clean(m[1]),line=m[2];
   if(!isTeam(selection))continue;
   let marketAt=-1;for(let j=i+1;j<Math.min(lines.length,i+6);j++){if(/^SPREAD$/i.test(lines[j])){marketAt=j;break}}
   if(marketAt<0)continue;
   let odds='';for(let j=i+1;j<Math.min(lines.length,i+8);j++)if(isOdds(lines[j])&&lines[j]!==line){odds=lines[j];break}
   let teams=[];for(let j=i+1;j<Math.min(lines.length,i+14);j++){let mm=matchupLine(lines[j]);if(mm){teams=mm;break}}
   if(teams.length<2){let cand=[];for(let j=i+1;j<Math.min(lines.length,i+14);j++)if(isTeam(lines[j])){let t=baseTeam(lines[j]);if(!cand.includes(t))cand.push(t)};teams=cand.slice(0,2)}
   let wager='';for(let j=i+1;j<Math.min(lines.length,i+40);j++)if(/^TOTAL WAGER$/i.test(lines[j])){wager=money(lines[j-1])||money(lines[j+1])||'';break}
   let gid='';for(let j=i;j<Math.min(lines.length,i+60);j++)if(/^BET ID\s*:/i.test(lines[j])){gid='bet:'+lines[j].replace(/^BET ID\s*:\s*/i,'').trim();break}
   if(!gid)gid='single-spread:'+normOpenId(selection+line+teams.join('|'));
   if(!out.some(x=>!x.player&&normOpenId(x.selection)===normOpenId(selection)&&normOpenId(x.prop)===normOpenId('Spread '+line)&&x.odds===odds&&(x.matchTeams||[]).map(normOpenId).join('|')===teams.map(normOpenId).join('|')))out.push({player:'',selection,prop:'Spread '+line,odds,wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([selection,'Spread '+line].join('~').toLowerCase())||'inherit',source:'FanDuel Open'});
 }
 // Deterministic VISIBLE-LINE pass. FanDuel's Open page already exposes each leg as
 // selection -> price(s) -> market -> live matchup. Parse that literal contract before
 // fallbacks so boosts, singles, parlays and round robins cannot disappear because the
 // flattened DOM happened to concatenate differently.
 for(let i=0;i<lines.length;i++){
   const title=lines[i];
   if(bad(title)||isOdds(title)||isMoney(title))continue;
   let j=i+1, prices=[];
   while(j<Math.min(lines.length,i+7)){
     if(isOdds(lines[j])){prices.push(lines[j]);j++;continue}
     if(/^(?:profit boost|boosted|bonus)/i.test(lines[j])){j++;continue}
     break;
   }
   if(!prices.length)continue;
   const odds=prices[prices.length-1]; // displayed/effective price; boosted bets expose base then boosted.
   const descriptor=lines[j]||'';
   const gid=groupAt(lines,i);
   let wager='';for(let q=j+1;q<Math.min(lines.length,j+80);q++){if(/^BET ID:/i.test(lines[q]))break;if(/^TOTAL WAGER$/i.test(lines[q])){wager=money(lines[q-1])||money(lines[q+1])||'';break}}

   // Team markets. The selected team is the title immediately before its price/market.
   if(isTeam(title)&&/^MONEYLINE$/i.test(descriptor)){
     let teams=nearbyTeams(lines,j,20);if(!teams.includes(baseTeam(title)))teams.unshift(baseTeam(title));teams=[...new Set(teams)].slice(0,2);
     const b={player:'',selection:baseTeam(title),prop:'Moneyline',odds,wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([baseTeam(title),'Moneyline'].join('~').toLowerCase())||'inherit',source:'FanDuel Open',parseConfidence:100};
     if(!out.some(x=>fingerprint(x)===fingerprint(b)))out.push(b);
     continue;
   }

   // Player markets. FanDuel may put the threshold in the title ("Tre Tucker 40+ Yards")
   // while the descriptor only says "TRE TUCKER - ALT RECEIVING YDS".
   const playerTitle=cleanOpenPlayerName(title.replace(/\s+\d+(?:\.\d+)?\+\s+(?:yards?|yds?|receptions?|touchdowns?|passing touchdowns?|shots?(?: on goal)?|goals?|total bases)\s*$/i,''));
   if(!playerish(playerTitle))continue;
   let prop='';
   if(/ANY\s*TIME\s+TOUCHDOWN\s+SCORER/i.test(descriptor))prop='Any Time Touchdown Scorer';
   else if(/TO\s+SCORE\s+2\+\s+TOUCHDOWNS?/i.test(descriptor)||/2\+\s+TOUCHDOWNS?/i.test(title+' '+descriptor))prop='2+ Touchdowns';
   else {
     const threshold=(title.match(/\b(\d+(?:\.\d+)?)\+\s+(?:yards?|yds?|receptions?|touchdowns?|passing touchdowns?|shots?(?: on goal)?|goals?|total bases)/i)||[])[1];
     if(/REC(?:EIVING)?\s+(?:YARDS?|YDS?)/i.test(descriptor))prop=(threshold?threshold+'+ ':'')+'Receiving Yards';
     else if(/RUSH(?:ING)?\s+(?:YARDS?|YDS?)/i.test(descriptor))prop=(threshold?threshold+'+ ':'')+'Rushing Yards';
     else if(/PASS(?:ING)?\s+(?:YARDS?|YDS?)/i.test(descriptor))prop=(threshold?threshold+'+ ':'')+'Passing Yards';
     else if(/RECEPTIONS?/i.test(descriptor))prop=(threshold?threshold+'+ ':'')+'Receptions';
     else if(isProp(descriptor))prop=descriptor;
   }
   if(!prop)continue;
   let teams=nearbyTeams(lines,j,24);if(teams.length<2)teams=priorTeams(lines,i);
   const targetM=prop.match(/^(\d+(?:\.\d+)?)\+/),target=targetM?Number(targetM[1]):undefined;
   const b={player:playerTitle,selection:'',prop,odds,wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([playerTitle,prop].join('~').toLowerCase())||'inherit',source:'FanDuel Open',parseConfidence:100};
   if(Number.isFinite(target))b.target=target;
   if(!out.some(x=>fingerprint(x)===fingerprint(b)))out.push(b);
 }

 // Singles and legacy sportsbook layouts still use the proven parser.
 const legacy=parse(raw,old);for(const b of legacy)if(!out.some(x=>fingerprint(x)===fingerprint(b)))out.push(b);

 // HARD FAIL-SAFE: every visible FanDuel BET ID must survive as at least one imported
 // ticket/leg. A BET ID is stronger evidence than our knowledge of any particular market.
 // If the normal parser did not resolve a ticket, salvage its universal fields and keep
 // the sportsbook's own selection/market wording rather than silently dropping it.
 const parsedGroups=new Set(out.map(b=>String(b.groupId||'').toLowerCase()));
 let fsPrevEnd=0;
 for(const idm of ids){
   const gid='bet:'+idm[1],gidKey=gid.toLowerCase(),ticketEnd=idm.index;
   let block=flatAll.slice(fsPrevEnd,ticketEnd);fsPrevEnd=idm.index+idm[0].length;
   if(parsedGroups.has(gidKey))continue;
   const pm=[...block.matchAll(/PLACED:\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?:AM|PM)\s+ET/gi)];
   if(pm.length)block=block.slice(pm[pm.length-1].index+pm[pm.length-1][0].length);
   if(/\b(?:WON|LOST|SETTLED|RETURNED)\b/i.test(block))continue;
   const mm=block.match(matchupRe);let teams=mm?[clean(mm[1]),clean(mm[2])]:inferOpenTeams(block);if(teams.length<2){const prior=oldByGroup.get(gidKey);if(prior?.matchTeams?.length>=2)teams=prior.matchTeams.slice(0,2)}
   const wagerM=block.match(/\$([\d,]+(?:\.\d{1,2})?)TOTAL WAGER/i),wager=wagerM?wagerM[1].replace(/,/g,''):'';
   const pre=mm?block.slice(0,mm.index):block;
   const omatches=[...pre.matchAll(/([+-]\d{2,7})(?![\d.])/g)],om=omatches.length?omatches[omatches.length-1]:null;
   const odds=om?om[1]:'';
   let before=clean(om?pre.slice(0,om.index):pre),descriptor=clean(om?pre.slice(om.index+om[0].length):'');
   before=clean(before.replace(/.*(?:OpenSettledSaved|My Bets|TOTAL PAYOUT|Share bet)/i,''));
   // Thresholds such as 40+, O/U 2.5, -4.5 are semantic clues, not format requirements.
   const clue=(before.match(/(?:\b(?:over|under)\s*\d+(?:\.\d+)?|\b\d+(?:\.\d+)?\+|[+-]\d+(?:\.\d+)?)(?!\d)/i)||[])[0]||'';
   let prop=normalizeOpenMarket(before,descriptor);
   // A spread is not usable without its line. FanDuel often separates the team,
   // line and SPREAD label in flattened text, so carry the signed clue into the
   // normalized market instead of saving a bare `Spread`.
   if(/^Spread$/i.test(prop)){
     const spreadClue=(before+' '+descriptor).match(/(^|[^\d])([+-]\d+(?:\.\d+)?)(?!\d)/);
     if(spreadClue)prop='Spread '+spreadClue[2];
   }
   if(!prop){
     let d=descriptor.replace(/^(?:[-–—:|]+\s*)/,'').trim();
     prop=clean((clue?clue+' ':'')+(d||'Tracked Bet'));
   }
   let selection='',player='';
   // Team markets: preserve the team as selection. Otherwise preserve the player/title.
   let bestTeam='';for(const t of TEAMS)if(before.toLowerCase().includes(t.toLowerCase())&&t.length>bestTeam.length)bestTeam=t;
   if(bestTeam&&/moneyline|spread|run line/i.test(prop)){selection=bestTeam}
   else {player=playerFromOpenTitle(before,descriptor)||clean(before.replace(/\s+(?:over|under)\s*\d+(?:\.\d+)?(?:\+)?\s*$/i,'').replace(/\s+\d+(?:\.\d+)?\+.*$/i,''));player=cleanOpenPlayerName(player);}
   if(!player&&!selection)selection=bestTeam||'FanDuel Bet';
   out.push({player,selection,prop,odds,wager,matchTeams:teams,groupId:gid,notifyMode:oldMode.get([player||selection,prop].join('~').toLowerCase())||'inherit',source:'FanDuel Open',fallbackParsed:true});
   parsedGroups.add(gidKey);
 }

 // Final semantic repair pass. BET ID is the ticket boundary, so use the ticket's own
 // raw text to restore numbers that FanDuel separates from its market label.
 // This is deliberately generic: the parser may understand the market label while still
 // dropping the threshold (40+) or spread line (-4.5). Those numbers are required by tracking.
 const rawByGroup=new Map();
 let repairPrev=0;
 for(const idm of ids){
   const gid=('bet:'+idm[1]).toLowerCase();
   let block=flatAll.slice(repairPrev,idm.index);repairPrev=idm.index+idm[0].length;
   const pm=[...block.matchAll(/PLACED:\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?:AM|PM)\s+ET/gi)];
   if(pm.length)block=block.slice(pm[pm.length-1].index+pm[pm.length-1][0].length);
   rawByGroup.set(gid,block);
 }
 for(const b of out){
   const block=rawByGroup.get(String(b.groupId||'').toLowerCase())||'';
   if(!block)continue;
   if((b.selection||(!b.player&&b.matchTeams?.length))&&/\bMONEYLINE\b/i.test(block)&&!/(moneyline|spread|run line|total runs)/i.test(b.prop||''))b.prop='Moneyline';
   // Moneyline repair: bind the saved pick to one of THIS ticket's two matchup teams.
   // Never let generic/flattened FanDuel text or a previous fallback choose an arbitrary side.
   if(/moneyline/i.test(b.prop||'')&&b.matchTeams?.length>=2){
     const teams=b.matchTeams.slice(0,2), norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
     const cur=norm(b.selection), exact=teams.find(t=>{const nt=norm(t);return cur&&nt&&(cur===nt||cur.includes(nt)||nt.includes(cur))});
     let chosen=exact||'';
     if(!chosen){
       // Prefer a team immediately adjacent to its American price / MONEYLINE market.
       let best=null;
       for(const t of teams){
         const esc=String(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
         const patterns=[
           new RegExp(esc+'\\s*[+-]\\d{2,7}\\s*MONEYLINE','i'),
           new RegExp(esc+'[^A-Za-z0-9]{0,20}MONEYLINE','i'),
           new RegExp('MONEYLINE[^A-Za-z0-9]{0,20}'+esc,'i')
         ];
         for(let pi=0;pi<patterns.length;pi++){const m=block.match(patterns[pi]);if(m){const score=100-pi*20;if(!best||score>best.score)best={team:t,score};break}}
       }
       if(best)chosen=best.team;
     }
     if(chosen){b.selection=chosen;b.player='';b.prop='Moneyline'}
   }
   // Repair a bare spread from the ticket's own text. Do not depend on DOM order.
   if(/^spread(?:\s|$)/i.test(clean(b.prop||''))&&!/[+-]\d+(?:\.\d+)?/.test(b.prop||'')){
     let line='';
     if(b.selection){
       const esc=String(b.selection).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
       const m=block.match(new RegExp(esc+'[^A-Za-z0-9]{0,8}([+-]\\d+(?:\\.\\d+)?)','i'));if(m)line=m[1];
     }
     if(!line){const m=block.match(/([+-]\d+(?:\.\d+)?)(?=[+-]\d{2,7}\s*SPREAD|\s*SPREAD)/i);if(m)line=m[1]}
     if(!line){const m=block.match(/\b(?:SPREAD)\s*([+-]\d+(?:\.\d+)?)/i);if(m)line=m[1]}
     if(line){b.prop='Spread '+line;b.line=Number(line)}
   } else if(/spread/i.test(b.prop||'')){
     const m=String(b.prop).match(/([+-]\d+(?:\.\d+)?)/);if(m)b.line=Number(m[1]);
   }
   const kind=String(b.prop||'');
   if(b.player&&!/\d+(?:\.\d+)?\s*\+/.test(kind)&&/(yards?|yds|receptions?|shots? on goal|total bases|goals?)/i.test(kind)&&!/touchdowns?|touchdown scorer/i.test(kind)){
     const esc=String(b.player).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
     let m=block.match(new RegExp(esc+'[^$]{0,90}?(\\d+(?:\\.\\d+)?\\+)','i'));
     if(!m)m=block.match(/\b(\d+(?:\.\d+)?\+)\s*(?:yards?|yds|receptions?|shots?|total bases|goals?|touchdowns?)?/i);
     if(m){b.target=Number(m[1].replace('+',''));b.prop=m[1]+' '+kind.replace(/^player\s+to\s+record\s+/i,'').replace(/^\d+(?:\.\d+)?\+\s*/,'')}
   }

 }
 // Final identity safety net: never let FanDuel prices/UI fragments become player names.
 // If this exact ticket/price/market was previously parsed correctly, preserve that identity.
 // Otherwise discard the malformed leg rather than showing a confidently wrong card.
 for(let i=out.length-1;i>=0;i--){
   const b=out[i];
   if(b?.source!=='FanDuel Open')continue;
   const exact=oldExact.get([String(b.groupId||'').toLowerCase(),String(b.odds||''),normOpenId(b.prop||'')].join('|'));
   const badPlayer=!!b.player&&!playerish(cleanOpenPlayerName(b.player));
   const bareStat=!!b.player&&/^(?:Receiving|Rushing|Passing) Yards$|^Receptions$/i.test(clean(b.prop||''))&&!Number.isFinite(Number(b.target));
   if((badPlayer||bareStat)&&exact&&isValidBet(exact)){
     out[i]={...b,player:exact.player||'',selection:exact.selection||'',prop:exact.prop||b.prop,target:exact.target,notifyMode:exact.notifyMode||b.notifyMode};
     continue;
   }
   // FanDuel sometimes exposes a UI label such as "Scorer Ollie Gordon II" as if
   // it were a player name. "Scorer" is never part of the selection identity; this is
   // a parser fragment, not another bet. Drop it unconditionally instead of allowing a
   // later semantic pass to reinterpret it as a 2+ TD market.
   if(/^Scorer\b/i.test(clean(b.player||''))){out.splice(i,1);continue}
   if(badPlayer){out.splice(i,1);continue}
   // A bare yardage/reception market has lost its sportsbook line. It cannot be tracked
   // accurately, so do not render a duplicate/phantom card until a later sync resolves it.
   if(bareStat){out.splice(i,1);continue}
 }
 // Cross-parser garbage suppression. Some FanDuel representations are fragments of a
 // real leg rather than additional bets. Never let those fragments survive just because
 // they were assigned a different synthetic ticket/group id by another parser.
 // Preserve real repeated RR/parlay legs; only discard an inferior fragment when a clean
 // representation of the SAME semantic selection exists elsewhere on the page.
 const preCanonSubject=b=>normOpenId(clean(b.player||b.selection||'').replace(/^Scorer\s+/i,'').replace(/\s+(?:Any\s*Time|To\s+Score)$/i,''));
 const preCanonMarket=b=>{
   const p=clean(b.prop||'');
   if(/moneyline/i.test(p))return 'moneyline';
   if(/2\+\s+(?:any\s*time\s+)?touchdown/i.test(p)||/to\s+score\s+2\+/i.test(p))return '2+ touchdowns';
   if(/touchdown scorer/i.test(p))return 'any time touchdown scorer';
   const th=(p.match(/\b(\d+(?:\.\d+)?)\+/)||[])[1]||((Number.isFinite(Number(b.target))&&Number(b.target)>0)?String(Number(b.target)):'');
   if(/rec(?:eiving)?\s+(?:yards?|yds?)/i.test(p))return (th?th+'+ ':'')+'receiving yards';
   if(/rush(?:ing)?\s+(?:yards?|yds?)/i.test(p))return (th?th+'+ ':'')+'rushing yards';
   if(/pass(?:ing)?\s+(?:yards?|yds?)/i.test(p))return (th?th+'+ ':'')+'passing yards';
   if(/receptions?/i.test(p))return (th?th+'+ ':'')+'receptions';
   return normOpenId(p);
 };
 const cleanEvidence=new Set(out.filter(b=>b.odds&&isOdds(b.odds)&&!/^Scorer\b/i.test(clean(b.player||''))&&!/^2\+\s+Any\s*Time\s+Touchdown\s+Scorer$/i.test(clean(b.prop||''))).map(b=>preCanonSubject(b)+'|'+preCanonMarket(b)));
 for(let i=out.length-1;i>=0;i--){
   const b=out[i], ck=preCanonSubject(b)+'|'+preCanonMarket(b);
   const malformed=/^Scorer\b/i.test(clean(b.player||''))||/^2\+\s+Any\s*Time\s+Touchdown\s+Scorer$/i.test(clean(b.prop||''));
   const fragment=!b.odds||!isOdds(b.odds);
   if(cleanEvidence.has(ck)&&(malformed||fragment))out.splice(i,1);
 }

 // BET-ID authority pass. FanDuel prints one BET ID per actual slip, at the END of
 // that slip. When IDs are present, they are the source of truth for ticket membership:
 // parser fragments with synthetic/missing/wrong group IDs are not additional bets.
 // This prevents cross-ticket text bleed from manufacturing duplicate legs.
 const visibleTicketIds=new Set(ids.map(m=>'bet:'+m[1].toLowerCase()));
 if(visibleTicketIds.size){
   for(let i=out.length-1;i>=0;i--){
     const gid=String(out[i]?.groupId||'').toLowerCase();
     if(!visibleTicketIds.has(gid))out.splice(i,1);
   }
 }

 // Semantic de-duplication happens AFTER every repair pass. Multiple FanDuel DOM/text
 // representations can describe the same leg with different wording, odds leakage, or a
 // bad nearby matchup. Keep one best representation per ticket + actual selection/market.
 const canonSubject=b=>{
   let s=clean(b.player||b.selection||'');
   s=s.replace(/^Scorer\s+/i,'').replace(/\s+(?:Any\s*Time|To\s+Score)$/i,'');
   return normOpenId(s);
 };
 const canonMarket=b=>{
   let p=clean(b.prop||'');
   if(/moneyline/i.test(p))return 'moneyline';
   if(/touchdown scorer/i.test(p))return /2\+/.test(p)?'2+ touchdowns':'any time touchdown scorer';
   if(/2\+\s+touchdowns?/i.test(p))return '2+ touchdowns';
   let th=(p.match(/\b(\d+(?:\.\d+)?)\+/)||[])[1]||((Number.isFinite(Number(b.target))&&Number(b.target)>0)?String(Number(b.target)):'');
   if(/rec(?:eiving)?\s+(?:yards?|yds?)/i.test(p))return (th?th+'+ ':'')+'receiving yards';
   if(/rush(?:ing)?\s+(?:yards?|yds?)/i.test(p))return (th?th+'+ ':'')+'rushing yards';
   if(/pass(?:ing)?\s+(?:yards?|yds?)/i.test(p))return (th?th+'+ ':'')+'passing yards';
   if(/receptions?/i.test(p))return (th?th+'+ ':'')+'receptions';
   return normOpenId(p);
 };
 const quality=b=>{
   let q=Number(b.parseConfidence)||0;
   if(b.odds&&isOdds(b.odds))q+=8;
   if(b.wager)q+=3;
   if((b.matchTeams||[]).length===2)q+=5;
   if(b.selection&&(b.matchTeams||[]).some(t=>normOpenId(t)===normOpenId(b.selection)))q+=8;
   if(b.player&&!/^(?:Scorer)\b|\b(?:Any\s*Time|To\s+Score)$/i.test(clean(b.player)))q+=6;
   if(/^(?:\d+(?:\.\d+)?\+ )?(?:Receiving|Rushing|Passing) Yards$|^(?:\d+(?:\.\d+)?\+ )?Receptions$/i.test(clean(b.prop||'')))q+=6;
   if(/- ALT |\bScorer\b.*\bScorer\b/i.test(clean(b.prop||'')))q-=20;
   return q;
 };
 const best=new Map();
 for(const b of out.filter(isValidBet)){
   const k=[String(b.groupId||'').toLowerCase(),canonSubject(b),canonMarket(b)].join('|');
   const prev=best.get(k);
   if(!prev||quality(b)>quality(prev))best.set(k,b);
 }
 return [...best.values()].map(b=>{if('parseConfidence' in b){b={...b};delete b.parseConfidence}return b});
}
function normOpenId(s){return clean(s).toLowerCase().replace(/[^a-z0-9]+/g,' ' ).trim()}

function displayTicketTitle(s){s=clean(s);return s.replace(/\bsgp\b/ig,'Same Game Parlay')}
g.DLOParser={parse,parseOpen,openBetsText,clean,cleanOpenPlayerName,fingerprint,isValidBet,parseSettledTickets};
})(globalThis);
