'use strict';
/* MemoryRooms – Datenbank & Datenmodell */
const DB = 'MemoryRoomsDB', ROOMS = 'rooms', MARKERS = 'markers', DBV = 3;
const INTERVALS = [0, 1, 3, 7, 14, 30, 60], MAX_BOX = 6, MASTERED_BOX = 3, SESSION_MAX = 30, DAY = 864e5, BACKUP_DAYS = 14;

let db;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
const LS = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
};
function dayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* ---------- Datenmodell ---------- */
function defStats() {
  return { attempts: 0, correct: 0, incorrect: 0, mastery: 0, box: 0, due: null, lastReviewed: null };
}
function itemTemplate(o = {}) {
  const raw = o.stats || {};
  const s = Object.assign(defStats(), raw);
  if (!('box' in raw)) s.box = Math.min(raw.mastery || 0, 2);
  s.box = clamp(Number(s.box) || 0, 0, MAX_BOX);
  s.mastery = s.box;
  return {
    id: o.id || uid(),
    title: o.title || '',
    question: o.question || '',
    answer: o.answer || '',
    hint: o.hint || '',
    photo: o.photo || null,
    showInRoom: !!o.showInRoom,
    useInQuiz: o.useInQuiz !== false,
    stats: s
  };
}
function markerNorm(m) {
  m = Object.assign({}, m);
  m.items = Array.isArray(m.items) ? m.items.map(itemTemplate) : [];
  m.stats = Object.assign(
    { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null, recallTotal: 0, recallAll: 0 },
    m.stats || {}
  );
  return m;
}
function learnable(it) {
  return !!(it.answer && (it.question || it.title) && it.useInQuiz !== false);
}
function byOrder(a, b) {
  return (a.routeOrder || 999) - (b.routeOrder || 999);
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


/* ---------- Datenbank ---------- */
function openDB(){return new Promise((res,rej)=>{if(db)return res(db);const r=indexedDB.open(DB,DBV);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(ROOMS)){const s=d.createObjectStore(ROOMS,{keyPath:'id'});s.createIndex('name','name')}if(!d.objectStoreNames.contains(MARKERS)){const s=d.createObjectStore(MARKERS,{keyPath:'id'});s.createIndex('roomId','roomId')}};r.onsuccess=e=>{db=e.target.result;res(db)};r.onerror=()=>rej(r.error)})}
function all(store){return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
function getOne(store,key){return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(store,obj){return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).put(obj);r.onsuccess=()=>res(obj);r.onerror=()=>rej(r.error)})}
function del(store,key){return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function rooms(){return all(ROOMS)}
async function markers(roomId){let list;try{list=await new Promise((res,rej)=>{const r=db.transaction(MARKERS).objectStore(MARKERS).index('roomId').getAll(roomId);r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}catch(e){list=(await all(MARKERS)).filter(m=>m.roomId===roomId)}return list.map(markerNorm)}
async function getMarker(mid){const m=await getOne(MARKERS,mid);return m?markerNorm(m):null}
async function saveMarker(m){return put(MARKERS,markerNorm(m))}
async function saveRoom(r){return put(ROOMS,r)}

