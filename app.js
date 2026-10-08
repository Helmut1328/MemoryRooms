/**
 * MemoryRooms – Hauptlogik
 * MVP: Räume, Merkpunkte, Lernen, lokales Speichern
 */

// ===== Zustand =====
let currentRoomId = null;
let currentMarkers = [];
let editingMarkerId = null;   // null = neuer Merkpunkt
let currentLearnMarker = null;
let photoBase64 = null;       // temporär für Foto-Upload
let isDragging = false;
let dragMarker = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ===== DOM-Elemente =====
const views = {
  rooms: document.getElementById('view-rooms'),
  room: document.getElementById('view-room'),
  learn: document.getElementById('view-learn'),
  edit: document.getElementById('view-edit-marker'),
  stats: document.getElementById('view-stats'),
  settings: document.getElementById('view-settings')
};

const headerTitle = document.getElementById('header-title');
const headerSubtitle = document.getElementById('header-subtitle');
const roomListEl = document.getElementById('room-list');
const markersLayer = document.getElementById('markers-layer');
const roomContainer = document.querySelector('.room-container');

// ===== Initialisierung =====
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await openDB();
    await ensureDemoRoom();
    await renderRoomList();
    setupEventListeners();
    console.log('MemoryRooms bereit.');
  } catch (err) {
    console.error('Startfehler:', err);
    alert('Fehler beim Starten der App. Bitte Seite neu laden.');
  }
});

/**
 * Stellt sicher, dass mindestens ein Demo-Raum existiert
 */
async function ensureDemoRoom() {
  const rooms = await getAllRooms();
  if (rooms.length === 0) {
    const demoRoom = {
      id: generateId(),
      name: 'Wohnzimmer',
      icon: '🛋️',
      createdAt: new Date().toISOString()
    };
    await saveRoom(demoRoom);

    // Beispiel-Merkpunkte (ohne Inhalt – Nutzer füllt selbst)
    const demoMarkers = [
      { title: 'Tür', x: 12, y: 82 },
      { title: 'Tisch', x: 42, y: 55 },
      { title: 'Sofa', x: 78, y: 68 },
      { title: 'Fenster', x: 50, y: 18 },
      { title: 'Regal', x: 15, y: 42 },
      { title: 'Bild', x: 82, y: 28 },
      { title: 'Schrank', x: 62, y: 72 }
    ];

    for (const m of demoMarkers) {
      await saveMarker({
        id: generateId(),
        roomId: demoRoom.id,
        title: m.title,
        content: '',
        hint: '',
        photo: null,
        x: m.x,   // Prozent
        y: m.y,
        stats: { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null }
      });
    }
  }
}

// ===== Navigation =====
function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  if (views[name]) views[name].classList.add('active');

  // Nav-Buttons aktualisieren
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name ||
      (name === 'room' && btn.dataset.view === 'room') ||
      (name === 'rooms' && btn.dataset.view === 'rooms'));
  });

  // Header anpassen
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
  // Untere Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'room') {
        // Zum aktuellen Raum oder ersten Raum
        openCurrentOrFirstRoom();
      } else if (view === 'rooms') {
        showView('rooms');
        renderRoomList();
      } else {
        showView(view);
        if (view === 'stats') renderStats();
      }
    });
  });

  // Neuen Raum erstellen
  document.getElementById('btn-add-room').addEventListener('click', createNewRoom);

  // Zurück zu Räumen
  document.getElementById('btn-back-rooms').addEventListener('click', () => {
    showView('rooms');
    renderRoomList();
  });

  // Merkpunkt hinzufügen
  document.getElementById('btn-add-marker').addEventListener('click', () => {
    openEditMarker(null);
  });

  // Edit-Formular
  document.getElementById('btn-save-marker').addEventListener('click', saveCurrentMarker);
  document.getElementById('btn-cancel-edit').addEventListener('click', closeEditMarker);
  document.getElementById('btn-delete-marker').addEventListener('click', deleteCurrentMarker);

  // Foto-Upload
  document.getElementById('input-marker-photo').addEventListener('change', handlePhotoSelect);
  document.getElementById('btn-remove-photo').addEventListener('click', removePhoto);

  // Lernmodus
  document.getElementById('btn-show-solution').addEventListener('click', showSolution);
  document.getElementById('btn-close-learn').addEventListener('click', closeLearn);
  document.getElementById('btn-knew').addEventListener('click', () => recordAnswer(true));
  document.getElementById('btn-not-knew').addEventListener('click', () => recordAnswer(false));

  // Einstellungen
  document.getElementById('btn-export-data').addEventListener('click', exportData);
  document.getElementById('input-import-data').addEventListener('change', handleImportFile);
  document.getElementById('btn-clear-data').addEventListener('click', clearData);

  // Drag & Drop für Merkpunkte (Touch + Mouse)
  markersLayer.addEventListener('pointerdown', onMarkerPointerDown);
  document.addEventListener('pointermove', onMarkerPointerMove);
  document.addEventListener('pointerup', onMarkerPointerUp);
  document.addEventListener('pointercancel', onMarkerPointerUp);
}

