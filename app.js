/**
 * MemoryRooms – Hauptlogik v3
 * Räume, Merkpunkte, Lernpunkte, Lernen, Quiz, Statistik, Backup
 */

let currentRoomId = null;
let currentMarkers = [];
let editingMarkerId = null;
let editingItems = [];
let editingItemIndex = -1;
let itemPhotoBase64 = null;
let photoBase64 = null;
let roomPhotoBase64 = null;
let editingRoomId = null;
let editingRoomPreset = 'livingroom';

let isDragging = false;
let dragMarker = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let learnQueue = [];
let learnIndex = 0;
let learnKnown = 0;
let learnUnknown = 0;
let learnMarkerId = null;
let onlyWrongMode = false;
let walkMode = false;
let walkMarkers = [];
let walkMarkerIndex = -1;

let quizQueue = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizWrong = 0;
let quizWrongItems = [];
let quizSelected = null;
let menuMarker = null;

const DEFAULT_SETTINGS = {
  questionFilter: 'all',
  questionCount: 10,
  questionScope: 'all',
  shuffle: true
};
let appSettings = loadSettings();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('memoryrooms-settings') || 'null');
    return Object.assign({}, DEFAULT_SETTINGS, saved || {});
  } catch (e) {
    return Object.assign({}, DEFAULT_SETTINGS);
  }
}

function saveSettings() {
  localStorage.setItem('memoryrooms-settings', JSON.stringify(appSettings));
}

const views = {
  rooms: document.getElementById('view-rooms'),
  room: document.getElementById('view-room'),
  markerMenu: document.getElementById('view-marker-menu'),
  roomMap: document.getElementById('view-room-map'),
  learn: document.getElementById('view-learn'),
  quiz: document.getElementById('view-quiz'),
  edit: document.getElementById('view-edit-marker'),
  editRoom: document.getElementById('view-edit-room'),
  editItem: document.getElementById('view-edit-item'),
  stats: document.getElementById('view-stats'),
  settings: document.getElementById('view-settings')
};

const headerTitle = document.getElementById('header-title');
const headerSubtitle = document.getElementById('header-subtitle');
const roomListEl = document.getElementById('room-list');
const markersLayer = document.getElementById('markers-layer');
const roomContainer = document.querySelector('.room-container');

document.addEventListener('DOMContentLoaded', async function () {
  try {
    await openDB();
    await ensureDemoRoom();
    await ensureRoomPhotoCompatibility();
    await renderRoomList();
    setupEventListeners();
    console.log('MemoryRooms v3 bereit.');
  } catch (err) {
    console.error('Startfehler:', err);
    alert('Fehler beim Starten. Bitte Seite neu laden.');
  }
});

async function ensureRoomPhotoCompatibility() {
  const rooms = await getAllRooms();
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    if (!Object.prototype.hasOwnProperty.call(room, 'photo')) {
      room.photo = room.name === 'Wohnzimmer' ? 'room-livingroom.jpg?v=10' : null;
      room.roomPreset = room.name === 'Wohnzimmer' ? 'livingroom' : 'livingroom';
      await saveRoom(room);
    }
  }
}

async function ensureDemoRoom() {
  const rooms = await getAllRooms();
  if (rooms.length > 0) return;

  const demoRoom = {
    id: generateId(),
    name: 'Wohnzimmer',
    icon: '🛋️',
    photo: 'room-livingroom.jpg?v=10',
    roomPreset: 'livingroom',
    createdAt: new Date().toISOString()
  };
  await saveRoom(demoRoom);

  const demoMarkers = [
    { title: 'Tür', x: 12, y: 82 },
    { title: 'Tisch', x: 42, y: 55 },
    { title: 'Sofa', x: 78, y: 68 },
    { title: 'Fenster', x: 50, y: 18 },
    { title: 'Regal', x: 15, y: 42 },
    { title: 'Bild', x: 82, y: 28 },
    { title: 'Schrank', x: 62, y: 72 }
  ];

  for (let i = 0; i < demoMarkers.length; i++) {
    const m = demoMarkers[i];
    await saveMarker({
      id: generateId(),
      roomId: demoRoom.id,
      title: m.title,
      description: '',
      content: '',
      hint: '',
      photo: null,
      x: m.x,
      y: m.y,
      items: [],
      routeOrder: currentMarkers.reduce(function(max, m){ return Math.max(max, Number(m.routeOrder)||0); }, 0) + 1,
      stats: { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null }
    });
  }
}

function showView(name) {
  Object.keys(views).forEach(function (k) {
    if (views[k]) views[k].classList.remove('active');
  });
  if (views[name]) views[name].classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(function (btn) {
    const v = btn.dataset.view;
    btn.classList.toggle('active', v === name || (name === 'room' && v === 'room') || (name === 'rooms' && v === 'rooms'));
  });

  if (name === 'rooms') {
    headerTitle.textContent = 'MemoryRooms';
    headerSubtitle.textContent = 'Dein virtueller Gedächtnisraum';
  } else if (name === 'stats') {
    headerTitle.textContent = 'Statistik';
    headerSubtitle.textContent = 'Dein Lernfortschritt';
  } else if (name === 'settings') {
    headerTitle.textContent = 'Einstellungen';
    headerSubtitle.textContent = '';
  }
}

