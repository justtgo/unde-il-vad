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
      if(r.ok&&(r.headers.get('content-type')||'').includes('json')){proxyState='on';return r.json()}
      if(proxyState==='unknown')proxyState='off';
    }catch(e){if(proxyState==='unknown')proxyState='off'}
  }
  const url=API+path;
  if(TMDB_TOKEN){
    try{const r=await fetch(url,{headers:{Authorization:"Bearer "+TMDB_TOKEN,accept:"application/json"}});if(r.ok)return r.json()}catch(e){}
  }
  if(!TMDB_API_KEY)throw new Error('lipsesc cheile TMDB');
  const r=await fetch(url+(url.includes('?')?'&':'?')+'api_key='+TMDB_API_KEY);
  if(!r.ok)throw new Error('tmdb '+r.status);
  return r.json();
}
const $=id=>document.getElementById(id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cache={info:{},prov:{},key:{}};
async function info(id){return cache.info[id]||(cache.info[id]=await tmdb(`/movie/${id}?language=ro-RO`))}
async function prov(id){if(cache.prov[id])return cache.prov[id];const d=await tmdb(`/movie/${id}/watch/providers`);return cache.prov[id]=(d.results&&d.results.RO)||{}}
async function trailerKey(id){
  if(id in cache.key)return cache.key[id];
  const pick=l=>{const yt=(l||[]).filter(v=>v.site==='YouTube');return (yt.find(v=>v.type==='Trailer'&&v.official)||yt.find(v=>v.type==='Trailer')||yt.find(v=>v.type==='Teaser')||yt[0]||{}).key||null};
  let k=null;
  try{k=pick((await tmdb(`/movie/${id}/videos?language=ro-RO`)).results)}catch(e){}
  if(!k){try{k=pick((await tmdb(`/movie/${id}/videos?language=en-US`)).results)}catch(e){}}
  return cache.key[id]=k;
}

/* ==================== TRAILER PE TOT ECRANUL (YouTube IFrame API) ==================== */
let heroSettled=false,yt=null,ytReady=false,heroKey=null,muted=true,heroVisible=true;
function settleHero(){heroSettled=true}
window.onYouTubeIframeAPIReady=function(){
  yt=new YT.Player('heroPlayer',{
    host:'https://www.youtube-nocookie.com',
    playerVars:{autoplay:1,mute:1,controls:0,disablekb:1,fs:0,iv_load_policy:3,modestbranding:1,playsinline:1,rel:0},
    events:{
      onReady:e=>{ytReady=true;e.target.mute();if(heroKey)startHero(heroKey)},
      onStateChange:e=>{
        if(e.data===YT.PlayerState.PLAYING){$('hbg').classList.add('playing');settleHero()}
        if(e.data===YT.PlayerState.ENDED){yt.seekTo(0);yt.playVideo()}
      },
      onError:()=>{$('hbg').classList.remove('playing');settleHero()}
    }
  });
};
function startHero(key){
  heroKey=key;
  if(!key){settleHero();return}
  if(!ytReady)return;
  yt.loadVideoById({videoId:key,startSeconds:0});
  yt.mute();
  if(!heroVisible)setTimeout(()=>{try{yt.pauseVideo()}catch(e){}},300);
}
(function(){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=settleHero;document.head.appendChild(s)})();

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
    b.onclick=()=>{mine.has(p)?mine.delete(p):mine.add(p);renderChips();refreshBadges();prov(FEATURED_ID).then(renderHeroLogos);if(current.type==='movie')renderSide(current.id)};
    $('chips').appendChild(b);
  });
}