// ===== Räume =====
async function renderRoomList() {
  const rooms = await getAllRooms();
  roomListEl.innerHTML = '';

  if (rooms.length === 0) {
    roomListEl.innerHTML = `
      <div class="empty-state">
        <div class="icon">🏠</div>
        <p>Noch keine Räume.<br>Erstelle deinen ersten Gedächtnisraum!</p>
      </div>`;
    return;
  }

  for (const room of rooms) {
    const markers = await getMarkersByRoom(room.id);
    const withContent = markers.filter(m => m.content && m.content.trim()).length;

    const card = document.createElement('div');
    card.className = 'room-card';
    card.innerHTML = `
      <div class="room-card-icon">${room.icon || '🏠'}</div>
      <div class="room-card-info">
        <h3>${escapeHtml(room.name)}</h3>
        <p>${markers.length} Merkpunkte · ${withContent} mit Inhalt</p>
      </div>`;
    card.addEventListener('click', () => openRoom(room.id));
    roomListEl.appendChild(card);
  }
}

async function createNewRoom() {
  const name = prompt('Name des neuen Raums:', 'Arbeitszimmer');
  if (!name || !name.trim()) return;

  const room = {
    id: generateId(),
    name: name.trim(),
    icon: '🏠',
    createdAt: new Date().toISOString()
  };
  await saveRoom(room);
  await renderRoomList();
  openRoom(room.id);
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
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;

  headerTitle.textContent = room.name;
  headerSubtitle.textContent = 'Tippe auf einen Merkpunkt zum Lernen';

  currentMarkers = await getMarkersByRoom(roomId);
  renderMarkers();
  showView('room');
}

// ===== Merkpunkte darstellen =====
function renderMarkers() {
  markersLayer.innerHTML = '';

  currentMarkers.forEach(marker => {
    const el = document.createElement('div');
    el.className = 'marker' + (marker.content && marker.content.trim() ? ' has-content' : '');
    el.dataset.id = marker.id;
    el.style.left = marker.x + '%';
    el.style.top = marker.y + '%';
    el.innerHTML = `<span class="marker-label">${escapeHtml(marker.title || '?')}</span>`;

    // Kurzer Tap = Lernen / Bearbeiten
    el.addEventListener('click', (e) => {
      if (isDragging) return; // nach Drag keinen Click
      e.stopPropagation();
      onMarkerTap(marker);
    });

    markersLayer.appendChild(el);
  });
}

function onMarkerTap(marker) {
  if (marker.content && marker.content.trim()) {
    // Hat Inhalt → Lernmodus
    openLearn(marker);
  } else {
    // Noch leer → direkt bearbeiten
    openEditMarker(marker.id);
  }
}

// ===== Drag & Drop =====
function onMarkerPointerDown(e) {
  const el = e.target.closest('.marker');
  if (!el) return;

  e.preventDefault();
  isDragging = false;
  dragMarker = el;
  el.setPointerCapture(e.pointerId);

  const rect = roomContainer.getBoundingClientRect();
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

  // Begrenzen
  x = Math.max(5, Math.min(95, x));
  y = Math.max(5, Math.min(95, y));

  dragMarker.style.left = x + '%';
  dragMarker.style.top = y + '%';
}

async function onMarkerPointerUp(e) {
  if (!dragMarker) return;

  const id = dragMarker.dataset.id;
  const x = parseFloat(dragMarker.style.left);
  const y = parseFloat(dragMarker.style.top);

  // Position speichern
  const marker = currentMarkers.find(m => m.id === id);
  if (marker) {
    marker.x = x;
    marker.y = y;
    await saveMarker(marker);
  }

  // Kleine Verzögerung, damit der Click-Event nicht ausgelöst wird
  setTimeout(() => { isDragging = false; }, 50);
  dragMarker = null;
}

