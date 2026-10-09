'use strict';
/* MemoryRooms – Hauptlogik v15.2 (modular) */

let currentRoom=null,currentRoomId=null,currentMarkers=[],editMarkerId=null,editItems=[],markerPhoto=null,editingRoom=null,roomPhoto=null,arrange=false,selectedPreset='livingroom';
let queue=[],qIndex=0,known=0,unknown=0,sessionLabel='',hintUsed=false;
let recallList=[],recallIdx=0,recallScore={all:0,part:0,none:0};

const $=sel=>document.getElementById(sel);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

/* ---------- Bilder ---------- */
function roomSvg(kind){
  const R=(x,y,w,h,f,o)=>{o=o||{};return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"`+(o.rx?` rx="${o.rx}"`:'')+(o.op?` fill-opacity="${o.op}"`:'')+(o.s?` stroke="${o.s}" stroke-width="${o.sw||4}"`:'')+'/>'};
  const C=(x,y,rad,f)=>`<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}"/>`;
  const E=(x,y,rx,ry,f,op)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"`+(op?` fill-opacity="${op}"`:'')+'/>';
  const G=(pts,f)=>`<polygon points="${pts}" fill="${f}"/>`;
  const PAL={livingroom:['#eadfce','#b58f6a'],kitchen:['#f3e6d3','#c9b08a'],bedroom:['#ddd6e8','#b79f86'],office:['#dfe8e6','#a89880'],workshop:['#d9cbb9','#8c7c6a'],blank:['#efe7da','#cdbb9f']};
  let b='';
  if(kind==='garden'){
    b='<defs><linearGradient id="sky" x2="0" y2="1"><stop offset="0" stop-color="#bfe3f5"/><stop offset="1" stop-color="#eaf6fb"/></linearGradient><linearGradient id="grass" x2="0" y2="1"><stop offset="0" stop-color="#8bc46b"/><stop offset="1" stop-color="#5f9b4a"/></linearGradient></defs>'
      +R(0,0,1200,520,'url(#sky)')+C(930,120,62,'#ffd966')+E(250,130,110,34,'#fff',.85)+E(330,110,70,28,'#fff',.85)+E(760,200,90,26,'#fff',.8)
      +R(0,520,1200,280,'url(#grass)')+R(0,400,1200,14,'#f3ead9')+R(0,452,1200,14,'#f3ead9');
    for(let x=20;x<1200;x+=70)b+=R(x,360,34,150,'#f8f1e3',{rx:6});
    b+=R(575,290,50,250,'#7a5638',{rx:8})+C(600,230,120,'#4f9d54')+C(520,290,80,'#5aae5f')+C(685,290,80,'#5aae5f');
    [[180,690,'#e86a6a'],[260,720,'#f2c94c'],[380,680,'#e86a6a'],[820,700,'#f2c94c'],[940,680,'#e86a6a'],[1040,725,'#f2c94c']].forEach(f=>{b+=C(f[0],f[1],11,f[2])});
  }else{
    const pal=PAL[kind]||PAL.blank;
    b=R(0,0,1200,800,pal[0])+R(0,560,1200,240,pal[1])+R(0,548,1200,14,'#000',{op:.12});
    for(let i=1;i<5;i++)b+=R(0,560+i*48,1200,3,'#000',{op:.07});
    if(kind==='livingroom'){
      b+=E(600,690,300,60,'#b5533c',.55)+R(410,360,380,120,'#4b7bb5',{rx:30})+R(390,440,420,110,'#5b8bc5',{rx:28})
        +R(370,420,50,140,'#4372a8',{rx:22})+R(780,420,50,140,'#4372a8',{rx:22})+R(430,380,150,70,'#6c9bd2',{rx:20})+R(620,380,150,70,'#6c9bd2',{rx:20})
        +R(400,550,16,24,'#4a3a2c')+R(784,550,16,24,'#4a3a2c')+R(880,380,10,180,'#3b3028')+G('850,380 920,380 905,320 865,320','#f2c94c');
    }else if(kind==='kitchen'){
      b+=R(380,150,440,140,'#fffaf0',{rx:8,s:'#cdb89a'})+R(527,150,4,140,'#cdb89a')+R(673,150,4,140,'#cdb89a')
        +R(360,440,480,26,'#8d6e4f',{rx:6})+R(370,466,460,110,'#efe0c8',{s:'#cdb89a'})+R(523,466,4,110,'#cdb89a')+R(677,466,4,110,'#cdb89a')
        +R(480,500,16,6,'#8d6e4f')+R(554,500,16,6,'#8d6e4f')+R(630,500,16,6,'#8d6e4f')+R(704,500,16,6,'#8d6e4f')
        +R(560,426,90,14,'#333',{rx:4})+R(430,396,70,44,'#7f8c8d',{rx:6})+R(440,386,50,10,'#5d6a6b',{rx:4});
    }else if(kind==='bedroom'){
      b+=R(400,320,400,150,'#7a5d78',{rx:24})+R(380,440,440,130,'#fffaf3',{rx:20})+R(380,490,440,90,'#a58ab0',{rx:16})
        +R(420,440,150,56,'#ffffff',{rx:24,s:'#ddd',sw:3})+R(630,440,150,56,'#ffffff',{rx:24,s:'#ddd',sw:3})
        +R(390,570,22,26,'#5c4635')+R(788,570,22,26,'#5c4635')+R(850,470,90,100,'#8a6a4a',{rx:8})+R(860,505,70,4,'#6d5238')
        +R(891,452,8,18,'#5c4635')+C(895,440,28,'#f2c94c');
    }else if(kind==='office'){
      b+=R(400,180,200,14,'#8a6a4a')+R(415,130,18,50,'#b94338')+R(437,140,18,40,'#2376d8')+R(459,125,18,55,'#2f8b4b')+R(481,138,18,42,'#c9741a')+R(503,132,18,48,'#76695d')
        +R(380,450,440,26,'#8a6a4a',{rx:6})+R(395,476,18,100,'#6d5238')+R(787,476,18,100,'#6d5238')
        +R(540,320,200,110,'#2b3a42',{rx:10})+R(552,332,176,86,'#6fa8dc')+R(628,430,24,20,'#222')+R(560,438,160,10,'#d4d4d4',{rx:4})
        +R(760,418,40,32,'#fffaf3',{rx:4,s:'#bbb',sw:3});
    }else if(kind==='workshop'){
      b+=R(340,120,520,300,'#c9a679',{rx:10});
      for(let x=365;x<860;x+=40)for(let y=145;y<420;y+=40)b+=C(x,y,3,'#8a6c43');
      b+=R(420,200,12,100,'#6d5238',{rx:4})+R(395,190,62,24,'#555',{rx:4})+G('520,200 640,160 640,230','#c0c7cc')+R(640,176,50,40,'#b94338',{rx:10})
        +R(740,180,14,140,'#8c9aa5',{rx:6})+C(747,176,22,'#8c9aa5')+C(747,176,9,'#c9a679')
        +R(320,450,560,30,'#6b4f36',{rx:6})+R(335,480,26,100,'#51392a')+R(839,480,26,100,'#51392a')+R(380,420,50,30,'#b94338',{rx:6})+R(700,400,110,50,'#a47c4f',{rx:6});
    }
  }
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">${b}</svg>`);
}
window.FB=roomSvg('livingroom');
function presetImage(p){return p==='livingroom'?'room-livingroom.jpg':roomSvg(p)}
function roomImage(r){return r.photo||presetImage(r.roomPreset||'livingroom')}
function photoData(file,max=1200,q=.78){return new Promise((res,rej)=>{if(!file)return res(null);const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{let w=im.width,h=im.height;if(w>max){h*=max/w;w=max}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);res(c.toDataURL('image/jpeg',q))};im.onerror=rej;im.src=rd.result};rd.onerror=rej;rd.readAsDataURL(file)})}

/* ---------- Navigation ---------- */
function show(v){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$(v).classList.add('active');document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='settings')renderSettings();window.scrollTo(0,0)}
function openSheet(title,buttons,desc){$('sheetTitle').textContent=title;$('sheetDesc').textContent=desc||'';$('sheetDesc').classList.toggle('hidden',!desc);const body=$('sheetBody');body.innerHTML='';buttons.forEach(b=>{const el=document.createElement('button');el.className='btn '+(b.cls||'btn-secondary');el.textContent=b.label;el.onclick=()=>{closeSheet();b.fn&&b.fn()};body.appendChild(el)});const c=document.createElement('button');c.className='btn btn-ghost';c.textContent='Abbrechen';c.onclick=closeSheet;body.appendChild(c);$('sheetOverlay').classList.add('active')}
function closeSheet(){$('sheetOverlay').classList.remove('active')}