function setupEventListeners() {
  document.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const view = btn.dataset.view;
      if (view === 'room') startConfiguredLearning();
      else if (view === 'rooms') {
        showView('rooms');
        renderRoomList();
      } else {
        showView(view);
        if (view === 'stats') renderStats();
      }
    });
  });

  document.getElementById('btn-add-room').addEventListener('click', createNewRoom);
  document.getElementById('btn-save-room').addEventListener('click', saveCurrentRoom);
  document.getElementById('btn-cancel-room').addEventListener('click', closeRoomEditor);
  document.getElementById('btn-delete-room').addEventListener('click', deleteCurrentRoom);
  document.getElementById('input-room-photo').addEventListener('change', handleRoomPhotoSelect);
  document.getElementById('btn-remove-room-photo').addEventListener('click', removeRoomPhoto);
  document.querySelectorAll('.room-preset-card').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectRoomPreset(btn.dataset.preset);
    });
  });
  document.getElementById('btn-back-rooms').addEventListener('click', function () {
    showView('rooms');
    renderRoomList();
  });
  document.getElementById('btn-back-rooms-top').addEventListener('click', function () {
    showView('rooms');
    renderRoomList();
  });
  document.getElementById('btn-room-info').addEventListener('click', function () {
    alert('Merkpunkte sind deine Gedächtnisanker. Tippe auf einen Ort, um Lernpunkte zu lernen oder zu bearbeiten.');
  });
  document.getElementById('btn-add-marker').addEventListener('click', function () {
    openEditMarker(null);
  });
  document.getElementById('btn-room-map').addEventListener('click', openRoomMap);
  document.getElementById('btn-close-room-map').addEventListener('click', closeRoomMap);
  document.getElementById('btn-close-room-map-bottom').addEventListener('click', closeRoomMap);
  document.getElementById('btn-start-room-walk').addEventListener('click', startRoomWalk);
  document.getElementById('btn-quiz-room').addEventListener('click', startRoomQuiz);
  document.getElementById('btn-side-learn').addEventListener('click', function () {
    if (menuMarker) startLearn(menuMarker, false);
  });
  document.getElementById('btn-side-edit').addEventListener('click', function () {
    if (menuMarker) openEditMarker(menuMarker.id);
  });

  document.getElementById('btn-menu-learn').addEventListener('click', function () {
    if (menuMarker) startLearn(menuMarker, false);
  });
  document.getElementById('btn-menu-edit').addEventListener('click', function () {
    if (menuMarker) openEditMarker(menuMarker.id);
  });
  document.getElementById('btn-menu-close').addEventListener('click', closeMarkerMenu);

  document.getElementById('btn-save-marker').addEventListener('click', saveCurrentMarker);
  document.getElementById('btn-cancel-edit').addEventListener('click', closeEditMarker);
  document.getElementById('btn-delete-marker').addEventListener('click', deleteCurrentMarker);
  document.getElementById('btn-add-item').addEventListener('click', function () {
    openEditItem(-1);
  });
  document.getElementById('input-marker-photo').addEventListener('change', handlePhotoSelect);
  document.getElementById('btn-remove-photo').addEventListener('click', removePhoto);

  document.getElementById('btn-save-item').addEventListener('click', saveCurrentItem);
  document.getElementById('btn-cancel-item').addEventListener('click', closeEditItem);
  document.getElementById('btn-delete-item').addEventListener('click', deleteCurrentItem);
  document.getElementById('input-item-photo').addEventListener('change', handleItemPhotoSelect);
  document.getElementById('btn-remove-item-photo').addEventListener('click', removeItemPhoto);
  document.getElementById('input-item-quiz').addEventListener('change', function () {
    document.getElementById('quiz-wrong-block').style.display =
      document.getElementById('input-item-quiz').checked ? 'block' : 'none';
  });

  document.getElementById('btn-show-solution').addEventListener('click', showSolution);
  document.getElementById('btn-close-learn').addEventListener('click', closeLearn);
  document.getElementById('btn-knew').addEventListener('click', function () { recordAnswer(true); });
  document.getElementById('btn-not-knew').addEventListener('click', function () { recordAnswer(false); });
  document.getElementById('btn-learn-again').addEventListener('click', function () {
    if (walkMode) { beginRoomWalk(); return; }
    const m = currentMarkers.find(function (x) { return x.id === learnMarkerId; });
    if (m) startLearn(m, onlyWrongMode);
  });
  document.getElementById('btn-learn-done').addEventListener('click', closeLearn);

  document.getElementById('btn-quiz-check').addEventListener('click', checkQuizAnswer);
  document.getElementById('btn-quiz-abort').addEventListener('click', closeQuiz);
  document.getElementById('btn-quiz-next').addEventListener('click', nextQuizQuestion);
  document.getElementById('btn-quiz-retry-wrong').addEventListener('click', function () {
    if (quizWrongItems.length === 0) {
      alert('Keine falschen Antworten in dieser Runde.');
      return;
    }
    startQuizWithItems(quizWrongItems.slice());
  });
  document.getElementById('btn-quiz-restart').addEventListener('click', startRoomQuiz);
  document.getElementById('btn-quiz-done').addEventListener('click', closeQuiz);

  document.getElementById('btn-export-data').addEventListener('click', exportData);
  document.getElementById('input-import-data').addEventListener('change', importData);
  document.getElementById('btn-clear-data').addEventListener('click', clearData);
  document.getElementById('setting-filter').addEventListener('change', saveSettingsFromUI);
  document.getElementById('setting-count').addEventListener('change', saveSettingsFromUI);
  document.getElementById('setting-scope').addEventListener('change', saveSettingsFromUI);
  document.getElementById('setting-shuffle').addEventListener('change', saveSettingsFromUI);
  document.getElementById('btn-start-configured-learning').addEventListener('click', startConfiguredLearning);
  renderSettingsUI();

  markersLayer.addEventListener('pointerdown', onMarkerPointerDown);
  document.addEventListener('pointermove', onMarkerPointerMove);
  document.addEventListener('pointerup', onMarkerPointerUp);
  document.addEventListener('pointercancel', onMarkerPointerUp);
}

/* ===== Räume ===== */

async function renderRoomList() {
  const rooms = await getAllRooms();
  roomListEl.innerHTML = '';

  if (rooms.length === 0) {
    roomListEl.innerHTML =
      '<div class="empty-state"><div class="icon">🏠</div><p>Noch keine Räume.<br>Erstelle deinen ersten Gedächtnisraum!</p></div>';
    return;
  }

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const markers = await getMarkersByRoom(room.id);
    let itemCount = 0;
    let mastered = 0;
    markers.forEach(function (m) {
      itemCount += countItems(m);
      mastered += countMasteredItems(m);
    });
    const pct = itemCount > 0 ? Math.round((mastered / itemCount) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'room-card';
    card.innerHTML =
      (room.photo
        ? '<img class="room-card-photo" src="' + room.photo + '" alt="">'
        : '<div class="room-card-icon">' + (room.icon || '🏠') + '</div>') +
      '<div class="room-card-info">' +
      '<h3>' + escapeHtml(room.name) + '</h3>' +
      '<div class="room-card-meta">' +
      '<span class="meta-chip">' + markers.length + ' Merkpunkte</span>' +
      '<span class="meta-chip' + (itemCount > 0 ? ' filled' : '') + '">' + itemCount + ' Lernpunkte</span>' +
      (itemCount > 0 ? '<span class="meta-chip filled">' + pct + ' % gelernt</span>' : '') +
      '</div>' +
      (itemCount > 0
        ? '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>'
        : '') +
      '</div>' +
      '<button class="room-card-menu" type="button" aria-label="Raumoptionen">⋯</button>';
    card.addEventListener('click', function (e) {
      if (e.target.closest('.room-card-menu')) return;
      openRoom(room.id);
    });
    card.querySelector('.room-card-menu').addEventListener('click', function (e) {
      e.stopPropagation();
      openRoomEditor(room.id);
    });
    roomListEl.appendChild(card);
  }
}

async function openRoomActions(room) {
  const action = prompt('Raum „' + room.name + '“\n\n1 = Öffnen\n2 = Bearbeiten\n3 = Löschen', '1');
  if (action === '1') {
    openRoom(room.id);
    return;
  }
  if (action === '2') {
    openRoomEditor(room.id);
    return;
  }
  if (action !== '3') return;
  await confirmAndDeleteRoom(room);
}

async function confirmAndDeleteRoom(room) {
  const rooms = await getAllRooms();
  if (rooms.length <= 1) {
    alert('Der letzte Raum kann nicht gelöscht werden. Erstelle zuerst einen neuen Raum.');
    return false;
  }
  const markers = await getMarkersByRoom(room.id);
  const itemCount = markers.reduce(function (sum, m) { return sum + countItems(m); }, 0);
  const ok = confirm('Raum „' + room.name + '“ wirklich löschen?\n\nDabei werden ' + markers.length + ' Merkpunkte und ' + itemCount + ' Lernpunkte dauerhaft gelöscht.');
  if (!ok) return false;
  await deleteRoom(room.id);
  if (currentRoomId === room.id) currentRoomId = null;
  await renderRoomList();
  return true;
}

async function createNewRoom() {
  openRoomEditor(null);
}

function openRoomEditor(roomId) {
  editingRoomId = roomId;
  roomPhotoBase64 = null;
  editingRoomPreset = 'livingroom';
  const nameInput = document.getElementById('input-room-name');
  const preview = document.getElementById('room-photo-preview');
  const img = document.getElementById('room-photo-preview-img');
  const deleteBtn = document.getElementById('btn-delete-room');
  const title = document.getElementById('room-edit-title');

  if (roomId) {
    const roomPromise = getAllRooms();
    roomPromise.then(function(rooms) {
      const room = rooms.find(function(r) { return r.id === roomId; });
      if (!room) return;
      title.textContent = 'Raum bearbeiten';
      nameInput.value = room.name || '';
      editingRoomPreset = room.roomPreset || 'livingroom';
      updateRoomPresetUI();
      deleteBtn.classList.remove('hidden');
      deleteBtn.disabled = rooms.length <= 1;
      deleteBtn.textContent = rooms.length <= 1 ? 'Letzten Raum nicht löschen' : 'Raum löschen';
      if (room.photo) {
        roomPhotoBase64 = room.photo;
        img.src = room.photo;
        preview.classList.remove('hidden');
      } else {
        preview.classList.add('hidden');
      }
      document.getElementById('input-room-photo').value = '';
      views.editRoom.classList.add('active');
      requestAnimationFrame(function(){ views.editRoom.querySelector('.edit-card').scrollTop = 0; });
    });
  } else {
    title.textContent = 'Neuen Raum erstellen';
    nameInput.value = '';
    editingRoomPreset = 'livingroom';
    updateRoomPresetUI();
    deleteBtn.classList.add('hidden');
    deleteBtn.disabled = false;
    deleteBtn.textContent = 'Raum löschen';
    preview.classList.add('hidden');
    document.getElementById('input-room-photo').value = '';
    views.editRoom.classList.add('active');
    requestAnimationFrame(function(){ views.editRoom.querySelector('.edit-card').scrollTop = 0; });
  }
}

