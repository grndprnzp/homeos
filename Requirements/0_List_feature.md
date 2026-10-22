# Übersicht

Das Listenfeature ist ein zentraler um gemeinsam an unterschiedlichen Listen zu arbeiten.
Das besondere an HouseOS Listen ist, dass die Einträge einer Liste typisiert werden können (ähnlich wie in einer Datenbank) oder lediglich einfache Felder verwendet werden können.


## Listen Definition
Wir unterscheiden 2 Arten von Listen:

1. Listen mit gemischten Datentypen
2. Listen mit fixen Datentypen



## Gemischte Listen
Listen mit gemischten Datentypen können beliebige Datentypen aufnehmen. Dies ist ideal für einfache Listen, die schnell erstellt und bearbeitet werden können und keine Statistiken über einzelne Felder des Datentyps benötigen.

## Listen mit fixen Datentypen
Listen mit fixen Datentypen können nur bestimmte Datentypen aufnehmen. Dies ist ideal für Listen, die strukturiert sind und Statistiken über einzelne Felder des Datentyps benötigen.

## Typ Definitionen
Alle Datentypen teilen sich gewisse Eigenschaften:
- Datum der Erstellung
- Name des Erstellers
- Name der zuständigen Person (optional, wenn die darauf basierende Liste mit anderen geteilt wird).
- Eindeutige ID

Weiterhin kann ein User weitere felder und Labels hinzufügen:
- Einfaches Textfeld (optional Autovervollständigung basierend auf existierende Einträge einer verwendeted Liste)
- Nummerisches Feld 
- Datum
- Uhrzeit
- Datum und Uhrzeit
- Checkbox
- Auswahl (Text)
- Auswahl (Numerisch)
- Ausblenden: Toggled die Sichtbarkeit des Eintrags in der Listenansicht (z.B. für Einkaufs- und ToDo Listen);
- Bilder: ein oder mehrere Bilder hochladen

Die einmal definierten Datentypen werden als Vorlage für den aktuellen Benutzer gespeichert und können bei Bedarf für zukünftige Listen wiederverwendet werden.

## Listendefinition
Bei Anlage einer neuen Liste muss der User zunächst entscheiden, ob es sich um eine gemischte Liste oder um eine Liste mit fixen Datentypen handelt.
Die Liste erhält weiterhin eine Beschreibung sowie Tags und eine Kategorie.

Wenn es sich um eine Liste mit fixem Datentyp handelt, muss er aus den bestehenden Datentypen auswählen oder einen neuen Datentyp erstellen.

### Statistik konfigurieren (optional)
Der User kann für jede Liste Statistiken festlegen, welche jeweils aus einem Wertfeld, einer Aggregation sowie einer optionalen Dimemsion zusammensetzt.

Beispiel der Liste: 
|Datum| Buchtitel | Zuletzt gelesene Seite|
|---|---|---|
|2026-10-15| Der Prozess der Softwareentwicklung | 123 |
|2026-10-16| Der Prozess der Softwareentwicklung | 150 |
|2026-10-18| Faust | 120 |
|2026-10-19| Faust | 150 |

In diesem Fall hätte man 2 Statistiken:
- "Anzahl gelesener Seiten" (Summe) und "Anzahl gelesener Seiten pro Buch" (Summe)
- Dies kann um die Dimension "Datum" erweitert werden, sodass man Statistiken pro Tag erhält
- Dies kann um die Dimension "Datum" und "Buchtitel" erweitert werden, sodass man Statistiken pro Tag und Buch erhält
- Dies kann um die Dimension "Datum", "Buchtitel" und "zuletzt gelesene Seite" erweitert werden, sodass man Statistiken pro Tag, Buch und zuletzt gelesener Seite erhält


## Features

* Listen erstellen
* Listen strukturieren (Datentypen, Kategorien, Tags)
* Listen mit Statistiken auswerten
* Listen mit anderen teilen und gemeinsam ausfüllen


# Technische Umsetzung
Die werden in googles Firestore gespeichert. Zugehörige Anhänge werden firebase storage gespeichert und auf firebase functions verwaltet.

## Ui
Die vorhanden Ui Anwendung wird mittels Angular entwickelt. Es dürfen nur standardkomponenten (angular material) verwendet werden. Die Ui muss auf mobilen Geräten bedienbar sein.


## Out of Scope
Das Teilen von Listen ist nicht Teil dieses Requirements.