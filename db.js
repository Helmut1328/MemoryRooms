/**
 * MemoryRooms – IndexedDB Datenverwaltung
 * Version 2: Räume, Merkpunkte mit Unterpunkten (Lernpunkte), Quiz-Daten, Fortschritt
 * Abwärtskompatibel zu Version-1-Daten und alten Backups
 */

const DB_NAME = 'MemoryRoomsDB';
const DB_VERSION = 3;
const STORE_ROOMS = 'rooms';
const STORE_MARKERS = 'markers';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      const transaction = event.target.transaction;
      const oldVersion = event.oldVersion || 0;

      if (!database.objectStoreNames.contains(STORE_ROOMS)) {
        const roomStore = database.createObjectStore(STORE_ROOMS, { keyPath: 'id' });
        roomStore.createIndex('name', 'name', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORE_MARKERS)) {
        const markerStore = database.createObjectStore(STORE_MARKERS, { keyPath: 'id' });
        markerStore.createIndex('roomId', 'roomId', { unique: false });
      }

      // Version 3: vorhandene Marker werden einmalig auf das neue
      // Lernpunkte-Schema normalisiert. Es wird nichts gelöscht.
      if (oldVersion < 3 && database.objectStoreNames.contains(STORE_MARKERS)) {
        const markerStore = transaction.objectStore(STORE_MARKERS);
        const cursorRequest = markerStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          const migrated = migrateMarker(cursor.value);
          cursor.update(migrated);
          cursor.continue();
        };
      }
    };

    request.onblocked = () => {
      console.warn('MemoryRoomsDB Upgrade wartet auf einen anderen offenen Tab.');
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      db.onversionchange = () => {
        db.close();
        db = null;
      };
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Fehler:', event.target.error);
      reject(event.target.error);
    };
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createEmptyItem(overrides) {
  return Object.assign({
    id: generateId(),
    title: '',
    question: '',
    answer: '',
    hint: '',
    photo: null,
    useInQuiz: true,
    wrongAnswers: ['', '', ''],
    stats: {
      attempts: 0,
      correct: 0,
      incorrect: 0,
      lastReviewed: null,
      mastery: 0
    }
  }, overrides || {});
}

/**
 * Migriert alten Merkpunkt (nur content) zu items[]
 */
function migrateMarker(marker) {
  if (!marker) return marker;
  const m = Object.assign({}, marker);

  if (!Array.isArray(m.items)) m.items = [];

  if (m.items.length === 0 && m.content && String(m.content).trim()) {
    m.items.push(createEmptyItem({
      title: 'Lernpunkt 1',
      question: 'Was hast du zu diesem Merkpunkt gespeichert?',
      answer: String(m.content).trim(),
      hint: m.hint || '',
      photo: m.photo || null,
      useInQuiz: false,
      wrongAnswers: ['', '', ''],
      stats: {
        attempts: (m.stats && m.stats.timesAsked) || 0,
        correct: (m.stats && m.stats.timesKnown) || 0,
        incorrect: (m.stats && m.stats.timesUnknown) || 0,
        lastReviewed: (m.stats && m.stats.lastAsked) || null,
        mastery: 0
      }
    }));
  }

  if (m.description == null) m.description = '';

  if (!m.stats) {
    m.stats = { timesAsked: 0, timesKnown: 0, timesUnknown: 0, lastAsked: null };
  }

  m.items = m.items.map(function (item) {
    const it = Object.assign({}, item);
    if (!it.id) it.id = generateId();
    if (!it.stats) {
      it.stats = { attempts: 0, correct: 0, incorrect: 0, lastReviewed: null, mastery: 0 };
    }
    if (!Array.isArray(it.wrongAnswers)) it.wrongAnswers = ['', '', ''];
    while (it.wrongAnswers.length < 3) it.wrongAnswers.push('');
    if (typeof it.useInQuiz !== 'boolean') it.useInQuiz = true;
    return it;
  });

  return m;
}

function markerHasContent(marker) {
  if (!marker) return false;
  if (marker.items && marker.items.some(function (i) {
    return (i.answer && i.answer.trim()) || (i.question && i.question.trim());
  })) return true;
  return !!(marker.content && String(marker.content).trim());
}

function countItems(marker) {
  if (!marker || !marker.items) return 0;
  return marker.items.length;
}

function countMasteredItems(marker) {
  if (!marker || !marker.items) return 0;
  return marker.items.filter(function (i) {
    return i.stats && i.stats.mastery >= 2;
  }).length;
}

function itemProgressPercent(marker) {
  const total = countItems(marker);
  if (total === 0) return 0;
  return Math.round((countMasteredItems(marker) / total) * 100);
}

async function getAllRooms() {
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_ROOMS, 'readonly');
    const request = tx.objectStore(STORE_ROOMS).getAll();
    request.onsuccess = function () { resolve(request.result || []); };
    request.onerror = function () { reject(request.error); };
  });
}

async function saveRoom(room) {
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_ROOMS, 'readwrite');
    const request = tx.objectStore(STORE_ROOMS).put(room);
    request.onsuccess = function () { resolve(room); };
    request.onerror = function () { reject(request.error); };
  });
}

async function deleteRoom(roomId) {
  const markers = await getMarkersByRoom(roomId);
  for (let i = 0; i < markers.length; i++) {
    await deleteMarker(markers[i].id);
  }
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_ROOMS, 'readwrite');
    const request = tx.objectStore(STORE_ROOMS).delete(roomId);
    request.onsuccess = function () { resolve(); };
    request.onerror = function () { reject(request.error); };
  });
}