function closeRoomEditor() {
  views.editRoom.classList.remove('active');
  editingRoomId = null;
  roomPhotoBase64 = null;
}

async function saveCurrentRoom() {
  const name = document.getElementById('input-room-name').value.trim();
  if (!name) {
    alert('Bitte einen Raumnamen eingeben.');
    return;
  }
  if (editingRoomId) {
    const rooms = await getAllRooms();
    const room = rooms.find(function(r) { return r.id === editingRoomId; });
    if (!room) return;
    room.name = name;
    room.photo = roomPhotoBase64;
    room.roomPreset = editingRoomPreset;
    await saveRoom(room);
    if (currentRoomId === room.id) {
      document.getElementById('room-view-title').textContent = room.name;
      setRoomBackground(room);
    }
  } else {
    const room = { id: generateId(), name: name, icon: '🏠', photo: roomPhotoBase64, roomPreset: editingRoomPreset, createdAt: new Date().toISOString() };
    await saveRoom(room);
    closeRoomEditor();
    await renderRoomList();
    openRoom(room.id);
    return;
  }
  closeRoomEditor();
  await renderRoomList();
}

async function deleteCurrentRoom() {
  if (!editingRoomId) return;
  const rooms = await getAllRooms();
  const room = rooms.find(function(r) { return r.id === editingRoomId; });
  if (!room) return;
  const deleted = await confirmAndDeleteRoom(room);
  if (deleted) {
    closeRoomEditor();
    showView('rooms');
  }
}

function selectRoomPreset(preset) {
  editingRoomPreset = preset || 'livingroom';
  updateRoomPresetUI();
  // Eine Vorlage ersetzt nur dann ein vorhandenes Raumfoto nicht.
  // Wird ein eigenes Foto ausgewählt, hat dieses Vorrang.
}

function updateRoomPresetUI() {
  document.querySelectorAll('.room-preset-card').forEach(function(btn) {
    btn.classList.toggle('selected', btn.dataset.preset === editingRoomPreset);
  });
}

function handleRoomPhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 6 * 1024 * 1024) {
    alert('Foto zu groß. Bitte ein Foto bis ca. 6 MB wählen.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(ev) {
    compressImage(ev.target.result, 1400, 0.78).then(function(base64) {
      roomPhotoBase64 = base64;
      document.getElementById('room-photo-preview-img').src = base64;
      document.getElementById('room-photo-preview').classList.remove('hidden');
    });
  };
  reader.readAsDataURL(file);
}

function removeRoomPhoto() {
  roomPhotoBase64 = null;
  document.getElementById('room-photo-preview').classList.add('hidden');
  document.getElementById('input-room-photo').value = '';
}

async function openCurrentOrFirstRoom() {
  if (currentRoomId) {
    openRoom(currentRoomId);
  } else {
    const rooms = await getAllRooms();
    if (rooms.length > 0) openRoom(rooms[0].id);
    else showView('rooms');
  }
}

async function openRoom(roomId) {
  currentRoomId = roomId;
  const rooms = await getAllRooms();
  const room = rooms.find(function (r) { return r.id === roomId; });
  if (!room) return;

  headerTitle.textContent = room.name;
  headerSubtitle.textContent = 'Dein Gedächtnisraum';
  const roomTitle = document.getElementById('room-view-title');
  if (roomTitle) roomTitle.textContent = room.name;

  currentMarkers = await getMarkersByRoom(roomId);
  await ensureMarkerRouteOrder(currentMarkers);
  setRoomBackground(room);
  resetSideMarkerPanel();
  const roomMarkerCount = document.getElementById('room-marker-count');
  if (roomMarkerCount) roomMarkerCount.textContent = currentMarkers.length + (currentMarkers.length === 1 ? ' Ort' : ' Orte');
  renderMarkers();
  showView('room');
}

function clampPercent(value) { return Math.max(4, Math.min(96, value)) + '%'; }
function compareMarkersByRoute(a, b) {
  const ao = Number.isFinite(Number(a.routeOrder)) ? Number(a.routeOrder) : 999999;
  const bo = Number.isFinite(Number(b.routeOrder)) ? Number(b.routeOrder) : 999999;
  if (ao !== bo) return ao - bo;
  return String(a.id).localeCompare(String(b.id));
}
async function ensureMarkerRouteOrder(markers) {
  let changed = false;
  markers.forEach(function(marker, idx) {
    if (!Number.isFinite(Number(marker.routeOrder))) { marker.routeOrder = idx + 1; changed = true; }
  });
  if (changed) for (let i = 0; i < markers.length; i++) await saveMarker(markers[i]);
  markers.sort(compareMarkersByRoute);
}
function getWalkMarkers() {
  return currentMarkers.slice().sort(compareMarkersByRoute).filter(function(marker) {
    return (marker.items || []).some(function(item) {
      return (item.question && item.question.trim()) || (item.title && item.title.trim()) || (item.answer && item.answer.trim());
    });
  });
}
function openRoomMap() { renderRoomMap(); views.roomMap.classList.add('active'); }
function closeRoomMap() { views.roomMap.classList.remove('active'); }
function renderRoomMap() {
  const map = document.getElementById('route-map');
  const legend = document.getElementById('route-legend');
  const ordered = currentMarkers.slice().sort(compareMarkersByRoute);
  if (!ordered.length) {
    map.innerHTML = '<div class="route-empty">Noch keine Merkpunkte. Lege zuerst Orte in deinem Raum an.</div>';
    legend.innerHTML = '';
    document.getElementById('btn-start-room-walk').disabled = true;
    return;
  }
  document.getElementById('btn-start-room-walk').disabled = getWalkMarkers().length === 0;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox','0 0 100 100'); svg.setAttribute('class','route-map-svg');
  const shell = document.createElementNS(ns,'rect');
  shell.setAttribute('x','3'); shell.setAttribute('y','3'); shell.setAttribute('width','94'); shell.setAttribute('height','94'); shell.setAttribute('rx','5'); shell.setAttribute('class','map-room-shell'); svg.appendChild(shell);
  const rug = document.createElementNS(ns,'ellipse'); rug.setAttribute('cx','50'); rug.setAttribute('cy','58'); rug.setAttribute('rx','27'); rug.setAttribute('ry','18'); rug.setAttribute('class','map-rug'); svg.appendChild(rug);
  const pts = ordered.map(function(m){ return [Math.max(8,Math.min(92,Number(m.x)||50)),Math.max(8,Math.min(92,Number(m.y)||50))]; });
  if (pts.length > 1) { const line=document.createElementNS(ns,'polyline'); line.setAttribute('points',pts.map(function(p){return p.join(',');}).join(' ')); line.setAttribute('class','map-route-line'); svg.appendChild(line); }
  ordered.forEach(function(marker,idx){
    const g=document.createElementNS(ns,'g'); g.setAttribute('class','map-node'); g.setAttribute('transform','translate('+pts[idx][0]+','+pts[idx][1]+')');
    const c=document.createElementNS(ns,'circle'); c.setAttribute('r','5.4'); c.setAttribute('class','map-node-circle'); g.appendChild(c);
    const t=document.createElementNS(ns,'text'); t.setAttribute('text-anchor','middle'); t.setAttribute('y','1.8'); t.setAttribute('class','map-node-number'); t.textContent=String(idx+1); g.appendChild(t);
    g.addEventListener('click',function(){ closeRoomMap(); onMarkerTap(marker); }); svg.appendChild(g);
  });
  map.innerHTML=''; map.appendChild(svg);
  legend.innerHTML=ordered.map(function(marker,idx){
    const count=countItems(marker); const photo=marker.photo ? '<img src="'+marker.photo+'" alt="">' : '<span class="legend-num">'+(idx+1)+'</span>';
    return '<div class="route-legend-row" data-marker-id="'+marker.id+'">'+photo+'<span class="route-legend-main"><strong>'+ (idx+1)+'. '+escapeHtml(marker.title||'Merkpunkt')+'</strong><small>'+count+' Lernpunkt'+(count===1?'':'e')+'</small></span><span class="route-order-actions"><button type="button" class="route-order-btn" data-dir="up" aria-label="Nach oben">▲</button><button type="button" class="route-order-btn" data-dir="down" aria-label="Nach unten">▼</button></span></div>';
  }).join('');
  legend.querySelectorAll('.route-legend-row').forEach(function(row){
    row.addEventListener('click',function(e){
      if (e.target.closest('.route-order-btn')) return;
      const m=currentMarkers.find(function(x){return x.id===row.dataset.markerId;});
      if(m){closeRoomMap();onMarkerTap(m);}
    });
    row.querySelectorAll('.route-order-btn').forEach(function(btn){
      btn.addEventListener('click',async function(e){
        e.stopPropagation();
        await moveMarkerInRoute(row.dataset.markerId, btn.dataset.dir === 'up' ? -1 : 1);
        renderMarkers(); renderRoomMap();
      });
    });
  });
}
async function moveMarkerInRoute(markerId, direction) {
  const ordered = currentMarkers.slice().sort(compareMarkersByRoute);
  const index = ordered.findIndex(function(m){ return m.id === markerId; });
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  const a = ordered[index];
  const b = ordered[target];
  const temp = Number(a.routeOrder) || index + 1;
  a.routeOrder = Number(b.routeOrder) || target + 1;
  b.routeOrder = temp;
  await saveMarker(a);
  await saveMarker(b);
  currentMarkers.sort(compareMarkersByRoute);
}

