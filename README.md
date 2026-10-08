# MemoryRooms

Einfache, moderne Lern-Web-App nach dem **Loci-Prinzip** (Methode der Orte / Memory Palace).

Verbinde Lerninhalte mit festen Orten und Gegenständen in virtuellen Räumen – und merke dir Informationen besser.

## Features (MVP)

- Virtuelle Räume (z. B. Wohnzimmer) mit illustrativer 2D-Darstellung
- Interaktive, verschiebbare Merkpunkte
- Lerninhalte + optionaler Merksatz + eigenes Foto
- Lernmodus: „Was hast du hier gespeichert?“ → Lösung → Gewusst / Nicht gewusst
- Alles lokal in **IndexedDB** (keine Cloud, keine KI)
- Mobile-First (iPhone-tauglich)

## Technologie

- HTML, CSS, JavaScript (kein Framework)
- IndexedDB für lokale Speicherung

## Starten

1. Repository klonen oder Dateien herunterladen
2. `index.html` im Browser öffnen  
   (am besten Chrome oder Safari, Mobile-Ansicht in den DevTools testen)

Oder lokal mit einem einfachen Server:

```bash
npx serve .
# oder
python3 -m http.server 8000
```

## Nutzung

1. App öffnen → Raum „Wohnzimmer“ wählen
2. Merkpunkt antippen → Lerninhalt (+ optional Foto) eingeben → Speichern
3. Später erneut antippen → nachdenken → „Lösung anzeigen“ → Gewusst / Nicht gewusst
4. Merkpunkte per Finger/Maus verschieben – Position wird gespeichert

## Nächste Schritte (geplant)

- PWA (Home-Bildschirm auf dem iPhone)
- Weitere Räume & bessere Hintergründe
- Lernmodus „alle Merkpunkte nacheinander“
- Erweiterte Statistik

## Lizenz

Privat / frei verwendbar für eigene Zwecke.