/* ---------- Räume ---------- */
async function renderRooms(){
  const rs=await rooms();const allM=(await all(MARKERS)).map(markerNorm);const byRoom={};allM.forEach(m=>(byRoom[m.roomId]=byRoom[m.roomId]||[]).push(m));
  const list=$('roomList');list.innerHTML='';
  for(const r of rs){
    const ms=byRoom[r.id]||[];const its=ms.flatMap(m=>m.items.filter(learnable));const n=its.length,done=its.filter(i=>i.stats.box>=MASTERED_BOX).length,due=its.filter(i=>i.stats.attempts>0&&isDue(i)).length;
    const c=document.createElement('div');c.className='room-card';
    const thumb=(r.photo||r.roomPreset)?`<img class="room-card-photo" src="${esc(roomImage(r))}" alt="" onerror="this.onerror=null;this.src=window.FB">`:`<div class="room-card-icon">${esc(r.icon||'🏠')}</div>`;
    c.innerHTML=thumb+`<div class="room-info"><h2>${esc(r.name)}</h2><div class="meta">${ms.length} Merkpunkte · ${n} Lernpunkte${n?` · ${Math.round(done/n*100)} % beherrscht`:''}${due?` · ${due} fällig`:''}</div></div><button class="room-menu" aria-label="Raum bearbeiten">⋯</button>`;
    c.onclick=e=>{if(e.target.closest('.room-menu'))openRoomEditor(r);else openRoom(r.id)};
    list.appendChild(c);
  }
  const dueItems=allM.flatMap(m=>m.items.filter(learnable).filter(i=>isDue(i)));
  const dueN=dueItems.length,reviewN=dueItems.filter(i=>i.stats.attempts>0).length;
  const box=$('dueBox');
  if(dueN){box.innerHTML=`<div class="panel due-card"><div><strong>📅 Heute dran: ${dueN} Lernpunkt${dueN===1?'':'e'}</strong><p>${reviewN} Wiederholung${reviewN===1?'':'en'}, ${dueN-reviewN} neu · kurze Runde, großer Effekt</p></div><button class="btn btn-warn" id="dueAllBtn">Üben</button></div>`;$('dueAllBtn').onclick=startDueAll}else box.innerHTML='';
  const total=allM.reduce((a,m)=>a+m.items.length,0);const last=LS.get('mr_backup',null);
  const old=!last||(Date.now()-last)>BACKUP_DAYS*DAY;
  if(total&&old){$('backupBox').innerHTML=`<div class="backup-note"><span>💾 ${last?'Letztes Backup vor '+Math.floor((Date.now()-last)/DAY)+' Tagen.':'Noch kein Backup gemacht.'}</span><button id="goBackup">Sichern</button></div>`;$('goBackup').onclick=()=>show('settings')}else $('backupBox').innerHTML='';
}
async function ensureDemo(){
  const rs=await rooms();if(rs.length)return;
  const r={id:uid(),name:'Wohnzimmer',icon:'🛋️',photo:'room-livingroom.jpg',roomPreset:'livingroom',createdAt:new Date().toISOString()};await saveRoom(r);
  const spots=[['Tür',12,82],['Tisch',42,55],['Sofa',78,68],['Fenster',50,18],['Regal',15,42],['Bild',82,28],['Schrank',62,72]];
  for(let i=0;i<spots.length;i++){const [t,x,y]=spots[i];await saveMarker({id:uid(),roomId:r.id,title:t,description:'',x,y,routeOrder:i+1,items:[]})}
}
async function createTheme(){let name=prompt('Wie soll dein Themenraum heißen?','Mein Themenraum');if(name===null)return;name=name.trim()||'Mein Themenraum';const r={id:uid(),name:'🎯 '+name,icon:'🎯',type:'theme',photo:'room-livingroom.jpg',roomPreset:'livingroom',createdAt:new Date().toISOString()};await saveRoom(r);await renderRooms();openRoom(r.id)}

async function openRoom(rid){
  const r=(await rooms()).find(x=>x.id===rid);if(!r)return;
  currentRoom=r;currentRoomId=rid;arrange=false;updateArrangeUI();
  currentMarkers=await markers(rid);currentMarkers.sort(byOrder);
  $('roomTitle').textContent=r.name;$('roomSub').textContent=r.type==='theme'?'Visueller Gedächtnisweg':'Dein Gedächtnisraum';
  const bg=$('roomBg');bg.onerror=()=>{bg.onerror=null;bg.src=window.FB};bg.src=roomImage(r);
  show('room');renderMarkers();setDecorMode(false);
}
function updateArrangeUI(){$('arrangeBtn').textContent=arrange?'✅ Fertig':'📍 Anordnen';$('arrangeHint').classList.toggle('hidden',!arrange)}
function renderMarkers(){
  const host=$('markers');host.innerHTML='';const numOnly=!!(currentRoom&&currentRoom.numberOnly);
  currentMarkers.forEach((m,idx)=>{
    const e=document.createElement('button');const dueN=m.items.filter(i=>learnable(i)&&i.stats.attempts>0&&isDue(i)).length;
    e.className='marker'+(numOnly?' dot'+(dueN?' due':''):'');e.style.left=m.x+'%';e.style.top=m.y+'%';e.setAttribute('aria-label',(idx+1)+': '+(m.title||'Merkpunkt'));
    e.innerHTML=numOnly?'<span class="num">'+(idx+1)+'</span>':(m.photo?`<img src="${esc(m.photo)}" alt=""><span>${esc(m.title)}</span>`:`<span class="num">${idx+1}</span><span>${esc(m.title||'Merkpunkt')}</span>`)+(m.items.length?`<span class="count">${m.items.length}</span>`:'')+(dueN?`<span class="dueDot">${dueN}</span>`:'');
    if(arrange)enableDrag(e,m);else e.onclick=()=>openMarkerSheet(m);
    host.appendChild(e);
    m.items.forEach((it,j)=>{
      if(numOnly||!it.photo||!it.showInRoom)return;
      const t=document.createElement('button');t.className='thought';
      t.style.left=clamp(m.x+[-8,8,0,10,-10][j%5],5,95)+'%';t.style.top=clamp(m.y+[-10,-10,11,8,8][j%5],5,95)+'%';
      t.innerHTML=`<img src="${esc(it.photo)}" alt="">`;t.onclick=ev=>{ev.stopPropagation();if(!arrange)openMarkerSheet(m)};host.appendChild(t);
    });
  });
}
function enableDrag(e,m){
  e.classList.add('arrange');let sx=0,sy=0,moved=false,dragging=false;
  e.addEventListener('pointerdown',ev=>{ev.preventDefault();dragging=true;moved=false;sx=ev.clientX;sy=ev.clientY;try{e.setPointerCapture(ev.pointerId)}catch(_){}});
  e.addEventListener('pointermove',ev=>{if(!dragging)return;if(Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)>6)moved=true;if(!moved)return;const r=$('roomWrap').getBoundingClientRect();m.x=Math.round(clamp((ev.clientX-r.left)/r.width*100,3,97)*10)/10;m.y=Math.round(clamp((ev.clientY-r.top)/r.height*100,3,97)*10)/10;e.style.left=m.x+'%';e.style.top=m.y+'%'});
  e.addEventListener('pointerup',async ev=>{if(!dragging)return;dragging=false;try{e.releasePointerCapture(ev.pointerId)}catch(_){}if(moved){await saveMarker(m);renderMarkers()}else openMarkerSheet(m)});
  e.addEventListener('pointercancel',()=>{dragging=false});
}
function openMarkerSheet(m){
  const n=m.items.filter(learnable).length;const btns=[];
  if(n)btns.push({label:'▶ Lernen',cls:'btn-primary',fn:()=>startMarker(m)});
  btns.push({label:'✏️ Bearbeiten',fn:()=>openMarkerEditor(m)});
  openSheet(m.title||'Merkpunkt',btns,`${n} Lernpunkt${n===1?'':'e'}`);
}