async function startRoomWalk() { closeRoomMap(); await beginRoomWalk(); }
async function beginRoomWalk() {
  walkMarkers=getWalkMarkers();
  if (!walkMarkers.length) { alert('Für einen Rundgang braucht es mindestens einen Merkpunkt mit einem Lernpunkt.'); return; }
  walkMode=true; walkMarkerIndex=0; learnKnown=0; learnUnknown=0; onlyWrongMode=false; loadWalkMarker(); views.learn.classList.add('active');
}
function loadWalkMarker() {
  const marker=walkMarkers[walkMarkerIndex]; learnMarkerId=marker.id;
  learnQueue=(marker.items||[]).filter(function(it){return (it.question&&it.question.trim())||(it.title&&it.title.trim())||(it.answer&&it.answer.trim());}).map(function(it){return Object.assign({},it,{_markerId:marker.id,_markerTitle:marker.title||'Merkpunkt',_markerPhoto:marker.photo||null});});
  learnIndex=0; document.getElementById('learn-summary').classList.add('hidden'); document.getElementById('learn-question-block').classList.remove('hidden'); document.getElementById('learn-solution').classList.add('hidden'); showLearnItem();
}

/* ===== Merkpunkte darstellen ===== */

function setRoomBackground(room) {
  const img = document.getElementById('room-photo-bg');
  const bg = document.getElementById('room-bg');
  if (!img || !bg) return;
  bg.dataset.preset = (room && room.roomPreset) || 'livingroom';
  if (room && room.photo) {
    img.src = room.photo;
    img.alt = 'Gedächtnisraum ' + (room.name || '');
    img.classList.remove('hidden');
    bg.classList.remove('no-room-photo');
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
    bg.classList.add('no-room-photo');
  }
}

function renderMarkers() {
  markersLayer.innerHTML = '';
  currentMarkers.slice().sort(compareMarkersByRoute).forEach(function (marker, idx) {
    const el = document.createElement('div');
    const has = markerHasContent(marker);
    const mastered = countItems(marker) > 0 && countMasteredItems(marker) === countItems(marker);
    el.className = 'marker' + (has ? ' has-content' : '') + (mastered ? ' mastered' : '');
    el.dataset.id = marker.id;
    el.style.left = marker.x + '%';
    el.style.top = marker.y + '%';
    const markerPhoto = marker.photo ? '<img class="marker-photo" src="' + marker.photo + '" alt="">' : '<span class="marker-num">' + (idx + 1) + '</span>';
    el.innerHTML = markerPhoto + '<span class="marker-label">' + escapeHtml(marker.title || '?') + '</span>' + (countItems(marker) ? '<span class="marker-count">' + countItems(marker) + '</span>' : '');
    el.addEventListener('click', function (e) {
      if (isDragging) return;
      e.stopPropagation();
      onMarkerTap(marker);
    });
    markersLayer.appendChild(el);

    (marker.items || []).forEach(function(item, itemIndex) {
      if (!item.photo || !item.showInRoom) return;
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'room-thought-anchor';
      thumb.style.left = clampPercent(Number(marker.x) + [-8, 8, 0, 10, -10][itemIndex % 5]);
      thumb.style.top = clampPercent(Number(marker.y) + [-10, -10, 11, 8, 8][itemIndex % 5]);
      thumb.title = item.title || item.question || 'Gedankenstütze';
      thumb.innerHTML = '<img src="' + item.photo + '" alt="Gedankenstütze">';
      thumb.addEventListener('click', function(e) { e.stopPropagation(); onMarkerTap(marker); });
      markersLayer.appendChild(thumb);
    });
  });
}
function onMarkerTap(marker) {
  updateSideMarkerPanel(marker);
  // Jeder Merkpunkt bekommt dasselbe, eindeutig sichtbare Menü.
  // So ist Bearbeiten immer erreichbar – auch bei einem noch leeren Merkpunkt.
  openMarkerMenu(marker);
}

function resetSideMarkerPanel() {
  const title = document.getElementById('side-marker-title');
  const count = document.getElementById('side-marker-count');
  const desc = document.getElementById('side-marker-desc');
  const photoWrap = document.getElementById('side-marker-photo-wrap');
  const photo = document.getElementById('side-marker-photo');
  const learn = document.getElementById('btn-side-learn');
  const edit = document.getElementById('btn-side-edit');
  if (!title) return;
  title.textContent = 'Noch keinen Merkpunkt ausgewählt';
  count.textContent = '—';
  desc.textContent = 'Tippe auf einen Ort im Raum. Dort kannst du beliebig viele Lernpunkte hinterlegen.';
  photo.src = '';
  photoWrap.classList.add('hidden');
  learn.disabled = true;
  edit.disabled = true;
}

function updateSideMarkerPanel(marker) {
  const title = document.getElementById('side-marker-title');
  const count = document.getElementById('side-marker-count');
  const desc = document.getElementById('side-marker-desc');
  const photoWrap = document.getElementById('side-marker-photo-wrap');
  const photo = document.getElementById('side-marker-photo');
  const learn = document.getElementById('btn-side-learn');
  const edit = document.getElementById('btn-side-edit');
  if (!title) return;
  const n = countItems(marker);
  title.textContent = marker.title || 'Merkpunkt';
  count.textContent = n ? String(n) : '0';
  desc.textContent = marker.description || (n ? n + ' Lernpunkt' + (n !== 1 ? 'e' : '') + ' an diesem Ort.' : 'Noch keine Lernpunkte. Lege jetzt den ersten Lernpunkt an.');
  if (marker.photo) {
    photo.src = marker.photo;
    photoWrap.classList.remove('hidden');
  } else {
    photo.src = '';
    photoWrap.classList.add('hidden');
  }
  learn.disabled = n === 0;
  edit.disabled = false;
}

