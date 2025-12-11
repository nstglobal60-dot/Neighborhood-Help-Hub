// ===== Utilities =====
const $ = id => document.getElementById(id);

function uid(){ return 'p_'+Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }
function timeAgo(ts){
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return s+'s ago';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  return new Date(ts).toLocaleDateString();
}
function speak(text){ if('speechSynthesis' in window){window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));} }

// ===== Data Handling =====
const seed = [
  {id:uid(),type:'Request',cat:'Tool',title:'Need electric drill for 2 hours',desc:'I need a drill to hang shelves today. Will pick up and return. Small fee offered.',lat:null,lon:null,ts:Date.now()-3600_000,author:'Aisha',rating:4.9},
  {id:uid(),type:'Offer',cat:'Skill',title:'Graphic design - quick logo',desc:'Can design simple logo in 24 hours. Affordable.',lat:null,lon:null,ts:Date.now()-7200_000,author:'Sam',rating:4.6},
  {id:uid(),type:'Request',cat:'Errand',title:'Pick up meds from pharmacy',desc:'Urgent — need someone to collect and deliver meds (small compensation).',lat:null,lon:null,ts:Date.now()-1800_000,author:'Chike',rating:4.7}
];

function load(){ 
  const raw=localStorage.getItem('neighborly_posts');
  if(!raw){ localStorage.setItem('neighborly_posts',JSON.stringify(seed)); return seed; }
  try{ return JSON.parse(raw); } catch(e){ localStorage.setItem('neighborly_posts',JSON.stringify(seed)); return seed; }
}
function save(data){ localStorage.setItem('neighborly_posts',JSON.stringify(data)); }

let posts = load();

// ===== UI References =====
const list = $('list');
const count = $('result-count');
const activity = $('activity');
const locLabel = $('loc');
const bd = $('backdrop');

// ===== Location =====
async function findLocation(){
  try{
    const p = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:5000}));
    const lat=p.coords.latitude.toFixed(4), lon=p.coords.longitude.toFixed(4);
    locLabel.textContent = lat+','+lon;
    return {lat,lon};
  }catch(e){ locLabel.textContent='permission denied'; return null; }
}

// ===== Rendering =====
function render(){
  const q = $('search').value.toLowerCase();
  const cat = $('category').value;
  const viewRequests = $('view-requests').classList.contains('active');

  let shown = posts.filter(p=>{
    if(viewRequests && p.type!=='Request') return false;
    if(!viewRequests && p.type!=='Offer') return false;
    if(cat!=='all' && p.cat!==cat) return false;
    if(q && !(p.title+p.desc+p.author).toLowerCase().includes(q)) return false;
    return true;
  });

  const sort = $('sort').value;
  if(sort==='newest') shown.sort((a,b)=>b.ts-a.ts);
  if(sort==='rating') shown.sort((a,b)=>(b.rating||0)-(a.rating||0));

  list.innerHTML='';
  count.textContent = shown.length;
  if(!shown.length) list.innerHTML='<div class="sub">No posts yet. Create one!</div>';

  shown.forEach(p=>{
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = `<div style="flex:1">
      <div class="title">${escapeHtml(p.title)}</div>
      <div class="desc">${escapeHtml(p.desc)}</div>
      <div class="meta">By <strong>${escapeHtml(p.author||'anon')}</strong> • ${timeAgo(p.ts)} • <span class="pill">${(p.rating||4.5).toFixed(1)}★</span></div>
    </div>`;
    const actions = document.createElement('div'); actions.style.display='flex'; actions.style.flexDirection='column'; actions.style.gap='8px';
    const btn = document.createElement('button'); btn.textContent='Contact'; btn.onclick=()=>contact(p);
    const btn2 = document.createElement('button'); btn2.className='ghost'; btn2.textContent='Save'; btn2.onclick=()=>saveToMy(p);
    actions.appendChild(btn); actions.appendChild(btn2);
    el.appendChild(actions);
    list.appendChild(el);
  });
}

