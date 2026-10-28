/* Unde-l văd – logica aplicației */
/* ==================== TMDB ==================== */
const {TMDB_TOKEN='',TMDB_API_KEY='',FEATURED_ID=24}=window.UNDE_IL_VAD_CONFIG||{};
const API="https://api.themoviedb.org/3";
const IMG="https://image.tmdb.org/t/p/w185",BACK="https://image.tmdb.org/t/p/w780",BIG="https://image.tmdb.org/t/p/original",LOGO="https://image.tmdb.org/t/p/w92";
/* Pe Netlify, cererile trec prin funcția /api/tmdb, care ține cheia secretă.
   Pe GitHub Pages sau local, se folosesc cheile din js/config.js. */
let proxyState=location.protocol==='file:'?'off':'unknown';
async function tmdb(path){
  if(proxyState!=='off'){
    try{
      const r=await fetch('/api/tmdb?p='+encodeURIComponent(path));
      if(r.ok&&(r.headers.get('content-type')||'').includes('json')){if(proxyState!=='on')dbg('TMDB: prin funcția Netlify');proxyState='on';return r.json()}
      if(proxyState==='unknown'){proxyState='off';dbg('TMDB: direct, cu cheile din config.js')}
    }catch(e){if(proxyState==='unknown'){proxyState='off';dbg('TMDB: direct, cu cheile din config.js')}}
  }
  const url=API+path;
  if(TMDB_TOKEN){
    try{const r=await fetch(url,{headers:{Authorization:"Bearer "+TMDB_TOKEN,accept:"application/json"}});if(r.ok)return r.json()}catch(e){}
  }
  if(!TMDB_API_KEY){dbg('EROARE: lipsesc cheile TMDB din config.js');throw new Error('lipsesc cheile TMDB')}
  const r=await fetch(url+(url.includes('?')?'&':'?')+'api_key='+TMDB_API_KEY);
  if(!r.ok){dbg('EROARE TMDB',r.status,path);throw new Error('tmdb '+r.status)}
  return r.json();
}
const $=id=>document.getElementById(id);
/* ==================== DIAGNOSTIC (doar cu ?debug în adresă) ==================== */
const DEBUG=new URLSearchParams(location.search).has('debug');
function dbg(...a){
  if(!DEBUG)return;
  let el=document.getElementById('dbg');
  if(!el){el=document.createElement('pre');el.id='dbg';el.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99;max-width:min(560px,94vw);max-height:45vh;overflow:auto;margin:0;padding:10px 12px;background:rgba(0,0,0,.88);color:#9f9;font:12px/1.45 Menlo,monospace;border:1px solid #393;border-radius:8px;white-space:pre-wrap;user-select:text';document.body.appendChild(el)}
  el.textContent+=new Date().toLocaleTimeString()+'  '+a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n';
  el.scrollTop=el.scrollHeight;
}
const YT_ERR={2:'id video invalid',5:'eroare player HTML5',100:'video inexistent sau privat',101:'studioul nu permite redarea pe alte site-uri',150:'studioul nu permite redarea pe alte site-uri',153:'lipsește informația despre site (referrer)'};
dbg('pornire',location.href,navigator.userAgent.match(/(Safari|Chrome|Firefox|Edg)\/[\d.]+/g)?.join(' ')||'');

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cache={info:{},prov:{},key:{}};
async function info(id){return cache.info[id]||(cache.info[id]=await tmdb(`/movie/${id}?language=ro-RO`))}
async function prov(id){if(cache.prov[id])return cache.prov[id];const d=await tmdb(`/movie/${id}/watch/providers`);return cache.prov[id]=(d.results&&d.results.RO)||{}}
async function trailerKeys(id){
  if(cache.key[id])return cache.key[id];
  const order=l=>{
    /* doar trailere și teasere: fără clipuri, interviuri, making-of sau Shorts */
    const yt=(l||[]).filter(v=>v.site==='YouTube'&&(v.type==='Trailer'||v.type==='Teaser')&&!/\b(short|shorts|featurette|behind|interview|clip)\b/i.test(v.name||''));
    const rank=v=>(v.type==='Trailer'?0:1)+(v.official?0:.5);
    return yt.sort((a,b)=>rank(a)-rank(b)).map(v=>v.key);
  };
  let keys=[];
  try{keys=order((await tmdb(`/movie/${id}/videos?language=ro-RO`)).results)}catch(e){}
  try{keys=keys.concat(order((await tmdb(`/movie/${id}/videos?language=en-US`)).results))}catch(e){}
  cache.key[id]=[...new Set(keys)];dbg('trailere pentru film '+id+':',cache.key[id].length?cache.key[id].slice(0,4).join(', '):'NICIUNUL');
  return cache.key[id];
}
async function trailerKey(id){return (await trailerKeys(id))[0]||null}
/* filmele populare acum care sunt incluse în cel puțin un abonament de streaming în România */
const STREAMING_RO='/discover/movie?language=ro-RO&watch_region=RO&with_watch_monetization_types=flatrate&include_adult=false&vote_count.gte=50&sort_by=popularity.desc';
/* cadre din film, folosite când trailerul nu poate rula */
async function stills(id){
  if(cache.stills&&cache.stills[id])return cache.stills[id];
  cache.stills=cache.stills||{};
  let list=[];
  try{
    const d=await tmdb(`/movie/${id}/images?include_image_language=null,xx,en,ro`);
    list=(d.backdrops||[]).sort((a,b)=>(a.iso_639_1?1:0)-(b.iso_639_1?1:0)||b.vote_average-a.vote_average).slice(0,7).map(b=>b.file_path);
  }catch(e){}
  dbg('cadre pentru film '+id+':',list.length);
  return cache.stills[id]=list;
}

/* ==================== YOUTUBE ====================
   Folosim playerul YouTube standard. Varianta "nocookie" nu trimite
   corect evenimentele în unele browsere (mai ales Safari), iar atunci
   trailerul nu mai pornea automat. */
const ytApi=new Promise(res=>{
  window.onYouTubeIframeAPIReady=()=>{dbg('YouTube: scriptul s-a încărcat');res(window.YT)};
  const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';
  s.onerror=()=>{dbg('EROARE: scriptul YouTube nu s-a putut încărca (blocat de rețea sau de un blocker?)');res(null)};document.head.appendChild(s);
  setTimeout(()=>res(window.YT&&window.YT.Player?window.YT:null),8000);
});
const IS_FILE=location.protocol==='file:';
const YT_VARS={rel:0,modestbranding:1,playsinline:1,iv_load_policy:3,...(IS_FILE?{}:{origin:location.origin})};
const FILE_MSG='Trailerele merg doar pe site-ul publicat sau pe localhost. Pagina e deschisă acum direct ca fișier.';
let heroSettled=false;
function settleHero(){heroSettled=true}

/* ==================== INTRO ==================== */
let introDone=false;
(function(){
  const crt=$('crt'),seed=$('seed'),full=$('full'),txt=$('txt'),glow=$('glow'),intro=$('intro'),skip=$('skipIntro'),waiting=$('waiting');
  let ctx,skipped=false;
  function audio(){if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();return ctx}
  function tone(f,d,v){try{const c=audio(),o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(v,c.currentTime+.02);g.gain.linearRampToValueAtTime(0,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d+.02)}catch(e){}}
  function sweep(a,b,d,v){try{const c=audio(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(a,c.currentTime);o.frequency.exponentialRampToValueAtTime(b,c.currentTime+d);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d+.02)}catch(e){}}
  function click(d,v){try{const c=audio(),n=Math.floor(c.sampleRate*d),buf=c.createBuffer(1,n,c.sampleRate),x=buf.getChannelData(0);for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource(),g=c.createGain();s.buffer=buf;g.gain.value=v;s.connect(g);g.connect(c.destination);s.start()}catch(e){}}
  function reveal(){
    if(introDone)return;introDone=true;skip.style.display='none';
    document.body.classList.remove('locked');
    intro.style.opacity='0';$('app').classList.add('on');
    setTimeout(()=>{intro.style.display='none'},500);
  }
  async function waitForTrailer(){
    const start=Date.now();
    if(!heroSettled)waiting.classList.add('on');
    while(!heroSettled&&Date.now()-start<9000&&!skipped)await wait(150);
    reveal();
  }
  async function run(){
    tone(1000,.9,.045);
    await wait(900);if(skipped)return;
    seed.style.transition='transform .6s cubic-bezier(.3,0,.15,1)';seed.style.transform='scale(11)';
    await wait(520);if(skipped)return;
    full.style.transition='opacity .08s';full.style.opacity='1';
    await wait(120);
    for(const ch of "unde-l văd?"){if(skipped)return;txt.textContent+=ch;await wait(60)}
    await wait(850);if(skipped)return;
    crt.style.transition='filter .07s linear';crt.style.filter='brightness(1.7)';sweep(1400,70,.22,.05);
    await wait(70);if(skipped)return;
    crt.style.transition='opacity .08s linear';crt.style.opacity='0';
    glow.style.transition='opacity .06s linear';glow.style.opacity='1';click(.05,.12);
    await wait(110);if(skipped)return;
    glow.style.transition='transform .22s cubic-bezier(.4,0,.7,1), opacity .22s linear .08s';glow.style.transform='scaleX(.01)';glow.style.opacity='0';
    await wait(350);
    waitForTrailer();
  }
  run();
  skip.onclick=()=>{skipped=true;reveal()};
})();

/* ==================== ABONAMENTE ==================== */
const P=["Netflix","HBO Max","Disney+","Prime Video","SkyShowtime","Apple TV+"];
const MATCH={"Netflix":["netflix"],"HBO Max":["hbo","max"],"Disney+":["disney"],"Prime Video":["prime video","amazon prime"],"SkyShowtime":["skyshowtime"],"Apple TV+":["apple tv"]};
let mine=new Set(["Netflix","HBO Max"]);
const isMine=n=>{n=n.toLowerCase();return [...mine].some(p=>MATCH[p].some(k=>n.includes(k)))};
const canWatch=ro=>(ro.flatrate||[]).some(p=>isMine(p.provider_name));
function renderChips(){
  $('chips').innerHTML='';
  P.forEach(p=>{
    const b=document.createElement('button');b.className='chip'+(mine.has(p)?' on':'');b.textContent=p;b.setAttribute('aria-pressed',mine.has(p));
    b.onclick=()=>{mine.has(p)?mine.delete(p):mine.add(p);renderChips();refreshBadges();prov(heroList[heroCur]).then(renderHeroLogos);if(current.type==='movie')renderSide(current.id)};
    $('chips').appendChild(b);
  });
}

/* ==================== HERO: CARUSEL ====================
   Primul film e alegerea developerului (din config, Kill Bill),
   apoi topul săptămânii: cele mai populare 10 filme. Dacă trailerul pornește, rulează pe fundal;
   dacă e blocat sau browserul nu-l lasă, rămâne imaginea filmului. */
let heroFadeAt=0,heroList=[FEATURED_ID],heroCur=0,heroYT=null,heroReady=false,heroKeys=[],heroIdx=0,
    heroPlaying=false,heroVisible=true,muted=true,slideTimer,autoTimer,heroToken=0;
const SLIDE_NO_VIDEO=9000,SLIDE_WITH_VIDEO=25000;
let stillTimer,stillList=[],stillIdx=0,stillLayer=0;
/* rezoluție potrivită pentru ecran: clară, dar de câteva ori mai mică decât originalul */
const STILL='https://image.tmdb.org/t/p/w1280';
const preloaded={};
function preload(path){if(path&&!preloaded[path]){const i=new Image();i.src=STILL+path;preloaded[path]=i}return preloaded[path]}
let stillSeq=0;
function showStill(path){
  const seq=++stillSeq;
  /* imaginea nouă se încarcă întâi, apoi apare, ca să nu se vadă un ecran gol */
  const img=preload(path);
  let shown=false;
  const show=()=>{
    if(shown||seq!==stillSeq)return;shown=true;
    const layers=document.querySelectorAll('#hbg .still');
    stillLayer=1-stillLayer;
    const el=layers[stillLayer],other=layers[1-stillLayer];
    el.style.backgroundImage=`url(${STILL}${path})`;
    el.classList.remove('on','kb');void el.offsetWidth;
    el.classList.add('kb','on');
    /* cel vechi doar se estompează; zoom-ul lui continuă, deci nu mai „sare” */
    other.classList.remove('on');
  };
  if(img.complete)show();
  else{img.addEventListener('load',show,{once:true});img.addEventListener('error',show,{once:true});setTimeout(show,1500)}
}
function startStills(list){
  clearInterval(stillTimer);stillList=list||[];stillIdx=0;
  if(!stillList.length)return;
  stillList.forEach(preload);
  showStill(stillList[0]);
  if(stillList.length<2)return;
  stillTimer=setInterval(()=>{
    if(heroPlaying||!heroVisible)return;
    stillIdx=(stillIdx+1)%stillList.length;showStill(stillList[stillIdx]);
  },4300);
}

function renderHeroLogos(ro){
  const subs=ro.flatrate||[];
  $('hlogos').innerHTML=subs.length?subs.map(p=>`<img class="${isMine(p.provider_name)?'mine':''}" src="${LOGO}${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">`).join(''):`<small>${(ro.rent||ro.buy)?'doar la închiriere sau cumpărare':'momentan indisponibil în România'}</small>`;
}
function renderDots(){
  $('hdots').innerHTML='';
  heroList.forEach((id,i)=>{
    const d=document.createElement('button');d.className='hdot'+(i===heroCur?' on':'');
    d.setAttribute('aria-label','Filmul '+(i+1));d.innerHTML='<i></i>';
    d.onclick=()=>goHero(i);
    $('hdots').appendChild(d);
  });
  $('hcount').textContent=`${heroCur+1} / ${heroList.length}`;
}
function setDotTimer(ms){
  const d=$('hdots').children[heroCur];if(!d)return;
  const bar=d.querySelector('i');bar.style.animation='none';void bar.offsetWidth;
  bar.style.animation=`dotfill ${ms}ms linear forwards`;
}
function scheduleNext(ms){
  clearTimeout(slideTimer);
  if(!heroVisible||heroList.length<2)return;
  /* caruselul pornește abia după intro */
  if(!introDone){slideTimer=setTimeout(()=>scheduleNext(ms),500);return}
  slideTimer=setTimeout(()=>goHero(heroCur+1),ms);setDotTimer(ms);
}
async function goHero(i){
  const token=++heroToken;
  heroCur=(i+heroList.length)%heroList.length;
  const id=heroList[heroCur];
  clearTimeout(slideTimer);clearTimeout(autoTimer);
  if($('hbg').classList.contains('playing'))heroFadeAt=Date.now();
  heroPlaying=false;$('hbg').classList.remove('playing');$('heroPlay').hidden=true;
  if(heroYT&&heroReady){try{heroYT.pauseVideo()}catch(e){}}
  renderDots();
  $('hcontent').classList.add('fade');
  const fadeStart=Date.now();
  try{
    const [f,ro,keys,pics]=await Promise.all([info(id),prov(id),trailerKeys(id),stills(id)]);
    if(token!==heroToken)return;
    /* textul vechi are timp să dispară lin, chiar dacă datele noi vin instant */
    const wait=420-(Date.now()-fadeStart);if(wait>0){await new Promise(r=>setTimeout(r,wait));if(token!==heroToken)return}
    /* cadrele din film apar imediat și se succed cu zoom lent, până pornește trailerul */
    const list=pics.length?pics:(f.backdrop_path?[f.backdrop_path]:[]);
    startStills(list);
    $('hkick').textContent=heroCur===0?"DEVELOPER'S CHOICE":`TOPUL SĂPTĂMÂNII · #${heroCur}`;
    $('htitle').textContent=f.title;
    const year=(f.release_date||'').slice(0,4),genres=(f.genres||[]).slice(0,2).map(g=>g.name).join(', ');
    $('hmeta').innerHTML=[year,genres,f.runtime?f.runtime+' min':''].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
    $('hdesc').textContent=f.overview||'';
    renderHeroLogos(ro);
    $('hcontent').classList.remove('fade');
    heroKeys=keys;heroIdx=0;
    scheduleNext(SLIDE_NO_VIDEO);
    /* pregătim din timp primul cadru al filmului următor */
    const nextId=heroList[(heroCur+1)%heroList.length];
    if(nextId!==id)stills(nextId).then(l=>preload(l[0])).catch(()=>{});
    if(!keys.length){settleHero();return}
    playHeroKey(token);
  }catch(e){
    if(token!==heroToken)return;
    $('hcontent').classList.remove('fade');
    $('hdesc').textContent='Nu am putut încărca datele. Verifică conexiunea la internet.';
    settleHero();
  }
}
async function playHeroKey(token){
  if(IS_FILE){dbg('Hero: pagină deschisă ca fișier, fără trailer');settleHero();return}
  const YT=await ytApi;
  if(token!==heroToken)return;
  if(!YT){dbg('Hero: fără YouTube, rămâne imaginea');settleHero();return}
  const left=1100-(Date.now()-heroFadeAt);
  if(left>0){await new Promise(r=>setTimeout(r,left));if(token!==heroToken)return}
  const key=heroKeys[heroIdx];dbg('Hero: încerc trailerul',key);
  if(!heroYT){
    heroYT=new YT.Player('heroPlayer',{
      videoId:key,
      playerVars:{...YT_VARS,autoplay:1,mute:1,controls:0,disablekb:1,fs:0},
      events:{
        onReady:e=>{heroReady=true;dbg('Hero: playerul e gata');e.target.mute();if(heroVisible)e.target.playVideo()},
        onStateChange:onHeroState,
        onError:onHeroError
      }
    });
  }else if(heroReady){
    heroYT.loadVideoById({videoId:key,startSeconds:0});
    if(muted)heroYT.mute();
    if(!heroVisible)setTimeout(()=>{try{heroYT.pauseVideo()}catch(e){}},300);
  }
  clearTimeout(autoTimer);
  /* dacă browserul nu lasă pornirea automată, arătăm butonul */
  autoTimer=setTimeout(()=>{if(!heroPlaying&&heroVisible&&token===heroToken){dbg('Hero: nu a pornit singur în 4,5 s (pornire automată blocată de browser?)');$('heroPlay').hidden=false;settleHero()}},4500);
}
function onHeroState(e){
  dbg('Hero: stare',{'-1':'nepornit','0':'terminat','1':'rulează','2':'pauză','3':'se încarcă','5':'pregătit'}[e.data]||e.data);
  if(e.data===YT.PlayerState.PLAYING){
    if(!heroPlaying)scheduleNext(SLIDE_WITH_VIDEO);
    heroPlaying=true;clearTimeout(autoTimer);
    $('hbg').classList.add('playing');$('heroPlay').hidden=true;settleHero();
  }
  if(e.data===YT.PlayerState.ENDED){heroPlaying=false;goHero(heroCur+1)}
}
function onHeroError(e){
  dbg('Hero: EROARE YouTube',e&&e.data,YT_ERR[e&&e.data]||'',heroKeys[heroIdx]);
  /* trailer blocat de studio pentru alte site-uri: încercăm următorul */
  heroIdx++;
  if(heroIdx<heroKeys.length&&heroIdx<6){heroYT.loadVideoById({videoId:heroKeys[heroIdx]});if(muted)heroYT.mute()}
  else{heroPlaying=false;$('hbg').classList.remove('playing');$('heroPlay').hidden=true;clearTimeout(autoTimer);settleHero()}
}
async function loadHeroList(){
  try{
    const pages=await Promise.all([1,2].map(n=>tmdb(STREAMING_RO+'&page='+n).catch(()=>({results:[]}))));
    const cand=pages.flatMap(d=>d.results||[]).filter(f=>f.backdrop_path&&f.id!==FEATURED_ID).slice(0,24);
    /* verificăm fiecare film: rămân doar cele incluse într-un abonament în România */
    const ok=await Promise.all(cand.map(f=>prov(f.id).then(ro=>(ro.flatrate||[]).length>0).catch(()=>false)));
    const top=cand.filter((f,i)=>ok[i]).slice(0,10).map(f=>f.id);
    dbg('topul săptămânii pe streaming:',top.length,'filme');
    heroList=[FEATURED_ID,...top];
    renderDots();
    if(heroPlaying)scheduleNext(SLIDE_WITH_VIDEO);else scheduleNext(SLIDE_NO_VIDEO);
  }catch(e){}
}
function toExplore(){$('explore').scrollIntoView({behavior:'smooth',block:'start'})}
$('hwatch').onclick=()=>{openMovie(heroList[heroCur],false);toExplore()};
$('hprev').onclick=()=>goHero(heroCur-1);
$('hnext').onclick=()=>goHero(heroCur+1);
$('brand').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
$('heroPlay').onclick=()=>{if(heroYT&&heroReady){heroYT.playVideo()}};
$('sound').onclick=()=>{
  if(!heroYT||!heroReady)return;
  muted=!muted;
  if(muted)heroYT.mute();else{heroYT.unMute();heroYT.setVolume(70)}
  $('soundIcon').innerHTML=muted?'<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/>':'<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>';
  $('sound').setAttribute('aria-label',muted?'Pornește sunetul trailerului':'Oprește sunetul trailerului');
};
document.addEventListener('keydown',e=>{
  if(!heroVisible||e.target.closest('input,.suggest'))return;
  if(e.key==='ArrowRight')goHero(heroCur+1);
  if(e.key==='ArrowLeft')goHero(heroCur-1);
});
/* Când derulezi în pagina de jos, trailerul de sus și caruselul se opresc; când revii, pornesc din nou */
new IntersectionObserver(es=>{
  const was=heroVisible;heroVisible=es[0].intersectionRatio>.35;
  $('sound').style.display=heroVisible?'':'none';
  if(was===heroVisible)return;
  if(heroVisible){
    if(heroYT&&heroReady&&heroKeys.length){try{heroYT.playVideo()}catch(e){}}
    scheduleNext(heroPlaying?SLIDE_WITH_VIDEO:SLIDE_NO_VIDEO);
  }else{
    clearTimeout(slideTimer);
    if(heroYT&&heroReady){try{heroYT.pauseVideo()}catch(e){}}
  }
},{threshold:[0,.35,1]}).observe($('hero'));
window.addEventListener('scroll',()=>{$('topbar').classList.toggle('solid',window.scrollY>window.innerHeight-120)},{passive:true});

/* ==================== PLAYER ==================== */
let current={type:null,id:null},mainYT=null,mainToken=0;
function pauseHero(){if(heroYT&&heroReady){try{heroYT.pauseVideo()}catch(e){}}}
function clearMain(){if(mainYT){try{mainYT.destroy()}catch(e){}mainYT=null}}
function iframeSrc(src){return src+(src.includes('?')?'&':'?')+'autoplay=1&rel=0&modestbranding=1&playsinline=1'}
/* când trailerul nu poate fi redat aici: posterul filmului peste imaginea lui */
function showPoster(f,keys,msg){
  clearMain();
  const back=f&&f.backdrop_path?BACK+f.backdrop_path:'',poster=f&&f.poster_path?BACK+f.poster_path:'';
  const link=keys&&keys.length?`<a class="pblink" href="https://www.youtube.com/watch?v=${keys[0]}" target="_blank" rel="noopener">Vezi trailerul pe YouTube ↗</a>`:'';
  $('player').innerHTML=`<div class="pblocked">
    <div class="pbg" style="background-image:url(${back||poster})"></div>
    ${poster?`<img class="pposter" src="${poster}" alt="">`:''}
    <div class="ptext"><b>${msg}</b>${link}</div></div>`;
}
function playMovie(f,keys){
  const token=++mainToken;
  pauseHero();clearMain();
  if(IS_FILE){showPoster(f,keys,FILE_MSG);return}
  if(!keys.length){showPoster(f,keys,'Nu există un trailer pentru acest film.');return}
  $('player').innerHTML='<div id="mainYT"></div>';
  ytApi.then(YT=>{
    if(token!==mainToken)return;
    if(!YT){showPoster(f,keys,'Playerul YouTube nu s-a putut încărca.');return}
    let idx=0;
    mainYT=new YT.Player('mainYT',{
      videoId:keys[0],
      playerVars:{...YT_VARS,autoplay:1},
      events:{
        onReady:e=>{dbg('Player: gata, pornesc',keys[idx]);e.target.playVideo()},
        onStateChange:e=>dbg('Player: stare',e.data),
        onError:e=>{
          dbg('Player: EROARE YouTube',e.data,YT_ERR[e.data]||'',keys[idx]);
          idx++;
          if(idx<keys.length&&idx<6)mainYT.loadVideoById(keys[idx]);
          else showPoster(f,keys,'Studioul nu permite redarea acestui trailer aici.');
        }
      }
    });
  });
}
function moviefacade(f,keys){
  const back=f.backdrop_path?BACK+f.backdrop_path:(f.poster_path?BACK+f.poster_path:'');
  if(!keys.length){showPoster(f,keys,'Nu există un trailer pentru acest film.');return}
  clearMain();
  $('player').innerHTML=`<button class="facade" style="background-image:url(${back})" aria-label="Redă trailerul"><span class="bigplay"></span><span class="ftag">Trailer oficial</span></button>`;
  $('player').querySelector('.facade').onclick=()=>playMovie(f,keys);
}
/* pentru Honest Trailers (playlist) */
function setPlayer({src,poster,label}){
  ++mainToken;pauseHero();clearMain();
  if(IS_FILE){showPoster({poster_path:null,backdrop_path:null},[],FILE_MSG);return}
  $('player').innerHTML=`<iframe src="${iframeSrc(src)}" title="${label||'Video'}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

/* ==================== PANOUL DIN DREAPTA ==================== */
function grp(title,arr,sub){
  if(!arr||!arr.length)return `<div class="wgrp"><p>${title}</p><span class="none">Indisponibil</span></div>`;
  return `<div class="wgrp"><p>${title}</p><div class="logos">${arr.map(p=>`<span class="logo${sub&&isMine(p.provider_name)?' mine':''}"><img src="${LOGO}${p.logo_path}" alt="">${p.provider_name}</span>`).join('')}</div></div>`;
}
async function renderSide(id){
  try{
    const [f,ro]=await Promise.all([info(id),prov(id)]);
    const year=(f.release_date||'').slice(0,4),genres=(f.genres||[]).slice(0,3).map(g=>g.name).join(', ');
    $('side').innerHTML=`
      <div class="sidehead"><div class="sp">${f.poster_path?`<img src="${IMG}${f.poster_path}" alt="">`:''}</div>
        <div><b>${f.title}${year?` (${year})`:''}</b><small>${[genres,f.runtime?f.runtime+' min':''].filter(Boolean).join(' · ')}</small></div></div>
      <h2 class="stitle">Trailer oficial: ${f.title}</h2>
      <p class="sdesc" id="sdesc">${f.overview||'Fără descriere în limba română.'}</p>
      <button class="more" id="more" aria-label="Arată toată descrierea">⌄</button>
      <div class="where"><h4>Unde îl poți vedea în România</h4>
        ${grp('ABONAMENT',ro.flatrate,true)}${grp('ÎNCHIRIERE',ro.rent)}${grp('CUMPĂRARE',ro.buy)}</div>`;
    $('more').onclick=()=>{$('sdesc').classList.toggle('open');$('more').textContent=$('sdesc').classList.contains('open')?'⌃':'⌄'};
  }catch(e){$('side').innerHTML='<p class="empty">Nu am putut încărca detaliile. Verifică conexiunea la internet.</p>'}
}
async function openMovie(id,autoplay){
  current={type:'movie',id};markActive();renderSide(id);
  try{
    const [f,keys]=await Promise.all([info(id),trailerKeys(id)]);
    if(current.type!=='movie'||current.id!==id)return;
    autoplay?playMovie(f,keys):moviefacade(f,keys);
  }catch(e){showPoster(null,[],'Nu am putut încărca trailerul.')}
}

/* ==================== HONEST TRAILERS ====================
   Direct de pe canalul Screen Junkies: întâi cele mai noi episoade,
   apoi cele mai populare, cu imagine și vizualizări.
   1) pe Netlify, prin funcția /api/honest;
   2) altfel (local), prin listele automate ale canalului, citite cu un
      player YouTube ascuns, iar titlurile din oEmbed. */
const CHANNEL_SUF="OpcACMWblDls9Z6GERVi1A"; /* Screen Junkies: UC + acest cod */
const LIST_NEW="UULF"+CHANNEL_SUF,LIST_POP="UULP"+CHANNEL_SUF;
let HONEST=[
  {id:"eQf6nDraYQg",title:"Spider-Man: Brand New Day",tag:"new"},
  {id:"iQM8DzszRCw",title:"Toy Story 5",tag:"new"}
];
const ytThumb=id=>`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const isHT=t=>/^\s*honest trailers?\s*[|:–-]/i.test(t||'')&&!/\b(short|preview|commentary)\b/i.test(t||'');
const cleanTitle=t=>(t||'').replace(/^\s*Honest Trailers?\s*[|:–-]\s*/i,'').trim();
const fmtViews=n=>n?new Intl.NumberFormat('ro-RO',{notation:'compact',maximumFractionDigits:1}).format(n)+' vizualizări':'';
function setHonest(newest,popular){
  const seen=new Set();
  HONEST=[...newest.map(v=>({...v,tag:'new'})),...popular.map(v=>({...v,tag:'pop'}))]
    .filter(v=>v.id&&!seen.has(v.id)&&seen.add(v.id))
    .map(v=>({...v,title:cleanTitle(v.title)||v.title||'Honest Trailers'}));
  renderHonest();
}
function renderHonest(){
  $('s2').innerHTML='';
  HONEST.forEach((v,i)=>{
    const c=document.createElement('button');c.className='vcard';c.dataset.h=i;
    const badge=v.tag==='new'?'<b class="vbadge">NOU</b>':'<b class="vbadge vpop">POPULAR</b>';
    const sub=[fmtViews(v.views),v.date?new Date(v.date).toLocaleDateString('ro-RO',{day:'numeric',month:'short',year:'numeric'}):''].filter(Boolean).join(' · ')||'Honest Trailers';
    c.innerHTML=`<div class="thumb" style="background-image:url(${ytThumb(v.id)})">${badge}<span class="tplay"><i></i>Redă</span></div><p class="vname">${v.title||'Se încarcă...'}</p><p class="vsub">${sub}</p>`;
    c.onclick=()=>openHonest(i);
    $('s2').appendChild(c);
  });
  markActive();
}
async function loadHonest(){
  if(IS_FILE)return;
  /* 1) funcția Netlify */
  try{
    const r=await fetch('/api/honest');
    if(r.ok&&(r.headers.get('content-type')||'').includes('json')){
      const d=await r.json();
      if((d.newest||[]).length||(d.popular||[]).length){
        dbg('Honest Trailers ('+d.source+'):',(d.newest||[]).length,'noi,',(d.popular||[]).length,'populare');
        setHonest(d.newest||[],d.popular||[]);return;
      }
    }
  }catch(e){}
  /* 2) local: listele automate ale canalului */
  const YT=await ytApi;if(!YT)return;
  const [newIds,popIds]=await Promise.all([playlistIds(YT,LIST_NEW),playlistIds(YT,LIST_POP)]);
  dbg('Honest Trailers (local):',newIds.length,'videoclipuri noi,',popIds.length,'populare, înainte de filtrare');
  if(!newIds.length&&!popIds.length)return;
  const ids=[...new Set([...newIds.slice(0,25),...popIds.slice(0,25)])];
  const titles={};
  await Promise.all(ids.map(async id=>{
    try{
      const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id));
      if(r.ok)titles[id]=(await r.json()).title;
    }catch(e){}
  }));
  const haveTitles=Object.keys(titles).length>0;
  const pick=list=>list.map(id=>({id,title:titles[id]||''})).filter(v=>haveTitles?isHT(v.title):true);
  setHonest(pick(newIds).slice(0,8),pick(popIds).slice(0,12));
}
/* lista de videoclipuri a unui playlist, printr-un player YouTube ascuns */
function playlistIds(YT,list){
  return new Promise(res=>{
    const holder=document.createElement('div');
    holder.style.cssText='position:absolute;left:-9999px;top:0;width:200px;height:120px;opacity:0;pointer-events:none';
    const id='pl_'+list;holder.innerHTML=`<div id="${id}"></div>`;document.body.appendChild(holder);
    let done=false,pl;
    const finish=ids=>{if(done)return;done=true;try{pl.destroy()}catch(e){}holder.remove();res(ids||[])};
    const tryGet=()=>{try{const ids=pl&&pl.getPlaylist&&pl.getPlaylist();if(ids&&ids.length)finish(ids)}catch(e){}};
    pl=new YT.Player(id,{
      playerVars:{...YT_VARS,listType:'playlist',list,autoplay:0,mute:1,controls:0},
      events:{onReady:()=>setTimeout(tryGet,700),onStateChange:tryGet,onError:()=>finish([])}
    });
    setTimeout(tryGet,3000);setTimeout(()=>{tryGet();finish([])},7000);
  });
}
function openHonest(i){
  const v=HONEST[i];if(!v)return;
  current={type:'honest',id:i};markActive();
  playMovie({},[v.id]);
  $('side').innerHTML=`
    <div class="sidehead"><div class="sp"><img src="${ytThumb(v.id)}" alt="" style="object-position:center"></div>
      <div><b>Honest Trailers</b><small>${v.tag==='new'?'Episod nou':'Printre cele mai populare'} · Screen Junkies</small></div></div>
    <h2 class="stitle">${v.title||'Honest Trailers'}</h2>
    <p class="sdesc">Varianta sinceră a trailerelor de film, cu tot ce nu-ți spune reclama oficială.</p>
    <div class="where"><h4>${fmtViews(v.views)||'Screen Junkies'}</h4><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener" style="color:var(--y);font-size:13px;font-weight:600">Deschide pe YouTube ↗</a></div>`;
  toExplore();
}

