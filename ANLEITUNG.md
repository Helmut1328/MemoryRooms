# MemoryRooms v15.2: Update-Anleitung

## Neu in v15.2
- **Antworten als Liste:** Schreib bei „Antwort / Lösung" pro Zeile einen Strich vor jeden Punkt, zum Beispiel
  `-rot`, `-grün`, `-blau` (jeweils in einer eigenen Zeile). Die App erkennt die Liste und zeigt im Editor „Liste erkannt: 3 Punkte".
- **Beim Abfragen ist die Reihenfolge egal.** Du siehst vorher „Liste mit 3 Punkten" und gibst pro Zeile einen Punkt ein (Komma oder Semikolon gehen auch).
- **Auswertung pro Punkt:** ✅ für gefunden, ❌ für nicht genannt, dazu „Zu viel genannt", wenn du etwas Falsches ergänzt hast. Kleine Tippfehler bei längeren Wörtern werden verziehen.
- **Bewertungsvorschlag:** alles richtig = „Gut", mindestens die Hälfte = „Schwer", weniger = „Nochmal".
- Gehört ein Komma zu einem Punkt (zum Beispiel `-Berlin, Hauptstadt`), gib die Punkte beim Abfragen bitte zeilenweise ein.
- Normale Antworten ohne Striche funktionieren wie bisher.

## Neu in v15.1
- **Eselsbrücke als Hinweis in Stufen:** Hat ein Lernpunkt eine Eselsbrücke, zeigt „Weiß ich nicht" zuerst nur diese. Du kannst es noch einmal versuchen (Eintippen geht weiter). Ein zweiter Klick („Lösung zeigen") deckt die Lösung auf. Ohne eingetragene Eselsbrücke geht „Weiß ich nicht" wie bisher direkt zur Lösung. Im Modus ohne Eintippen gibt es dafür ebenfalls einen Knopf „Weiß ich nicht".
- Wusstest du es erst mit Hilfe der Eselsbrücke, schlägt die App „Schwer" statt „Gut" vor. So kommt der Punkt etwas früher wieder.

## Neu in v15
**Raum gestalten (🎨 Gestalten im Raum)**
- **＋ Bild hinzufügen:** eigenes Foto oder eigene Datei, oder eine kleine Vorlage (Fenster, Tür, Bilderrahmen, Pflanze).
- **Verschieben:** Bild antippen und ziehen.
- **Größe ändern:** an einem der vier Eckpunkte ziehen, das Seitenverhältnis bleibt.
- **Zuschneiden (✂️ Zuschnitt):** Rahmen oder Ecken ziehen. Das Original bleibt erhalten, „Ganzes Bild" holt alles zurück.
- **Kopie, Vorn, Hinten, Löschen:** für mehrere gleiche Fenster und die Reihenfolge der Bilder.
- Die Bilder gehören **zu jedem Raum einzeln**, liegen unter den Merkpunkten und sind im Backup enthalten.
- **Tipp:** Ein PNG mit durchsichtigem Hintergrund (zum Beispiel ein ausgeschnittenes Fenster) sieht am besten aus. PNG-Transparenz bleibt erhalten.

**Einfache Raumvorlagen:** Küche, Schlafzimmer, Büro, Werkstatt und Garten sind jetzt schlicht gezeichnet (vorher nur ein Symbol). Neu ist die Vorlage **Leer** (nur Wand und Boden) zum komplett Selbstgestalten. Wählbar unter ✏️ Raum.

## Neu in v14.1
- **Nur nummerierte Punkte (pro Raum):** Raum öffnen → ✏️ Raum → Haken bei „Merkpunkte in diesem Raum nur als nummerierte Punkte zeigen". Dann erscheinen die Merkpunkte dieses Raums als kleine Kreise mit der Nummer der Route, ohne Titel und Foto. Jeder Raum hat seinen eigenen Schalter. Orange Kreise haben eine fällige Wiederholung. Antippen öffnet weiter das Menü mit dem Titel, Anordnen per Ziehen geht auch.

## Was ist in der ZIP?
- `index.html`: die App (v15.2)
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