/* ==================== HERO ==================== */
function renderHeroLogos(ro){
  const subs=ro.flatrate||[];
  $('hlogos').innerHTML=subs.length?subs.map(p=>`<img class="${isMine(p.provider_name)?'mine':''}" src="${LOGO}${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">`).join(''):`<small>${(ro.rent||ro.buy)?'doar la închiriere sau cumpărare':'momentan indisponibil în România'}</small>`;
}
async function loadHero(){
  try{
    const [f,ro,key]=await Promise.all([info(FEATURED_ID),prov(FEATURED_ID),trailerKey(FEATURED_ID)]);
    if(f.backdrop_path)$('hbg').style.backgroundImage=`url(${BIG}${f.backdrop_path})`;
    $('htitle').textContent=f.title;
    const year=(f.release_date||'').slice(0,4),genres=(f.genres||[]).slice(0,2).map(g=>g.name).join(', ');
    $('hmeta').innerHTML=[year,genres,f.runtime?f.runtime+' min':''].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
    $('hdesc').textContent=f.overview||'';
    renderHeroLogos(ro);
    startHero(key);
  }catch(e){$('hdesc').textContent='Nu am putut încărca datele. Verifică conexiunea la internet.';settleHero()}
}
function toExplore(){$('explore').scrollIntoView({behavior:'smooth',block:'start'})}
$('hwatch').onclick=()=>{openMovie(FEATURED_ID,false);toExplore()};
$('scrollhint').onclick=toExplore;
$('brand').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
$('hrestart').onclick=()=>{if(yt&&ytReady){yt.seekTo(0);yt.playVideo()}};
$('sound').onclick=()=>{
  if(!yt||!ytReady)return;
  muted=!muted;
  if(muted)yt.mute();else{yt.unMute();yt.setVolume(70)}
  $('soundIcon').innerHTML=muted?'<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/>':'<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>';
  $('sound').setAttribute('aria-label',muted?'Pornește sunetul trailerului':'Oprește sunetul trailerului');
};
/* Când derulezi în pagina de jos, trailerul de sus se oprește; când revii, pornește din nou */
new IntersectionObserver(es=>{
  const e=es[0];heroVisible=e.intersectionRatio>.35;
  $('sound').style.display=heroVisible?'':'none';
  if(!yt||!ytReady||!heroKey)return;
  try{heroVisible?yt.playVideo():yt.pauseVideo()}catch(err){}
},{threshold:[0,.35,1]}).observe($('hero'));
window.addEventListener('scroll',()=>{$('topbar').classList.toggle('solid',window.scrollY>window.innerHeight-120)},{passive:true});

/* ==================== PLAYER ==================== */
let current={type:null,id:null};
function iframeSrc(src){return src+(src.includes('?')?'&':'?')+'autoplay=1&rel=0&modestbranding=1&playsinline=1'}
function setPlayer({src,poster,label,autoplay}){
  const p=$('player');
  if(!src){p.innerHTML=`${poster?`<div class="facade" style="background-image:url(${poster});cursor:default"></div>`:''}<div class="noTrailer">Nu există un trailer disponibil pentru acest film.</div>`;return}
  if(autoplay){
    if(yt&&ytReady){try{yt.pauseVideo()}catch(e){}}
    p.innerHTML=`<iframe src="${iframeSrc(src)}" title="${label||'Trailer'}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;return
  }
  p.innerHTML=`<button class="facade" style="background-image:url(${poster||''})" aria-label="Redă ${label||'trailerul'}"><span class="bigplay"></span><span class="ftag">${label||'Trailer'}</span></button>`;
  p.querySelector('.facade').onclick=()=>setPlayer({src,poster,label,autoplay:true});
}
const ytEmbed=key=>`https://www.youtube-nocookie.com/embed/${key}`;

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
    const [f,key]=await Promise.all([info(id),trailerKey(id)]);
    setPlayer({src:key?ytEmbed(key):null,poster:f.backdrop_path?BACK+f.backdrop_path:null,label:'Trailer oficial',autoplay});
  }catch(e){setPlayer({src:null})}
}