function openMarkerMenu(marker) {
  menuMarker = marker;
  document.getElementById('menu-marker-title').textContent = marker.title || 'Merkpunkt';
  document.getElementById('menu-marker-desc').textContent = marker.description || '';
  const n = countItems(marker);
  const m = countMasteredItems(marker);
  document.getElementById('menu-marker-meta').textContent = n > 0
    ? n + ' Lernpunkt' + (n !== 1 ? 'e' : '') + ' · ' + itemProgressPercent(marker) + ' % beherrscht'
    : 'Noch keine Lernpunkte angelegt';

  const menuPhotoWrap = document.getElementById('menu-marker-photo-wrap');
  const menuPhoto = document.getElementById('menu-marker-photo');
  if (marker.photo) {
    menuPhoto.src = marker.photo;
    menuPhotoWrap.classList.remove('hidden');
  } else {
    menuPhoto.src = '';
    menuPhotoWrap.classList.add('hidden');
  }

  const learnBtn = document.getElementById('btn-menu-learn');
  learnBtn.disabled = n === 0;
  learnBtn.style.opacity = n === 0 ? '0.5' : '1';
  learnBtn.title = n === 0 ? 'Zuerst einen Lernpunkt anlegen' : '';
  views.markerMenu.classList.add('active');
}

function closeMarkerMenu() {
  views.markerMenu.classList.remove('active');
  menuMarker = null;
}

/* ===== Drag ===== */

function onMarkerPointerDown(e) {
  const el = e.target.closest('.marker');
  if (!el) return;
  e.preventDefault();
  isDragging = false;
  dragMarker = el;
  el.setPointerCapture(e.pointerId);
  const markerRect = el.getBoundingClientRect();
  dragOffsetX = e.clientX - (markerRect.left + markerRect.width / 2);
  dragOffsetY = e.clientY - (markerRect.top + markerRect.height / 2);
}

function onMarkerPointerMove(e) {
  if (!dragMarker) return;
  isDragging = true;
  const rect = roomContainer.getBoundingClientRect();
  let x = ((e.clientX - dragOffsetX - rect.left) / rect.width) * 100;
  let y = ((e.clientY - dragOffsetY - rect.top) / rect.height) * 100;
  x = Math.max(5, Math.min(95, x));
  y = Math.max(5, Math.min(95, y));
  dragMarker.style.left = x + '%';
  dragMarker.style.top = y + '%';
}

async function onMarkerPointerUp() {
  if (!dragMarker) return;
  const id = dragMarker.dataset.id;
  const x = parseFloat(dragMarker.style.left);
  const y = parseFloat(dragMarker.style.top);
  const marker = currentMarkers.find(function (m) { return m.id === id; });
  if (marker) {
    marker.x = x;
    marker.y = y;
    await saveMarker(marker);
  }
  setTimeout(function () { isDragging = false; }, 50);
  dragMarker = null;
}

/* ===== Editor Merkpunkt + Lernpunkte ===== */

function openEditMarker(markerId) {
  closeMarkerMenu();
  editingMarkerId = markerId;
  photoBase64 = null;

  const titleInput = document.getElementById('input-marker-title');
  const descInput = document.getElementById('input-marker-desc');
  const photoPreview = document.getElementById('photo-preview');
  const photoImg = document.getElementById('photo-preview-img');
  const deleteBtn = document.getElementById('btn-delete-marker');
  const editTitle = document.getElementById('edit-title');

  if (markerId) {
    const marker = currentMarkers.find(function (m) { return m.id === markerId; });
    if (!marker) return;
    editTitle.textContent = 'Merkpunkt bearbeiten';
    titleInput.value = marker.title || '';
    descInput.value = marker.description || '';
    deleteBtn.classList.remove('hidden');
    editingItems = (marker.items || []).map(function (it) {
      return Object.assign({}, it, {
        wrongAnswers: (it.wrongAnswers || ['', '', '']).slice(0, 3),
        stats: Object.assign({ attempts: 0, correct: 0, incorrect: 0, lastReviewed: null, mastery: 0 }, it.stats || {})
      });
    });
    if (marker.photo) {
      photoBase64 = marker.photo;
      photoImg.src = marker.photo;
      photoPreview.classList.remove('hidden');
    } else {
      photoPreview.classList.add('hidden');
    }
  } else {
    editTitle.textContent = 'Neuer Merkpunkt';
    titleInput.value = '';
    descInput.value = '';
    deleteBtn.classList.add('hidden');
    editingItems = [];
    photoPreview.classList.add('hidden');
  }

  document.getElementById('input-marker-photo').value = '';
  renderItemsList();
  views.edit.classList.add('active');
}

function closeEditMarker() {
  views.edit.classList.remove('active');
  editingMarkerId = null;
  editingItems = [];
  photoBase64 = null;
}

function renderItemsList() {
  const list = document.getElementById('items-list');
  list.innerHTML = '';
  if (editingItems.length === 0) {
    list.innerHTML = '<p class="empty-items">Noch keine Lernpunkte. Tippe auf „+ Lernpunkt“.</p>';
    return;
  }
  editingItems.forEach(function (item, idx) {
    const row = document.createElement('div');
    row.className = 'item-row';
    const thumb = item.photo
      ? '<img class="item-row-thumb" src="' + item.photo + '" alt="">'
      : '<div class="item-row-thumb item-row-thumb-empty">🧠</div>';
    row.innerHTML =
      thumb +
      '<div class="item-row-main">' +
      '<strong>' + (idx + 1) + '. ' + escapeHtml(item.title || item.question || 'Lernpunkt') + '</strong>' +
      '<span>' + escapeHtml(truncate(item.question || item.answer || '', 50)) + '</span>' +
      '</div>' +
      '<span class="item-row-badge">' + (item.useInQuiz ? '🎯' : '') + '</span>';
    row.addEventListener('click', function () { openEditItem(idx); });
    list.appendChild(row);
  });
}

function openEditItem(index) {
  editingItemIndex = index;
  itemPhotoBase64 = null;
  const isNew = index < 0;
  document.getElementById('item-edit-title').textContent = isNew ? 'Neuer Lernpunkt' : 'Lernpunkt bearbeiten';
  document.getElementById('btn-delete-item').classList.toggle('hidden', isNew);

  if (!isNew) {
    const item = editingItems[index];
    document.getElementById('input-item-title').value = item.title || '';
    document.getElementById('input-item-question').value = item.question || '';
    document.getElementById('input-item-answer').value = item.answer || '';
    document.getElementById('input-item-hint').value = item.hint || '';
    document.getElementById('input-item-quiz').checked = item.useInQuiz !== false;
    document.getElementById('input-item-room-photo').checked = item.showInRoom === true;
    const wa = item.wrongAnswers || ['', '', ''];
    document.getElementById('input-wrong-1').value = wa[0] || '';
    document.getElementById('input-wrong-2').value = wa[1] || '';
    document.getElementById('input-wrong-3').value = wa[2] || '';
    if (item.photo) {
      itemPhotoBase64 = item.photo;
      document.getElementById('item-photo-preview-img').src = item.photo;
      document.getElementById('item-photo-preview').classList.remove('hidden');
    } else {
      document.getElementById('item-photo-preview').classList.add('hidden');
    }
  } else {
    document.getElementById('input-item-title').value = '';
    document.getElementById('input-item-question').value = '';
    document.getElementById('input-item-answer').value = '';
    document.getElementById('input-item-hint').value = '';
    document.getElementById('input-item-quiz').checked = true;
    document.getElementById('input-item-room-photo').checked = false;
    document.getElementById('input-wrong-1').value = '';
    document.getElementById('input-wrong-2').value = '';
    document.getElementById('input-wrong-3').value = '';
    document.getElementById('item-photo-preview').classList.add('hidden');
  }
  document.getElementById('input-item-photo').value = '';
  document.getElementById('quiz-wrong-block').style.display =
    document.getElementById('input-item-quiz').checked ? 'block' : 'none';
  views.editItem.classList.add('active');
  requestAnimationFrame(function(){ views.editItem.querySelector('.edit-card').scrollTop = 0; });
}

function closeEditItem() {
  views.editItem.classList.remove('active');
  editingItemIndex = -1;
  itemPhotoBase64 = null;
}

