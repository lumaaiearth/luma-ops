# BIOME™ Kundenportal — Scope, Datenpakete, Sensorik-Dashboard

Stand: 2026-07-29 · Produktkonzept + Umsetzungsstand

## Die Idee in einem Satz

Der Kunde (Bezirksamt, Wohnungsbaugesellschaft, Betrieb) definiert **sein
Gebiet**, bucht dazu **Datenpakete** und **Sensorik von LUMA** — und sieht in
seinem Dashboard, was in diesem Gebiet klimatisch passiert: als Punktwolke,
Verteilung und Zeitreihe, frei einstellbar.

Der Unterschied zu jedem GIS-Viewer: Wir liefern nicht nur Karten, sondern die
Kombination aus **amtlichen Klimadaten + eigener Simulation + echter Sensorik
vor Ort + der Pflege, die daraus folgt**. Das kann sonst niemand aus einer Hand.

## 1 · Scope: „Was ist mein Gebiet?"

Drei Zuschnitte, beliebig kombinierbar:

| Ebene | Quelle | Zweck |
|---|---|---|
| **Bezirk** (12) | ALKIS-Bezirksgrenzen, amtlich | Bezirksamt sieht sein Hoheitsgebiet |
| **Ortsteil** (97) | ALKIS-Ortsteilgrenzen, amtlich | Quartiersbezogene Betrachtung |
| **Projektfläche** | eigene BIOME-Flächen | Wohnungsbau: „meine Höfe" |

✅ **umgesetzt**: Grenzen liegen als vereinfachtes GeoJSON in `public/geo/`
(`scripts/berlin-gebiete.mjs`, 112 KB für alle 109 Gebiete). Die Auswahl
filtert Sensorik und Auswertungen punktgenau (Punkt-in-Polygon).