/* ==================== HONEST TRAILERS ==================== */
const LIST="PL86F4D497FD3CACCE";
const HONEST=[
  {title:"Honest Trailers | Spider-Man: Brand New Day",thumb:"https://i.ytimg.com/vi/eQf6nDraYQg/hqdefault.jpg",src:`https://www.youtube-nocookie.com/embed/eQf6nDraYQg?list=${LIST}`},
  {title:"Episodul 2 din playlist",src:`https://www.youtube-nocookie.com/embed/videoseries?list=${LIST}&index=1`},
  {title:"Episodul 3 din playlist",src:`https://www.youtube-nocookie.com/embed/videoseries?list=${LIST}&index=2`},
  {title:"Episodul 4 din playlist",src:`https://www.youtube-nocookie.com/embed/videoseries?list=${LIST}&index=3`},
  {title:"Episodul 5 din playlist",src:`https://www.youtube-nocookie.com/embed/videoseries?list=${LIST}&index=4`}
];
const HBG=["#5b2a86","#1d3557","#0f4a3a","#4a2a0f","#3a0f4a"];
function renderHonest(){
  $('s2').innerHTML='';
  HONEST.forEach((v,i)=>{
    const c=document.createElement('button');c.className='vcard';c.dataset.h=i;
    c.innerHTML=`<div class="thumb" style="background-color:${HBG[i%HBG.length]};${v.thumb?`background-image:url(${v.thumb})`:''}"><span class="tplay"><i></i>Redă</span></div><p class="vname">${v.title}</p><p class="vsub">Screen Junkies</p>`;
    c.onclick=()=>openHonest(i);
    $('s2').appendChild(c);
  });
}
function openHonest(i){
  const v=HONEST[i];current={type:'honest',id:i};markActive();
  setPlayer({src:v.src,poster:v.thumb,label:v.title,autoplay:true});
  $('side').innerHTML=`
    <div class="sidehead"><div class="sp" style="background:${HBG[i%HBG.length]}"></div>
      <div><b>Honest Trailers</b><small>Screen Junkies · YouTube</small></div></div>
    <h2 class="stitle">${v.title}</h2>
    <p class="sdesc">Varianta sinceră a trailerelor de film, cu tot ce nu-ți spune reclama oficială.</p>
    <div class="where"><h4>Vezi tot playlistul</h4><a href="https://www.youtube.com/playlist?list=${LIST}" target="_blank" rel="noopener" style="color:var(--y);font-size:13px;font-weight:600">Deschide pe YouTube ↗</a></div>`;
  toExplore();
}

/* ==================== TRAILERE POPULARE / CĂUTARE ==================== */
async function loadPopular(){
  $('t1').innerHTML='Trailere populare<small>filme populare acum în România</small>';
  $('e1').innerHTML='<span class="spin"></span>Se încarcă...';
  try{const d=await tmdb('/movie/popular?language=ro-RO&region=RO&page=1');renderMovies(d.results.filter(f=>f.backdrop_path).slice(0,16))}
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
let debounceT;
$('q').addEventListener('input',()=>{clearTimeout(debounceT);debounceT=setTimeout(doSearch,350)});
$('q').addEventListener('focus',()=>{if(window.scrollY<window.innerHeight*.5)toExplore()});
async function doSearch(){
  const q=$('q').value.trim();
  if(!q){loadPopular();return}
  $('t1').innerHTML=`Rezultate<small>pentru „${q.replace(/</g,'&lt;')}”</small>`;
  $('s1').innerHTML='';$('e1').innerHTML='<span class="spin"></span>Caut...';
  try{const d=await tmdb(`/search/movie?language=ro-RO&region=RO&query=${encodeURIComponent(q)}`);renderMovies(d.results.slice(0,16))}
  catch(e){$('e1').textContent='Căutarea a eșuat. Încearcă din nou.'}
}
document.querySelectorAll('.arrow').forEach(b=>b.onclick=()=>{const s=$(b.dataset.s);s.scrollBy({left:b.dataset.d*s.clientWidth*.85})});

/* ==================== START ==================== */
renderChips();renderHonest();loadHero();loadPopular();openMovie(FEATURED_ID,false);