/* ---------- Raum gestalten (eigene Bilder) ---------- */
let decorMode=false,selDecor=null,cropItem=null,cropState=null,cropDrag=null;
const FULL={x:0,y:0,w:1,h:1};
const r1=v=>Math.round(v*10)/10;
const PIECES={
  window:{label:'🪟 Fenster',w:300,h:360,svg:'<rect x="10" y="10" width="280" height="338" rx="14" fill="#fff" stroke="#8b6b4a" stroke-width="14"/><rect x="28" y="28" width="116" height="144" fill="#bfe3f5"/><rect x="156" y="28" width="116" height="144" fill="#bfe3f5"/><rect x="28" y="184" width="116" height="144" fill="#bfe3f5"/><rect x="156" y="184" width="116" height="144" fill="#bfe3f5"/><polygon points="28,172 90,28 144,28 144,60" fill="#fff" fill-opacity=".35"/><rect x="2" y="338" width="296" height="20" rx="6" fill="#a98562"/>'},
  door:{label:'🚪 Tür',w:240,h:420,svg:'<rect x="10" y="10" width="220" height="408" rx="8" fill="#9a6b43" stroke="#6d4a2b" stroke-width="10"/><rect x="40" y="40" width="160" height="150" rx="6" fill="#8a5c38" stroke="#6d4a2b" stroke-width="4"/><rect x="40" y="220" width="160" height="170" rx="6" fill="#8a5c38" stroke="#6d4a2b" stroke-width="4"/><circle cx="195" cy="215" r="10" fill="#e0c36a"/>'},
  frame:{label:'🖼️ Bilderrahmen',w:260,h:320,svg:'<rect x="8" y="8" width="244" height="304" rx="6" fill="#6b4f36"/><rect x="28" y="28" width="204" height="264" fill="#fffdf9"/><circle cx="170" cy="100" r="24" fill="#f2c94c"/><polygon points="28,292 100,150 150,230 190,180 232,292" fill="#7aa874"/><polygon points="28,292 70,220 110,292" fill="#5f9460"/>'},
  plant:{label:'🪴 Pflanze',w:200,h:320,svg:'<ellipse cx="100" cy="120" rx="26" ry="85" fill="#4f9d54"/><ellipse cx="62" cy="150" rx="22" ry="70" fill="#5aae5f" transform="rotate(-30 62 150)"/><ellipse cx="138" cy="150" rx="22" ry="70" fill="#5aae5f" transform="rotate(30 138 150)"/><ellipse cx="38" cy="190" rx="16" ry="50" fill="#4f9d54" transform="rotate(-62 38 190)"/><ellipse cx="162" cy="190" rx="16" ry="50" fill="#4f9d54" transform="rotate(62 162 190)"/><polygon points="55,230 145,230 132,310 68,310" fill="#b5653a"/><rect x="48" y="218" width="104" height="18" rx="6" fill="#c47a4c"/>'}
};
function pieceSrc(k){const p=PIECES[k];return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.w} ${p.h}" width="${p.w}" height="${p.h}">${p.svg}</svg>`)}
function decorList(){return (currentRoom&&currentRoom.decor)||[]}
function selItem(){return decorList().find(d=>d.id===selDecor)}
function persistDecor(){return currentRoom?saveRoom(currentRoom):Promise.resolve()}
function decorAr(d){const c=d.crop||FULL;return (c.w*d.iw)/(c.h*d.ih)}

function renderDecor(){
  const host=$('decor');host.innerHTML='';host.classList.toggle('editing',decorMode);
  decorList().forEach(d=>{
    const c=d.crop||FULL;const el=document.createElement('div');
    el.className='decor-item';el.dataset.id=d.id;
    el.style.left=d.x+'%';el.style.top=d.y+'%';el.style.width=d.w+'%';el.style.aspectRatio=String(decorAr(d));
    const img=document.createElement('img');img.alt='';img.draggable=false;img.src=d.src;
    img.style.cssText=`width:${100/c.w}%;height:${100/c.h}%;left:${-c.x/c.w*100}%;top:${-c.y/c.h*100}%`;
    const clip=document.createElement('div');clip.className='decor-clip';clip.appendChild(img);el.appendChild(clip);
    if(decorMode)bindDecor(el,d);
    host.appendChild(el);
  });
  if(decorMode&&selDecor&&!selItem())selDecor=null;
  if(decorMode&&selDecor)setSel(selDecor);else updateDecorBar();
}
function setSel(id){
  selDecor=id;
  $('decor').querySelectorAll('.decor-item').forEach(el=>{
    const on=el.dataset.id===id;el.classList.toggle('sel',on);
    el.querySelectorAll('.hdl').forEach(h=>h.remove());
    if(on){const d=decorList().find(x=>x.id===id);if(d)addHandles(el,d)}
  });
  updateDecorBar();
}
function addHandles(el,d){
  ['nw','ne','sw','se'].forEach(pos=>{
    const h=document.createElement('i');h.className='hdl '+pos;el.appendChild(h);
    let st=null;
    h.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();const r=$('roomWrap').getBoundingClientRect();const cx=r.left+d.x/100*r.width,cy=r.top+d.y/100*r.height;st={cx,cy,d0:Math.hypot(ev.clientX-cx,ev.clientY-cy)||1,w0:d.w};try{h.setPointerCapture(ev.pointerId)}catch(_){}});
    h.addEventListener('pointermove',ev=>{if(!st)return;const dist=Math.hypot(ev.clientX-st.cx,ev.clientY-st.cy);d.w=r1(clamp(st.w0*dist/st.d0,3,200));el.style.width=d.w+'%'});
    h.addEventListener('pointerup',async()=>{if(!st)return;st=null;await persistDecor()});
    h.addEventListener('pointercancel',()=>{st=null});
  });
}
function bindDecor(el,d){
  let st=null;
  el.addEventListener('pointerdown',ev=>{
    if(ev.target.closest('.hdl'))return;
    ev.preventDefault();if(selDecor!==d.id)setSel(d.id);
    const r=$('roomWrap').getBoundingClientRect();st={x0:ev.clientX,y0:ev.clientY,ox:d.x,oy:d.y,r,moved:false};
    try{el.setPointerCapture(ev.pointerId)}catch(_){}
  });
  el.addEventListener('pointermove',ev=>{
    if(!st)return;const dx=ev.clientX-st.x0,dy=ev.clientY-st.y0;
    if(!st.moved&&Math.abs(dx)+Math.abs(dy)<4)return;st.moved=true;
    d.x=r1(clamp(st.ox+dx/st.r.width*100,0,100));d.y=r1(clamp(st.oy+dy/st.r.height*100,0,100));
    el.style.left=d.x+'%';el.style.top=d.y+'%';
  });
  el.addEventListener('pointerup',async()=>{if(!st)return;const mv=st.moved;st=null;if(mv)await persistDecor()});
  el.addEventListener('pointercancel',()=>{st=null});
}
function setDecorMode(on){
  decorMode=!!on;selDecor=null;
  if(decorMode){arrange=false;updateArrangeUI();renderMarkers()}
  $('decorBar').classList.toggle('hidden',!decorMode);
  $('roomTools').classList.toggle('hidden',decorMode);$('roomActions').classList.toggle('hidden',decorMode);
  $('markers').classList.toggle('decor-edit',decorMode);
  renderDecor();
}
function updateDecorBar(){const sel=!!(decorMode&&selDecor);$('decorSel').classList.toggle('hidden',!sel);$('decorHint').classList.toggle('hidden',sel)}
async function addDecor(p){
  if(!currentRoom)return;
  currentRoom.decor=currentRoom.decor||[];const n=currentRoom.decor.length;
  const item={id:uid(),src:p.src,iw:p.iw,ih:p.ih,x:clamp(50+(n%5)*4,10,90),y:clamp(40+(n%5)*4,10,90),w:p.iw/p.ih<1?20:30,crop:Object.assign({},FULL)};
  currentRoom.decor.push(item);await persistDecor();renderDecor();setSel(item.id);
}
function decorPhoto(file,max=1000){return new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{let w=im.naturalWidth||im.width||300,h=im.naturalHeight||im.height||300;const k=Math.min(1,max/Math.max(w,h));w=Math.max(1,Math.round(w*k));h=Math.max(1,Math.round(h*k));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);const alpha=/png|webp|gif|svg/.test(file.type||'');res({src:alpha?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.82),iw:w,ih:h})};im.onerror=rej;im.src=rd.result};rd.onerror=rej;rd.readAsDataURL(file)})}
function decorSheet(){
  const btns=[{label:'📷 Eigenes Bild (Foto oder Datei)',cls:'btn-primary',fn:()=>$('decorFile').click()}];
  Object.keys(PIECES).forEach(k=>btns.push({label:PIECES[k].label,fn:()=>addDecor({src:pieceSrc(k),iw:PIECES[k].w,ih:PIECES[k].h})}));
  openSheet('Bild hinzufügen',btns,'Tipp: Ein PNG mit durchsichtigem Hintergrund, zum Beispiel ein ausgeschnittenes Fenster, sieht am besten aus.');
}