async function getMarkersByRoom(roomId) {
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_MARKERS, 'readonly');
    const index = tx.objectStore(STORE_MARKERS).index('roomId');
    const request = index.getAll(roomId);
    request.onsuccess = function () {
      resolve((request.result || []).map(migrateMarker));
    };
    request.onerror = function () { reject(request.error); };
  });
}

async function getMarker(markerId) {
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_MARKERS, 'readonly');
    const request = tx.objectStore(STORE_MARKERS).get(markerId);
    request.onsuccess = function () {
      resolve(request.result ? migrateMarker(request.result) : null);
    };
    request.onerror = function () { reject(request.error); };
  });
}

async function saveMarker(marker) {
  const database = await openDB();
  const toSave = migrateMarker(marker);
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_MARKERS, 'readwrite');
    const request = tx.objectStore(STORE_MARKERS).put(toSave);
    request.onsuccess = function () { resolve(toSave); };
    request.onerror = function () { reject(request.error); };
  });
}

async function deleteMarker(markerId) {
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_MARKERS, 'readwrite');
    const request = tx.objectStore(STORE_MARKERS).delete(markerId);
    request.onsuccess = function () { resolve(); };
    request.onerror = function () { reject(request.error); };
  });
}

async function getAllMarkers() {
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction(STORE_MARKERS, 'readonly');
    const request = tx.objectStore(STORE_MARKERS).getAll();
    request.onsuccess = function () {
      resolve((request.result || []).map(migrateMarker));
    };
    request.onerror = function () { reject(request.error); };
  });
}

async function exportAllData() {
  const rooms = await getAllRooms();
  const markers = await getAllMarkers();
  return {
    app: 'MemoryRooms',
    backupVersion: 3,
    dbVersion: DB_VERSION,
    rooms: rooms,
    markers: markers,
    settings: (typeof appSettings !== 'undefined' ? appSettings : null),
    exportedAt: new Date().toISOString()
  };
}

function validateBackup(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Ungültiges Backup-Format');
  }
  if (data.app && data.app !== 'MemoryRooms') {
    throw new Error('Dieses Backup gehört nicht zu MemoryRooms');
  }
  if (!Array.isArray(data.rooms) || !Array.isArray(data.markers)) {
    throw new Error('Backup enthält keine gültigen Räume und Merkpunkte');
  }

  const roomIds = new Set();
  data.rooms.forEach((room) => {
    if (!room || !room.id) throw new Error('Backup enthält einen ungültigen Raum');
    roomIds.add(room.id);
  });

  data.markers.forEach((marker) => {
    if (!marker || !marker.id || !marker.roomId) {
      throw new Error('Backup enthält einen ungültigen Merkpunkt');
    }
    if (!roomIds.has(marker.roomId)) {
      throw new Error('Backup enthält einen Merkpunkt ohne zugehörigen Raum');
    }
  });
}

/**
 * Stellt ein Backup vollständig wieder her.
 * Die beiden Stores werden innerhalb EINER IndexedDB-Transaktion geleert
 * und anschließend mit den Backup-Daten gefüllt. Bei einem Fehler rollt
 * die Transaktion zurück – dadurch bleibt der bisherige Datenbestand erhalten.
 * Unterstützt auch ältere Backups ohne app/backupVersion-Felder.
 */
async function restoreAllData(data) {
  validateBackup(data);
  const database = await openDB();

  return new Promise(function (resolve, reject) {
    const tx = database.transaction([STORE_ROOMS, STORE_MARKERS], 'readwrite');
    const roomStore = tx.objectStore(STORE_ROOMS);
    const markerStore = tx.objectStore(STORE_MARKERS);

    roomStore.clear();
    markerStore.clear();

    data.rooms.forEach(function (room) {
      roomStore.put(room);
    });
    data.markers.forEach(function (marker) {
      markerStore.put(migrateMarker(marker));
    });

    tx.oncomplete = function () {
      resolve({ rooms: data.rooms.length, markers: data.markers.length });
    };
    tx.onerror = function () { reject(tx.error || new Error('Backup konnte nicht wiederhergestellt werden')); };
    tx.onabort = function () { reject(tx.error || new Error('Backup-Wiederherstellung abgebrochen')); };
  });
}

/**
 * Optional: Backup zu den vorhandenen Daten hinzufügen/zusammenführen.
 * Wird aktuell von der Oberfläche nicht verwendet, bleibt aber als sichere
 * API für spätere Funktionen erhalten.
 */
async function mergeAllData(data) {
  validateBackup(data);
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction([STORE_ROOMS, STORE_MARKERS], 'readwrite');
    const roomStore = tx.objectStore(STORE_ROOMS);
    const markerStore = tx.objectStore(STORE_MARKERS);
    data.rooms.forEach(function (room) { roomStore.put(room); });
    data.markers.forEach(function (marker) { markerStore.put(migrateMarker(marker)); });
    tx.oncomplete = function () {
      resolve({ rooms: data.rooms.length, markers: data.markers.length });
    };
    tx.onerror = function () { reject(tx.error || new Error('Backup konnte nicht hinzugefügt werden')); };
    tx.onabort = function () { reject(tx.error || new Error('Backup-Zusammenführung abgebrochen')); };
  });
}

// Kompatibilitätsname für ältere Aufrufer. Import bedeutet jetzt bewusst
// vollständige Wiederherstellung statt stilles Zusammenführen.
async function importAllData(data) {
  return restoreAllData(data);
}

async function clearAllData() {
  const database = await openDB();
  return new Promise(function (resolve, reject) {
    const tx = database.transaction([STORE_ROOMS, STORE_MARKERS], 'readwrite');
    tx.objectStore(STORE_ROOMS).clear();
    tx.objectStore(STORE_MARKERS).clear();
    tx.oncomplete = function () { resolve(); };
    tx.onerror = function () { reject(tx.error); };
  });
}
