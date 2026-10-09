# MemoryRooms v15.2 (modular)

Dein virtueller Gedächtnisraum – Methode der Loci + Spaced Repetition.

**Keine KI, keine Cloud, keine externe API.** Alle Daten bleiben lokal im Browser (IndexedDB).

## Dateistruktur

```
MemoryRooms/   (alles flach, ohne Unterordner)
├── index.html
├── styles.css
├── db.js          # IndexedDB + Datenmodell
├── spaced.js      # Wiederholungsplan + Listen-Auswertung
├── app.js         # UI, Lernen, Räume, Events
├── sw.js
├── manifest.webmanifest
├── icon-192.png / icon-512.png
└── room-livingroom.jpg
```

## Änderungen gegenüber dem Ein-Datei-Build

- Code in logische Module aufgeteilt (db / spaced / app)
- CSS ausgelagert
- Optionaler Schalter „Anonyme Nutzungsstatistik“ (standardmäßig aus)
- Service Worker cacht alle Modul-Dateien

## Deployment (GitHub Pages)

1. Alle Dateien in dein Repository `MemoryRooms` legen (Ordnerstruktur beibehalten).
2. GitHub Pages auf den `main`-Branch / Root einstellen.
3. Nach 1–2 Minuten: https://helmut1328.github.io/MemoryRooms/

**Wichtig:** Bestehende Nutzerdaten bleiben erhalten (gleiche IndexedDB). Trotzdem vorher Backup exportieren.

## iPhone als App

Safari → Teilen → **Zum Home-Bildschirm**.

## Analytics (optional)

In `js/app.js` die auskommentierte `fetch`-URL in `sendAnonymousPing()` durch deinen eigenen Endpoint ersetzen (z. B. Cloudflare Worker). Der Schalter in den Einstellungen steuert, ob gesendet wird.

## Lizenz / Hinweis

Basierend auf MemoryRooms von Helmut1328. Modularisierung und Analytics-Hook hinzugefügt.