function saveCurrentItem() {
  const title = document.getElementById('input-item-title').value.trim();
  const question = document.getElementById('input-item-question').value.trim();
  const answer = document.getElementById('input-item-answer').value.trim();
  if (!title && !question) {
    alert('Bitte entweder einen Titel oder eine Frage eingeben. Beides ist nicht nötig.');
    return;
  }
  if (!answer) {
    alert('Bitte eine Antwort / Lösung eingeben.');
    return;
  }
  const data = {
    id: editingItemIndex >= 0 ? editingItems[editingItemIndex].id : generateId(),
    title: title,
    question: question,
    answer: answer,
    hint: document.getElementById('input-item-hint').value.trim(),
    photo: itemPhotoBase64,
    useInQuiz: document.getElementById('input-item-quiz').checked,
    showInRoom: document.getElementById('input-item-room-photo').checked && !!itemPhotoBase64,
    wrongAnswers: [
      document.getElementById('input-wrong-1').value.trim(),
      document.getElementById('input-wrong-2').value.trim(),
      document.getElementById('input-wrong-3').value.trim()
    ],
    stats: editingItemIndex >= 0
      ? editingItems[editingItemIndex].stats
      : { attempts: 0, correct: 0, incorrect: 0, lastReviewed: null, mastery: 0 }
  };
  if (editingItemIndex >= 0) editingItems[editingItemIndex] = data;
  else editingItems.push(data);
  closeEditItem();
  renderItemsList();
}

function deleteCurrentItem() {
  if (editingItemIndex < 0) return;
  if (!confirm('Lernpunkt wirklich löschen?')) return;
  editingItems.splice(editingItemIndex, 1);
  closeEditItem();
  renderItemsList();
}

async function saveCurrentMarker() {
  const title = document.getElementById('input-marker-title').value.trim();
  if (!title) {
    alert('Bitte einen Titel eingeben (z. B. Tisch).');
    return;
  }
  const description = document.getElementById('input-marker-desc').value.trim();

  if (editingMarkerId) {
    const marker = currentMarkers.find(function (m) { return m.id === editingMarkerId; });
    if (!marker) return;
    marker.title = title;
    marker.description = description;
    marker.photo = photoBase64;
    marker.items = editingItems;
    if (marker.items.length > 0) {
      marker.content = marker.items[0].answer || '';
      marker.hint = marker.items[0].hint || '';
    }
    await saveMarker(marker);
  } else {
    const newMarker = {
      id: generateId(),
      roomId: currentRoomId,
      title: title,
      description: description,
      content: editingItems[0] ? editingItems[0].answer : '',
      hint: editingItems[0] ? editingItems[0].hint : '',
      photo: photoBase64,
      x: 50,
      y: 50,
      items: editingItems,
      stats: { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null }
    };
    await saveMarker(newMarker);
    currentMarkers.push(newMarker);
  }

  closeEditMarker();
  currentMarkers = await getMarkersByRoom(currentRoomId);
  renderMarkers();
}

async function deleteCurrentMarker() {
  if (!editingMarkerId) return;
  if (!confirm('Merkpunkt und alle Lernpunkte wirklich löschen?')) return;
  await deleteMarker(editingMarkerId);
  closeEditMarker();
  currentMarkers = await getMarkersByRoom(currentRoomId);
  renderMarkers();
}

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) {
    alert('Foto zu groß (max. ca. 1,5 MB).');
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    compressImage(ev.target.result, 800, 0.7).then(function (base64) {
      photoBase64 = base64;
      document.getElementById('photo-preview-img').src = base64;
      document.getElementById('photo-preview').classList.remove('hidden');
    });
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  photoBase64 = null;
  document.getElementById('photo-preview').classList.add('hidden');
  document.getElementById('input-marker-photo').value = '';
}

function handleItemPhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) {
    alert('Foto zu groß (max. ca. 1,5 MB).');
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    compressImage(ev.target.result, 800, 0.7).then(function (base64) {
      itemPhotoBase64 = base64;
      document.getElementById('item-photo-preview-img').src = base64;
      document.getElementById('item-photo-preview').classList.remove('hidden');
    });
  };
  reader.readAsDataURL(file);
}

function removeItemPhoto() {
  itemPhotoBase64 = null;
  document.getElementById('item-photo-preview').classList.add('hidden');
  document.getElementById('input-item-photo').value = '';
}

function compressImage(dataUrl, maxWidth, quality) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

/* ===== Lernmodus ===== */

function startLearn(marker, wrongOnly) {
  closeMarkerMenu();
  walkMode = false;
  walkMarkers = [];
  walkMarkerIndex = -1;
  learnMarkerId = marker.id;
  onlyWrongMode = !!wrongOnly;

  let items = (marker.items || []).filter(function (it) {
    return (it.question && it.question.trim()) || (it.answer && it.answer.trim());
  });
  if (wrongOnly) {
    items = items.filter(function (it) {
      return it.stats && it.stats.incorrect > 0 && it.stats.mastery < 2;
    });
  }
  if (items.length === 0) {
    alert(wrongOnly
      ? 'Keine zu wiederholenden Lernpunkte.'
      : 'Dieser Merkpunkt hat noch keine Lernpunkte. Bitte zuerst bearbeiten.');
    return;
  }

  learnQueue = items.map(function (it) {
    return Object.assign({}, it, { _markerId: marker.id, _markerTitle: marker.title || 'Merkpunkt', _markerPhoto: marker.photo || null });
  });
  learnIndex = 0;
  learnKnown = 0;
  learnUnknown = 0;

  document.getElementById('learn-summary').classList.add('hidden');
  document.getElementById('learn-question-block').classList.remove('hidden');
  document.getElementById('learn-solution').classList.add('hidden');
  showLearnItem();
  views.learn.classList.add('active');
}

function showLearnItem() {
  const item = learnQueue[learnIndex];
  const marker = currentMarkers.find(function (m) { return m.id === learnMarkerId; }) || null;
  const placeTitle = document.getElementById('learn-place-title');
  const placeWrap = document.getElementById('learn-place-wrap');
  const placePhoto = document.getElementById('learn-place-photo');
  if (placeTitle) placeTitle.textContent = item._markerTitle || (marker ? (marker.title || 'Merkpunkt') : 'Merkpunkt');
  if (placeWrap && placePhoto) {
    if (item._markerPhoto) {
      placePhoto.src = item._markerPhoto;
      placePhoto.classList.remove('hidden');
      placeWrap.classList.add('has-photo');
    } else {
      placePhoto.src = '';
      placePhoto.classList.add('hidden');
      placeWrap.classList.remove('has-photo');
    }
  }
  document.getElementById('learn-progress').textContent = walkMode
    ? ('Ort ' + (walkMarkerIndex + 1) + ' von ' + walkMarkers.length + ' · Punkt ' + (learnIndex + 1) + ' von ' + learnQueue.length)
    : ((learnIndex + 1) + ' von ' + learnQueue.length);
  const promptEl = document.getElementById('learn-question-text');
  const promptLabel = document.querySelector('#learn-question-block .prompt');
  const displayPrompt = item.question || item.title || 'Lernpunkt';
  promptEl.textContent = displayPrompt;
  if (promptLabel) promptLabel.textContent = item.question ? 'FRAGE' : 'LERNPUNKT';
  document.getElementById('learn-content').textContent = item.answer || '(keine Antwort)';
  const photoEl = document.getElementById('learn-photo');
  if (item.photo) {
    photoEl.src = item.photo;
    photoEl.classList.remove('hidden');
  } else {
    photoEl.classList.add('hidden');
  }
  const hintEl = document.getElementById('learn-hint');
  if (item.hint) {
    hintEl.textContent = '💡 Gedankenstütze · ' + item.hint;
    hintEl.classList.remove('hidden');
  } else {
    hintEl.classList.add('hidden');
  }
  document.getElementById('learn-question-block').classList.remove('hidden');
  document.getElementById('learn-solution').classList.add('hidden');
  document.getElementById('learn-summary').classList.add('hidden');
}

function showSolution() {
  document.getElementById('learn-question-block').classList.add('hidden');
  document.getElementById('learn-solution').classList.remove('hidden');
}