// ===== Activity / Contact =====
function pushActivity(text){ const item=document.createElement('div'); item.textContent=text; activity.prepend(item); }
function contact(p){
  pushActivity(`${new Date().toLocaleTimeString()} — You contacted ${p.author||'anon'} about "${p.title}"`);
  $('match').textContent = `${p.type} matched: ${p.title} — suggested: ${p.author||'anon'} (${(p.rating||4.5).toFixed(1)}★)`;
  speak(`${p.type} matched: ${p.title}. ${p.desc}`);
}
function saveToMy(p){
  const me = JSON.parse(localStorage.getItem('neighborly_mine')||'[]'); me.push(p); localStorage.setItem('neighborly_mine',JSON.stringify(me));
  pushActivity('Saved "'+p.title+'" to My posts');
}

// ===== Event Listeners =====
// Modal
$('create').addEventListener('click',()=>bd.style.display='flex');
$('close-modal').addEventListener('click',()=>bd.style.display='none');
$('save-post').addEventListener('click',()=>{
  const title=$('post-title').value.trim(); if(!title){alert('Add a title'); return;}
  const post={id:uid(),type:$('post-type').value,cat:$('post-cat').value,title,desc:$('post-desc').value,ts:Date.now(),author:'You',rating:5};
  posts.unshift(post); save(posts); render(); bd.style.display='none'; pushActivity('Created: '+title);
});

// Quick create
$('quick-create').addEventListener('click',()=>{
  const t=$('quick-title').value.trim(); if(!t){alert('Type something');return;}
  const post={id:uid(),type:'Request',cat:$('quick-cat').value,title:t,desc:'Quick post',ts:Date.now(),author:'You',rating:5};
  posts.unshift(post); save(posts); render(); $('quick-title').value=''; pushActivity('Quick Request created: '+t);
});

// View switch
$('view-requests').addEventListener('click',()=>{$('view-requests').classList.add('active'); $('view-offers').classList.remove('active'); render();});
$('view-offers').addEventListener('click',()=>{$('view-offers').classList.add('active'); $('view-requests').classList.remove('active'); render();});

// Search & filters
['search','category','sort'].forEach(id=>$(id).addEventListener('input',render));

// My posts
$('my-requests').addEventListener('click',()=>{
  const mine = JSON.parse(localStorage.getItem('neighborly_mine')||'[]'); if(!mine.length) return alert('No saved posts yet');
  list.innerHTML=''; mine.forEach(p=>{const e=document.createElement('div'); e.className='item'; e.innerHTML=`<div><div class="title">${escapeHtml(p.title)}</div><div class="desc">${escapeHtml(p.desc)}</div></div>`; list.appendChild(e);});
});

// Nearby
$('nearby').addEventListener('click',async ()=>{
  const loc = await findLocation(); if(!loc) return alert('Location not available');
  pushActivity('Searched nearby at '+loc.lat+','+loc.lon);
  render();
});

// Voice
const recognitionAvailable = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
$('voice').addEventListener('click',async ()=>{
  if(!recognitionAvailable) return alert('Speech recognition not supported');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SpeechRecognition(); r.lang='en-US'; r.interimResults=false; r.maxAlternatives=1;
  r.onresult = (e)=>{const t=e.results[0][0].transcript; $('post-title').value = t; bd.style.display='flex';};
  r.onerror = (ev)=>alert('Voice error: '+ev.error);
  r.start();
});

// Notifications
async function maybeNotify(){
  if(!('Notification' in window)) return; 
  if(Notification.permission==='granted') return;
  try{ const p=await Notification.requestPermission(); if(p==='granted') new Notification('Neighborly ready — posts saved locally'); }catch(e){}
}

// Storage listener
window.addEventListener('storage',()=>{ posts=load(); render(); });

// ===== Initialize =====
(async ()=>{
  await findLocation();
  render();
  ['Welcome to Neighborly','Tip: use "Quick Post" to add a request fast'].forEach(a=>pushActivity(a));
  maybeNotify();
})();
