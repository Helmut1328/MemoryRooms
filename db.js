/**
 * MemoryRooms – IndexedDB Datenverwaltung
 * Speichert alles lokal: Räume, Merkpunkte, Fotos (Base64), Lernfortschritt
 */

const DB_NAME = 'MemoryRoomsDB';
// Datenbank-Version. Beim Erhöhen wird onupgradeneeded ausgeführt.
// Bestehende Daten bleiben erhalten, solange wir Stores nicht löschen.
const DB_VERSION = 2;
const STORE_ROOMS = 'rooms';
const STORE_MARKERS = 'markers';

let db = null;

/**
 * Datenbank öffnen / initialisieren
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Räume speichern
      if (!database.objectStoreNames.contains(STORE_ROOMS)) {
        const roomStore = database.createObjectStore(STORE_ROOMS, { keyPath: 'id' });
        roomStore.createIndex('name', 'name', { unique: false });
      }

      // Merkpunkte speichern
      if (!database.objectStoreNames.contains(STORE_MARKERS)) {
        const markerStore = database.createObjectStore(STORE_MARKERS, { keyPath: 'id' });
        markerStore.createIndex('roomId', 'roomId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Fehler:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Alle Räume laden
 */
async function getAllRooms() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_ROOMS, 'readonly');
    const store = tx.objectStore(STORE_ROOMS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Einen Raum speichern (neu oder aktualisieren)
 */
async function saveRoom(room) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_ROOMS, 'readwrite');
    const store = tx.objectStore(STORE_ROOMS);
    const request = store.put(room);
    request.onsuccess = () => resolve(room);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Raum löschen (inkl. aller Merkpunkte)
 */
async function deleteRoom(roomId) {
  const database = await openDB();
  // Zuerst Merkpunkte des Raums löschen
  const markers = await getMarkersByRoom(roomId);
  for (const m of markers) {
    await deleteMarker(m.id);
  }
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_ROOMS, 'readwrite');
    const store = tx.objectStore(STORE_ROOMS);
    const request = store.delete(roomId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Alle Merkpunkte eines Raums laden
 */
async function getMarkersByRoom(roomId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MARKERS, 'readonly');
    const store = tx.objectStore(STORE_MARKERS);
    const index = store.index('roomId');
    const request = index.getAll(roomId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Einen Merkpunkt speichern
 */
async function saveMarker(marker) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MARKERS, 'readwrite');
    const store = tx.objectStore(STORE_MARKERS);
    const request = store.put(marker);
    request.onsuccess = () => resolve(marker);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Merkpunkt löschen
 */
async function deleteMarker(markerId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MARKERS, 'readwrite');
    const store = tx.objectStore(STORE_MARKERS);
    const request = store.delete(markerId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Einzelnen Merkpunkt laden
 */
async function getMarker(markerId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MARKERS, 'readonly');
    const store = tx.objectStore(STORE_MARKERS);
    const request = store.get(markerId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Alle Daten löschen (für Einstellungen)
 */
async function clearAllData() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_ROOMS, STORE_MARKERS], 'readwrite');
    tx.objectStore(STORE_ROOMS).clear();
    tx.objectStore(STORE_MARKERS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Alle Daten als JSON exportieren
 */
async function exportAllData() {
  const rooms = await getAllRooms();
  const allMarkers = [];
  for (const room of rooms) {
    const markers = await getMarkersByRoom(room.id);
    allMarkers.push(...markers);
  }

  // Backup-Format versionieren, damit spätere App-Versionen
  // das Format erkennen und bei Bedarf migrieren können.
  return {
    backupVersion: 1,
    app: 'MemoryRooms',
    exportedAt: new Date().toISOString(),
    rooms,
    markers: allMarkers
  };
}

/**
 * Backup importieren.
 * Vor dem Überschreiben muss die aufrufende Funktion bestätigen.
 */
async function importAllData(data) {
  if (!data || data.app !== 'MemoryRooms') {
    throw new Error('Ungültiges MemoryRooms-Backup.');
  }

  if (!Array.isArray(data.rooms) || !Array.isArray(data.markers)) {
    throw new Error('Das Backup enthält keine gültigen Daten.');
  }

  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(
      [STORE_ROOMS, STORE_MARKERS],
      'readwrite'
    );

    const roomStore = tx.objectStore(STORE_ROOMS);
    const markerStore = tx.objectStore(STORE_MARKERS);

    // Erst den aktuellen Datenbestand ersetzen.
    roomStore.clear();
    markerStore.clear();

    for (const room of data.rooms) {
      if (!room || typeof room.id !== 'string' || typeof room.name !== 'string') {
        tx.abort();
        reject(new Error('Ungültiger Raum im Backup.'));
        return;
      }
      roomStore.put(room);
    }

    const roomIds = new Set(data.rooms.map(room => room.id));

    for (const marker of data.markers) {
      if (
        !marker ||
        typeof marker.id !== 'string' ||
        typeof marker.roomId !== 'string' ||
        !roomIds.has(marker.roomId)
      ) {
        tx.abort();
        reject(new Error('Ungültiger Merkpunkt im Backup.'));
        return;
      }
      markerStore.put(marker);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Import fehlgeschlagen.'));
    tx.onabort = () => reject(tx.error || new Error('Import abgebrochen.'));
  });
}

/**
 * Hilfsfunktion: eindeutige ID erzeugen
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