async function recordAnswer(knew) {
  const item = learnQueue[learnIndex];
  if (!item.stats) {
    item.stats = { attempts: 0, correct: 0, incorrect: 0, lastReviewed: null, mastery: 0 };
  }
  item.stats.attempts += 1;
  item.stats.lastReviewed = new Date().toISOString();
  if (knew) {
    item.stats.correct += 1;
    item.stats.mastery = Math.min(5, (item.stats.mastery || 0) + 1);
    learnKnown += 1;
  } else {
    item.stats.incorrect += 1;
    item.stats.mastery = Math.max(0, (item.stats.mastery || 0) - 1);
    learnUnknown += 1;
  }

  const marker = (item._markerId && currentMarkers.find(function (m) { return m.id === item._markerId; })) ||
    (learnMarkerId ? currentMarkers.find(function (m) { return m.id === learnMarkerId; }) : null) ||
    (item._markerId ? await getMarker(item._markerId) : null);
  if (marker) {
    const idx = marker.items.findIndex(function (i) { return i.id === item.id; });
    if (idx >= 0) {
      const persistedItem = Object.assign({}, item);
      delete persistedItem._markerId;
      delete persistedItem._markerTitle;
      delete persistedItem._markerPhoto;
      marker.items[idx] = persistedItem;
    }
    if (!marker.stats) marker.stats = { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null };
    marker.stats.timesAsked += 1;
    if (knew) marker.stats.timesKnown += 1;
    else marker.stats.timesUnknown += 1;
    marker.stats.lastAsked = new Date().toISOString();
    await saveMarker(marker);
  }

  learnIndex += 1;
  if (learnIndex >= learnQueue.length) {
    if (walkMode && walkMarkerIndex < walkMarkers.length - 1) {
      walkMarkerIndex += 1;
      loadWalkMarker();
    } else {
      showLearnSummary();
    }
  } else {
    showLearnItem();
  }
}

function showLearnSummary() {
  document.getElementById('learn-summary-title').textContent = walkMode ? 'Rundgang abgeschlossen' : 'Merkpunkt abgeschlossen';
  document.getElementById('learn-question-block').classList.add('hidden');
  document.getElementById('learn-solution').classList.add('hidden');
  document.getElementById('learn-summary').classList.remove('hidden');
  const total = learnKnown + learnUnknown;
  const pct = total > 0 ? Math.round((learnKnown / total) * 100) : 0;
  document.getElementById('learn-summary-score').textContent =
    learnKnown + ' von ' + total + ' gewusst';
  document.getElementById('learn-summary-pct').textContent = pct + ' %';
  document.getElementById('learn-progress').textContent = 'Fertig';
}

function closeLearn() {
  views.learn.classList.remove('active');
  learnQueue = [];
  learnMarkerId = null;
  walkMode = false;
  walkMarkers = [];
  walkMarkerIndex = -1;
  if (currentRoomId) {
    getMarkersByRoom(currentRoomId).then(function (list) {
      currentMarkers = list;
      renderMarkers();
    });
  }
}

/* ===== Quiz ===== */

function collectQuizItems(markers) {
  const items = [];
  markers.forEach(function (m) {
    (m.items || []).forEach(function (it) {
      if (it.useInQuiz && it.answer && it.answer.trim() && it.question && it.question.trim()) {
        items.push(Object.assign({}, it, { _markerTitle: m.title }));
      }
    });
  });
  return items;
}

function startRoomQuiz() {
  const items = collectQuizItems(currentMarkers);
  if (items.length === 0) {
    alert('Keine Quiz-Fragen in diesem Raum.\nAktiviere „Im Quiz verwenden“ bei Lernpunkten und gib falsche Antworten an.');
    return;
  }
  startQuizWithItems(shuffle(items));
}

function startQuizWithItems(items) {
  quizQueue = items;
  quizIndex = 0;
  quizCorrect = 0;
  quizWrong = 0;
  quizWrongItems = [];
  quizSelected = null;

  document.getElementById('quiz-summary').classList.add('hidden');
  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('quiz-question-block').classList.remove('hidden');
  showQuizQuestion();
  views.quiz.classList.add('active');
}

function showQuizQuestion() {
  const item = quizQueue[quizIndex];
  quizSelected = null;
  document.getElementById('quiz-progress').textContent =
    'Frage ' + (quizIndex + 1) + ' von ' + quizQueue.length;
  document.getElementById('quiz-question-text').textContent = item.question;
  document.getElementById('btn-quiz-check').disabled = true;

  const wrongs = (item.wrongAnswers || []).filter(function (w) { return w && w.trim(); });
  let options = [item.answer].concat(wrongs);
  // Falls zu wenige Distraktoren: generische Fülloptionen vermeiden – nur vorhandene nutzen
  options = uniqueStrings(options);
  options = shuffle(options);

  const box = document.getElementById('quiz-options');
  box.innerHTML = '';
  options.forEach(function (opt, i) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.dataset.value = opt;
    btn.addEventListener('click', function () {
      document.querySelectorAll('.quiz-option').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      quizSelected = opt;
      document.getElementById('btn-quiz-check').disabled = false;
    });
    box.appendChild(btn);
  });

  document.getElementById('quiz-question-block').classList.remove('hidden');
  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('quiz-summary').classList.add('hidden');
}

async function checkQuizAnswer() {
  if (quizSelected == null) return;
  const item = quizQueue[quizIndex];
  const correct = quizSelected === item.answer;

  document.querySelectorAll('.quiz-option').forEach(function (btn) {
    btn.disabled = true;
    if (btn.dataset.value === item.answer) btn.classList.add('correct');
    else if (btn.dataset.value === quizSelected && !correct) btn.classList.add('wrong');
  });

  if (!item.stats) {
    item.stats = { attempts: 0, correct: 0, incorrect: 0, lastReviewed: null, mastery: 0 };
  }
  item.stats.attempts += 1;
  item.stats.lastReviewed = new Date().toISOString();
  if (correct) {
    item.stats.correct += 1;
    item.stats.mastery = Math.min(5, (item.stats.mastery || 0) + 1);
    quizCorrect += 1;
  } else {
    item.stats.incorrect += 1;
    item.stats.mastery = Math.max(0, (item.stats.mastery || 0) - 1);
    quizWrong += 1;
    quizWrongItems.push(item);
  }

  // Persistenz: Marker mit diesem Item finden und speichern
  for (let i = 0; i < currentMarkers.length; i++) {
    const m = currentMarkers[i];
    const idx = (m.items || []).findIndex(function (it) { return it.id === item.id; });
    if (idx >= 0) {
      m.items[idx].stats = item.stats;
      await saveMarker(m);
      break;
    }
  }

  const fb = document.getElementById('quiz-feedback-text');
  fb.textContent = correct ? '✅ Richtig!' : '❌ Leider falsch. Richtig: ' + item.answer;
  fb.className = correct ? 'feedback-ok' : 'feedback-bad';
  const hintEl = document.getElementById('quiz-feedback-hint');
  if (item.hint) {
    hintEl.textContent = '💡 Gedankenstütze · ' + item.hint;
    hintEl.classList.remove('hidden');
  } else {
    hintEl.classList.add('hidden');
  }

  document.getElementById('quiz-actions-answer').classList.add('hidden');
  document.getElementById('quiz-feedback').classList.remove('hidden');
}

function nextQuizQuestion() {
  document.getElementById('quiz-actions-answer').classList.remove('hidden');
  quizIndex += 1;
  if (quizIndex >= quizQueue.length) showQuizSummary();
  else showQuizQuestion();
}

function showQuizSummary() {
  document.getElementById('quiz-question-block').classList.add('hidden');
  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('quiz-summary').classList.remove('hidden');
  const total = quizCorrect + quizWrong;
  const pct = total > 0 ? Math.round((quizCorrect / total) * 100) : 0;
  document.getElementById('quiz-summary-score').textContent = quizCorrect + ' / ' + total + ' richtig';
  document.getElementById('quiz-summary-pct').textContent = pct + ' %';
  document.getElementById('quiz-summary-detail').innerHTML =
    '<p>✅ Gewusst: <strong>' + quizCorrect + '</strong></p>' +
    '<p>❌ Nicht gewusst: <strong>' + quizWrong + '</strong></p>';
  document.getElementById('quiz-progress').textContent = 'Ergebnis';
  document.getElementById('btn-quiz-retry-wrong').style.display =
    quizWrongItems.length > 0 ? 'block' : 'none';
}