// ===== Merkpunkt bearbeiten =====
function openEditMarker(markerId) {
  editingMarkerId = markerId;
  photoBase64 = null;

  const titleInput = document.getElementById('input-marker-title');
  const contentInput = document.getElementById('input-marker-content');
  const hintInput = document.getElementById('input-marker-hint');
  const photoPreview = document.getElementById('photo-preview');
  const photoImg = document.getElementById('photo-preview-img');
  const deleteBtn = document.getElementById('btn-delete-marker');
  const editTitle = document.getElementById('edit-title');

  if (markerId) {
    const marker = currentMarkers.find(m => m.id === markerId);
    if (!marker) return;
    editTitle.textContent = 'Merkpunkt bearbeiten';
    titleInput.value = marker.title || '';
    contentInput.value = marker.content || '';
    hintInput.value = marker.hint || '';
    deleteBtn.classList.remove('hidden');

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
    contentInput.value = '';
    hintInput.value = '';
    deleteBtn.classList.add('hidden');
    photoPreview.classList.add('hidden');
  }

  document.getElementById('input-marker-photo').value = '';
  views.edit.classList.add('active');
}

function closeEditMarker() {
  views.edit.classList.remove('active');
  editingMarkerId = null;
  photoBase64 = null;
}

async function saveCurrentMarker() {
  const title = document.getElementById('input-marker-title').value.trim();
  const content = document.getElementById('input-marker-content').value.trim();
  const hint = document.getElementById('input-marker-hint').value.trim();

  if (!title) {
    alert('Bitte einen Titel eingeben (z. B. Tisch).');
    return;
  }

  if (editingMarkerId) {
    // Bestehenden aktualisieren
    const marker = currentMarkers.find(m => m.id === editingMarkerId);
    if (!marker) return;
    marker.title = title;
    marker.content = content;
    marker.hint = hint;
    marker.photo = photoBase64;
    await saveMarker(marker);
  } else {
    // Neu anlegen – in der Mitte des Raums
    const newMarker = {
      id: generateId(),
      roomId: currentRoomId,
      title,
      content,
      hint,
      photo: photoBase64,
      x: 50,
      y: 50,
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
  if (!confirm('Merkpunkt wirklich löschen?')) return;

  await deleteMarker(editingMarkerId);
  closeEditMarker();
  currentMarkers = await getMarkersByRoom(currentRoomId);
  renderMarkers();
}

// ===== Foto-Handling =====
function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Größe begrenzen (max. ~800 KB für IndexedDB-Komfort)
  if (file.size > 1.5 * 1024 * 1024) {
    alert('Foto ist zu groß (max. ca. 1,5 MB). Bitte ein kleineres wählen oder komprimieren.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    // Optional: leichte Kompression über Canvas
    compressImage(ev.target.result, 800, 0.7).then(base64 => {
      photoBase64 = base64;
      const img = document.getElementById('photo-preview-img');
      img.src = base64;
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

/**
 * Bild verkleinern / komprimieren (Client-seitig, keine KI)
 */
function compressImage(dataUrl, maxWidth, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

// ===== Lernmodus =====
function openLearn(marker) {
  currentLearnMarker = marker;

  document.getElementById('learn-marker-title').textContent = marker.title || 'Merkpunkt';
  document.getElementById('learn-question').classList.remove('hidden');
  document.getElementById('learn-solution').classList.add('hidden');
  document.getElementById('learn-actions-question').classList.remove('hidden');
  document.getElementById('learn-actions-result').classList.add('hidden');

  // Lösung vorbereiten (noch versteckt)
  document.getElementById('learn-content').textContent = marker.content || '(kein Inhalt)';
  const photoEl = document.getElementById('learn-photo');
  if (marker.photo) {
    photoEl.src = marker.photo;
    photoEl.classList.remove('hidden');
  } else {
    photoEl.classList.add('hidden');
  }
  const hintEl = document.getElementById('learn-hint');
  if (marker.hint) {
    hintEl.textContent = 'Merksatz: ' + marker.hint;
    hintEl.classList.remove('hidden');
  } else {
    hintEl.classList.add('hidden');
  }

  views.learn.classList.add('active');
}

function showSolution() {
  document.getElementById('learn-question').classList.add('hidden');
  document.getElementById('learn-solution').classList.remove('hidden');
  document.getElementById('learn-actions-question').classList.add('hidden');
  document.getElementById('learn-actions-result').classList.remove('hidden');
}

function closeLearn() {
  views.learn.classList.remove('active');
  currentLearnMarker = null;
}

async function recordAnswer(knew) {
  if (!currentLearnMarker) return;

  const marker = currentLearnMarker;
  if (!marker.stats) {
    marker.stats = { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null };
  }
  marker.stats.timesAsked += 1;
  if (knew) marker.stats.timesKnown += 1;
  else marker.stats.timesUnknown += 1;
  marker.stats.lastAsked = new Date().toISOString();

  await saveMarker(marker);

  // In der lokalen Liste aktualisieren
  const idx = currentMarkers.findIndex(m => m.id === marker.id);
  if (idx >= 0) currentMarkers[idx] = marker;

  closeLearn();
}

// ===== Statistik (einfach) =====
async function renderStats() {
  const rooms = await getAllRooms();
  let totalAsked = 0;
  let totalKnown = 0;
  let totalMarkers = 0;
  let withContent = 0;

  for (const room of rooms) {
    const markers = await getMarkersByRoom(room.id);
    totalMarkers += markers.length;
    for (const m of markers) {
      if (m.content && m.content.trim()) withContent++;
      if (m.stats) {
        totalAsked += m.stats.timesAsked || 0;
        totalKnown += m.stats.timesKnown || 0;
      }
    }
  }

  const rate = totalAsked > 0 ? Math.round((totalKnown / totalAsked) * 100) : 0;

  document.getElementById('stats-content').innerHTML = `
    <div style="text-align:left; margin-top:24px; line-height:1.8;">
      <p>🏠 Räume: <strong>${rooms.length}</strong></p>
      <p>📍 Merkpunkte gesamt: <strong>${totalMarkers}</strong></p>
      <p>📝 Mit Lerninhalt: <strong>${withContent}</strong></p>
      <p>🔄 Abfragen: <strong>${totalAsked}</strong></p>
      <p>✅ Gewusst: <strong>${totalKnown}</strong> (${rate} %)</p>
    </div>`;
}

// ===== Einstellungen =====
async function exportData() {
  try {
    const data = await exportAllData();
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memoryrooms-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // URL erst nach dem Klick freigeben.
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    alert('Backup wurde erstellt.');
  } catch (err) {
    console.error('Exportfehler:', err);
    alert('Backup konnte nicht erstellt werden.');
  }
}

/**
 * Backup-Datei vom Gerät auswählen und importieren.
 */
async function handleImportFile(event) {
  const file = event.target.files[0];
  event.target.value = '';

  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.app !== 'MemoryRooms' || !Array.isArray(data.rooms) || !Array.isArray(data.markers)) {
      throw new Error('Ungültiges MemoryRooms-Backup.');
    }

    const roomCount = data.rooms.length;
    const markerCount = data.markers.length;

    const confirmed = confirm(
      `Backup importieren?\n\n` +
      `${roomCount} Räume\n` +
      `${markerCount} Merkpunkte\n\n` +
      `ACHTUNG: Der aktuelle lokale Datenbestand wird durch das Backup ersetzt.`
    );

    if (!confirmed) return;

    // Zweite Sicherheitsabfrage, weil der Import vorhandene Daten ersetzt.
    const confirmedAgain = confirm(
      'Letzte Sicherheitsabfrage:\n\n' +
      'Hast du ein aktuelles Backup deiner jetzigen Daten?\n\n' +
      'OK = Backup importieren'
    );

    if (!confirmedAgain) return;

    await importAllData(data);

    currentRoomId = null;
    currentMarkers = [];
    currentLearnMarker = null;

    await ensureDemoRoom();
    await renderRoomList();
    showView('rooms');

    alert('Backup erfolgreich importiert.');
  } catch (err) {
    console.error('Importfehler:', err);
    alert('Backup konnte nicht importiert werden. Die vorhandenen Daten wurden nicht verändert.');
  }
}

async function clearData() {
  if (!confirm('Wirklich ALLE Daten unwiderruflich löschen?')) return;
  if (!confirm('Sicher? Es gibt kein Zurück.')) return;
  await clearAllData();
  currentRoomId = null;
  currentMarkers = [];
  await ensureDemoRoom();
  await renderRoomList();
  showView('rooms');
  alert('Alle Daten wurden gelöscht. Demo-Raum neu angelegt.');
}

// ===== Hilfsfunktionen =====
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
