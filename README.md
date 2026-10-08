# MemoryRooms v8

MemoryRooms ist eine lokale Lern-Web-App nach dem Loci-/Memory-Palace-Prinzip.

## v8
- Sichere Raumverwaltung: Räume können über ⋯ gelöscht werden; der letzte Raum bleibt erhalten.
- Globale Lernabfrage-Einstellungen:
  - Alle Lernpunkte / nur fürs Quiz freigegebene / nur zu wiederholende
  - 5 / 10 / 20 / alle Lernpunkte
  - aktueller Raum / alle Räume
  - zufällige Reihenfolge an/aus
- Die Schaltfläche **Lernen** startet eine Lernrunde nach diesen Einstellungen.
- Einstellungen werden lokal gespeichert und in Backups mitgesichert.
- Bestehende IndexedDB-Daten bleiben erhalten; DB-Version bleibt 3.
- Keine KI, keine Cloud-Datenbank.

## Dateien
- `index.html` – Oberfläche
- `styles.css` – Design / Responsive Layout
- `app.js` – Lernlogik, Einstellungen, Raumverwaltung
- `db.js` – IndexedDB und Backup
- `room-livingroom.jpg` – fotorealistischer Raumhintergrund

Vor einem größeren Update: in der App zuerst ein Backup exportieren.