function closeQuiz() {
  views.quiz.classList.remove('active');
  quizQueue = [];
  if (currentRoomId) {
    getMarkersByRoom(currentRoomId).then(function (list) {
      currentMarkers = list;
      renderMarkers();
    });
  }
}

/* ===== Konfigurierte Lernrunde ===== */

function saveSettingsFromUI() {
  appSettings.questionFilter = document.getElementById('setting-filter').value;
  appSettings.questionCount = document.getElementById('setting-count').value === 'all'
    ? 'all' : Number(document.getElementById('setting-count').value);
  appSettings.questionScope = document.getElementById('setting-scope').value;
  appSettings.shuffle = document.getElementById('setting-shuffle').checked;
  saveSettings();
  updateSettingsSummary();
}

function renderSettingsUI() {
  const filter = document.getElementById('setting-filter');
  if (!filter) return;
  filter.value = appSettings.questionFilter;
  document.getElementById('setting-count').value = String(appSettings.questionCount);
  document.getElementById('setting-scope').value = appSettings.questionScope;
  document.getElementById('setting-shuffle').checked = appSettings.shuffle !== false;
  updateSettingsSummary();
}

function updateSettingsSummary() {
  const el = document.getElementById('settings-summary');
  if (!el) return;
  const filterText = { all: 'Alle Lernpunkte', quiz: 'Nur fürs Quiz freigegebene', wrong: 'Nur zu wiederholende' }[appSettings.questionFilter] || 'Alle Lernpunkte';
  const countText = appSettings.questionCount === 'all' ? 'alle' : String(appSettings.questionCount);
  const scopeText = appSettings.questionScope === 'current' ? 'aktueller Raum' : 'alle Räume';
  el.textContent = filterText + ' · ' + countText + ' · ' + scopeText + (appSettings.shuffle !== false ? ' · zufällig' : ' · Reihenfolge');
}

async function startConfiguredLearning() {
  const rooms = await getAllRooms();
  if (!rooms.length) {
    alert('Noch kein Raum vorhanden.');
    return;
  }

  let selectedRooms = rooms;
  if (appSettings.questionScope === 'current') {
    let room = rooms.find(function (r) { return r.id === currentRoomId; });
    if (!room) room = rooms[0];
    selectedRooms = [room];
  }

  const markers = [];
  for (let i = 0; i < selectedRooms.length; i++) {
    const ms = await getMarkersByRoom(selectedRooms[i].id);
    ms.forEach(function (m) { markers.push(m); });
  }

  let items = [];
  markers.forEach(function (m) {
    (m.items || []).forEach(function (it) {
      const valid = (it.question && it.question.trim()) || (it.answer && it.answer.trim());
      if (!valid) return;
      if (appSettings.questionFilter === 'quiz' && it.useInQuiz === false) return;
      if (appSettings.questionFilter === 'wrong' && !((it.stats && it.stats.incorrect > 0) && (it.stats.mastery || 0) < 2)) return;
      items.push(Object.assign({}, it, { _markerId: m.id, _markerTitle: m.title || 'Merkpunkt', _markerPhoto: m.photo || null }));
    });
  });

  if (!items.length) {
    const msg = appSettings.questionFilter === 'wrong'
      ? 'Keine zu wiederholenden Lernpunkte gefunden.'
      : 'Keine passenden Lernpunkte für diese Einstellung gefunden.';
    alert(msg);
    return;
  }

  if (appSettings.shuffle !== false) items = shuffle(items);
  if (appSettings.questionCount !== 'all') items = items.slice(0, Number(appSettings.questionCount));

  learnMarkerId = null;
  onlyWrongMode = appSettings.questionFilter === 'wrong';
  learnQueue = items;
  learnIndex = 0;
  learnKnown = 0;
  learnUnknown = 0;
  document.getElementById('learn-summary').classList.add('hidden');
  document.getElementById('learn-question-block').classList.remove('hidden');
  document.getElementById('learn-solution').classList.add('hidden');
  showLearnItem();
  views.learn.classList.add('active');
}

/* ===== Statistik ===== */

async function renderStats() {
  const rooms = await getAllRooms();
  const allMarkers = await getAllMarkers();
  let totalItems = 0;
  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let toReview = 0;
  let bestRoom = null;
  let bestPct = -1;

  for (let r = 0; r < rooms.length; r++) {
    const room = rooms[r];
    const markers = allMarkers.filter(function (m) { return m.roomId === room.id; });
    let roomItems = 0;
    let roomMastered = 0;
    markers.forEach(function (m) {
      (m.items || []).forEach(function (it) {
        roomItems += 1;
        totalItems += 1;
        if (it.stats) {
          totalAttempts += it.stats.attempts || 0;
          totalCorrect += it.stats.correct || 0;
          totalIncorrect += it.stats.incorrect || 0;
          if ((it.stats.incorrect || 0) > 0 && (it.stats.mastery || 0) < 2) toReview += 1;
          if ((it.stats.mastery || 0) >= 2) roomMastered += 1;
        }
      });
    });
    const pct = roomItems > 0 ? Math.round((roomMastered / roomItems) * 100) : 0;
    if (roomItems > 0 && pct > bestPct) {
      bestPct = pct;
      bestRoom = room.name + ' (' + pct + ' %)';
    }
  }

  const rate = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  document.getElementById('stats-content').innerHTML =
    '<div class="stat-card"><div class="stat-value">' + rooms.length + '</div><div class="stat-label">Räume</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + allMarkers.length + '</div><div class="stat-label">Merkpunkte</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + totalItems + '</div><div class="stat-label">Lernpunkte</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + totalAttempts + '</div><div class="stat-label">Abfragen</div></div>' +
    '<div class="stat-card wide"><div class="stat-value success">' + rate + ' %</div><div class="stat-label">Trefferquote</div></div>' +
    '<div class="stat-card"><div class="stat-value success">' + totalCorrect + '</div><div class="stat-label">Gewusst</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + totalIncorrect + '</div><div class="stat-label">Nicht gewusst</div></div>' +
    '<div class="stat-card wide"><div class="stat-value">' + (bestRoom || '–') + '</div><div class="stat-label">🏆 Bester Raum</div></div>' +
    '<div class="stat-card wide"><div class="stat-value">' + toReview + '</div><div class="stat-label">🧠 Zu wiederholen</div></div>';
}

/* ===== Backup ===== */

async function exportData() {
  const data = await exportAllData();
  data.settings = appSettings;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'memoryrooms-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!confirm('Backup wiederherstellen? Die aktuell gespeicherten MemoryRooms-Daten auf diesem Gerät werden durch den Backup-Stand ersetzt.\n\nWenn du unsicher bist, zuerst ein Backup exportieren.')) {
      e.target.value = '';
      return;
    }
    const result = await restoreAllData(data);
    if (data.settings && typeof data.settings === 'object') {
      appSettings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
      saveSettings();
      renderSettingsUI();
    }
    currentRoomId = null;
    currentMarkers = [];
    await renderRoomList();
    showView('rooms');
    alert('Import erfolgreich: ' + result.rooms + ' Räume, ' + result.markers + ' Merkpunkte.');
  } catch (err) {
    console.error(err);
    alert('Import fehlgeschlagen: ' + (err.message || 'Ungültige Datei'));
  }
  e.target.value = '';
}

async function clearData() {
  if (!confirm('Wirklich ALLE Daten unwiderruflich löschen?')) return;
  if (!confirm('Sicher? Es gibt kein Zurück (außer einem Backup).')) return;
  await clearAllData();
  currentRoomId = null;
  currentMarkers = [];
  await ensureDemoRoom();
  await renderRoomList();
  showView('rooms');
  alert('Alle Daten gelöscht. Demo-Raum neu angelegt.');
}

/* ===== Helpers ===== */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function uniqueStrings(arr) {
  const seen = {};
  return arr.filter(function (x) {
    const k = String(x);
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
}