/* ==================== TRAILERE POPULARE / CĂUTARE ==================== */
async function loadPopular(){
  $('t1').innerHTML='Populare pe streaming<small>incluse acum în abonamentele din România</small>';
  $('e1').innerHTML='<span class="spin"></span>Se încarcă...';
  try{
    const d=await tmdb(STREAMING_RO+'&page=1');
    const cand=(d.results||[]).filter(f=>f.backdrop_path);
    const ok=await Promise.all(cand.map(f=>prov(f.id).then(ro=>(ro.flatrate||[]).length>0).catch(()=>false)));
    renderMovies(cand.filter((f,i)=>ok[i]).slice(0,16));
  }
  catch(e){$('e1').textContent='Nu am putut încărca filmele. Verifică conexiunea la internet.'}
}
function renderMovies(list){
  $('e1').textContent='';$('s1').innerHTML='';
  if(!list.length){$('e1').textContent='Niciun film găsit. Încearcă alt titlu.';return}
  list.forEach(f=>{
    const c=document.createElement('button');c.className='vcard';c.dataset.id=f.id;
    const year=(f.release_date||'').slice(0,4);
    c.innerHTML=`<div class="thumb" style="background-image:url(${f.backdrop_path?BACK+f.backdrop_path:(f.poster_path?BACK+f.poster_path:'')})"><b class="vbadge" style="display:none"></b><span class="tplay"><i></i>Trailer</span></div><p class="vname">${f.title}</p><p class="vsub">${year||''}</p>`;
    c.onclick=()=>{openMovie(f.id,true);toExplore()};
    $('s1').appendChild(c);
  });
  markActive();refreshBadges();
}
function refreshBadges(){
  for(const c of $('s1').children){
    const id=+c.dataset.id;if(!id)continue;
    prov(id).then(ro=>{const b=c.querySelector('.vbadge');if(!b)return;const ok=canWatch(ro);b.textContent=ok?'Inclus la tine':'';b.style.display=ok?'':'none'}).catch(()=>{});
  }
}
function markActive(){
  for(const c of $('s1').children)c.classList.toggle('on',current.type==='movie'&&+c.dataset.id===current.id);
  for(const c of $('s2').children)c.classList.toggle('on',current.type==='honest'&&+c.dataset.h===current.id);
}
let debounceT,searchSeq=0;
const sug=$('suggest');
function closeSuggest(){sug.hidden=true;sug.innerHTML=''}
$('q').addEventListener('input',()=>{clearTimeout(debounceT);debounceT=setTimeout(liveSearch,300)});
$('q').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();clearTimeout(debounceT);closeSuggest();doSearch();}
  if(e.key==='Escape'){closeSuggest();$('q').blur()}
  if(e.key==='ArrowDown'){const f=sug.querySelector('button');if(f){e.preventDefault();f.focus()}}
});
sug.addEventListener('keydown',e=>{
  const items=[...sug.querySelectorAll('button')],i=items.indexOf(document.activeElement);
  if(e.key==='ArrowDown'&&i<items.length-1){e.preventDefault();items[i+1].focus()}
  if(e.key==='ArrowUp'){e.preventDefault();i>0?items[i-1].focus():$('q').focus()}
  if(e.key==='Escape'){closeSuggest();$('q').focus()}
});
document.addEventListener('click',e=>{if(!e.target.closest('.searchwrap'))closeSuggest()});
async function liveSearch(){
  const q=$('q').value.trim(),seq=++searchSeq;
  if(q.length<2){closeSuggest();if(!q)loadPopular();return}
  sug.hidden=false;sug.innerHTML='<p class="sgmsg"><span class="spin"></span>Caut...</p>';
  try{
    const d=await tmdb(`/search/movie?language=ro-RO&region=RO&query=${encodeURIComponent(q)}`);
    if(seq!==searchSeq)return;
    const list=(d.results||[]).slice(0,8);
    if(!list.length){sug.innerHTML='<p class="sgmsg">Niciun film găsit. Încearcă alt titlu.</p>';return}
    sug.innerHTML='';
    list.forEach(f=>{
      const b=document.createElement('button');b.type='button';b.className='sgitem';
      const year=(f.release_date||'').slice(0,4);
      b.innerHTML=`<span class="sgp">${f.poster_path?`<img src="${IMG}${f.poster_path}" alt="">`:''}</span><span class="sgt"><b>${f.title}</b><small>${[year,f.original_title&&f.original_title!==f.title?f.original_title:''].filter(Boolean).join(' · ')}</small></span>`;
      b.onclick=()=>{closeSuggest();openMovie(f.id,true);toExplore()};
      sug.appendChild(b);
    });
    const all=document.createElement('button');all.type='button';all.className='sgall';all.textContent='Vezi toate rezultatele';
    all.onclick=()=>{closeSuggest();doSearch()};
    sug.appendChild(all);
  }catch(e){if(seq===searchSeq)sug.innerHTML='<p class="sgmsg">Căutarea a eșuat. Încearcă din nou.</p>'}
}
async function doSearch(){
  const q=$('q').value.trim();
  /* căutarea apare și în adresă, ca linkul să poată fi trimis cuiva */
  try{const u=new URL(location.href);q?u.searchParams.set('q',q):u.searchParams.delete('q');history.replaceState(null,'',u)}catch(e){}
  if(!q){loadPopular();return}
  $('t1').innerHTML=`Rezultate<small>pentru „${q.replace(/</g,'&lt;')}”</small>`;
  $('s1').innerHTML='';$('e1').innerHTML='<span class="spin"></span>Caut...';
  $('t1').scrollIntoView({behavior:'smooth',block:'start'});
  try{const d=await tmdb(`/search/movie?language=ro-RO&region=RO&query=${encodeURIComponent(q)}`);renderMovies(d.results.slice(0,16))}
  catch(e){$('e1').textContent='Căutarea a eșuat. Încearcă din nou.'}
}
document.querySelectorAll('.arrow').forEach(b=>b.onclick=()=>{const s=$(b.dataset.s);s.scrollBy({left:b.dataset.d*s.clientWidth*.85})});

/* ==================== START ==================== */
/* link cu căutare: ?q=titlu (folosit și de Google) */
const START_Q=new URLSearchParams(location.search).get('q');
if(START_Q){$('q').value=START_Q;const waitIntro=()=>introDone?setTimeout(doSearch,400):setTimeout(waitIntro,300);waitIntro()}
renderChips();renderHonest();loadHonest();renderDots();goHero(0);loadHeroList();loadPopular();openMovie(FEATURED_ID,false);