🔜 **geplant**: Freihand-Scope (Polygon auf der Karte ziehen), Mehrfachauswahl
(„Pankow + Weißensee"), gespeicherte Scopes je Kundenkonto, Scope-Vererbung an
Unterkonten (Amt → Fachbereich).

## 2 · Datenpakete (das Buchungsmodell)

Der Scope allein zeigt, was da ist. Die **Tiefe** ist buchbar:

| Paket | Inhalt | Aktualisierung |
|---|---|---|
| **Basis** (inkl.) | Amtliche Klimaschichten im Scope: Wärmeinsel, PET, Versiegelung, Grünvolumen, Starkregen | jährlich (Datenstand der Ämter) |
| **Analyse** | Sonnenstunden-Simulation + Heatmaps je Fläche, Klima-Steckbriefe als PDF, Starkregen-Ampel je Objekt | auf Abruf, Neuberechnung bei Änderung |
| **Monitoring** | Eigene Sensorik im Gebiet, Live-Werte, Alarme, Verlauf, Gieß-Prioritäten | 5–60 min |
| **Pflege** | Verknüpfung zu Maßnahmen: Aufgaben, Einsätze, Nachweise, Fotodokumentation | laufend |

Technisch ist das kein neues System, sondern **Sichtbarkeits-Schalter auf
vorhandenen Daten** — RLS-Rollen (`kunde_viewer`) und `org_id` existieren
bereits. Ein Paket = eine Menge freigeschalteter Module + Scope.

🔜 **geplant**: `kunden_pakete`-Tabelle (org_id, scope_typ, scope_name, pakete[],
laufzeit), Preisliste, Selbstbedienungs-Buchung mit Angebots-PDF.

## 3 · Sensorik buchen

Der Kunde bucht **Messstellen**, nicht Hardware:

- **Einzelstandort**: „Bodenfeuchte in diesem Beet" — Preis je Messstelle/Jahr
  inkl. Installation, Wartung, Batteriewechsel, Datenanbindung.
- **Sensorpaket Quartier**: n Messstellen mit sinnvoller Verteilung
  (Sonnen-/Schattenlagen, versiegelt/unversiegelt, Baumscheiben) — die Verteilung
  schlägt BIOME auf Basis der Heatmap und der Versiegelungsdaten selbst vor.
- **Referenzstation**: Luft-/Bodentemperatur + Niederschlag als Gebietsreferenz.

Jede Messstelle ist in BIOME ein Punkt mit GPS (existiert), hängt am Projekt
und liefert in `sensor_readings` ihre Zeitreihe (existiert).

🔜 **geplant**: Bestellstrecke „Sensor hier setzen" direkt aus der Karte,
Statusverfolgung (bestellt → installiert → aktiv), Wartungsintervalle als
wiederkehrende Aufgabe (Mechanik existiert bereits).

## 4 · Das Dashboard (umgesetzt: `/klima`)

```
┌────────────────────────────────────────────────────────────┐
│ BIOME™ · KLIMA-DASHBOARD                                   │
│ Pankow                          [Alles|Bezirk|Ortsteil|…]  │
│ [💧Bodenfeuchte][🌡Bodentemp][🌤Lufttemp][🌧Regen]  24h·7T·30T·12M │
├────────────────────────────────────────────────────────────┤
│ Sensoren  │ Ø Wert   │ Kritisch │ Warnung │ Messpunkte     │
├───────────────────────────────┬────────────────────────────┤
│  Punktwolke + IDW-Fläche      │  Verteilung (Histogramm)   │
│  Farbe = Messwert             │  Wie viele Messstellen     │
│  Größe = Abweichung           │  liegen in welchem Bereich │
├───────────────────────────────┴────────────────────────────┤
│  Verlauf: Mittelwert + Spannband (min–max aller Sensoren)  │
├────────────────────────────────────────────────────────────┤
│  Messstellen-Kacheln mit aktuellem Wert                    │
└────────────────────────────────────────────────────────────┘
```

**Was bereits funktioniert:**
- Scope-Auswahl über amtliche Bezirks-/Ortsteilgrenzen oder Projektflächen
- Punktwolke: jeder Sensor als farbcodierter Punkt (Farbskala je Messgröße:
  trocken→nass bzw. kalt→heiß), Größe zeigt die Abweichung, Tooltip mit Wert
- Verteilungs-Histogramm über alle Messstellen im Gebiet
- Zeitverlauf mit **Spannband**: nicht nur der Mittelwert, sondern die Streuung
  zwischen der trockensten und der feuchtesten Messstelle — genau das macht
  Handlungsbedarf sichtbar
- Zeithorizont 24 h / 7 Tage / 30 Tage / 12 Monate mit passender Verdichtung
- Kennzahlen: Anzahl Messstellen, Mittelwert, kritische/warnende Stellen

**Inzwischen ebenfalls umgesetzt:**
1. ✅ **Gebiets-Klimaprofil** im Kopf: PET, Versiegelung, Grünvolumen als
   Gebietsmittel aus einer Stichprobe über das Gebiet (`fetchGebietsProfil`).
   Wichtig für die Belastbarkeit: statt eines widersprüchlichen „häufigsten
   Labels" wird der **Anteil belasteter Punkte** (PET ≥ 35) ausgewiesen.
2. ✅ **Sensor-Cluster** nach Standortcharakter (versiegelt ≥ 50 % /
   gemischt ≥ 25 % / grün), Vergleich der Cluster im selben Diagramm
3. ✅ **Interpolationsfläche** (IDW) über die Messpunkte, zuschaltbar; auf die
   Gebietsgrenze maskiert, ohne Messpunkt in Reichweite bleibt die Karte frei.
   Ab drei Messpunkten wählbar, mit ausgewiesener Reichweite — die Schätzung
   ist als Schätzung gekennzeichnet.
4. ✅ **CSV-Export** der Rohmesswerte inkl. Standortcharakter (für GIS-/
   Fachabteilungen) und Druckansicht des Dashboards
5. ✅ **Alarm-Regeln** je Sensor: Warn-/Kritisch-Schwelle nach unten **und**
   oben, Hysterese gegen Flattern, Ruhezeit, Ziel-Gruppe in Telegram, Aufgabe
   im wählbaren Bereich (`lib/sensorAlarm.js`, Sensor-Detailseite)

🔜 **als Nächstes:**
1. **PDF-Bericht je Zeitraum** (heute Browser-Druck) mit Kartenausschnitt —
   die Kachel-Komposition dafür steht bereits (`lib/mapSnapshot.js`)
2. **Vergleich**: zwei Gebiete oder zwei Zeiträume nebeneinander
3. **Alarmregeln auf Kunden-/Projektebene** statt nur je Sensor (Vorlage, die
   für alle Sensoren eines Projekts gilt)
4. **Gieß-Prioritätenliste** an Hitzetagen aus Sensorlage + DWD-Vorhersage

## 5 · Warum das verkäuflich ist

- **Nachweispflicht**: Ämter müssen Klimaanpassung dokumentieren — das Dashboard
  liefert die Belege automatisch statt in Excel.
- **Gießen ist teuer**: Bodenfeuchte-Monitoring spart Fahrten; die Spannbreite
  im Verlauf zeigt sofort, welche Standorte wirklich Wasser brauchen.
- **Kein Vendor-Lock bei den Fachdaten**: Alles Amtliche bleibt offen
  zugänglich — bezahlt wird die Aufbereitung, Simulation, Sensorik und Pflege.
- **Der Weg von der Zahl zur Maßnahme** ist im selben System: Messwert →
  Aufgabe → Einsatz → Nachweis mit Fotos.