/* Zuschneiden: nicht zerstörend, das Originalbild bleibt erhalten ("Ganzes Bild" holt alles zurück) */
function openCrop(d){
  cropItem=d;cropState=Object.assign({},d.crop||FULL);
  $('cropOverlay').classList.add('active');
  const img=$('cropImg');
  const fit=()=>{const maxW=Math.max(120,$('cropWrap').clientWidth-4),maxH=Math.max(120,window.innerHeight*.5);const k=Math.min(1,maxW/d.iw,maxH/d.ih);img.style.width=Math.round(d.iw*k)+'px';img.style.height=Math.round(d.ih*k)+'px';drawCrop()};
  img.onload=fit;img.src=d.src;if(img.complete&&img.naturalWidth)fit();
}
function drawCrop(){const b=$('cropBox'),c=cropState;if(!c)return;b.style.left=c.x*100+'%';b.style.top=c.y*100+'%';b.style.width=c.w*100+'%';b.style.height=c.h*100+'%'}
async function applyCrop(){
  const d=cropItem;if(!d)return;
  const oc=d.crop||FULL,nc=cropState,wr=$('roomWrap').getBoundingClientRect();
  const imgWpct=d.w/oc.w;
  const imgHpct=imgWpct/100*wr.width*(d.ih/d.iw)/wr.height*100;
  d.x=r1(clamp(d.x+((nc.x+nc.w/2)-(oc.x+oc.w/2))*imgWpct,0,100));
  d.y=r1(clamp(d.y+((nc.y+nc.h/2)-(oc.y+oc.h/2))*imgHpct,0,100));
  d.w=r1(clamp(imgWpct*nc.w,3,200));d.crop={x:nc.x,y:nc.y,w:nc.w,h:nc.h};
  $('cropOverlay').classList.remove('active');cropItem=null;
  await persistDecor();renderDecor();
}

