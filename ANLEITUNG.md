# MemoryRooms v14: Update-Anleitung

## Was ist in der ZIP?
- `index.html`: die App (v14)
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`: damit läuft sie als richtige App auf dem Home-Bildschirm und auch offline

**Nicht enthalten:** `room-livingroom.jpg`. Die Datei liegt schon in deinem GitHub-Repository und bleibt dort einfach liegen. Fehlt sie, zeigt die App automatisch ein Ersatzbild.

## Auf GitHub Pages hochladen
1. Repository `MemoryRooms` auf github.com öffnen.
2. **Add file → Upload files**, alle Dateien aus der ZIP hineinziehen (`index.html` wird ersetzt).
3. **Commit changes** drücken.
4. 1 bis 2 Minuten warten, dann die Seite öffnen. Auf dem iPhone die Seite einmal komplett neu laden (oder die App vom Home-Bildschirm schließen und neu öffnen).

Deine bisherigen Daten (Räume, Merkpunkte, Fortschritt) bleiben erhalten, sie liegen im Browser-Speicher. **Mach trotzdem vorher ein Backup** (Einstellungen → Backup exportieren).

## iPhone: als App installieren
Safari → Teilen-Symbol → **Zum Home-Bildschirm**. Dann ist der Speicher am sichersten.

## Was ist neu in v14?
**Fehler behoben**
- „Neuen Raum erstellen" funktioniert jetzt.
- Merkpunkte lassen sich per Ziehen platzieren (Raum → 📍 Anordnen) und in der Route umsortieren (Feld „Position in der Route").
- Der Tipp-Modus gilt jetzt für alle Räume (früher war er nie aktiv).
- „Abbrechen" ist auch nach dem Aufdecken der Lösung erreichbar.
- Fotos von Lernpunkten können neben dem Merkpunkt im Raum angezeigt werden.

**Lernen nach Lernforschung**
- **Erst abrufen, dann aufdecken:** Antwort eintippen (oder „Weiß ich nicht"). In den Einstellungen abschaltbar.
- **Wiederholung in wachsenden Abständen** (1, 3, 7, 14, 30, 60 Tage), bewertet mit Nochmal / Schwer / Gut / Leicht. Die App zeigt vorher, wann der Punkt wiederkommt.
- **Heute dran:** Auf der Startseite siehst du, was fällig ist, raumübergreifend und gemischt (max. 30 pro Runde).
- **🔀 Fällige üben:** dasselbe nur für den aktuellen Raum.
- **🧭 Raum im Kopf:** vorwärts, rückwärts oder zufällig durch die Orte gehen, erst aufschreiben, dann vergleichen.
- Mit „Nochmal" bewertete Punkte kommen in derselben Runde noch einmal.
- **Statistik:** fällige Punkte, Trefferquote, Tage in Folge, schwächste Lernpunkte, Fortschritt pro Raum.
- **Backup-Erinnerung** nach 14 Tagen und Anfrage auf dauerhaften Speicher.

## Hinweis zu alten Fortschrittsdaten
Lernpunkte, die du in v13 schon geübt hast, gelten in v14 als sofort fällig und werden neu eingeordnet. Das ist gewollt, so startet der neue Wiederholungsplan sauber.