/* ---------- Merkpunkt-Editor ---------- */
function openMarkerEditor(m){
  editMarkerId=m?.id||null;editItems=(m?.items||[]).map(itemTemplate);markerPhoto=m?.photo||null;
  $('markerModalTitle').textContent=m?'Merkpunkt bearbeiten':'Neuer Merkpunkt';
  $('markerTitle').value=m?.title||'';$('markerDesc').value=m?.description||'';$('markerFile').value='';
  $('markerOrder').value=m?(m.routeOrder||currentMarkers.indexOf(m)+1):currentMarkers.length+1;
  $('markerPhotoRemove').classList.toggle('hidden',!markerPhoto);
  $('deleteMarker').classList.toggle('hidden',!m);$('markerOverlay').classList.add('active');renderItems();
}
function renderItems(){
  const host=$('items');host.innerHTML='';if(!editItems.length)host.innerHTML='<p class="muted">Noch keine Lernpunkte.</p>';
  editItems.forEach((it,i)=>{
    const d=document.createElement('div');d.className='item-card';
    d.innerHTML=`<div class="item-head"><strong>${esc(it.title||it.question||'Lernpunkt')}</strong><button class="item-delete" aria-label="Lernpunkt löschen">✕</button></div>
    <div class="field"><span>Titel (optional)</span><input class="it-title" value="${esc(it.title)}"></div>
    <div class="field"><span>Frage (optional)</span><input class="it-question" value="${esc(it.question)}"></div>
    <div class="field"><span>Antwort / Lösung</span><textarea class="it-answer">${esc(it.answer)}</textarea></div><div class="muted it-listinfo" style="font-size:11px;margin:-6px 0 8px;line-height:1.35"></div>
    <div class="field"><span>Bild / Eselsbrücke an diesem Ort</span><input class="it-hint" value="${esc(it.hint)}" placeholder="z. B. Ein riesiger Frosch quakt dir ins Ohr"></div>
    <div class="field"><span>Foto als Gedankenstütze</span><input class="it-file" type="file" accept="image/*"></div>
    ${it.photo?`<img class="item-thumb" src="${esc(it.photo)}" alt=""><label class="check"><input type="checkbox" class="it-show" ${it.showInRoom?'checked':''}> Foto neben dem Merkpunkt im Raum zeigen</label><button class="link-btn it-rm">Foto entfernen</button>`:''}`;
    d.querySelector('.item-delete').onclick=()=>{editItems.splice(i,1);renderItems()};
    d.querySelector('.it-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;editItems[i].photo=await photoData(f,800,.7);renderItems()};
    const upd=()=>{d.querySelector('.it-listinfo').textContent=listInfo(editItems[i].answer)};upd();
    ['title','question','answer','hint'].forEach(k=>d.querySelector('.it-'+k).oninput=e=>{editItems[i][k]=e.target.value;if(k==='answer')upd()});
    const sh=d.querySelector('.it-show');if(sh)sh.onchange=e=>{editItems[i].showInRoom=e.target.checked};
    const rm=d.querySelector('.it-rm');if(rm)rm.onclick=()=>{editItems[i].photo=null;editItems[i].showInRoom=false;renderItems()};
    host.appendChild(d);
  });
}
async function saveMarkerEditor(){
  const title=$('markerTitle').value.trim();if(!title){alert('Bitte einen Titel eingeben.');return}
  for(const it of editItems){if(!it.title&&!it.question){alert('Jeder Lernpunkt braucht Titel ODER Frage.');return}if(!it.answer){alert('Jeder Lernpunkt braucht eine Antwort.');return}}
  let m=editMarkerId?currentMarkers.find(x=>x.id===editMarkerId):null;
  if(!m){const n=currentMarkers.length;m={id:uid(),roomId:currentRoomId,x:20+(n*13)%60,y:25+(n*17)%50,stats:{}}}
  m.title=title;m.description=$('markerDesc').value.trim();m.items=editItems;m.photo=markerPhoto||null;
  const others=currentMarkers.filter(x=>x.id!==m.id).sort(byOrder);
  let pos=parseInt($('markerOrder').value,10);if(isNaN(pos))pos=others.length+1;pos=clamp(pos,1,others.length+1);
  others.splice(pos-1,0,m);
  for(let i=0;i<others.length;i++){const x=others[i];if(x===m||x.routeOrder!==i+1){x.routeOrder=i+1;await saveMarker(x)}}
  $('markerOverlay').classList.remove('active');currentMarkers=await markers(currentRoomId);currentMarkers.sort(byOrder);renderMarkers();
}

/* ---------- Lernsitzung ---------- */
function mkQ(it,m,roomName,stop,stops){return Object.assign({},it,{_markerId:m.id,_markerTitle:m.title,_markerPhoto:m.photo,_room:roomName,_stop:stop,_stops:stops,_again:0})}
function startSession(list,label){
  if(!list.length)return false;
  queue=list;qIndex=0;known=0;unknown=0;sessionLabel=label;
  $('learnDone').classList.add('hidden');$('learnMain').classList.remove('hidden');
  showLearnItem();$('learnOverlay').classList.add('active');return true;
}
function startMarker(m){
  const items=m.items.filter(learnable);
  if(!startSession(items.map(it=>mkQ(it,m,currentRoom?.name,1,1)),'Ort'))alert('Dieser Merkpunkt hat noch keine Lernpunkte.');
}
function startWalk(){
  const ms=currentMarkers.filter(m=>m.items.some(learnable)).sort(byOrder);const list=[];
  ms.forEach((m,i)=>m.items.filter(learnable).forEach(it=>list.push(mkQ(it,m,currentRoom?.name,i+1,ms.length))));
  if(!startSession(list,'Rundgang'))alert('Es gibt noch keine Lernpunkte für einen Rundgang.');
}
function dueQueue(pairs){ // pairs: [{it,m,room}]
  const due=pairs.filter(p=>learnable(p.it)&&isDue(p.it));
  const rev=shuffle(due.filter(p=>p.it.stats.attempts>0)),neu=shuffle(due.filter(p=>!p.it.stats.attempts));
  return rev.concat(neu).slice(0,SESSION_MAX).map(p=>mkQ(p.it,p.m,p.room,1,1));
}
function startDueRoom(){
  const pairs=[];currentMarkers.forEach(m=>m.items.forEach(it=>pairs.push({it,m,room:currentRoom?.name})));
  if(!startSession(dueQueue(pairs),'Fällige üben'))alert('Hier ist gerade nichts fällig 🎉 Komm später wieder oder mach einen Rundgang.');
}
async function startDueAll(){
  const rs=await rooms(),names={};rs.forEach(r=>names[r.id]=r.name);
  const pairs=[];(await all(MARKERS)).map(markerNorm).forEach(m=>m.items.forEach(it=>pairs.push({it,m,room:names[m.roomId]})));
  if(!startSession(dueQueue(pairs),'Heute fällig'))alert('Heute ist nichts mehr fällig 🎉');
}
function showLearnItem(){
  const it=queue[qIndex];
  $('learnAnchor').textContent=(sessionLabel==='Heute fällig'&&it._room?it._room+' › ':'')+(it._markerTitle||'Merkpunkt');
  if(it._markerPhoto){$('learnPhoto').src=it._markerPhoto;$('learnPhoto').classList.remove('hidden')}else $('learnPhoto').classList.add('hidden');
  $('learnProgress').textContent=(sessionLabel==='Rundgang'&&it._stops>1?`Ort ${it._stop} von ${it._stops} · `:'')+`${qIndex+1} von ${queue.length}`;
  $('learnPrompt').textContent=it.question?'FRAGE – JETZT AUS DEM GEDÄCHTNIS':'LERNPUNKT – JETZT AUS DEM GEDÄCHTNIS';
  $('learnQuestion').textContent=it.question||it.title;
  const li0=listItems(it.answer);$('listHint').classList.toggle('hidden',!li0);if(li0)$('listHint').textContent='📋 Liste mit '+li0.length+' Punkten, die Reihenfolge ist egal. Ein Punkt pro Zeile.';$('typed').placeholder=li0?'Ein Punkt pro Zeile …':'Was weißt du dazu?';
  $('solution').classList.add('hidden');$('phaseAnswer').classList.remove('hidden');
  const typed=LS.get('mr_typed',true);$('typeBox').classList.toggle('hidden',!typed);$('thinkBox').classList.toggle('hidden',typed);
  $('typed').value='';hintUsed=false;$('hintStage').classList.add('hidden');dontLabels('Weiß ich nicht');if(typed)setTimeout(()=>$('typed').focus(),80);
}
/* Listen-Antworten: pro Zeile ein Punkt mit Strich, Reihenfolge beim Abfragen egal */
function listItems(a){
  const lines=String(a||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length<2||!lines.every(l=>/^[-–•*]\s*/.test(l)))return null;
  const items=lines.map(l=>l.replace(/^[-–•*]\s*/,'').trim()).filter(Boolean);
  return items.length>=2?items:null;
}
function listInfo(a){const li=listItems(a);return li?`📋 Liste erkannt: ${li.length} Punkte. Beim Abfragen ist die Reihenfolge egal, und du siehst, welche Punkte stimmen.`:'Mehrere Punkte? Schreib pro Zeile einen Strich davor, zum Beispiel -rot, -grün, -blau. Dann ist die Reihenfolge beim Abfragen egal.'}
function userEntries(v,items){const sep=items.some(x=>/[,;]/.test(x))?/\n+/:/[\n;,]+/;return String(v||'').split(sep).map(x=>x.replace(/^\s*[-–•*]\s*/,'').trim()).filter(Boolean)}
function matchList(items,entries){
  const used=new Array(items.length).fill(false),extra=[],keys=items.map(norm);
  entries.forEach(e=>{
    const k=norm(e);if(!k)return;
    let idx=keys.findIndex((x,i)=>!used[i]&&x===k);
    if(idx<0)idx=keys.findIndex((x,i)=>!used[i]&&x.length>=5&&lev(k,x)<=Math.max(1,Math.floor(x.length*.1)));
    if(idx>=0)used[idx]=true;else extra.push(e);
  });
  return {used,extra,hit:used.filter(Boolean).length,entries:entries.length};
}
function renderList(items,lm){
  let h=items.map((x,i)=>lm?`<div class="li ${lm.used[i]?'ok':'bad'}">${lm.used[i]?'✅':'❌'} ${esc(x)}</div>`:`<div class="li">• ${esc(x)}</div>`).join('');
  if(lm&&lm.extra.length)h+='<div class="li-extra">Zu viel genannt:</div>'+lm.extra.map(x=>`<div class="li bad">✖ ${esc(x)}</div>`).join('');
  return h;
}
function ansHtml(a){const li=listItems(a);return li?li.map(x=>`<div>• ${esc(x)}</div>`).join(''):`<div style="white-space:pre-wrap">${esc(a)}</div>`}
function dontLabels(t){$('dontKnow').textContent=t;$('thinkDont').textContent=t}
function dontKnow(){
  const it=queue[qIndex],h=(it.hint||'').trim();
  if(h&&!hintUsed){hintUsed=true;$('hintStage').textContent='💡 Eselsbrücke: '+h;$('hintStage').classList.remove('hidden');dontLabels('Lösung zeigen');return}
  reveal('','unknown');
}
function reveal(userText,mode){
  const it=queue[qIndex];
  $('phaseAnswer').classList.add('hidden');$('solution').classList.remove('hidden');
  const li=listItems(it.answer);const lm=(li&&mode==='typed')?matchList(li,userEntries(userText,li)):null;
  if(li)$('solutionText').innerHTML=renderList(li,lm);else $('solutionText').textContent=it.answer;
  $('solutionHint').textContent=it.hint?'💡 '+it.hint:'';$('solutionHint').classList.toggle('hidden',!it.hint);
  $('solutionPhotoWrap').innerHTML=it.photo?`<img style="width:100%;max-height:260px;object-fit:contain;border-radius:16px;margin-top:10px" src="${esc(it.photo)}" alt="">`:'';
  let fb='',cls='neutral',suggest=null;
  if(mode==='unknown'){fb='Kein Problem. Präge dir die Lösung jetzt bewusst ein und stell dir das Bild an diesem Ort vor.';suggest=0}
  else if(mode==='typed'&&lm){
    const tot=li.length,hit=lm.hit,ex=lm.extra.length;
    if(!lm.entries){fb='Du hast nichts eingegeben.';cls='bad';suggest=0}
    else if(hit===tot&&!ex){fb=`✅ Alles richtig (${hit} von ${tot})`+(hintUsed?', mit Hilfe der Eselsbrücke.':'.');cls='ok';suggest=hintUsed?1:2}
    else if(hit===tot){fb=`🟡 Alle ${tot} gefunden, aber ${ex} zu viel genannt.`;cls='neutral';suggest=1}
    else{fb=`${hit>0?'🟡':'❌'} ${hit} von ${tot} richtig`+(ex?`, ${ex} zu viel genannt`:'')+'. Die ❌ Punkte hast du nicht genannt.';cls=hit>0?'neutral':'bad';suggest=hit*2>=tot?1:0}
  }
  else if(mode==='typed'){
    const v=(userText||'').trim(),a=norm(it.answer),u=norm(v);
    if(u&&u===a){fb=hintUsed?'✅ Richtig, mit Hilfe der Eselsbrücke.':'✅ Richtig!';cls='ok';suggest=hintUsed?1:2}
    else if(u&&a.length>=5&&a.length<=40&&lev(u,a)<=Math.max(1,Math.floor(a.length*.1))){fb='🟡 Fast richtig, vermutlich ein Tippfehler. Vergleiche mit der Lösung.';cls='ok';suggest=hintUsed?1:2}
    else if(a.length>40){fb='Vergleiche deine Antwort mit der Lösung und bewerte ehrlich.'}
    else if(!u){fb='Du hast nichts eingegeben.';cls='bad';suggest=0}
    else{fb='❌ Noch nicht richtig. Vergleiche mit der Lösung.';cls='bad';suggest=0}
  }
  $('yourAnswer').textContent=mode==='typed'&&userText&&userText.trim()?'Deine Antwort: '+userText.trim():'';$('yourAnswer').classList.toggle('hidden',!(mode==='typed'&&userText&&userText.trim()));
  $('feedback').textContent=fb;$('feedback').className='feedback '+cls;$('feedback').classList.toggle('hidden',!fb);
  for(let r=0;r<4;r++){const s=schedule(it.stats,r);$('rv'+r).textContent=fmtDays(s.days)}
  document.querySelectorAll('.rate-grid .btn').forEach(b=>b.classList.toggle('suggest',suggest!==null&&Number(b.dataset.rate)===suggest));
}
async function rate(r){
  const it=queue[qIndex];const raw=await getMarker(it._markerId);let fresh=it.stats;
  if(raw){
    const i=raw.items.findIndex(x=>x.id===it.id);
    if(i>=0){
      const st=raw.items[i].stats,s=schedule(st,r),now=new Date().toISOString();
      st.attempts++;st.lastReviewed=now;if(r===0)st.incorrect++;else st.correct++;
      st.box=s.box;st.mastery=s.box;st.due=s.days===0?now:dueAt(s.days);fresh=Object.assign({},st);
    }
    raw.stats.timesAsked++;if(r===0)raw.stats.timesUnknown++;else raw.stats.timesKnown++;raw.stats.lastAsked=new Date().toISOString();
    await saveMarker(raw);
  }
  const days=LS.get('mr_days',[]);const k=dayKey();if(!days.includes(k)){days.push(k);LS.set('mr_days',days.slice(-400))}
  if(r===0)unknown++;else known++;
  if((r===0||(r===1&&(fresh.box||0)===0))&&it._again<2)queue.push(Object.assign({},it,{stats:fresh,_again:it._again+1}));
  nextLearn();
}
function nextLearn(){
  qIndex++;if(qIndex<queue.length){showLearnItem();return}
  $('learnMain').classList.add('hidden');$('learnDone').classList.remove('hidden');
  $('doneTitle').textContent=sessionLabel==='Rundgang'?'Rundgang abgeschlossen':'Runde geschafft';
  $('doneScore').textContent=`${known} sicher · ${unknown} nochmal${unknown?'. Genau diese Punkte kommen bald wieder.':''}`;
}
async function refreshAfter(){
  if(currentRoomId){currentMarkers=await markers(currentRoomId);currentMarkers.sort(byOrder);if($('room').classList.contains('active'))renderMarkers()}
  await renderRooms();if($('stats').classList.contains('active'))stats(statsScope);
}
function closeLearn(){$('learnOverlay').classList.remove('active');refreshAfter()}

/* ---------- Raum im Kopf ---------- */
function recallSheet(){
  if(!currentMarkers.some(m=>m.items.some(learnable))){alert('Zuerst Lernpunkte anlegen.');return}
  openSheet('🧭 Raum im Kopf',[
    {label:'Vorwärts (Route)',cls:'btn-primary',fn:()=>startRecall('fwd')},
    {label:'Rückwärts',fn:()=>startRecall('rev')},
    {label:'Zufällige Reihenfolge',fn:()=>startRecall('rnd')}
  ],'Geh den Raum gedanklich ab und schreib auf, was du abgelegt hast. Erst danach siehst du die Lösung.');
}
function startRecall(dir){
  let list=currentMarkers.filter(m=>m.items.some(learnable)).sort(byOrder);
  if(dir==='rev')list=list.slice().reverse();else if(dir==='rnd')list=shuffle(list.slice());
  recallList=list;recallIdx=0;recallScore={all:0,part:0,none:0};
  $('rcMain').classList.remove('hidden');$('rcDone').classList.add('hidden');showRecall();$('recallOverlay').classList.add('active');
}
function showRecall(){
  const m=recallList[recallIdx];
  $('rcPos').textContent=`ORT ${recallIdx+1} VON ${recallList.length}`;$('rcTitle').textContent=m.title||'Merkpunkt';
  if(m.photo){$('rcPhoto').src=m.photo;$('rcPhoto').classList.remove('hidden')}else $('rcPhoto').classList.add('hidden');
  $('rcText').value='';$('rcAsk').classList.remove('hidden');$('rcSolution').classList.add('hidden');
}
function recallReveal(){
  const m=recallList[recallIdx];
  $('rcList').innerHTML=m.items.filter(learnable).map(it=>`<div class="item-card"><strong>${esc(it.title||it.question)}</strong>${ansHtml(it.answer)}${it.hint?`<small>💡 ${esc(it.hint)}</small>`:''}</div>`).join('');
  $('rcAsk').classList.add('hidden');$('rcSolution').classList.remove('hidden');
}
async function recallRate(kind){
  const m=recallList[recallIdx];const raw=await getMarker(m.id);
  if(raw){
    raw.stats.recallTotal=(raw.stats.recallTotal||0)+1;if(kind==='all')raw.stats.recallAll=(raw.stats.recallAll||0)+1;
    if(kind!=='all'){const now=new Date().toISOString();raw.items.forEach(it=>{if(!learnable(it))return;if(kind==='none'){it.stats.box=Math.max(0,it.stats.box-1);it.stats.mastery=it.stats.box}it.stats.due=now})}
    await saveMarker(raw);
  }
  const days=LS.get('mr_days',[]);const k=dayKey();if(!days.includes(k)){days.push(k);LS.set('mr_days',days.slice(-400))}
  recallScore[kind]++;recallIdx++;
  if(recallIdx<recallList.length){showRecall();return}
  $('rcMain').classList.add('hidden');$('rcDone').classList.remove('hidden');
  $('rcScore').textContent=`${recallScore.all} Orte komplett · ${recallScore.part} teilweise · ${recallScore.none} fast nichts${recallScore.part+recallScore.none?'. Die schwachen Orte kommen heute nochmal dran.':''}`;
}
function closeRecall(){$('recallOverlay').classList.remove('active');refreshAfter()}

/* ---------- Raum bearbeiten ---------- */
function updatePresetUI(){document.querySelectorAll('#roomPresetGrid [data-preset]').forEach(b=>b.classList.toggle('selected',b.dataset.preset===selectedPreset))}
function openRoomEditor(r){
  editingRoom=r;$('roomName').value=r.name||'';$('roomFile').value='';$('roomNumOnly').checked=!!r.numberOnly;roomPhoto=r.photo||null;
  selectedPreset=r.roomPreset||(r.photo&&r.photo!=='room-livingroom.jpg'?'custom':'livingroom');
  updatePresetUI();$('deleteRoom').classList.toggle('hidden',!r.id);$('exportRoom').classList.toggle('hidden',!r.id);$('roomOverlay').classList.add('active');
}
async function saveRoomEditor(){
  const n=$('roomName').value.trim();if(!n)return alert('Bitte einen Raumnamen eingeben.');
  const r=editingRoom;if(!r.id)r.id=uid();
  r.name=n;r.numberOnly=$('roomNumOnly').checked;r.roomPreset=selectedPreset;r.photo=selectedPreset==='custom'?roomPhoto:(selectedPreset==='livingroom'?'room-livingroom.jpg':null);
  await saveRoom(r);$('roomOverlay').classList.remove('active');await renderRooms();openRoom(r.id);
}
async function deleteRoomEditor(){
  const rs=await rooms();const r=editingRoom;if(!r||!r.id)return;
  if(rs.length<=1)return alert('Der letzte Raum kann nicht gelöscht werden.');
  if(!confirm(`Raum „${r.name}“ wirklich löschen?`))return;
  for(const m of await markers(r.id))await del(MARKERS,m.id);await del(ROOMS,r.id);
  if(currentRoomId===r.id){currentRoom=null;currentRoomId=null;currentMarkers=[]}
  $('roomOverlay').classList.remove('active');show('rooms');renderRooms();
}

/* ---------- Statistik ---------- */
let statsScope=null;
function streakDays(){const set=new Set(LS.get('mr_days',[]));let n=0;const d=new Date();if(!set.has(dayKey(d)))d.setDate(d.getDate()-1);while(set.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
async function stats(roomId){
  statsScope=roomId||null;
  const rs=await rooms(),names={};rs.forEach(r=>names[r.id]=r.name);
  const ms=(await all(MARKERS)).map(markerNorm).filter(m=>!roomId||m.roomId===roomId);
  const rows=[];ms.forEach(m=>m.items.filter(learnable).forEach(it=>rows.push({it,m})));
  const items=rows.map(x=>x.it);
  const attempts=items.reduce((a,i)=>a+i.stats.attempts,0),correct=items.reduce((a,i)=>a+i.stats.correct,0);
  const neu=items.filter(i=>!i.stats.attempts).length,mastered=items.filter(i=>i.stats.box>=MASTERED_BOX).length;
  const learning=items.filter(i=>i.stats.attempts>0&&i.stats.box<MASTERED_BOX).length,due=items.filter(i=>i.stats.attempts>0&&isDue(i)).length;
  $('statsTitle').textContent=roomId?'📊 '+(names[roomId]||'Raum'):'📊 Lernfortschritt';
  const vals=[[due,'Wiederholungen fällig'],[neu,'Neu'],[learning,'In Arbeit'],[mastered,'Beherrscht (7+ Tage Abstand)'],[items.length,'Lernpunkte'],[attempts,'Abfragen'],[attempts?Math.round(correct/attempts*100)+' %':'–','Trefferquote'],[streakDays(),'Tage in Folge geübt']];
  $('statsGrid').innerHTML=vals.map(v=>`<div class="stat"><strong>${v[0]}</strong><span>${v[1]}</span></div>`).join('');
  let extra='';
  if(!roomId&&rs.length){extra+='<div class="sub">Räume</div>'+rs.map(r=>{const its=rows.filter(x=>x.m.roomId===r.id).map(x=>x.it),n=its.length,d=its.filter(i=>i.stats.box>=MASTERED_BOX).length,du=its.filter(i=>i.stats.attempts>0&&isDue(i)).length;return `<div class="stat-row"><strong>${esc(r.name)}</strong><br><small>${n} Lernpunkte · ${d} beherrscht${du?` · ${du} fällig`:''}</small><div class="bar"><i style="width:${n?Math.round(d/n*100):0}%"></i></div></div>`}).join('')}
  const weak=rows.filter(x=>x.it.stats.attempts>0&&x.it.stats.incorrect>0).sort((a,b)=>b.it.stats.incorrect-a.it.stats.incorrect||a.it.stats.box-b.it.stats.box).slice(0,5);
  if(weak.length)extra+='<div class="sub">Schwächste Lernpunkte</div>'+weak.map(x=>`<div class="stat-row"><strong>${esc(x.it.title||x.it.question)}</strong><br><small>${esc(x.m.title)}${roomId?'':' · '+esc(names[x.m.roomId]||'')} · ${x.it.stats.incorrect}× „Nochmal"</small></div>`).join('');
  $('statsExtra').innerHTML=extra;
}

/* ---------- Einstellungen & Backup ---------- */
async function renderSettings(){
  $('optTyped').checked=LS.get('mr_typed',true);
$('optStats').checked=LS.get('mr_stats',false);
  const last=LS.get('mr_backup',null);$('backupInfo').textContent=last?'Letztes Backup: '+new Date(last).toLocaleDateString('de-DE'):'Noch kein Backup gemacht.';
  let txt='Speicher: ';
  try{if(navigator.storage&&navigator.storage.persisted){txt+=(await navigator.storage.persisted())?'dauerhaft gesichert ✅':'vom Browser löschbar. Am sichersten: zum Home-Bildschirm hinzufügen und regelmäßig sichern.'}else txt+='Status unbekannt.'}catch(e){txt+='Status unbekannt.'}
  $('storageInfo').textContent=txt;
}

/* ---------- Einzelnen Raum exportieren / importieren ---------- */
async function exportRoom(room) {
  if (!room || !room.id) {
    alert('Bitte den Raum zuerst speichern, bevor du ihn exportierst.');
    return;
  }
  const ms = await markers(room.id);
  const payload = {
    app: 'MemoryRooms',
    type: 'room',
    version: 1,
    exportedAt: new Date().toISOString(),
    room: {
      name: room.name,
      icon: room.icon || '🏠',
      photo: room.photo || null,
      roomPreset: room.roomPreset || null,
      numberOnly: !!room.numberOnly,
      decor: Array.isArray(room.decor) ? room.decor : []
    },
    markers: ms.map(m => ({
      title: m.title || '',
      description: m.description || '',
      content: m.content || '',
      hint: m.hint || '',
      photo: m.photo || null,
      x: m.x,
      y: m.y,
      routeOrder: m.routeOrder || 0,
      items: (m.items || []).map(it => ({
        title: it.title || '',
        question: it.question || '',
        answer: it.answer || '',
        hint: it.hint || '',
        photo: it.photo || null,
        showInRoom: !!it.showInRoom,
        useInQuiz: it.useInQuiz !== false
      }))
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const safe = String(room.name || 'Raum').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 40);
  a.href = URL.createObjectURL(blob);
  a.download = 'MemoryRooms-Raum-' + safe + '.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}

async function importRoomFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (e) {
    alert('Die Datei ist kein gültiges JSON.');
    return;
  }
  if (!data || data.app !== 'MemoryRooms' || data.type !== 'room' || !data.room) {
    if (data && data.app === 'MemoryRooms' && Array.isArray(data.rooms)) {
      alert('Das ist ein komplettes Backup, kein einzelner Raum. Bitte unter Einstellungen → Backup importieren verwenden.');
      return;
    }
    alert('Ungültige Raum-Datei. Erwarte eine MemoryRooms-Raum-Export-Datei.');
    return;
  }
  const src = data.room;
  const name = (src.name || 'Importierter Raum').trim() || 'Importierter Raum';
  const existing = await rooms();
  let finalName = name;
  const names = new Set(existing.map(function (r) { return r.name; }));
  if (names.has(finalName)) {
    let n = 2;
    while (names.has(finalName + ' (' + n + ')')) n++;
    finalName = finalName + ' (' + n + ')';
  }
  const newRoom = {
    id: uid(),
    name: finalName,
    icon: src.icon || '🏠',
    photo: src.photo || null,
    roomPreset: src.roomPreset || null,
    numberOnly: !!src.numberOnly,
    decor: Array.isArray(src.decor)
      ? src.decor.map(function (d) { return Object.assign({}, d, { id: uid() }); })
      : [],
    createdAt: new Date().toISOString()
  };
  await saveRoom(newRoom);
  const markerList = Array.isArray(data.markers) ? data.markers : [];
  for (let i = 0; i < markerList.length; i++) {
    const m = markerList[i];
    const items = Array.isArray(m.items)
      ? m.items.map(function (it) {
          return itemTemplate({
            title: it.title || '',
            question: it.question || '',
            answer: it.answer || '',
            hint: it.hint || '',
            photo: it.photo || null,
            showInRoom: !!it.showInRoom,
            useInQuiz: it.useInQuiz !== false
          });
        })
      : [];
    await saveMarker({
      id: uid(),
      roomId: newRoom.id,
      title: m.title || '',
      description: m.description || '',
      content: m.content || '',
      hint: m.hint || '',
      photo: m.photo || null,
      x: typeof m.x === 'number' ? m.x : 50,
      y: typeof m.y === 'number' ? m.y : 50,
      routeOrder: m.routeOrder != null ? m.routeOrder : i + 1,
      items: items,
      stats: { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null, recallTotal: 0, recallAll: 0 }
    });
  }
  await renderRooms();
  alert('Raum „' + finalName + '“ importiert (' + markerList.length + ' Merkpunkte).');
  openRoom(newRoom.id);
}

async function exportBackup(){
  const data={app:'MemoryRooms',backupVersion:4,rooms:await rooms(),markers:(await all(MARKERS)).map(markerNorm),days:LS.get('mr_days',[]),exportedAt:new Date().toISOString()};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='memoryrooms-backup-'+dayKey()+'.json';document.body.appendChild(a);a.click();a.remove();
  LS.set('mr_backup',Date.now());renderSettings();
}
async function importBackup(file){
  try{
    const d=JSON.parse(await file.text());if(!Array.isArray(d.rooms)||!Array.isArray(d.markers))throw Error('Ungültiges Backup');
    if(!confirm('Backup vollständig wiederherstellen? Die aktuellen Daten werden ersetzt.'))return;
    const tx=db.transaction([ROOMS,MARKERS],'readwrite');tx.objectStore(ROOMS).clear();tx.objectStore(MARKERS).clear();
    d.rooms.forEach(r=>tx.objectStore(ROOMS).put(r));d.markers.forEach(m=>tx.objectStore(MARKERS).put(markerNorm(m)));
    tx.oncomplete=async()=>{if(Array.isArray(d.days))LS.set('mr_days',d.days);currentRoom=null;currentRoomId=null;currentMarkers=[];await ensureDemo();await renderRooms();show('rooms');alert('Backup wiederhergestellt.')};
    tx.onerror=()=>alert('Backup konnte nicht importiert werden.');
  }catch(err){alert('Backup konnte nicht importiert werden.')}
}
function clearAll(){
  if(!confirm('Wirklich alle Daten löschen?'))return;if(!confirm('Letzte Sicherheitsabfrage: Daten unwiderruflich löschen?'))return;
  const tx=db.transaction([ROOMS,MARKERS],'readwrite');tx.objectStore(ROOMS).clear();tx.objectStore(MARKERS).clear();
  tx.oncomplete=async()=>{currentRoom=null;currentRoomId=null;currentMarkers=[];LS.set('mr_days',[]);await ensureDemo();await renderRooms();show('rooms')};
}

/* ---------- Ereignisse ---------- */
$('newRoom').onclick=()=>openRoomEditor({id:null,name:'',photo:null,icon:'🏠',createdAt:new Date().toISOString()});
$('themeRoom').onclick=createTheme;
$('decorBtn').onclick=()=>setDecorMode(!decorMode);
$('decorDone').onclick=()=>setDecorMode(false);
$('decorAdd').onclick=decorSheet;
$('decorFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{await addDecor(await decorPhoto(f))}catch(err){alert('Das Bild konnte nicht geladen werden.')}};
$('roomWrap').addEventListener('pointerdown',e=>{if(decorMode&&!e.target.closest('.decor-item'))setSel(null)});
$('dCrop').onclick=()=>{const d=selItem();if(d)openCrop(d)};
$('dDup').onclick=async()=>{const d=selItem();if(!d)return;const n=JSON.parse(JSON.stringify(d));n.id=uid();n.x=clamp(r1(d.x+4),0,100);n.y=clamp(r1(d.y+4),0,100);currentRoom.decor.push(n);await persistDecor();renderDecor();setSel(n.id)};
$('dFront').onclick=async()=>{const a=currentRoom.decor||[],i=a.findIndex(x=>x.id===selDecor);if(i<0)return;a.push(a.splice(i,1)[0]);await persistDecor();renderDecor()};
$('dBack').onclick=async()=>{const a=currentRoom.decor||[],i=a.findIndex(x=>x.id===selDecor);if(i<0)return;a.unshift(a.splice(i,1)[0]);await persistDecor();renderDecor()};
$('dDel').onclick=async()=>{if(!selItem()||!confirm('Dieses Bild aus dem Raum entfernen?'))return;currentRoom.decor=currentRoom.decor.filter(x=>x.id!==selDecor);selDecor=null;await persistDecor();renderDecor()};
$('cropOk').onclick=applyCrop;
$('cropCancel').onclick=()=>{$('cropOverlay').classList.remove('active');cropItem=null};
$('cropReset').onclick=()=>{cropState=Object.assign({},FULL);drawCrop()};
(()=>{
  const cb=$('cropBox');
  cb.addEventListener('pointerdown',ev=>{ev.preventDefault();const sr=$('cropStage').getBoundingClientRect();cropDrag={mode:ev.target.dataset.h||'move',x0:ev.clientX,y0:ev.clientY,c:Object.assign({},cropState),sw:sr.width,sh:sr.height};try{cb.setPointerCapture(ev.pointerId)}catch(_){}});
  cb.addEventListener('pointermove',ev=>{
    if(!cropDrag)return;const c0=cropDrag.c,dx=(ev.clientX-cropDrag.x0)/cropDrag.sw,dy=(ev.clientY-cropDrag.y0)/cropDrag.sh,MIN=.06,m=cropDrag.mode;
    if(m==='move'){cropState={x:clamp(c0.x+dx,0,1-c0.w),y:clamp(c0.y+dy,0,1-c0.h),w:c0.w,h:c0.h}}
    else{
      const R0=c0.x+c0.w,B0=c0.y+c0.h;let l=c0.x,t=c0.y,r=R0,b=B0;
      if(m.includes('w'))l=clamp(c0.x+dx,0,R0-MIN);
      if(m.includes('e'))r=clamp(R0+dx,c0.x+MIN,1);
      if(m.includes('n'))t=clamp(c0.y+dy,0,B0-MIN);
      if(m.includes('s'))b=clamp(B0+dy,c0.y+MIN,1);
      cropState={x:l,y:t,w:r-l,h:b-t};
    }
    drawCrop();
  });
  cb.addEventListener('pointerup',()=>{cropDrag=null});cb.addEventListener('pointercancel',()=>{cropDrag=null});
})();
$('backRooms').onclick=()=>{show('rooms');renderRooms()};
$('walkBtn').onclick=startWalk;$('dueRoomBtn').onclick=startDueRoom;$('recallBtn').onclick=recallSheet;
$('addMarker').onclick=()=>{arrange=false;updateArrangeUI();renderMarkers();openMarkerEditor(null)};
$('arrangeBtn').onclick=()=>{if(decorMode)setDecorMode(false);arrange=!arrange;updateArrangeUI();renderMarkers()};
$('editRoom').onclick=()=>{if(currentRoom)openRoomEditor(currentRoom)};
$('roomStats').onclick=()=>{show('stats');stats(currentRoomId)};
$('saveMarker').onclick=saveMarkerEditor;$('cancelMarker').onclick=()=>$('markerOverlay').classList.remove('active');
$('addItem').onclick=()=>{editItems.push(itemTemplate());renderItems()};
$('markerFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;markerPhoto=await photoData(f,900,.75);$('markerPhotoRemove').classList.remove('hidden')};
$('markerPhotoRemove').onclick=()=>{markerPhoto=null;$('markerFile').value='';$('markerPhotoRemove').classList.add('hidden')};
$('deleteMarker').onclick=async()=>{if(!editMarkerId||!confirm('Merkpunkt und Lernpunkte wirklich löschen?'))return;await del(MARKERS,editMarkerId);$('markerOverlay').classList.remove('active');currentMarkers=await markers(currentRoomId);currentMarkers.sort(byOrder);renderMarkers()};
$('checkTyped').onclick=()=>reveal($('typed').value,'typed');
$('dontKnow').onclick=dontKnow;$('thinkDont').onclick=dontKnow;
$('revealBtn').onclick=()=>reveal(null,'think');
document.querySelectorAll('.rate-grid .btn').forEach(b=>b.onclick=()=>rate(Number(b.dataset.rate)));
$('closeLearn').onclick=closeLearn;$('doneClose').onclick=closeLearn;
$('rcReveal').onclick=recallReveal;$('rcCancel').onclick=closeRecall;$('rcClose').onclick=closeRecall;
document.querySelectorAll('[data-rc]').forEach(b=>b.onclick=()=>recallRate(b.dataset.rc));
document.querySelectorAll('#roomPresetGrid [data-preset]').forEach(b=>b.onclick=()=>{selectedPreset=b.dataset.preset;roomPhoto=selectedPreset==='livingroom'?'room-livingroom.jpg':null;updatePresetUI()});
$('roomFile').onchange=async e=>{if(!e.target.files[0])return;roomPhoto=await photoData(e.target.files[0],1400,.78);selectedPreset='custom';updatePresetUI()};
$('saveRoom').onclick=saveRoomEditor;$('cancelRoom').onclick=()=>$('roomOverlay').classList.remove('active');$('deleteRoom').onclick=deleteRoomEditor;
$('export').onclick=exportBackup;$('clear').onclick=clearAll;
$('exportRoom').onclick=()=>{if(editingRoom)exportRoom(editingRoom)};
$('importRoom').onchange=async e=>{const f=e.target.files[0];if(f)await importRoomFile(f);e.target.value=''};

$('import').onchange=async e=>{const f=e.target.files[0];if(f)await importBackup(f);e.target.value=''};
$('optTyped').onchange=e=>LS.set('mr_typed',e.target.checked);
$('optStats').onchange=e=>LS.set('mr_stats',e.target.checked);
document.querySelectorAll('nav button').forEach(b=>b.onclick=async()=>{
  const v=b.dataset.view;
  if(v==='rooms'){show('rooms');renderRooms()}
  else if(v==='room'){if(currentRoomId)openRoom(currentRoomId);else{const rs=await rooms();if(rs[0])openRoom(rs[0].id)}}
  else if(v==='stats'){show('stats');stats(null)}
  else show('settings');
});


/* ---------- Anonyme Nutzungsstatistik (opt-in) ---------- */
async function sendAnonymousPing() {
  if (!LS.get('mr_stats', false)) return;
  const today = dayKey();
  if (LS.get('mr_ping_day', '') === today) return;
  try {
    // Ersetze die URL durch deinen eigenen Endpoint (Cloudflare Worker / Netlify Function)
    // await fetch('https://dein-endpoint.example.com/ping', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ v: '15.2', day: today }),
    //   mode: 'cors',
    //   keepalive: true
    // });
    LS.set('mr_ping_day', today);
  } catch (e) {}
}

(async()=>{
  try{
    await openDB();await ensureDemo();await renderRooms();
    setTimeout(sendAnonymousPing, 2500);
    if(navigator.storage&&navigator.storage.persist){try{await navigator.storage.persist()}catch(e){}}
    if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{})}
  }catch(e){console.error(e);alert('MemoryRooms konnte nicht gestartet werden.')}
})();
