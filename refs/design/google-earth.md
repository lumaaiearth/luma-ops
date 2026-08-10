# Gestaltungsregister — Google Earth (Vorbild für das BIOME-Interface)

> Stand: 2026-08-10. Nur Quellen, die im Container tatsächlich abgerufen wurden.
> Regel wie in `refs/standards/`: Was hier nicht wörtlich belegt ist, gilt als
> **nicht dokumentiert** und darf im Redesign nicht als „so macht es Google Earth"
> begründet werden.
>
> **Abrufhinweis für Nachprüfungen:** Kein Browser verfügbar. Alle Abrufe mit
> `curl -sL --cacert /root/.ccr/ca-bundle.crt "<URL>"`. Die Seiten von
> `developers.google.com`, `developer.android.com`, `support.google.com` und
> `raw.githubusercontent.com` sind serverseitig gerendert und per `curl`
> vollständig lesbar. `m3.material.io` und `m2.material.io` sind **nicht**
> lesbar (siehe Abschnitt „Nicht zugänglich").
>
> Textextraktion aus dem `<article>`-Element; Zitate wurden anschließend gegen
> das Roh-HTML gegengeprüft.

---

## Vorbemerkung: Es gibt zwei Google Earth, mit zwei Vokabularen

Das ist die wichtigste Einzelerkenntnis dieser Recherche, und sie wird beim
Nachschlagen leicht übersehen:

| | **Google Earth** (aktuell, Web/Android/iOS) | **Google Earth Pro für Desktop** (Altprodukt) |
|---|---|---|
| Dokumentation | `developers.google.com/maps/documentation/earth/…` | `support.google.com/earth/answer/…` |
| Kartenfenster | *Map* / Globus | *3D viewer* / „3D-Viewer" |
| Datenliste links | *Map contents panel* / „Bereich Karteninhalt" | *Places panel* / „Bereich Orte" |
| Ebenenliste | *Layers panel* (Legende), *data catalog* | *Layers panel* / „Ebenen" |
| Objektinfo | *Knowledge card* / „Wissenskarte", *Inspector* | *Balloon* (nur in der KML-Referenz benannt) |
| Zeit | *Historical imagery* + *Timelapse*, „Zeitachse" | *Time slider* / „Zeitschieberegler" |

**Diese beiden Wortschätze dürfen nicht vermischt werden.** Wer „Ebenen-Panel"
gegen „Orte-Panel" abgrenzen will, argumentiert mit Earth Pro Desktop; wer von
„Knowledge Card" und „Inspector" spricht, argumentiert mit dem aktuellen Earth.
Der Aufbau der beiden Produkte ist **nicht** derselbe.

Der alte Nutzerleitfaden `earth.google.com/userguide/v4/` existiert nicht mehr
als eigenständiges Dokument — er leitet auf `support.google.com` um (siehe
„Nicht zugänglich"). Die dort früher dokumentierten Bezeichnungen
(„Sidebar", „Status bar", „Overview Map", „Toolbar" als benannte Fensterteile
mit Nummerierung) sind damit **nicht mehr belegbar**.

---

## A · Aktuelles Google Earth (Web) — Fensteraufbau

### GE-01 · Menüleiste — die vollständige, dokumentierte Gliederung der Funktionen
- **Herausgeber:** Google — Google Maps Platform, Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/quickstart · deutsch: https://developers.google.com/maps/documentation/earth/quickstart?hl=de
- **Abgerufen:** 2026-08-10 (HTTP 200, 192 124 Bytes / HTTP 200, 196 859 Bytes)
- **Wörtlich (EN):**
  „You can find most of Google Earth's existing features at the top menu bar. You can reach the Google Earth menu bar by clicking Explore Earth from the initial home screen."
- **Wörtlich (DE):**
  „In der oberen Menüleiste finden Sie die meisten Google Earth-Funktionen. Sie können auf dem Startbildschirm auf Earth erkunden klicken, um zur Menüleiste von Google Earth zu gelangen."
- **Wörtlich — die sechs Menüs und ihr Inhalt (EN, gekürzt auf die Einträge):**
  - **File:** „View all projects", „New project", „Import file to project", „Open My Maps from Drive", „New local KML file", „Open local KMZ file", „Export as KML file", „Delete"
  - **Edit:** „Copy", „Paste"
  - **View:** „Start slideshow", „Show gridlines", „Show historical imagery", „Show Street View", „Basemap settings", „Hide menu bar"
  - **Add:** „Folder", „Placemark", „Path or Polygon", „Slide", „Tile overlay"
  - **Tools:** „Measurement", „Explore building and solar designs"
  - **Help:** „Keyboard Shortcuts", „Videos", „Community Forum", „Send feedback", „About Google Earth"
- **Wörtlich (EN, einzelne Einträge im Wortlaut):**
  „Show gridlines: To learn about geographic coordinates and get your approximate location on the Earth's surface, turn on gridlines."
  „Show historical imagery: Explore how locations have changed over time with a timeline of past imagery."
  „Hide menu bar: Get an uncluttered, full-screen view of Google Earth."
  „Folder: To organize trips and other projects, use folders."
  „Tile overlay: Show location-based data layers that cover a specific area on top of your map, using tiled overlays."
- **Wörtlich (DE, Menünamen):** „Datei", „Bearbeiten", „Ansicht", „Hinzufügen", „Tools", „Hilfe"; „Historische Bilder anzeigen", „Menüleiste ausblenden", „Basiskarteneinstellungen", „Ordner", „Ortsmarkierung".
- **Was das für BIOME hergibt:**
  - Google Earth hat eine **klassische Menüleiste** mit genau sechs Menüs — keine „alles ist ein Icon"-Oberfläche. Für ein Fachwerkzeug mit vielen selten genutzten Funktionen (Import, Export, Messen, Bericht) ist das ein belegtes Vorbild, kein Rückschritt.
  - Die Aufteilung ist **nach Objektart des Handelns** geordnet, nicht nach Fachdomäne: Datei (Projekt), Bearbeiten (Zwischenablage), Ansicht (was sehe ich), Hinzufügen (was erzeuge ich), Tools (was rechne ich aus), Hilfe. Eine BIOME-Menüleiste kann dieselbe Achse nutzen; „Bäume", „Boden", „Sensorik" wären dann **keine** Menüs, sondern Ebenen/Datenkatalog.
  - **„Hide menu bar"** ist als eigener Menüeintrag dokumentiert: die Karte darf vollflächig werden. Ein Kartenprodukt muss seine eigene Bedienoberfläche wegräumen können.
  - „Add ▸ Folder", „Add ▸ Placemark", „Add ▸ Path or Polygon" belegen: Ordner ist ein **gleichrangiges Erzeugnis** neben Geometrien, nicht bloß eine Baum-Verzierung.
- **Deckt ausdrücklich nicht:** Pixelmaße, Höhe der Menüleiste, Typografie, Farben, Reihenfolge innerhalb der Menüs als verbindliche Vorgabe, Tastenkürzel (der Text verweist nur auf „Help ▸ Keyboard Shortcuts", ohne die Kürzel zu nennen). Auch **keine** Aussage darüber, was auf Mobilgeräten aus der Menüleiste wird.

### GE-02 · Die drei Flächen: Karteninhalt links, Inspector rechts, Karte in der Mitte
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/manage-data-layers · deutsch: https://developers.google.com/maps/documentation/earth/manage-data-layers?hl=de
- **Abgerufen:** 2026-08-10 (HTTP 200, 186 589 Bytes / HTTP 200, 190 636 Bytes)
- **Wörtlich (EN):**
  „In your project's Map contents panel on the left, find the data layer you want to adjust."
  „To adjust opacity, select the layer in the Map contents panel, and then click the Style tab in the inspector that appears on the right hand side."
  „Select a layer feature (for example, a census tract, a property parcel) on the map view. The inspector opens on the right, displaying details about that specific feature from the data layer."
- **Wörtlich (DE):**
  „Suchen Sie im Bereich Karteninhalt links in Ihrem Projekt nach der Datenebene, die Sie anpassen möchten."
  „Wenn Sie die Deckkraft anpassen möchten, wählen Sie die Ebene im Bereich Karteninhalt aus und klicken Sie dann im Inspector rechts auf den Tab Stil."
  „Wählen Sie in der Kartenansicht eine Funktion einer Ebene aus, z. B. einen Zensusbezirk oder ein Grundstück. Rechts wird der Inspector geöffnet, in dem Details zu dieser Funktion aus der Datenebene angezeigt werden."
- **Was das für BIOME hergibt:**
  - **Die Rollenverteilung ist belegt und strikt:** links = *was ist geladen und in welcher Reihenfolge* (Karteninhalt); rechts = *was ist gerade ausgewählt und wie sieht es aus* (Inspector); Mitte = Karte. Das ist genau die Dreiteilung, die ein Baumkataster braucht: Ebenenliste ▸ Karte ▸ Baumdatenblatt.
  - **Der Inspector ist auswahlgetrieben, nicht navigationsgetrieben.** Er öffnet sich beim Klick auf ein Objekt *in der Karte* und beim Auswählen einer Ebene *in der Liste* — dieselbe Fläche für beide Fälle. BIOME sollte nicht zwei getrennte rechte Panels für „Ebene konfigurieren" und „Objekt ansehen" bauen.
  - Der Inspector ist **in Tabs gegliedert** („Style tab" / „Tab Stil"), er ist also kein reiner Lesebereich.
  - Deutsche Terminologie zum Übernehmen: **„Bereich Karteninhalt"**, **„Inspector"** (Google übersetzt „Inspector" nicht).
- **Deckt ausdrücklich nicht:** Breiten der beiden Bereiche, ob sie einklappbar sind, ob sie gleichzeitig offen sein können, Verhalten bei schmalen Fenstern. Nichts davon steht in der Quelle.
- **Warnung zur deutschen Fassung:** Google übersetzt „feature" hier durchgehend fälschlich als **„Funktion"** („Funktionen von Layern untersuchen", „Funktion ausblenden", „Details zu dieser Funktion"). Gemeint ist das **Geoobjekt**. Diese Übersetzung darf **nicht** in BIOME übernommen werden — dort heißt es „Objekt" oder „Element".

### GE-03 · Statusleiste unten: Aufnahmedatum, Koordinaten, Höhe folgen dem Mauszeiger
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/imagery-dates-alt-coord · deutsch: https://developers.google.com/maps/documentation/earth/imagery-dates-alt-coord?hl=de
- **Abgerufen:** 2026-08-10 (HTTP 200, 187 708 Bytes / HTTP 200, 191 527 Bytes)
- **Wörtlich (EN):**
  „Important: An imagery date or range of dates may not be available in all locations or at all zoom levels. To find a date or range of dates for when an image was taken in the bottom status bar, move your cursor over any location on the map."
  „Tip: If you move the mouse to hover over other locations, the updated coordinates and altitude appear on the bottom right corner of the screen."
  „At the bottom right find the real-world altitude and the altitude of the camera. If you move the mouse to hover over different locations, the altitude updates."
- **Wörtlich (DE):**
  „Bewegen Sie den Cursor auf einen beliebigen Ort auf der Karte, um das Datum oder den Zeitraum der Aufnahme der Bilder in der unteren Statusleiste zu sehen."
- **Wörtlich (EN, Formateinstellungen):**
  „In the drop-down menu under ‚Latitude/Longitude formatting', choose Degrees, Minutes, Seconds, or Decimal."
  „In the drop-down menu under Unit system, select either Metric (meters and kilometers)or Imperial (feet and miles)."
- **Was das für BIOME hergibt:**
  - Es gibt eine **untere Statusleiste** („bottom status bar" / „untere Statusleiste") und sie zeigt **Herkunftsangaben zum Bild unter dem Cursor**, nicht Programmzustand. Das ist die belegte Rechtfertigung dafür, in BIOME Aufnahmedatum/Datenstand der Fernerkundungsebene permanent und cursorbezogen einzublenden statt in einem Dialog zu verstecken.
  - **Zwei Höhen nebeneinander:** „the real-world altitude and the altitude of the camera" — Geländehöhe und Kamerahöhe sind getrennt ausgewiesen. Für ein 3D-Baumkataster ist diese Trennung übernehmenswert.
  - **Koordinatenformat und Einheitensystem sind Nutzereinstellung**, nicht Produktentscheidung: DMS vs. Dezimal, metrisch vs. imperial.
  - Die Quelle sagt ausdrücklich, dass ein Aufnahmedatum **fehlen kann** („may not be available in all locations or at all zoom levels"). Ein leerer Zustand der Statusleiste ist dokumentiert vorgesehen.
- **Deckt ausdrücklich nicht:** Höhe der Statusleiste, Schriftgröße, welche Felder in welcher Reihenfolge stehen, ob die Leiste ausblendbar ist. Auch keine Angabe zur Genauigkeit oder Rundung der Werte.

### GE-04 · Navigation und Ansichtssteuerung liegen unten rechts
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/navigate-the-globe
- **Abgerufen:** 2026-08-10 (HTTP 200, 186 745 Bytes)
- **Wörtlich:**
  „Move around: Drag with your mouse."
  „Zoom in and out: At the bottom right, use +/- or right drag the mouse."
  „Switch between top-down view and orbiting 3D view: At the bottom right, click 3D. If you're already in 3D view, you'll find 2D instead."
  „Reset your globe to face true north: At the bottom right, click the compass."
  „Fly to your current location: At the bottom right, click my_location My Location."
  „Tip: While you wait for a place to load, check the bottom left to tell how much of the image already loaded."
- **Was das für BIOME hergibt:**
  - **Alle vier Kartensteuerelemente liegen im selben Eck (unten rechts):** Zoom, 2D/3D-Umschalter, Kompass, eigener Standort. Ein einziger Steuerungscluster, nicht über den Kartenrand verteilt.
  - Der **2D/3D-Umschalter ist ein Wechselknopf mit wechselnder Beschriftung** — er zeigt das Ziel, nicht den Zustand („If you're already in 3D view, you'll find 2D instead").
  - **Ladefortschritt gehört nach unten links**, getrennt vom Steuerungscluster.
  - Basiskarten-Einstellungen liegen ebenfalls unten links: „At the bottom left, click the Basemap icon." (Quelle GE-01, Quickstart).
- **Deckt ausdrücklich nicht:** Größen, Abstände, Icon-Sätze, ob die Steuerelemente ausblenden, wenn die Maus wegfährt. (Für **Earth Pro Desktop** ist das Ausblenden dokumentiert — siehe GE-23 — für das aktuelle Earth nicht.)

### GE-05 · Suche
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/quickstart · https://developers.google.com/maps/documentation/earth/add-features-to-projects · https://developers.google.com/maps/documentation/earth/imagery-dates-alt-coord
- **Abgerufen:** 2026-08-10 (HTTP 200; 192 124 / 197 638 / 187 708 Bytes)
- **Wörtlich:**
  „At the top left, click the search bar." (Quickstart)
  „Enter what you'd like to search for or click casino I'm feeling lucky." (Quickstart)
  „To search for places, use the ‚Search Google Earth' bar." (add-features-to-projects)
  „On the left, click Search. Search for a place. A knowledge panel will open with information about the place." (imagery-dates-alt-coord)
- **Was das für BIOME hergibt:**
  - Die Suche sitzt **oben links** und ist mit einem sprechenden Platzhalter beschriftet („Search Google Earth"), nicht mit einem nackten Lupensymbol.
  - Die Suche ist **kein eigener Modus** — das Ergebnis erscheint als Informationskarte über der Karte, die Karte bleibt sichtbar.
- **Deckt ausdrücklich nicht:** Autovervollständigung, Filter, Suche innerhalb von Ebenen/Attributen, Suchsyntax. Für das aktuelle Earth ist **keine** Attributsuche über Datenebenen dokumentiert. (Koordinateneingabeformate sind belegt: „Decimal Degrees: 42.7°, -100.2°" und „Degrees, Minutes, Seconds: 64°25'12.07"N, 100°10'15.24"W".)

---

## B · Auswahl eines Objekts: Knowledge Card und Inspector

### GE-06 · Knowledge Card — die Informationskarte bei Auswahl
- **Herausgeber:** Google — Dokumentation Google Earth / Google Earth Outreach
- **Quelle:** https://developers.google.com/maps/documentation/earth/learn-about-places · https://developers.google.com/maps/documentation/earth/add-features-to-projects · https://www.google.com/earth/outreach/learn/create-a-map-or-story-in-google-earth-web/
- **Abgerufen:** 2026-08-10 (HTTP 200; 185 430 / 197 638 / 46 112 Bytes)
- **Wörtlich (learn-about-places, EN — die einzige Beschreibung der Karte selbst):**
  „Search for a location or click a place on the map. To the right, there's a box with more info about the location."
  „To learn more, click the box."
  „To find photos, click the box. At the top, click the photo."
  „To save the place to a project, click Save to project."
- **Wörtlich (learn-about-places, DE):**
  „Suchen Sie nach einem Ort oder klicken Sie auf der Karte darauf. Auf der rechten Seite sehen Sie einen Kasten mit weiteren Informationen zum Ort."
- **Wörtlich (add-features-to-projects, EN):**
  „In the knowledge card, at the top right, rename your placemark. Your placemark shows on the map and in the map contents panel on the left."
  „From the search results, select the result you want to add. This will take you to the result you selected and open up more info in a knowledge card."
  „In the knowledge card, on the right, click Save to project"
  „Your saved placemark will show up by default as a yellow pin on both the map and the project details panel."
  „The editor panel is on the right. If you are happy with the default information from Google, click Done. If you would like to update the information (for example, adding your own title, description, or photos), click Update. This will also remove the information provided by Google."
  „Tips: Updating place information removes information provided by Google."
- **Wörtlich (add-features-to-projects, DE):**
  „Benennen Sie die Ortsmarkierung oben rechts in der Wissenskarte um."
  „Die Ortsmarkierung wird jetzt auf der Karte und im Bereich ‚Karteninhalte' links angezeigt."
  „Der Editor-Bereich befindet sich rechts."
- **Wörtlich (Google Earth Outreach — das Schließen):**
  „On the Nairobi National Museum Knowledge Card at right, click the Add to project button."
  „Click Save to add the second place to your project. You can close the Knowledge Card by clicking on the X in the top-right corner."
  „Use the Search tool again to fly to ‚Gombe National Park', but close the Knowledge Card without adding it to the Project."
- **Was das für BIOME hergibt:**
  - **Wo:** rechts, über der Karte. Nicht als Popup am Objekt, nicht als Vollbilddialog.
  - **Wodurch:** Klick auf ein Objekt in der Karte **oder** Auswahl eines Suchergebnisses — derselbe Behälter für beide Wege.
  - **Schließen:** ein **X oben rechts**. Das Schließen ist ausdrücklich folgenlos — man darf die Karte schließen, ohne die Aktion auszuführen („close the Knowledge Card without adding it to the Project"). Für BIOME: Die Objektkarte ist keine Bestätigungspflicht.
  - **Inhalt:** Titel, Beschreibungstext, Fotos, primäre Aktion („Save to project" / „Add to project"). Die Karte ist **anklickbar als Ganzes** und führt in eine tiefere Ansicht („To learn more, click the box").
  - **Zwei Stufen, nicht eine:** *Knowledge Card* zeigt an und bietet die Übernahme an; erst danach übernimmt der *editor panel* rechts das Bearbeiten. Das trennt Lesen von Ändern — für ein Kataster mit Datenverantwortung genau die richtige Trennung.
  - **Ein dokumentierter Datenschutz-/Provenienz-Mechanismus:** Eigene Angaben **ersetzen** die von Google gelieferten, sie ergänzen sie nicht („This will also remove the information provided by Google"). BIOME hat dieselbe Frage bei amtlichen vs. selbst erhobenen Baumdaten — Google löst sie durch Ersetzen mit ausdrücklichem Warnhinweis.
- **Deckt ausdrücklich nicht:**
  - Maße, Breite, Höhe, Ecken-Radius, Elevation, Farben der Knowledge Card. **Nichts davon ist in irgendeiner abrufbaren Google-Quelle dokumentiert.**
  - Verhalten bei Mehrfachauswahl, bei überlappenden Objekten, bei sehr langen Inhalten (Scrollen), auf schmalen Fenstern.
  - Der Begriff „Knowledge Card" ist in der offiziellen Dokumentation **uneinheitlich**: `learn-about-places` nennt sie nur „a box", `imagery-dates-alt-coord` nennt sie **„a knowledge panel"**, `add-features-to-projects` nennt sie „knowledge card" (klein geschrieben), Google Earth Outreach „Knowledge Card". Es gibt **keine** Quelle, die den Begriff definiert oder die Anatomie benennt.

### GE-07 · Inspector bei Auswahl eines Objekts aus einer Datenebene
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/manage-data-layers
- **Abgerufen:** 2026-08-10 (HTTP 200, 186 589 Bytes)
- **Wörtlich:**
  „Inspect layer features — Learn more about individual features within a data layer directly on the map. Select a layer feature (for example, a census tract, a property parcel) on the map view. The inspector opens on the right, displaying details about that specific feature from the data layer."
- **Was das für BIOME hergibt:** Objekte, die aus einer **Datenebene** stammen (also aus einem Datensatz, nicht aus der Nutzererfassung), landen **nicht** in der Knowledge Card, sondern im Inspector. Das ist die belegte Zweiteilung: Ortsmarkierung/Suchergebnis → Knowledge Card; Ebenenobjekt (Flurstück, Zensusbezirk — bei BIOME: Vegetationsfläche, Bodeneinheit, Sensor) → Inspector. Beide rechts.
- **Deckt ausdrücklich nicht:** Wie der Inspector aussieht, welche Felder er zeigt, wie er sortiert, ob und wie er geschlossen wird. Kein Wort dazu in der Quelle.

---

## C · Ebenen-Konzept im aktuellen Google Earth

### GE-08 · Sichtbarkeit, Deckkraft, Reihenfolge — die drei dokumentierten Ebenen-Bedienungen
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/manage-data-layers · deutsch: `?hl=de`
- **Abgerufen:** 2026-08-10 (HTTP 200, 186 589 / 190 636 Bytes)
- **Wörtlich (EN):**
  „Once you add data layers to your Google Earth project, you can control their visibility, appearance, and how you interact with the data on the map. Layers are automatically saved to your project as you add or adjust them."
  „To hide the layer, click visibility_off Hide feature next to the name of the layer. To show the layer, click visibility Show feature."
  „To adjust opacity, select the layer in the Map contents panel, and then click the Style tab in the inspector that appears on the right hand side. You can drag the opacity slider to make the layer more transparent or opaque."
  „In your project's Map contents panel, right-click the layer you want to rearrange, and click either flip_to_front Bring to front or flip_to_back Send to back."
  „This will change the visual order of layers on the map, but not how they appear in your project's Map contents panel."
  „Note: 3D buildings may interfere with data layers, especially when zoomed in. To turn off 3D buildings, go to View ▸ Basemap settings ▸ toggle 3D buildings."
- **Wörtlich (DE):**
  „Ebenen werden automatisch in Ihrem Projekt gespeichert, wenn Sie sie hinzufügen oder anpassen."
  „Dadurch ändert sich die visuelle Reihenfolge der Ebenen auf der Karte, aber nicht die Reihenfolge im Bereich Karteninhalt Ihres Projekts."
- **Was das für BIOME hergibt:**
  - **Sichtbarkeit wird per Augen-Symbol geschaltet, nicht per Ankreuzfeld.** Das ist der harte Bruch gegenüber Earth Pro Desktop (GE-20) und gegenüber KML (GE-30). Beide Muster existieren bei Google nebeneinander; das **neuere** ist das Auge. Für BIOME heißt das: Ankreuzfeld ist zulässig und belegt, Auge ebenfalls — aber nicht beides gemischt.
  - **Deckkraft ist eine Ebeneneigenschaft im Stil-Tab des Inspectors**, nicht ein Regler in der Liste. Die Liste bleibt schmal, die Feineinstellung wandert nach rechts. Direkt übertragbar auf Baumkronen-Overlay über Orthofoto.
  - **Zeichenreihenfolge ist entkoppelt von der Listenreihenfolge.** Das ist eine ausdrückliche, überraschende Design-Entscheidung: „Bring to front"/„Send to back" ändert die Karte, nicht die Liste. BIOME muss sich hier bewusst entscheiden — Google Earth koppelt die beiden **nicht**.
  - Es gibt nur **zwei** Reihenfolgebefehle (ganz nach vorn / ganz nach hinten), kein freies Umsortieren per Drag im aktuellen Earth. (Drag-Umsortieren ist nur für **Earth Pro Desktop** belegt, GE-21.)
  - Der 3D-Gebäude-Hinweis belegt: Google dokumentiert **Konflikte zwischen Basiskarte und Datenebene** offen und nennt den Ausschalter. BIOME sollte dasselbe tun (z. B. 3D-Bäume vs. Kronenflächen).
- **Deckt ausdrücklich nicht:** Gruppierung/Verschachtelung der Ebenen im Karteninhalt, Ordner in der Ebenenliste, Mehrfachauswahl, „alle ein/aus", Kopplung an Zoomstufen. Nichts davon steht dort.

### GE-09 · Ebenen-Stil und Legende
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/style-data-layers
- **Abgerufen:** 2026-08-10 (HTTP 200, 188 622 Bytes)
- **Wörtlich (die drei Stil-Methoden, vollständig):**
  „Uniform styling — Apply a single, consistent style to all features in the layer. This is useful for making a whole layer distinct or for basic visualizations. Example: Style all water bodies in an imported layer with a semi-transparent blue fill."
  „Categorical styling — Style features based on unique values in a specific data attribute (field). This works for attributes containing text or numbers. Distinct colors or styles are assigned to each category. You can typically style up to 20 unique categories, with any additional values grouped into an ‚Other' category. Example: Color a ‚Zoning' layer by the ‚Zone Type' attribute (for example, Residential, Commercial, Industrial)."
  „Numerical styling — Visualize numerical data attributes using a color gradient. Features with lower values will be shaded towards one end of the ramp, and higher values towards the other. Example: Style a layer of census tracts by ‚Median Income' using a ramp from light yellow to dark blue."
- **Wörtlich (Eigenschaften):**
  „Fill color: Change the interior color of polygons or the color of points."
  „Stroke color: Change the color of lines or the outlines of polygons."
  „Stroke width: Adjust the thickness of lines or outlines."
  „Opacity: Control the transparency of fills and strokes."
  „Labels — Visibility: Toggle all labels for the layer on or off. Font size and color: Adjust the size and color of the label text to improve readability."
- **Wörtlich (Legende):**
  „Dynamic legends — The legend displayed for your data layer in the Layers panel will automatically update to reflect the styling method and properties you apply, helping viewers understand the map. For user-imported layers, attribute names in the legend will appear as they are in the source file."
- **Wörtlich (Grundsätze):**
  „Project-specific styles: Any style changes you make to a layer are saved only within the current project. The layer's default appearance in other projects or in the Google Earth data catalog remains unaffected."
  „Real-time updates: As you adjust style settings, the map and the layer's legend will update immediately to reflect your changes."
  „Collaboration: All editors in a shared project see the same layer styles. Changes made by one editor are visible to others. Similar to other project edits, a refresh may be necessary."
  „Reset to default: You can usually find an option to revert your layer's style back to its original default appearance."
- **Was das für BIOME hergibt:**
  - **Genau drei Stilmethoden**, und sie decken den gesamten Bedarf eines Kartenprodukts ab: einheitlich / kategorial / numerisch. Für BIOME: Baumart = kategorial, Vitalitätsstufe = kategorial, Stammdurchmesser oder Bodenfeuchte = numerisch, Erfassungsraster = einheitlich. Mehr braucht es dokumentiert nicht.
  - **20 Kategorien als weiche Obergrenze, Rest in „Other".** Das ist eine belegte Zahl und ein belegter Umgang mit dem Überlauf. BIOME sollte bei Baumarten genau dieses Verhalten übernehmen statt eine 200-farbige Legende zu bauen.
  - **Die Legende ist an den Stil gekoppelt und aktualisiert sich sofort.** Legende ist kein separates Artefakt, das jemand pflegt.
  - **Die Legende steht im „Layers panel"** — hier taucht dieser Name im aktuellen Earth auf, und zwar für den Ort der **Legende**, nicht für die Schaltliste (die heißt „Map contents panel"). Diese Doppelbenennung ist in den Quellen nicht aufgelöst.
  - **Stil ist projektlokal**, der Katalogdatensatz bleibt unberührt. Für BIOME mit gemeinsam genutzten Fachdatensätzen (ALKIS, Bodenkarte) ist das genau das richtige Modell: Darstellung gehört dem Projekt, Daten gehören dem Katalog.
  - „Reset to default" ist als eigene, dokumentierte Funktion vorgesehen.
- **Deckt ausdrücklich nicht:** die konkreten Farbrampen, ob Klassengrenzen (Quantile, Jenks, gleiche Intervalle) wählbar sind, Symbolgrößen-Abbildung, Diagramm-Symbole, datenabhängige Beschriftung. Nichts davon steht dort.

### GE-10 · Ebenen-Metadaten — welche Felder ein Datensatz mitbringen muss
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/learn-about-data-layers
- **Abgerufen:** 2026-08-10 (HTTP 200, 188 876 Bytes)
- **Wörtlich (die Metadaten-Felder, vollständig):**
  „Title: The name of the data layer."
  „About: Detailed information about the data layer and its purpose."
  „Data sources: The source of the data. This may include links to additional resources."
  „Data coverage: Regions of the world that are included in the data."
  „Last updated: The date when the data was last updated."
  „Thumbnail image: A static image representing the data layer."
  „Terms of use: Important information regarding how the data can be used."
  „Plan: A label on the thumbnail indicating whether a Professional or Professional Advanced plan is required to access the data layer."
  „(If applicable) Experimental badging: Experimental (pre-GA) data layers will be highlighted with a green banner over the thumbnail image."
- **Wörtlich (Aktualisierung und Änderungshinweis):**
  „When a data layer is updated (for example, new data is added or refreshed), your projects that include that layer will automatically update to the latest version."
  „Notifications for updates: For layers with regular update cadences (such as monthly or annually), a badge may appear on the layer's title in the left-hand panel to indicate an update. This visual cue will disappear after a few views or after selecting the layer."
  „View changelog: For some data layers, you may be able to view a changelog that details specific changes made with each update."
- **Wörtlich (Klassifikation):**
  „Non-aggregated layers: Features that do not rely on political boundaries and contain no regional identity metadata (for example, rasters or elevation)."
  „Aggregated layers: Data aggregated by a dimension (for example, ‚population per postal code')."
- **Wörtlich (Einschränkungen):**
  „Export restrictions: You cannot export, download, or copy data directly from data layers in Google Earth."
  „Note: You can export your project to KML, but proprietary data layers are not included within the downloaded file."
  „Privacy-sensitive data: Some data layers may have restrictions to protect privacy. For example, data might not be shown if there are too few data points within a boundary."
  „Not all data layers are available for all geographic regions."
  „Data layers may have different levels of granularity, aggregation, or anonymization."
- **Was das für BIOME hergibt:**
  - Eine **fertige, vollständige Feldliste für den BIOME-Ebenenkatalog**: Titel, Beschreibung, Datenquelle(n), räumliche Abdeckung, Stand, Vorschaubild, Nutzungsbedingungen, Zugriffsstufe, Reifegrad-Kennzeichen. Das deckt sich fast eins zu eins mit dem, was die Standards-Register in `refs/standards/` für Fachdaten verlangen.
  - **„Last updated" und ein Änderungsprotokoll sind Pflichtbestandteil der Ebene**, nicht Beiwerk. Für Fernerkundung und Sensorik in BIOME ist das zwingend.
  - **Aktualisierungen greifen automatisch durch** in bestehende Projekte, und der Nutzer wird per **Badge am Ebenennamen in der linken Liste** informiert; das Badge verschwindet nach wenigen Ansichten. Ein sehr übernehmenswertes Muster für „die Bodenkarte hat einen neuen Stand".
  - Die Trennung **aggregiert vs. nicht aggregiert** ist genau die Trennung zwischen Rasterdaten (Fernerkundung, Höhenmodell) und flächenbezogenen Kennzahlen (Baumbestand je Block) in BIOME. Sie hat direkte Folgen für Aussagekraft und Datenschutz.
  - **Datenschutz durch Unterdrückung kleiner Fallzahlen** ist ausdrücklich dokumentiert („data might not be shown if there are too few data points within a boundary") — relevant, sobald BIOME personen- oder grundstücksbezogene Aggregate zeigt.
  - **Fremddaten sind vom Export ausgenommen.** Das Projekt lässt sich exportieren, die proprietäre Ebene nicht. Ein sauberes Lizenzmodell für BIOME.
- **Deckt ausdrücklich nicht:** wie der Katalog gegliedert oder gefiltert wird (Kategorien, Facetten, Suche), wie die Detailansicht aussieht, wo genau das Badge sitzt.

### GE-11 · Der Ebenenkatalog selbst — Tabellenschema und Umfang
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/available-data-layers
- **Abgerufen:** 2026-08-10 (HTTP 200, 226 839 Bytes)
- **Wörtlich (Kopf):**
  „Refer to the table below for a detailed list of all the data layers available in Google Earth. Note that data layers may change periodically throughout the year. Check this page regularly for updates."
- **Wörtlich (Spaltenschema der Tabelle):** „Data layer | Description | Source(s) | Plan | Coverage"
- **Wörtlich (Beispielzeilen mit direktem BIOME-Bezug):**
  „Tree canopy percentage (by US census tract) | Tree canopy percentage is estimated as the percentage of pixels in a census tract that are categorized as ‚tree', based on an AI model that was trained to categorize pixels in high-resolution overhead imagery into a number of terrain types, such as ‚tree' or ‚road'."
  „Tree canopy percentage (by postal code) | …"
  „Land cover (WorldCover v100)" / „Land cover (WorldCover v200)"
  „Digital elevation model (Copernicus GLO-30) | A digital elevation model (DEM) that represents the top-reflective surface of the Earth including buildings, infrastructure and vegetation at 30 meter resolution. Data were acquired through the TanDEM-X mission between 2011 and 2015. Note: This is an Experimental data layer, which is focused on gathering user feedback."
  „Building footprints | … | Google Maps | Professional Advanced | Global"
  „Cycling trip percentage | Shows the monthly percentage of trip segments that are completed by bike, based on anonymized Google location data. Values are measured by S2 Cell Level 11 boundaries: generally about 20 square kilometers … Only trips that begin and end within the boundary are included in the calculation. The latest data is from December 2025."
- **Was das für BIOME hergibt:**
  - Das **Spaltenschema `Ebene | Beschreibung | Quelle(n) | Zugriffsstufe | Abdeckung`** ist der kürzeste belegte Katalogeintrag, der trägt. Übernehmenswert 1:1.
  - Die Beschreibungstexte nennen **Methode, Auflösung, Erhebungszeitraum und Bezugsgeometrie im Fließtext** (z. B. „30 meter resolution", „TanDEM-X mission between 2011 and 2015", „S2 Cell Level 11 … about 20 square kilometers"). Das ist genau die Prosa-Provenienz, die BIOME für Fernerkundungs- und Sensorebenen braucht.
  - **Experimentelle Ebenen sind im Katalogtext selbst gekennzeichnet**, nicht nur visuell.
  - Google Earth führt selbst Baumkronen- und Landbedeckungsebenen — die Domäne von BIOME ist im Vorbild abgebildet, allerdings **aggregiert auf Verwaltungseinheiten**, nicht als Einzelbaumkataster.
- **Deckt ausdrücklich nicht:** Eine thematische Gruppierung des Katalogs. Die Tabelle ist **alphabetisch und flach**, ohne Oberkategorien. Wer in BIOME „Bäume / Vegetation / Boden / Sensorik" als Katalogrubriken bauen will, hat dafür in dieser Quelle **keine** Deckung.

### GE-12 · Drei Datenarten mit unterschiedlichen Eigenschaften
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/projects-kml
- **Abgerufen:** 2026-08-10 (HTTP 200, 188 311 Bytes)
- **Wörtlich:**
  „Map features: Individually editable items like placemarks, lines, and polygons stored within a Google Drive project. Best for creating and curating map content."
  „Data layers: Read-only layers generated from larger datasets (KML, GeoJSON, SHP), also stored within a Google Drive project. Ideal for visualizing and analyzing large-scale data."
  „Local KML files: KML/KMZ files stored in your computer's browser storage, independent of Google Drive projects. Best for quickly viewing KML data."
- **Wörtlich (Größenordnungen aus der Vergleichstabelle):**
  Map features: „Best for up to ~10,000 features. Performance degrades with additional features."
  Data layers: „Optimized for very large datasets (1,000,000+ features). Higher performance."
  Local KML file: „Performance depends on file size and complexity. May be slow for large files."
- **Wörtlich (Importformate):** Map features: „KML, KMZ" · Data layers: „KML, KMZ, GeoJSON, SHP.zip" · Local KML file: „KML, KMZ"
- **Was das für BIOME hergibt:**
  - **Die entscheidende Unterscheidung ist bearbeitbar vs. schreibgeschützt**, und sie fällt mit der Größenordnung zusammen: einzeln editierbare Objekte bis ~10 000, schreibgeschützte Massendaten ab da. Genau die Grenze zwischen BIOME-Baumkataster (editierbar, tausende Objekte) und Fernerkundungs-/Bodenebenen (schreibgeschützt, Millionen).
  - Die Oberfläche muss beide Arten **im selben Karteninhalt-Bereich** zeigen, aber mit unterschiedlichem Funktionsumfang. Das ist bei Google belegt und wird nicht durch getrennte Panels gelöst.
- **Deckt ausdrücklich nicht:** wie die beiden Arten in der Liste visuell unterschieden werden. Kein Wort zu Icons, Gruppen oder Trennern.

### GE-13 · Speicherkontingente und Verhalten bei Überschreitung
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/manage-layers-storage
- **Abgerufen:** 2026-08-10 (HTTP 200, 187 748 Bytes)
- **Wörtlich (Tabelle):** „Total storage | 1 GB | 10 GB | 20 GB" · „Maximum single file size | 250 MB | 500 MB | 500 MB" · „Supported file formats | KML, GeoJSON" (Spalten: Standard, Professional, Professional Advanced)
- **Wörtlich:**
  „View total usage: You can see your current storage usage against your total quota in the Storage widget at the bottom left of the Google Earth home screen."
  „Project sizes: The total size of each project, calculated from the sum of its data assets, is displayed on the Google Earth home screen to help identify which projects are using the storage."
  „‚Over Quota' state: If your total storage use exceeds your plan's limit, you enter an ‚Over Quota' state: You will be blocked from starting any new data imports across your account. All your existing projects and previously imported layers will remain fully accessible and functional. You won't lose access to your data."
  „It may take up to 30 minutes for the freed space to be reflected in the owner's storage quota."
- **Was das für BIOME hergibt:** Das **Verhalten bei Überschreitung** ist das Übernehmenswerte, nicht die Zahlen: Neues wird blockiert, **Bestehendes bleibt vollständig nutzbar**. Kein Datenverlust, keine Degradierung. Dazu ein **Speicher-Widget unten links auf dem Startbildschirm** und Projektgrößen in der Projektliste. Und ein ehrlicher Hinweis auf die Verzögerung bei der Freigabe.
- **Deckt ausdrücklich nicht:** Warnschwellen (z. B. „ab 80 %"), Aussehen des Widgets, Fehlermeldungstexte.

---

## D · Umgang mit Zeit

### GE-14 · Historische Bilder und Zeitraffer — die Zeitachse im aktuellen Google Earth
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/historical-imagery · deutsch: `?hl=de`
- **Abgerufen:** 2026-08-10 (HTTP 200, 186 554 / 190 762 Bytes)
- **Wörtlich (EN, vollständige Bedienabfolge):**
  „Current imagery automatically displays in Google Earth. To discover how images have changed over time or view past versions of a map on a timeline:"
  „To view a map over time, you can either: In the toolbar, click Historical imagery. Click View ▸ Historical imagery."
  „Note: This feature isn't available if you're using the Map basemap. To enable this feature, change your basemap to Satellite."
  „Select how you want to view the map. To turn on historical imagery view, at the top left, click Historical imagery. To turn on timelapse, at the top left, click history Timelapse."
  „A timeline appears. At the top right, click the timeline to explore the map over time."
  „To find a specific time, you can either: Click the year you want to view in the timeline. Click chevron_left Previous or chevron_right Next."
  „To lock the latest imagery, click last_page Last page."
  „To minimize the historical imagery toolbar, at the top right, click collapse_content Collapse. At the top left, the toolbar remains active as a floating chip."
  „To deactivate historical imagery, click Historical imagery."
- **Wörtlich (EN, Tipps — vollständig):**
  „To optimize your viewing experience, 3D buildings feature is turned off when historical imagery is turned on."
  „Satellite image availability is represented on the slider."
  „Image availability may change as you explore."
  „Years are marked by dots. Smaller dots indicate additional months."
  „If a previously selected year becomes unavailable, its dot on the slider turns gray."
  „Global coverage varies."
- **Wörtlich (DE):**
  „Klicken Sie in der Symbolleiste auf Historische Bilder." · „Klicken Sie auf Ansicht ▸ Historische Bilder."
  „Eine Zeitachse wird angezeigt. Klicken Sie rechts oben auf die Zeitachse, um die Karte im Zeitverlauf anzusehen."
  „So aktivieren Sie den Zeitraffer: Klicken Sie links oben auf Zeitraffer."
  „Hinweis: Diese Funktion ist nicht verfügbar, wenn Sie die Karte-Basiskarte verwenden. Wenn Sie diese Funktion aktivieren möchten, ändern Sie die Basiskarte in Satellit."
- **Was das für BIOME hergibt:**
  - **Zeit ist ein Modus, kein Dauerzustand.** Man schaltet ihn ein („Historical imagery") und wieder aus, über denselben Knopf. Dazu ein **zweiter Modus „Timelapse"** — Einzelzeitpunkt vs. Animation sind getrennt. Für BIOME: „Zustand am Stichtag" und „Entwicklung abspielen" sind zwei Dinge.
  - **Verfügbarkeit ist Teil der Zeitachse selbst:** Punkte markieren Jahre, kleinere Punkte zusätzliche Monate, ausgegraute Punkte nicht mehr verfügbare Stände. Das ist die belegte Antwort auf die schwierigste Frage jedes Zeitschiebers — *woher weiß ich, wo überhaupt Daten liegen*. Direkt auf Sensorzeitreihen und Befliegungstermine übertragbar.
  - **„Last page" sperrt auf den jeweils neuesten Stand** statt auf ein festes Datum. Ein eigener, benannter Zustand „immer aktuell".
  - **Die Zeitleiste kann sich zu einem Chip zusammenfalten** und bleibt dabei aktiv („the toolbar remains active as a floating chip"). Der Modus bleibt sichtbar, auch wenn die Bedienung weg ist. Das ist die Lösung gegen „ich weiß nicht mehr, warum meine Karte alt aussieht".
  - **Modus-Konflikte werden offen behandelt:** 3D-Gebäude werden bei historischen Bildern automatisch abgeschaltet; mit der Basiskarte „Karte" gibt es die Funktion gar nicht. BIOME sollte Zeitmodus-Konflikte (z. B. Sensor-Livewerte im historischen Modus) genauso ausdrücklich regeln.
  - Zwei gleichwertige Einstiege: **Symbolleiste** und **Menü Ansicht**.
- **Deckt ausdrücklich nicht:** die genaue Lage der Zeitachse (die Quelle sagt „a timeline appears" und dann „at the top right, click the timeline" — die Position bleibt offen), Maße, ob sie zieh- oder nur klickbar ist (dokumentiert sind Klick auf das Jahr sowie Vor/Zurück, **kein** Ziehen), Zeitauflösung feiner als Monat, Zeitfilter auf eigene Daten im aktuellen Earth.

### GE-15 · Zeitschieberegler in Earth Pro Desktop — und eine Lücke in der englischen Doku
- **Herausgeber:** Google — Google Earth-Hilfe (Earth Pro für Desktop)
- **Quelle:** https://support.google.com/earth/answer/148094?hl=de (deutsch) · https://support.google.com/earth/answer/148094?hl=en (englisch)
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 391 675 Bytes / HTTP 200, 1 390 953 Bytes)
- **Wörtlich (DE — enthält die Bedienschritte):**
  „Bei Google Earth werden automatisch aktuelle Bilder angezeigt. Anhand von historischem Bildmaterial können Sie beobachten, wie sich Orte im Lauf der Zeit verändert haben. Öffnen Sie Google Earth. Wählen Sie einen Ort aus. Klicken Sie auf Ansicht ▸ Historische Bilder oder über dem 3D-Viewer auf das Uhrsymbol."
  „Der Zeitschieberegler ist beim Aufzeichnen von Filmen nicht verfügbar."
  „Wenn Sie mehrere Datensätze ausgewählt haben, zeigt der Zeitschieberegler die Gesamtzeitspanne aller Datensätze an."
  „Wählen Sie im Bereich ‚Orte' die von Ihnen importierten Daten aus. Oben im 3D-Viewer wird der Zeitschieberegler eingeblendet und der Zeitraum der ausgewählten Daten wird angegeben."
  „Die Linien auf der Zeitachse kennzeichnen die Datumsangaben, für die Bilder Ihres Kartenausschnitts verfügbar sind."
  „Um die Länge des Zeitraums zu ändern, ziehen Sie die Bereichsmarkierung nach links oder rechts."
  „Wenn Sie einen früheren oder späteren Zeitraum festlegen möchten, ziehen Sie den Schieberegler nach links oder rechts. Die Bereichsmarkierung bewegt sich zusammen mit dem Zeitschieberegler, sodass die Länge des angezeigten Zeitraums gleich bleibt."
  „Zoomen Sie zum Verlängern des Zeitraums herein bzw. zoomen Sie zum Verkürzen heraus. Anfangs- und Enddatum der Zeitachse ändern sich."
- **Wörtlich (EN — Textstelle bricht ab):**
  „Current imagery automatically displays in Google Earth. To discover how images have changed over time or view past versions of a map on a timeline:" — **danach folgt in der englischen Fassung unmittelbar der Abschnitt „Tips". Die Bedienschritte fehlen.** Die Zeichenkette „historical" kommt im gesamten englischen HTML (`hl=en` wie `hl=en-GB`) **null Mal** vor; geprüft per `grep -c -i historical` → 0.
- **Warnhinweis in der deutschen Fassung, wörtlich:**
  „Diese Seite enthält möglicherweise Inhalte, die mithilfe von KI-Technologie übersetzt wurden. KI-Übersetzungen können Fehler enthalten."
- **Was das für BIOME hergibt:**
  - **Der Zeitschieber ist ein Bereichsregler, kein Punktregler.** Es gibt einen Schieberegler **und** eine separate **Bereichsmarkierung**; das Verschieben des einen nimmt das andere mit, die Fensterbreite bleibt konstant. Genau das braucht eine Sensor-Zeitreihe („zeige mir immer 7 Tage, aber verschiebe den Zeitraum").
  - **Zoom in die Zeitachse verändert Anfangs- und Enddatum.** Die Zeitachse ist selbst zoombar, unabhängig vom Kartenzoom.
  - **Verfügbarkeitsmarkierungen als Linien auf der Achse** — dasselbe Prinzip wie die Punkte im aktuellen Earth (GE-14).
  - **Ein Zeitschieber für mehrere Datensätze zeigt die Gesamtspanne.** Belegt für den Fall „mehrere Sensoren gleichzeitig ausgewählt".
  - Der Regler wird **oben im Kartenfenster** eingeblendet („Oben im 3D-Viewer") — im Gegensatz zu GE-14, wo die Position offenbleibt.
- **Deckt ausdrücklich nicht:** Maße, Aussehen, Tastaturbedienung, Zeitauflösung, Verhalten bei Objekten ohne Zeitstempel.
- **Wichtig zur Quelle:** Die deutsche Fassung ist hier **inhaltlich reicher** als die englische, trägt aber einen KI-Übersetzungsvorbehalt. Wer sich auf diesen Eintrag stützt, sollte die Bedienschritte am Produkt gegenprüfen. Ich habe **keine** englische Quelle gefunden, die diese Schritte belegt.

### GE-16 · Zeit im Datenmodell: TimeStamp, TimeSpan und was der Zeitschieber daraus macht
- **Herausgeber:** Google — Keyhole Markup Language, Developer's Guide „Time and Animation"
- **Quelle:** https://developers.google.com/kml/documentation/time
- **Abgerufen:** 2026-08-10 (HTTP 200, 88 922 Bytes)
- **Wörtlich:**
  „Any Feature in KML can have time data associated with it. This time data has the effect of restricting the visibility of the data set to a given time period or point in time. Although the complete data set is fetched when the KML file is loaded, the time slider in the Google Earth user interface controls which parts of the data are visible."
  „TimeStamp - specifies a single moment in time for a given Feature"
  „TimeSpan - specifies a <begin> and <end> time for a given Feature"
  „When Google Earth opens a KML file that contains a Feature with a TimePrimitive element, it displays a time slider. (Google Earth automatically selects the beginning and ending units for the time slider based on the earliest and latest times found in the KML Features in a particular file.) Using the slider and play button, the user can ‚play' the entire sequence or can select individual time periods for display."
  „To enable the time slider in Google Earth, go to View > Show Time, and select Automatically or Always. (The default is Automatically.)"
  „The Google Earth user interface time slider includes a time window that selects a ‚slice' of the time slider and moves from beginning to end of the time period."
  „TimeStamps are usually used for lightweight data sets that are shown in multiple locations (for example, Placemarks moving along a path)."
  „To display polygons and image overlays that transition instantly from one to the next, you can specify the beginning and ending of a time period using the TimeSpan object. This technique is typically used to show the changes in polygons and images such as ground overlays—for example, to show the retreating path of glaciers, the spread of volcanic ash, and the extent of logging efforts over the years."
- **Was das für BIOME hergibt:**
  - **Genau zwei Zeittypen, und sie sind nach Objektart zu wählen:** Zeitpunkt (`TimeStamp`) für bewegte oder punktuelle Ereignisse — bei BIOME: Sensormesswert, Kontrollgang, Baumkontrolle; Zeitspanne (`TimeSpan`) für Flächen und Overlays, die instantan wechseln — bei BIOME: Vegetationsfläche mit Gültigkeitszeitraum, Bodenkarte, Befliegung.
  - **Der Zeitschieber ist ein Sichtbarkeitsfilter, kein Nachladen.** „the complete data set is fetched when the KML file is loaded" — das ist eine belegte Architekturentscheidung mit direkten Folgen für die Datenmenge.
  - **Die Spanne des Schiebers wird automatisch aus den Daten abgeleitet** (frühestes/spätestes Datum). Keine manuelle Konfiguration.
  - **Der Schieber ist ausdrücklich ein Fenster („time window", „slice"), das über die Achse wandert** — deckungsgleich mit GE-15.
  - **„Show Time: Automatically | Always"** — es gibt einen dokumentierten dritten Zustand jenseits von an/aus: *nur zeigen, wenn Zeitdaten vorhanden sind*. Das ist der richtige Standard für BIOME, wo nur ein Teil der Ebenen Zeitbezug hat.
- **Deckt ausdrücklich nicht:** Aussehen, Maße, Farbe des Schiebers; Verhalten bei sich überlappenden Zeitspannen; Zeitzonen in der Anzeige.

---

## D-bis · Barrierefreiheit und Erscheinungsbild

### GE-17 · Screenreader, Tastatur, Bewegungsreduktion, Hell/Dunkel
- **Herausgeber:** Google — Dokumentation Google Earth
- **Quelle:** https://developers.google.com/maps/documentation/earth/accessibility
- **Abgerufen:** 2026-08-10 (HTTP 200, 185 374 Bytes)
- **Wörtlich (vollständig, ohne die Verweisliste):**
  „Use a screen reader — You can use Google Earth with ChromeVox, VoiceOver, NVDA, and JAWS. Google Earth works with Chrome, Firefox, Safari, and Edge."
  „Find keyboard shortcuts — To explore the Google Earth globe, use the arrow keys. To regain functionality of other shortcuts, type ‚g'. Tip: To find the list of shortcuts on Google Earth, type ‚?'."
  „Adjust animation settings — Animations help provide smooth transitions to navigate between different locations on the map. In settings Settings, you can control the speed of the animations or you can disable them."
  „Change Dark Mode settings — … In the upper right hand corner, click settings Settings. In Display settings, under ‚Application theme,' select Dark theme or Light theme."
- **Was das für BIOME hergibt:**
  - **Der Globus ist mit den Pfeiltasten bedienbar** — und dieser Modus **kapert die Pfeiltasten**, weshalb es eine dokumentierte Taste `g` gibt, um die übrigen Kürzel zurückzuholen. Das ist ein ehrlich benannter Zielkonflikt: eine Karte, die Tastaturnavigation zulässt, nimmt der restlichen Oberfläche Tasten weg. BIOME muss denselben Konflikt lösen und sollte ihn genauso ausdrücklich benennen.
  - **`?` öffnet die Kürzelliste** — die Standardgeste, kostenlos zu übernehmen.
  - **Animationsgeschwindigkeit ist regelbar und Animation ganz abschaltbar.** Nicht nur ein Ein/Aus, sondern ein Tempo. Für Kartenflüge in einem Fachwerkzeug (und für vestibuläre Beschwerden) relevant.
  - **Hell/Dunkel ist eine ausdrückliche Einstellung** („Application theme"), nicht nur Systemübernahme.
- **Deckt ausdrücklich nicht:** Was ein Screenreader auf der Karte tatsächlich vorliest, Fokusreihenfolge, Fokusringe, Kontrastanforderungen, Bedienbarkeit von Knowledge Card, Inspector oder Zeitleiste per Tastatur. **Zur Barrierefreiheit der eigentlichen Bedienelemente sagt die Quelle nichts.**

---

## E · Google Earth Pro Desktop — das ältere, aber ausführlicher belegte Layout

### GE-20 · Ebenen-Bereich mit Ankreuzfeldern und aufklappbaren Ordnern
- **Herausgeber:** Google — Google Earth-Hilfe
- **Quelle:** https://support.google.com/earth/answer/148130?hl=en · deutsch: `?hl=de` · sowie https://support.google.com/earth/answer/2663886?hl=en
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 388 555 / 1 388 360 Bytes; 2663886: HTTP 200, 1 378 412 Bytes)
- **Wörtlich (2663886, EN — die einzige Stelle, die das Schaltverhalten vollständig beschreibt):**
  „Layers display a variety of interesting geographic content. To view a layer, check the layer or layer folder in the Layers panel. To hide a layer or layer folder, uncheck it. To expand or collapse a layer folder, click the Arrows."
  „Note that some layer content does not appear until you zoom into an area."
- **Wörtlich (148130, EN):**
  „Layers show a variety of interesting geographic content. Learn more about places you visit by exploring layers such as borders, labels, transportation, places, 3D buildings, photos, 3D terrain, and more."
  „In the left-hand panel under ‚Layers,' check the layers you want to display on the map."
  „Tip: Uncheck any borders you don't want to display on the map."
- **Wörtlich (148130, DE):**
  „Mithilfe von Ebenen kann eine Vielzahl interessanter geografischer Inhalte dargestellt werden. Sie können sich z. B. Gebäude und Gelände in 3D ansehen oder auch Grenzen, Beschriftungen, Verkehrsmittel und Fotos anzeigen lassen und so mehr über Orte erfahren, die Sie besuchen."
  „Klicken Sie im linken Bereich unter ‚Ebenen' die Kästchen neben den Ebenen an, die auf der Karte zu sehen sein sollen."
- **Was das für BIOME hergibt:**
  - **Baum mit Ankreuzfeldern**, Ordner sind **selbst ankreuzbar** (Ordner-Häkchen schaltet die ganze Gruppe) und **unabhängig davon auf-/zuklappbar** über einen Pfeil. Zwei getrennte Interaktionen an derselben Zeile: Häkchen = Sichtbarkeit, Pfeil = Ausklappen. Das ist der klassische Ebenenbaum, und er ist hier ausdrücklich belegt.
  - **Ebenen können zoomabhängig sein** („does not appear until you zoom into an area"). Ein angehaktes, aber nicht sichtbares Element ist ein dokumentierter Normalzustand — BIOME braucht dafür einen Hinweis in der Liste.
  - Deutsche Terminologie: **„Ebenen"**, **„Kästchen"**, **„linker Bereich"**.
- **Deckt ausdrücklich nicht:** Tiefe der Verschachtelung, ob Teilauswahl (halbes Häkchen) dargestellt wird, Reihenfolge/Sortierung, Suche im Ebenenbaum. Nichts davon ist dokumentiert.

### GE-21 · Orte-Bereich: „Meine Orte", „Temporäre Orte", Ordner, Ziehen und Ablegen
- **Herausgeber:** Google — Google Earth-Hilfe
- **Quelle:** https://support.google.com/earth/answer/148142?hl=en (deutsch: `?hl=de`) · https://support.google.com/earth/answer/176685?hl=en (deutsch: `?hl=de`)
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 401 195 / 1 414 340 Bytes; DE: 1 416 847 Bytes)
- **Wörtlich (148142, EN):**
  „In the left panel under ‚My Places' you can drag a placemark or folder anywhere on the list, including into other folders."
  „If you move placemarks or sub-folders to a folder with custom settings, those settings will apply everything in that folder."
  „Select Add ▸ Folder. A ‚New Folder' window opens. Add folder info that will apply to all placemarks and folders in that folder."
  „Note: To add a sub-folder, right-click on an existing folder."
  „Important: If you delete a folder, everything in it is also deleted, including sub-folders and icons."
  „To organize folders, change the icon for placemarks and folders. You can't assign an icon for a folder that holds different things, such as placemarks and overlays."
  „In the left panel under ‚My Places,' right-click the placemark or folder and click Snapshot View. The current view is then set as the view for the selected placemark or folder."
  „You can change the angle or direction of the view over the placemark. To create a consistent viewing angle of all placemarks in that folder, change the 3D view for that folder."
- **Wörtlich (176685, EN):**
  „The imported data is located in the Temporary Places folder within the Places Panel. If you want to save imported data, before you exit Google Earth, drag this data out of this folder and choose File ▸ Save ▸ Save My Places."
  „Every location that you import from your text file is converted to a Google Earth placemark and listed in your Places."
  „Set the location of the new overlay in any folder inside the ‚Places' panel."
- **Wörtlich (176685, DE):**
  „Die importierte Datei befindet sich im Ordner ‚Temporäre Orte' im Bereich ‚Orte'."
  „Legen Sie fest, in welchem Ordner im Bereich ‚Orte' das neue Overlay abgelegt werden soll."
  „Erstellen Sie Unterordner, um Datenelemente für Orte basierend auf Farbgruppen anzuzeigen. Zum Ein- und Ausblenden der Farbgruppen klicken Sie einfach das Kästchen neben dem Ordner an."
- **Was das für BIOME hergibt:**
  - **Zwei Wurzeln im Orte-Bereich mit unterschiedlicher Lebensdauer:** „Meine Orte" (dauerhaft) und **„Temporäre Orte"** (geht beim Beenden verloren, sofern nicht herausgezogen). Das ist ein sehr gutes, unterschätztes Muster für BIOME-Importe: Fremddaten landen sichtbar in einem Vorraum und werden bewusst übernommen, nicht stillschweigend gespeichert.
  - **Ordner tragen Einstellungen, die auf ihren Inhalt durchschlagen** („settings will apply everything in that folder", Ansichtswinkel je Ordner). Ordner sind hier Konfigurationsträger, nicht bloß Ablage.
  - **Freies Umsortieren per Ziehen**, Verschachtelung beliebig — anders als im aktuellen Earth (GE-08), das nur „nach vorn/nach hinten" kennt.
  - **Ordner löschen löscht den Inhalt**, ausdrücklich mit „Important" gekennzeichnet.
  - Ordner-Symbole nur bei einheitlichem Inhalt — ein belegter Fall, in dem eine Funktion bewusst gesperrt wird statt ein sinnloses Ergebnis zu liefern.
  - Stilvorlagen erzeugen **Unterordner je Farbgruppe**, deren Kästchen die Gruppe schaltet: die Legende ist hier zugleich die Filterliste. (DE-Zitat oben.)
- **Deckt ausdrücklich nicht:** Breite des Bereichs, Verhältnis zwischen Orte- und Ebenen-Bereich (übereinander? getrennt scrollbar?), Mehrfachauswahl, Suche innerhalb der Orte.

### GE-22 · Suche mit Verlauf als eigener Bereich
- **Herausgeber:** Google — Google Earth-Hilfe
- **Quelle:** https://support.google.com/earth/answer/148081?hl=en · deutsch: `?hl=de`
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 389 514 Bytes; DE: 1 389 370 Bytes)
- **Wörtlich (EN):**
  „At the top left, select Search box and type a location."
  „Google Earth saves your most recent searches. On your computer, you'll find recent searches in a list when you type in the Search box."
  „On the left-hand panel under ‚Search,' click History."
  „If the Search History isn't already open, go to the end of the row ▸ click More. You'll find a folder for each place you've searched."
  „At the bottom right, click Clear History."
- **Wörtlich (DE):**
  „Klicken Sie im linken Bereich unter ‚Suche' auf Verlauf." · „Klicken Sie rechts unten auf Verlauf löschen."
- **Wörtlich (EN, unterstützte Eingaben — vollständig):** „City, State", „City, Country", „Street name", „Specific address", „Zip or Postal code", „Longitude, Latitude: in decimal format, 37.7, -122.2 or DMS format, 37 25'19.07"N, 122 05'06.24"W", „General places: coffee in NYC"
- **Was das für BIOME hergibt:**
  - Der Suchverlauf ist **ein Ordner pro gesuchtem Ort im selben Baum** wie alles andere — Suchergebnisse sind Datenobjekte, keine flüchtige Trefferliste. Für BIOME: Ergebnisse einer Katasterabfrage als speicherbarer Zweig.
  - „Clear History" liegt **unten rechts am Ende der Ergebnisliste**, mit ausdrücklichem Hinweis, dass man dafür scrollen muss („If you haven't cleared your history in a while, scroll down to find it") — dokumentierte Schwäche, die BIOME nicht nachbauen sollte.
  - Die Suche akzeptiert **Koordinaten in zwei Formaten** gleichberechtigt mit Adressen.
- **Deckt ausdrücklich nicht:** Suche über Attribute eigener Daten, Filter, Umkreissuche.

### GE-23 · 3D-Viewer und Navigationselemente in Earth Pro Desktop
- **Herausgeber:** Google — Google Earth-Hilfe
- **Quelle:** https://support.google.com/earth/answer/148186?hl=en · deutsch: `?hl=de`
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 395 668 Bytes; DE: 1 395 818 Bytes)
- **Wörtlich (EN):**
  „Check out mountains, hills, landmarks, and underwater scenery with the 3D viewer."
  „The navigation controls are in the upper right corner of the map and fade when you aren't using them."
  „To show navigation controls, mouse over the right corner of the map."
  „If you don't find the navigation controls, in the top menu, click View ▸ Show Navigation ▸ Automatically."
  „Show or hide the compass: In the top menu, click View ▸ Show Navigation."
  „In the top right corner, on the compass, click the up arrow. The compass and globe will both return to a north-facing view."
  „To return to the default view: Click the map and press r."
  „Under ‚Terrain,' enter a number between .01 and 3 for ‚Elevation Exaggeration.' 1.5 shows a natural elevation."
  „You can change where you start each time you launch Google Earth. … In the top menu, click View ▸ Make this my start location."
- **Wörtlich (DE):** „Im 3D-Viewer von Google Earth haben Sie die Möglichkeit, sich Berge, Hügel, Sehenswürdigkeiten und sogar Unterwasserlandschaften anzusehen."
- **Was das für BIOME hergibt:**
  - **Das Kartenfenster heißt offiziell „3D viewer" / „3D-Viewer"** — nicht „Karte", nicht „Viewport". Das ist die einzige belegte deutsche Bezeichnung für die Kartenfläche.
  - **Navigationselemente blenden sich bei Nichtbenutzung aus** und kommen bei Mausannäherung an das Eck zurück. Dazu ein Dreizustand „Automatically" im Menü. Die Karte gehört den Daten, nicht den Knöpfen.
  - **Es gibt einen benannten Rücksprung** („default view", Taste `r`) und eine **speicherbare Startansicht** („Make this my start location"). Beides sollte BIOME haben — Startausschnitt der Kommune, Rücksprungtaste.
  - Überhöhung des Geländes ist ein Zahlenwert **0,01 bis 3**, empfohlen 1,5. (Die englische Fassung nennt an einer Stelle „.01 and 3", an anderer „0.01 to 3.0" — dieselbe Spanne.)
- **Deckt ausdrücklich nicht:** Aufbau der Navigationselemente im Detail, Maße, Statusleiste in Earth Pro (die aktuelle Hilfe erwähnt für Earth Pro **keine** Statusleiste — belegt ist sie nur für das aktuelle Earth, GE-03).

---

## F · Das dokumentierte Datenmodell hinter der Oberfläche (KML)

Die KML-Referenz ist die **präziseste** Quelle zu Google Earths Ebenen- und
Infofenster-Semantik, weil sie die Oberfläche aus Sicht des Datenformats
beschreibt. Sie gilt für Google Earth Pro Desktop.

### GE-30 · `ListStyle`/`listItemType` — die vier Schaltmodi eines Ebenenbaums
- **Herausgeber:** Google — KML Reference
- **Quelle:** https://developers.google.com/kml/documentation/kmlreference
- **Abgerufen:** 2026-08-10 (HTTP 200, 405 062 Bytes)
- **Wörtlich:**
  „Specifies how a Feature is displayed in the list view. The list view is a hierarchy of containers and children; in Google Earth, this is the Places panel."
  „check (default) - The Feature's visibility is tied to its item's checkbox."
  „radioFolder - When specified for a Container, only one of the Container's items is visible at a time"
  „checkOffOnly - When specified for a Container or Network Link, prevents all items from being made visible at once—that is, the user can turn everything in the Container or Network Link off but cannot turn everything on at the same time. This setting is useful for Containers or Network Links containing large amounts of data."
  „checkHideChildren - Use a normal checkbox for visibility but do not display the Container or Network Link's children in the list view. A checkbox allows the user to toggle visibility of the child objects in the viewer."
  „<ItemIcon> Icon used in the List view that reflects the state of a Folder or Link fetch. Icons associated with the open and closed modes are used for Folders and Network Links. Icons associated with the error and fetching0, fetching1, and fetching2 modes are used for Network Links."
  „<state> Specifies the current state of the NetworkLink or Folder. Possible values are open, closed, error, fetching0, fetching1, and fetching2."
- **Was das für BIOME hergibt:** Das ist die **vollständigste dokumentierte Spezifikation eines Ebenenbaums, die Google veröffentlicht hat**, und sie ist unmittelbar auf BIOME übertragbar:
  - **`check`** — normales Kontrollkästchen. Standard.
  - **`radioFolder`** — **Optionsfeld-Gruppe: genau ein Kind sichtbar.** Genau das braucht BIOME für sich ausschließende Darstellungen: eine Basiskarte, ein Bodenparameter, ein Sensorkanal, ein Stichjahr.
  - **`checkOffOnly`** — „alles aus" erlaubt, „alles an" verboten, ausdrücklich begründet mit **Datenmenge**. Für BIOME der richtige Modus über einer Gruppe schwerer Rasterebenen.
  - **`checkHideChildren`** — Gruppe schaltbar, Kinder in der Liste **verborgen**. Gegen unübersichtliche Bäume mit tausenden Einzelobjekten (Baumkataster!).
  - **Ladezustände gehören ins Baum-Icon**: `open`, `closed`, `error`, `fetching0/1/2`. Also ein **Fehlerzustand und eine dreiphasige Ladeanimation direkt am Baumknoten** — nicht als globaler Spinner. Für BIOME mit entfernten WMS-/WFS-Diensten genau richtig.
- **Deckt ausdrücklich nicht:** Aussehen, Maße, Icon-Grafiken (die Referenz verweist nur auf ein Bildschirmfoto: „The following screen capture illustrates the Google Earth icons for these states" — das Bild ist im HTML nicht als Text verfügbar), Tastaturbedienung, Teilauswahl-Darstellung.

### GE-31 · `visibility`, `open`, `Snippet` — Ausgangszustand und Zweitzeile im Baum
- **Herausgeber:** Google — KML Reference, Abschnitt `<Feature>`
- **Quelle:** https://developers.google.com/kml/documentation/kmlreference
- **Abgerufen:** 2026-08-10 (HTTP 200, 405 062 Bytes)
- **Wörtlich:**
  „<name> User-defined text displayed in the 3D viewer as the label for the object (for example, for a Placemark, Folder, or NetworkLink)."
  „<visibility> Boolean value. Specifies whether the feature is drawn in the 3D viewer when it is initially loaded. In order for a feature to be visible, the <visibility> tag of all its ancestors must also be set to 1. In the Google Earth List View, each Feature has a checkbox that allows the user to control visibility of the Feature."
  „<open> Boolean value. Specifies whether a Document or Folder appears closed or open when first loaded into the Places panel. 0=collapsed (the default), 1=expanded."
  „<Snippet maxLines=„2"> A short description of the feature. In Google Earth, this description is displayed in the Places panel under the name of the feature."
- **Was das für BIOME hergibt:**
  - **Sichtbarkeit ist konjunktiv über die gesamte Elternkette** („the <visibility> tag of all its ancestors must also be set to 1"). Ein angehaktes Kind in einem abgehakten Ordner ist unsichtbar. Diese Regel muss BIOME explizit implementieren und dem Nutzer erklären.
  - **Der Ausgangszustand ist Teil der Daten, nicht der Oberfläche:** jede Ebene bringt mit, ob sie beim Laden sichtbar und ob ihr Ordner aufgeklappt ist. Standard ist **zugeklappt**.
  - **Zwei Zeilen pro Baumeintrag sind vorgesehen:** Name plus `Snippet` darunter, standardmäßig **maximal zwei Zeilen**. Das ist die belegte Rechtfertigung für eine zweizeilige Ebenenzeile mit Kurzbeschreibung (z. B. „Baumkataster 2025 · 12 483 Objekte · Stand 03/2026").
- **Deckt ausdrücklich nicht:** Zeilenhöhen, Schriftgrößen, Einrückung je Ebene.

### GE-32 · `BalloonStyle` — was das Infofenster in Earth Pro standardmäßig enthält
- **Herausgeber:** Google — KML Reference
- **Quelle:** https://developers.google.com/kml/documentation/kmlreference
- **Abgerufen:** 2026-08-10 (HTTP 200, 405 062 Bytes)
- **Wörtlich:**
  „Specifies how the description balloon for placemarks is drawn. The <bgColor>, if specified, is used as the background color of the balloon."
  „<text> Text displayed in the balloon. If no text is specified, Google Earth draws the default balloon (with the Feature <name> in boldface, the Feature <description>, links for driving directions, a white background, and a tail that is attached to the point coordinates of the Feature, if specified)."
  „You can add entities to the <text> tag using the following format to refer to a child element of Feature: $[name], $[description], $[address], $[id], $[Snippet]."
  „<bgColor> Background color of the balloon (optional). … The default is opaque white (ffffffff)."
  „<textColor> Foreground color for text. The default is black (ff000000)."
  „<displayMode> If <displayMode> is default, Google Earth uses the information supplied in <text> to create a balloon. If <displayMode> is hide, Google Earth does not display the balloon. In Google Earth, clicking the List View icon for a Placemark whose balloon's <displayMode> is hide causes Google Earth to fly to the Placemark."
- **Was das für BIOME hergibt:**
  - **Die einzige belegte Anatomie eines Google-Earth-Infofensters überhaupt.** Standardinhalt: **Name fett**, **Beschreibung**, **Aktionslinks**, **weißer Grund**, **Zeiger („tail") zum Objektpunkt**. Mehr ist nicht dokumentiert — und mehr braucht eine Objektkarte auch nicht.
  - **Der Inhalt ist eine Vorlage mit Platzhaltern** (`$[name]`, `$[description]`, `$[address]`, `$[id]`, `$[Snippet]`). Für BIOME: die Objektkarte einer Ebene sollte **konfigurierbar** sein, nicht fest verdrahtet — pro Ebene eine Feldvorlage.
  - **`displayMode=hide` ist ein eigener, sinnvoller Zustand:** kein Infofenster, stattdessen **fliegt die Karte zum Objekt**. Für BIOME-Ebenen ohne Attributinhalt (reine Geometrien) genau richtig — kein leeres Fenster öffnen.
  - Standardfarben: **Grund `ffffffff` (deckendes Weiß), Text `ff000000` (Schwarz)**. Das Infofenster ist eine helle Fläche über der Karte, unabhängig vom Kartenbild.
  - Erweiterung `gx:balloonVisibility` existiert, um Ballons per Daten zu öffnen (in der Referenz erwähnt).
- **Deckt ausdrücklich nicht:** Maße, maximale Breite, Scrollverhalten, Position relativ zum Objekt (nur „a tail that is attached to the point coordinates"), Schließen-Geste. **Kein dokumentiertes Maß, keine dokumentierte Elevation.**

---

## G · Material Design — nur belegte Maße und Regeln

**Vorbemerkung:** `m3.material.io` und `m2.material.io` liefern über `curl` und
über WebFetch **kein** Inhaltstext (siehe „Nicht zugänglich"). Alle folgenden
Werte stammen deshalb aus Googles **eigenen, veröffentlichten
Design-Token-Dateien** im Repository `material-components/material-components-android`.
Diese Dateien tragen im Kopf ausdrücklich:
„AUTOGENERATED FILE. DO NOT MODIFY." und je Block
„Generated from token set (md.sys.elevation) in context (platform=android, audience=3p)."
— sie sind also der maschinell erzeugte Abzug der Material-3-Tokens, nicht eine
Interpretation. Die Repository-Version zum Abrufzeitpunkt war `<!-- Version: 34.0.0 -->`.
Die Werte sind in **dp** angegeben (Android-Kontext).

### MD-01 · Elevation — die sechs Stufen mit ihren dp-Werten
- **Herausgeber:** Google — Material Components for Android, Token-Abzug `md.sys.elevation`
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/elevation/res/values/tokens.xml
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 183 Bytes)
- **Wörtlich (vollständig):**
  „`<dimen name="m3_sys_elevation_level5">12dp</dimen>`
  `<dimen name="m3_sys_elevation_level4">8dp</dimen>`
  `<dimen name="m3_sys_elevation_level3">6dp</dimen>`
  `<dimen name="m3_sys_elevation_level2">3dp</dimen>`
  `<dimen name="m3_sys_elevation_level1">1dp</dimen>`
  `<dimen name="m3_sys_elevation_level0">0dp</dimen>`"
- **Gegenprobe (Web-Tokens, identische Stufung):** https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/v0_192/_md-sys-elevation.scss (HTTP 200, 798 Bytes) — „'level0': … 0, 'level1': … 1, 'level2': … 3, 'level3': … 6, 'level4': … 8, 'level5': … 12". Die Hauptdatei `tokens/_md-sys-elevation.scss` (HTTP 200, 932 Bytes) überschreibt das für Web mit den bloßen Stufennummern und begründet das wörtlich: „Elevation levels on web should use the level number, not the dp value."
- **Was das für BIOME hergibt:** **Es gibt genau sechs erlaubte Höhenstufen: 0, 1, 3, 6, 8, 12 dp.** Keine Zwischenwerte. Eine Kartenoberfläche mit Rail, Panel, Karte, Objektkarte und Zeitleiste braucht davon höchstens drei bis vier — die Stufen sind ein Ordnungsmittel, kein Farbverlauf.
- **Deckt ausdrücklich nicht:** Schattenparameter (Unschärfe, Versatz, Farbe, Deckkraft) für die einzelnen Stufen. Die stehen nicht in dieser Datei. **Für Web ist die dp-Stufung ausdrücklich nicht anwendbar** — dort ist „Elevation" nur eine Stufennummer.

### MD-02 · Ecken-Radien — die vollständige Shape-Skala
- **Herausgeber:** Google — Token-Abzug `md.sys.shape`
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/shape/res/values/tokens.xml
- **Abgerufen:** 2026-08-10 (HTTP 200, 5 507 Bytes)
- **Wörtlich (die Werteliste, vollständig):**
  „`<dimen name="m3_sys_shape_corner_value_none">0dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_extra_small">4dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_small">8dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_medium">12dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_large">16dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_large_increased">20dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_extra_large">28dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_extra_large_increased">32dp</dimen>`
  `<dimen name="m3_sys_shape_corner_value_extra_extra_large">48dp</dimen>`"
- **Wörtlich (die zugehörigen Stile):**
  „ShapeAppearance.M3.Sys.Shape.Corner.Full … `<item name="cornerSize">50%</item>`"
  „ShapeAppearance.M3.Sys.Shape.Corner.ExtraLarge … `<item name="cornerSize">28dp</item>`"
  „ShapeAppearance.M3.Sys.Shape.Corner.Large … `<item name="cornerSize">16dp</item>`"
  „ShapeAppearance.M3.Sys.Shape.Corner.Medium … `<item name="cornerSize">12dp</item>`"
  „ShapeAppearance.M3.Sys.Shape.Corner.Small … `<item name="cornerSize">8dp</item>`"
  „ShapeAppearance.M3.Sys.Shape.Corner.ExtraSmall … `<item name="cornerSize">4dp</item>`"
- **Was das für BIOME hergibt:** Erlaubte Radien: **0 / 4 / 8 / 12 / 16 / 20 / 28 / 32 / 48 dp und „voll" (50 %)** — neun feste Werte, keine freien Zwischenstufen. Cards nutzen Medium = 12 dp (MD-08), angedockte Side Sheets Corner.None = 0 dp und freistehende Large = 16 dp (MD-06), Bottom Sheets ExtraLarge = 28 dp (MD-07), aktive Navigationsindikatoren „Full" (MD-04/05).
- **Deckt ausdrücklich nicht:** asymmetrische Formen — die Datei nennt sie nur als „suppressed" und verweist auf `ShapeAppearanceOverlay.Material3.Corner.Top/Left/Right`, ohne eigene Werte. Ebenso wenig: wann welche Stufe zu wählen ist (das stünde auf `m3.material.io`, siehe „Nicht zugänglich").

### MD-03 · Farbrollen — die vollständige Surface-Familie und was sie bedeutet
- **Herausgeber:** Google — Material Components for Android, „Color theming"
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Color.md
- **Abgerufen:** 2026-08-10 (HTTP 200, 41 759 Bytes)
- **Wörtlich (Systemaufbau):**
  „We provide three accent color groups (Primary, Secondary, Tertiary), each with 4-5 color roles that you can customize to represent your brand color"
  „The Material Design color theming system provides additional colors which don't represent your brand, but define your UI and ensure accessible color combinations."
- **Wörtlich (die Surface- und Struktur-Rollen mit ihren Baseline-Tonwerten, hell / dunkel):**
  „Surface | colorSurface | neutral98 | … | neutral6"
  „On Surface | colorOnSurface | neutral10 | … | neutral90"
  „Surface Variant | colorSurfaceVariant | neutral_variant90 | … | neutral_variant30"
  „On Surface Variant | colorOnSurfaceVariant | neutral_variant30 | … | neutral_variant80"
  „Surface Bright | colorSurfaceBright | neutral98 | … | neutral24"
  „Surface Dim | colorSurfaceDim | neutral87 | … | neutral6"
  „Surface Container Lowest | colorSurfaceContainerLowest | white | … | neutral4"
  „Surface Container Low | colorSurfaceContainerLow | neutral96 | … | neutral10"
  „Surface Container | colorSurfaceContainer | neutral94 | … | neutral12"
  „Surface Container High | colorSurfaceContainerHigh | neutral92 | … | neutral17"
  „Surface Container Highest | colorSurfaceContainerHighest | neutral90 | … | neutral22"
  „Outline | colorOutline | neutral_variant50 | … | neutral_variant60"
  „Outline Variant | colorOutlineVariant | neutral_variant80 | … | neutral_variant30"
  „Inverse Surface | colorSurfaceInverse | neutral20 | … | neutral90"
  „Error | colorError | error40 | … | error80" · „Error Container | colorErrorContainer | error90 | … | error30"
- **Wörtlich (die zentrale Regeländerung):**
  „As of version 1.11.0-alpha02 and above, Material3 components will use the following tonal surface color roles by default (instead of elevation overlays which involved blending the Surface and Primary colors): colorSurfaceContainer, colorSurfaceContainerLow, colorSurfaceContainerHigh, colorSurfaceContainerLowest, colorSurfaceContainerHighest, colorSurfaceDim, colorSurfaceBright"
  „Note: Surface with elevation overlay has been replaced with tonal surface colors in Material's components. … The maintenance to the elevation overlay has been discontinued."
- **Was das für BIOME hergibt:**
  - **Hierarchie wird durch Farbe gebaut, nicht durch Schatten.** Das ist die aktuell gültige Regel und sie widerspricht dem älteren Material-Verständnis ausdrücklich („The maintenance to the elevation overlay has been discontinued"). Für eine Kartenoberfläche mit vielen flächigen Panels ist das die richtige Richtung: fünf abgestufte Container-Flächen statt fünf Schattenstärken.
  - **Fünf Container-Stufen** (Lowest, Low, Standard, High, Highest) plus **Dim/Bright** — genug, um Rail, Ebenenliste, Objektkarte, Zeitleiste und Karte voneinander abzuheben, ohne einen einzigen Schatten.
  - Die Baseline-Tonwerte (`neutral98`, `neutral96`, `neutral94`, `neutral92`, `neutral90` hell / `neutral4`…`neutral22` dunkel) zeigen: die **Abstände zwischen den Stufen sind 2 Tonwerte im Hellmodus** — sehr subtil, absichtlich.
  - **`Outline` vs. `Outline Variant`** sind getrennte Rollen: eine für tragende Trennlinien, eine für schwache. Für Ebenenlisten und Kartenlegenden relevant.
  - **`onSurfaceVariant` ist die dokumentierte Rolle für sekundäre Symbole und Beschriftungen** (siehe MD-04/05: inaktive Icons und Labels in Rail und Drawer nutzen genau diese Rolle) — nicht „Grau mit 60 % Deckkraft".
- **Deckt ausdrücklich nicht:** **Konkrete Hex-Werte.** Die Tabelle nennt nur Tonwertnamen der Referenzpalette (`neutral98` usw.), nicht deren Farbwerte. Diese entstehen erst aus einer Quellfarbe über den Material-Farbalgorithmus. Wer aus diesem Register Hex-Codes ableiten will, hat dafür **keine** Deckung. Ebenso nicht gedeckt: Kontrastverhältnisse der Rollenpaare (die Quelle behauptet nur „ensure accessible color combinations", ohne Zahl).

### MD-04 · Navigation Rail — Maße und Farbrollen
- **Herausgeber:** Google — Token-Abzug `md.comp.nav-rail` u. a. · sowie Komponentendoku
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/navigationrail/res/values/tokens.xml · https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/NavigationRail.md
- **Abgerufen:** 2026-08-10 (HTTP 200, 5 376 Bytes / HTTP 200, 32 013 Bytes)
- **Wörtlich (Tokens, Maße):**
  „`m3_comp_nav_rail_collapsed_container_width` 96dp" · „`m3_comp_nav_rail_collapsed_narrow_container_width` 80dp"
  „`m3_comp_nav_rail_expanded_container_width_minimum` 220dp" · „`m3_comp_nav_rail_expanded_container_width_maximum` 360dp"
  „`m3_comp_nav_rail_collapsed_top_space` 44dp" · „`m3_comp_nav_rail_collapsed_item_vertical_space` 4dp"
  „`m3_comp_nav_rail_item_container_height` 64dp" · „`m3_comp_nav_rail_item_short_container_height` 56dp"
  „`m3_comp_nav_rail_item_icon_size` 24dp"
  „`m3_comp_nav_rail_item_vertical_active_indicator_height` 32dp" · „`m3_comp_nav_rail_item_vertical_active_indicator_width` 56dp"
  „`m3_comp_nav_rail_item_horizontal_active_indicator_height` 56dp"
  „`m3_comp_nav_rail_item_vertical_icon_label_space` 4dp" · „`m3_comp_nav_rail_item_horizontal_icon_label_space` 8dp"
  „`m3_comp_nav_rail_item_header_space_minimum` 40dp"
  „`m3_comp_nav_rail_collapsed_container_elevation` @dimen/m3_sys_elevation_level0"
- **Wörtlich (Tokens, Farbrollen):**
  „`m3_comp_nav_rail_collapsed_container_color` ?attr/colorSurface"
  „`m3_comp_nav_rail_item_active_indicator_color` ?attr/colorSecondaryContainer"
  „`m3_comp_nav_rail_item_active_icon_color` ?attr/colorOnSecondaryContainer"
  „`m3_comp_nav_rail_item_active_label_text_color` ?attr/colorSecondary"
  „`m3_comp_nav_rail_item_inactive_label_text_color` ?attr/colorOnSurfaceVariant"
  „`m3_comp_nav_rail_item_inactive_icon_color` ?attr/colorOnSurfaceVariant"
  „ShapeAppearance.M3.Comp.NavRail.Item.ActiveIndicator.Shape parent=„ShapeAppearance.M3.Sys.Shape.Corner.Full""
- **Wörtlich (NavigationRail.md, „M3 Expressive styles — Measurement changes from M3"):**
  „Width: from 80dp to 96dp" · „Item minimum height: from 60dp to 64dp" · „Item spacing: from 0dp to 4dp" · „Elevation: from 0dp to 3dp" · „Top item padding: from 4dp to 6dp" · „Bottom item padding: from 12dp to 4dp" · „Top margin of navigation rail content: from 8dp to 44dp" · „Padding between optional header view and navigation rail items: from 8dp to 40dp" · „Label text is no longer bolded when selected"
- **Wörtlich (NavigationRail.md, Farbänderung):** „Active label on vertical items changed from **on surface variant** to **secondary**"
- **Was das für BIOME hergibt:**
  - **Eingeklappte Rail: 80 dp (schmal) bzw. 96 dp (aktuell). Ausgeklappt: 220 bis 360 dp.** Das sind die belegten Zahlen für eine linke Werkzeugleiste neben der Karte — und die 220–360-dp-Spanne ist genau die Breite, die eine BIOME-Ebenenliste braucht.
  - **Die Rail ist flach (Elevation Level 0) und liegt auf `colorSurface`** — sie hebt sich nicht durch Schatten von der Karte ab, sondern durch Farbe.
  - **Der aktive Zustand ist eine vollgerundete Pille in `secondaryContainer`**, 56 × 32 dp bei vertikalen Einträgen, 56 dp hoch bei horizontalen. Nicht ein Farbbalken, nicht eine Unterstreichung.
  - **Eintragshöhe 64 dp (kurz: 56 dp), Icon 24 dp.** Beides deutlich über der 48-dp-Mindestgröße (MD-09).
  - **Inaktive Symbole und Beschriftungen nutzen `onSurfaceVariant`**, aktive `onSecondaryContainer`/`secondary`. Keine Deckkraft-Tricks.
- **Deckt ausdrücklich nicht:** wann eingeklappt und wann ausgeklappt zu verwenden ist (siehe MD-10/MD-11), Verhalten beim Umschalten, Animationsdauer, ob eine Rail scrollen darf.

### MD-05 · Navigation Drawer — Maße und Farbrollen
- **Herausgeber:** Google — Token-Abzug `md.comp.navigation-drawer` · Komponentendoku
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/navigation/res/values/tokens.xml · https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/NavigationDrawer.md
- **Abgerufen:** 2026-08-10 (HTTP 200, 5 116 Bytes / HTTP 200, 31 204 Bytes)
- **Wörtlich (Tokens):**
  „`m3_comp_navigation_drawer_container_width` 360dp"
  „`m3_comp_navigation_drawer_modal_container_color` ?attr/colorSurfaceContainerLow"
  „`m3_comp_navigation_drawer_modal_container_elevation` @dimen/m3_sys_elevation_level1"
  „`m3_comp_navigation_drawer_standard_container_elevation` @dimen/m3_sys_elevation_level0"
  „`m3_comp_navigation_drawer_icon_size` 24dp"
  „`m3_comp_navigation_drawer_active_indicator_color` ?attr/colorSecondaryContainer"
  „`m3_comp_navigation_drawer_headline_color` ?attr/colorOnSurfaceVariant" · „`m3_comp_navigation_drawer_headline_type` ?attr/textAppearanceTitleSmall"
  „`m3_comp_navigation_drawer_label_text_type` ?attr/textAppearanceLabelLarge"
  „ShapeAppearance.M3.Comp.NavigationDrawer.ActiveIndicator.Shape parent=„ShapeAppearance.M3.Sys.Shape.Corner.Full""
- **Wörtlich (NavigationDrawer.md, Android-Implementierungswerte — weichen ab):**
  „**Max width** | `android:maxWidth` | N/A | `280dp`"
  „**Drawer corner size** | `drawerLayoutCornerSize` | N/A | `16dp`"
  „**Horizontal padding** | `app:itemHorizontalPadding` | … | `28dp`" · „**Vertical padding** | `app:itemVerticalPadding` | … | `4dp`"
  „**Insets** | `app:itemShapeInsetStart` … | `12dp`, `0dp`, `12dp`, `0dp`"
  „**Size** | `app:itemIconSize` | `setItemIconSize` | `24dp`" · „**Padding** | `app:itemIconPadding` | … | `12dp`"
  „**Height** (Divider) | … | `1dp`" · „**Inset** | `app:dividerInsetStart`/`End` | … | `28dp`/`28dp`"
  „To open navigation drawers, use clickable widgets that meet the minimum touch target size of `48dp` and are properly labeled for accessibility. To close navigation drawers, consider doing the same but bear in mind that clicking on menu items or an optional scrim should also serve this purpose."
- **Was das für BIOME hergibt:**
  - **Drawer-Breite: 360 dp laut Design-Token, 280 dp als Android-Implementierungsgrenze.** Die beiden Zahlen widersprechen sich; das Token ist die Spezifikation, `maxWidth` die Bibliotheksvorgabe. Wer zitiert, muss sagen welche.
  - **Modal vs. Standard unterscheiden sich in genau zwei Dingen:** Elevation (Level 1 vs. Level 0) und Scrim. Sonst identisch.
  - **Der aktive Eintrag ist wieder eine vollgerundete Pille in `secondaryContainer`** — identisch zur Rail. Ein durchgehendes Muster.
  - **Einrückungen sind großzügig: 28 dp horizontal**, Trennlinien 1 dp mit 28 dp Einzug beidseitig.
  - **Das Schließen darf auf drei Wegen geschehen:** Schließknopf, Menüeintrag, Scrim-Klick. Ausdrücklich dokumentiert.
- **Deckt ausdrücklich nicht:** wann Modal und wann Standard zu verwenden ist, Verhältnis zur Navigation Rail, Animationen.

### MD-06 · Side Sheet — die rechte Fläche
- **Herausgeber:** Google — Token-Abzug `md.comp.sheet.side` · Komponentendoku
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/sidesheet/res/values/tokens.xml · https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/SideSheet.md
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 878 Bytes / HTTP 200, 18 135 Bytes)
- **Wörtlich (Tokens, vollständig):**
  „`m3_comp_sheet_side_docked_container_width` 256dp"
  „`m3_comp_sheet_side_docked_standard_container_color` ?attr/colorSurface"
  „`m3_comp_sheet_side_docked_modal_container_color` ?attr/colorSurfaceContainerLow"
  „`m3_comp_sheet_side_docked_standard_container_elevation` @dimen/m3_sys_elevation_level0"
  „`m3_comp_sheet_side_docked_modal_container_elevation` @dimen/m3_sys_elevation_level1"
  „ShapeAppearance.M3.Comp.Sheet.Side.Docked.Container.Shape parent=„ShapeAppearance.M3.Sys.Shape.Corner.None""
  „`m3_comp_sheet_side_detached_container_shape` ?attr/shapeAppearanceCornerLarge"
  „`m3_comp_sheet_side_docked_modal_container_shape` ?attr/shapeAppearanceCornerLarge"
- **Wörtlich (SideSheet.md, Anatomie):**
  „Side sheets are surfaces containing supplementary content that are anchored to the side of the screen. There are two variants of side sheets. 1. Standard side sheet 2. Modal side sheet"
  Standard: „1. Divider (optional) 2. Headline 3. Container 4. Close affordance"
  Modal: „1. Back icon button (optional) 2. Header 3. Container 4. Close icon button 5. Divider (optional) 6. Action (optional) 7. Scrim"
- **Was das für BIOME hergibt:**
  - **Angedockte Side Sheet: 256 dp breit, eckig (Corner.None), Elevation 0, auf `colorSurface`.** Freistehend („detached") oder modal: 16 dp Radius.
  - **Die Anatomie ist die belegte Bauanleitung für das BIOME-Objektdatenblatt:** Überschrift, Inhaltsfläche, Schließ-Affordanz, optionale Trennlinie — beim modalen Fall zusätzlich Zurück-Knopf, Aktion und Scrim.
  - **Ein Zurück-Knopf ist vorgesehen** — die Side Sheet darf mehrstufig sein (Ebene ▸ Objekt ▸ Messreihe). Sehr relevant für Sensorik.
  - **Standard-Variante hat keinen Scrim und keine Erhebung** — sie ist Teil des Layouts, nicht ein Überlagerungsdialog. Genau das braucht ein Kartenprodukt, in dem die Karte weiter bedienbar bleiben muss.
- **Deckt ausdrücklich nicht:** maximale Breite, Verhalten bei schmalen Fenstern, ob mehrere Sheets gestapelt werden dürfen, Höhe des Headers.

### MD-07 · Bottom Sheet — für schmale Fenster
- **Herausgeber:** Google — Token-Abzug `md.comp.sheet.bottom` · Komponentendoku
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/bottomsheet/res/values/tokens.xml · https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BottomSheet.md
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 775 Bytes / HTTP 200, 25 357 Bytes)
- **Wörtlich (Tokens, vollständig):**
  „`m3_comp_sheet_bottom_docked_container_color` ?attr/colorSurfaceContainerLow"
  „`m3_comp_sheet_bottom_docked_modal_container_elevation` @dimen/m3_sys_elevation_level1"
  „`m3_comp_sheet_bottom_docked_standard_container_elevation` @dimen/m3_sys_elevation_level1"
  „`m3_comp_sheet_bottom_docked_container_shape` ?attr/shapeAppearanceCornerExtraLarge"
  „`m3_comp_sheet_bottom_docked_drag_handle_color` ?attr/colorOnSurfaceVariant"
  „`m3_comp_sheet_bottom_docked_drag_handle_width` 32dp" · „`m3_comp_sheet_bottom_docked_drag_handle_height` 4dp"
- **Wörtlich (BottomSheet.md):**
  „Bottom sheets show secondary content anchored to the bottom of the screen. There are two variants of bottom sheets. 1. Standard bottom sheet 2. Modal bottom sheet"
  „Modal bottom sheets are above a scrim while standard bottom sheets don't have a scrim. Besides this, both types of bottom sheets have the same specs."
  „Anatomy: 1. Container 2. Drag handle (optional) 3. Scrim"
  „**Max width** | `android:maxWidth` | … | `640dp`"
  „**Note:** `BottomSheetDragHandleView` has a default min width and height of 48dp to conform to the minimum touch target requirement. So you will need to preserve at least 48dp at the top to place a drag handle."
  „The handle also supports tapping to cycle through expanded and collapsed states as well as double tapping to hide."
- **Was das für BIOME hergibt:**
  - **Ziehgriff: sichtbar 32 × 4 dp, Trefferfläche mindestens 48 × 48 dp.** Das ist der belegte Unterschied zwischen sichtbarer Marke und Tippziel und ein exzellentes Muster.
  - **Der Griff ist auch ohne Ziehen bedienbar:** Tippen wechselt zwischen ausgeklappt/eingeklappt, Doppeltippen blendet aus. Barrierefreiheit ohne Gestenzwang.
  - **Ecken oben: ExtraLarge = 28 dp.** Deutlich runder als alles andere — die Bottom Sheet ist bewusst als eigenständige Fläche markiert.
  - **Maximalbreite 640 dp** — auf breiten Fenstern läuft sie nicht auseinander.
- **Deckt ausdrücklich nicht:** Höhen der Rastpunkte (peek/half/full), Schwellwerte für das Einrasten, wann Bottom statt Side Sheet zu wählen ist.

### MD-08 · Cards — die Informationskarte als Bauteil
- **Herausgeber:** Google — Token-Abzug `md.comp.filled-card`/`outlined-card`/`elevated-card` · Komponentendoku
- **Quelle:** https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/card/res/values/tokens.xml · https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/Card.md
- **Abgerufen:** 2026-08-10 (HTTP 200, 3 895 Bytes / HTTP 200, 21 433 Bytes)
- **Wörtlich (Tokens):**
  „`m3_comp_filled_card_container_color` ?attr/colorSurfaceContainerHighest" · „`m3_comp_filled_card_container_elevation` @dimen/m3_sys_elevation_level0"
  „`m3_comp_outlined_card_container_color` ?attr/colorSurface" · „`m3_comp_outlined_card_container_elevation` @dimen/m3_sys_elevation_level0" · „`m3_comp_outlined_card_outline_width` 1dp" · „`m3_comp_outlined_card_outline_color` ?attr/colorOutlineVariant"
  „`m3_comp_elevated_card_container_color` ?attr/colorSurfaceContainerLow" · „`m3_comp_elevated_card_container_elevation` @dimen/m3_sys_elevation_level1"
  Alle drei: „…`_card_icon_size` 24dp" und „…`_card_container_shape` ?attr/shapeAppearanceCornerMedium"
- **Wörtlich (Card.md):**
  „On mobile, an outlined or a filled card's default elevation is `0dp`, with a raised dragged elevation of `8dp`. The Material Android library also provides an elevated card style, which has an elevation of `1dp`, with a raised dragged elevation of `2dp`."
  „**Note:** We recommend that cards on mobile have `8dp` margins."
  „Elevated cards have a drop shadow, providing more separation from the background than filled cards, but less than outlined cards."
- **Was das für BIOME hergibt:**
  - **Drei Kartenvarianten mit klarer Rangfolge der Abhebung:** gefüllt (schwächste Trennung, `surfaceContainerHighest`, flach) < erhöht (`surfaceContainerLow`, 1 dp Schatten) < umrandet (`surface` + 1 dp Linie in `outlineVariant`, stärkste Trennung).
  - **Alle drei: Radius Medium = 12 dp, Icon 24 dp, Außenabstand 8 dp.**
  - Für eine Objektkarte über einer Karte ist **„outlined"** die belegt kontrastreichste Variante — sie funktioniert über unruhigem Luftbild besser als ein Schatten.
- **Deckt ausdrücklich nicht:** Innenabstände (Card.md zeigt `16dp` Padding nur im Beispiel-Layout, nicht als Token), Mindest-/Maximalbreite, Inhaltsstruktur.

### MD-09 · Tippziele — 48 dp, mit Begründung und Abstand
- **Herausgeber:** Google — Android Accessibility Help; Material Components for Android (Quelltext)
- **Quelle:** https://support.google.com/accessibility/android/answer/7101858?hl=en · https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/resources/res/values/dimens.xml
- **Abgerufen:** 2026-08-10 (HTTP 200, 1 385 299 Bytes / HTTP 200, 3 786 Bytes)
- **Wörtlich (Accessibility Help):**
  „Any on-screen element that someone can click, touch, or otherwise interact with should be large enough for reliable interaction. Consider making sure these elements have a width and height of at least 48dp, as described in the Material Design Accessibility guidelines."
  „Touch targets include the area that responds to user input. Touch targets extend beyond the visual bounds of an element: An element like an icon may appear to be 24x24dp but the padding surrounding it comprises the full 48x48dp touch target."
  „Consider making touch targets at least 48x48dp, separated by 8dp of space or more, to ensure balanced information density and usability. A touch target of 48x48dp results in a physical size of about 9mm, regardless of screen size. The recommended target size for touchscreen objects is 7-10mm."
  „Ensure that each of those elements is 48x48dp in size, or approximately 9mm in each dimension."
- **Wörtlich (Quelltext-Token):** „`<dimen name="mtrl_min_touch_target_size">48dp</dimen>`"
- **Was das für BIOME hergibt:**
  - **48 × 48 dp Mindesttippziel, mindestens 8 dp Abstand dazwischen.** Beides zusammen, nicht nur die erste Zahl.
  - **Die Trefferfläche darf größer sein als das Sichtbare** — 24-dp-Icon in 48-dp-Fläche ist der dokumentierte Normalfall. Für eine dichte Ebenenliste mit Auge, Pfeil und Menüpunkt pro Zeile ist das die Rettung.
  - **Die physikalische Begründung ist belegt: ~9 mm, empfohlen 7–10 mm.** Damit lässt sich die Regel auch auf ein Desktop-Kartenwerkzeug mit Touch-Bedienung im Feld verteidigen.
- **Deckt ausdrücklich nicht:** eine Ausnahme für reine Maus-/Desktop-Bedienung, Mindestgrößen für Tastaturfokus-Ringe, WCAG-Konformitätsaussagen (die Quelle nennt keine WCAG-Kriteriennummer).

### MD-10 · Fenstergrößenklassen — die Breakpoints
- **Herausgeber:** Google — Android Developers
- **Quelle:** https://developer.android.com/develop/ui/compose/layouts/adaptive/window-size-classes (leitet weiter auf `…/use-window-size-classes`)
- **Abgerufen:** 2026-08-10 (HTTP 200, 353 598 Bytes)
- **Wörtlich (Breite):**
  „Compact width | width < 600dp" · „Medium width | 600dp ≤ width < 840dp" · „Expanded width | 840dp ≤ width < 1200dp" · „Large width | 1200dp ≤ width < 1600dp" · „Extra-large width | width ≥ 1600dp"
- **Wörtlich (Höhe):**
  „Compact height | height < 480dp" · „Medium height | 480dp ≤ height < 900dp" · „Expanded height | height ≥ 900dp"
- **Wörtlich (Regeln):**
  „Available width is usually more important than available height due to the ubiquity of vertical scrolling, so the width window size class is likely more relevant to your app's UI."
  „Note: Most apps can build an adaptive UI by considering only the width window size class. However, also consider the height window size class for scenarios such as phones or open flippables in landscape orientation; the window width is typically medium, but window height is compact, in which case two pane layouts are not practical."
  „window size classes are explicitly not determined by the size of the device screen. Window size classes are not intended for isTablet‑type logic."
- **Was das für BIOME hergibt:** Fünf Breiten-Breakpoints — **600 / 840 / 1200 / 1600 dp** — als belegte Umschaltpunkte. Und die ausdrückliche Warnung, **nicht nach Gerätetyp zu verzweigen**, sondern nach verfügbarer Fensterbreite. Für BIOME mit Feldtablet, Bürobildschirm und geteiltem Fenster genau die richtige Denkweise. Die Höhenklassen sind nur für den Sonderfall Querformat auf dem Telefon relevant — dort sind Zwei-Spalten-Layouts ausdrücklich unpraktikabel.
- **Deckt ausdrücklich nicht:** welches Layout bei welcher Klasse zu verwenden ist (das steht in MD-11, und auch dort nur teilweise). Keine Aussage zu Kartenanwendungen im Besonderen.

### MD-11 · Welches Navigationselement bei welcher Fensterbreite
- **Herausgeber:** Google — Android Developers
- **Quelle:** https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation
- **Abgerufen:** 2026-08-10 (HTTP 200, 392 036 Bytes)
- **Wörtlich:**
  „In compact windows, such as a standard phone display, the destinations are typically displayed in a navigation bar at the bottom of the window. In an expanded window, such as a full screen app on a tablet, a navigation rail alongside the app is usually a better choice since the navigation controls are easier to reach while holding the left and right sides of the device."
  „The default behavior is to show either of the following UI components: Navigation bar if the width or height is compact or if the device is in tabletop posture. Navigation rail for everything else."
- **Was das für BIOME hergibt:** Die belegte Standardregel ist **zweiteilig, nicht dreiteilig**: **Bottom Navigation Bar bei kompakter Breite ODER kompakter Höhe, sonst Navigation Rail.** Der Drawer kommt in dieser Regel **nicht** vor.
- **Deckt ausdrücklich nicht:** Wann ein **Navigation Drawer** statt einer Rail zu verwenden ist. Die verbreitete Faustregel „compact → Bar, medium → Rail, expanded → Drawer" ist in dieser Quelle **nicht** belegt und konnte in keiner abrufbaren Google-Quelle belegt werden. Ebenso wenig gedeckt: Umgang mit Kartenanwendungen, bei denen die „Navigation" nicht Seitenwechsel, sondern Werkzeugwahl ist.

---

## Nicht zugänglich

| Quelle | Warum | Status / Beleg | Was dadurch nicht belegbar ist |
|---|---|---|---|
| `https://m3.material.io/…` (alle Seiten, u. a. `components/navigation-rail/specs`, `styles/elevation/tokens`) | Reine JavaScript-Anwendung. Der ausgelieferte HTML-Rumpf enthält **nur den Titel**. Per WebFetch gegengeprüft, Ergebnis wörtlich: „The page has no readable content beyond the title." | HTTP 200, 61 748 bzw. 61 601 Bytes; sichtbarer Text 35 bzw. 29 Zeichen | Die **maßgebliche Material-3-Spezifikation im Original**: Anatomie-Diagramme, Verwendungsempfehlungen („when to use"), Bewegungs-/Motion-Spezifikationen, Typografie-Skala, Kontrastwerte, offizielle Component-Guidelines. Alle Maße in Abschnitt G stammen **ersatzweise** aus Googles Token-Abzügen — die Zahlen stimmen, die **Gestaltungsbegründungen** fehlen. |
| `https://m2.material.io/…` (alle Seiten) | Ebenfalls JS-Anwendung — und schlimmer: der Server liefert für **jede** URL denselben Rumpf. `components/navigation-drawer` und `design/usability/accessibility.html` sind byte-identisch (md5 `5aaa432d4da2`), sichtbarer Text jeweils „Material Design" (15 Zeichen). | HTTP 200, beide exakt 68 334 Bytes | Material-2-Grundlagen: Layoutraster, Keylines, Abstandsraster (8-dp-Grid), die ursprünglichen Elevation-Definitionen, die Accessibility-Guidelines im Original (auf die MD-09 nur verweist). |
| `http://earth.google.com/userguide/v4/` und Unterseiten | Existiert nicht mehr als eigenes Dokument. Alle Aufrufe enden per Weiterleitung auf `support.google.com`. `…/index.html` und `…/ug_toc.html` → `support.google.com/earth/?page=guide_toc.cs`. `…/ug_navigation.html` und `…/ug_find.html` → **HTTP 404** (1 592 bzw. 1 586 Bytes). | HTTP 200 nach Redirect (1 259 507 Bytes) bzw. HTTP 404 | Die **nummerierte Anatomie des Earth-Pro-Fensters** aus dem alten Leitfaden: die Bezeichnungen „Sidebar", „Status bar", „Overview Map", „Toolbar", „Search panel" als benannte, verorteten Fensterteile mit Abbildung. Diese Begriffe sind in der heutigen Dokumentation **nicht** mehr enthalten (Ausnahme: „bottom status bar" für das aktuelle Earth, GE-03) und dürfen nicht als Google-Terminologie zitiert werden. |
| `web.archive.org` / `archive.org/wayback/available` | Nicht erreichbar. Die API antwortet `HTTP 429 Too Many Requests`; der direkte Abruf `https://web.archive.org/web/2012/http://earth.google.com/userguide/v4/index.html` bricht mit curl-Fehler 35 (SSL connect error) ab. | HTTP 429 bzw. curl exit 35 | Der archivierte alte Nutzerleitfaden — und damit die einzige realistische Chance, die Zeile darüber doch noch zu belegen. |
| Englische Fassung von `support.google.com/earth/answer/148094` | Der Abschnitt mit den Bedienschritten für „Historical imagery" **fehlt im ausgelieferten HTML**. Die Zeichenkette „historical" kommt in `hl=en` und `hl=en-GB` je **0 ×** vor. Nur die deutsche Fassung enthält die Schritte. | HTTP 200, 1 390 953 / 1 390 974 Bytes; `grep -c -i historical` = 0 | Eine **englischsprachige** Belegstelle für den Aufruf des Zeitschiebers in Earth Pro Desktop. GE-15 stützt sich deshalb auf eine Fassung, die selbst einen KI-Übersetzungsvorbehalt trägt. |
| Anatomie und Maße der **Knowledge Card** | Keine abrufbare Google-Quelle beschreibt sie. `learn-about-places` nennt sie nur „a box"; `imagery-dates-alt-coord` nennt sie „a knowledge panel"; `add-features-to-projects` „knowledge card"; Google Earth Outreach „Knowledge Card". Keine Definition, keine Anatomie, keine Maße. | alle HTTP 200 (siehe GE-06) | Breite, Höhe, Elevation, Ecken, Farbrollen, Scrollverhalten, Verhalten bei Mehrfachauswahl, Aussehen auf schmalen Fenstern. **Wer das im Redesign festlegt, entscheidet frei — Google gibt es nicht vor.** |
| Anatomie und Maße des **Inspectors** | Nur seine Existenz, seine Position („on the right") und ein Tab („Style") sind dokumentiert. | HTTP 200 (GE-02, GE-07) | Alles Weitere: Breite, Tabs außer „Style", Schließen, Verhältnis zur Knowledge Card. |
| Gruppierung/Struktur des **Ebenenkatalogs** | Die Katalogseite ist eine flache, alphabetische Tabelle ohne Oberkategorien; `learn-about-data-layers` beschreibt nur die Detailansicht. | HTTP 200, 226 839 Bytes | Thematische Rubriken, Facettenfilter, Katalogsuche. Eine BIOME-Gliederung „Bäume / Vegetation / Boden / Sensorik" hat hier **keine** Deckung. |
| Verhältnis **Ebenen-Bereich ↔ Orte-Bereich** in Earth Pro | Beide werden je einzeln als „left panel" / „linker Bereich" beschrieben, nie zusammen. | HTTP 200 (GE-20, GE-21) | Ob sie übereinander liegen, getrennt scrollen, in der Höhe verstellbar sind. |
| **Tastenkürzel** in beiden Produkten | Beide Produkte verweisen nur auf eine Hilfe-Funktion im Programm („Help ▸ Keyboard Shortcuts", „type ‚?'"), ohne die Kürzel zu nennen. Einzige Ausnahmen: `r` für Standardansicht (GE-23) und `g` zum Wiederherstellen der Kürzel bei Screenreader-Nutzung (GE-17/accessibility). | HTTP 200 | Eine belegte Kürzelbelegung, die BIOME übernehmen könnte. |
| **Kontrastwerte / WCAG-Aussagen** für die Material-Farbrollen | `Color.md` behauptet nur „ensure accessible color combinations", ohne Zahl; die Rollentabellen nennen Tonwertnamen, keine Hex-Werte. `m3.material.io/styles/color` ist unzugänglich. | HTTP 200, 41 759 Bytes | Konkrete Kontrastverhältnisse, Hex-Werte, Nachweis der Barrierefreiheit einer Farbpaarung. |

---

## Was ich daraus für ein Redesign ableiten würde

> **Dieser Abschnitt ist meine Wertung, keine Vorgabe und kein Beleg.** Alles
> oberhalb ist zitierbar; alles hier unten ist Auslegung. Wo ich mich auf einen
> Eintrag stütze, steht die Kennung dabei.

**1. Die Dreiteilung übernehmen, die Rollen aber härter trennen als Google.**
Links Karteninhalt, Mitte Karte, rechts Inspector (GE-02) ist für ein
Baumkataster genau richtig. Google mischt allerdings zwei Dinge auf der rechten
Seite: die Knowledge Card (Suchergebnis/Ortsmarkierung, GE-06) und den Inspector
(Ebenenobjekt, GE-07). Für BIOME würde ich das zu **einer** rechten Fläche
zusammenziehen — ein Side Sheet im Standardmodus (MD-06: 256 dp, eckig, flach,
`colorSurface`), das je nach Auswahl anderen Inhalt zeigt. Zwei konkurrierende
rechte Panels sind eine Altlast, kein Vorbild.

**2. Ankreuzfelder für Sichtbarkeit — und die vier KML-Schaltmodi als
Ebenenkatalog-Feature.** GE-30 ist der wertvollste Fund dieser Recherche.
`radioFolder` (genau eine Ebene sichtbar), `checkOffOnly` (alles aus erlaubt,
alles an verboten) und `checkHideChildren` (Gruppe schaltbar, Kinder verborgen)
lösen drei konkrete BIOME-Probleme: sich ausschließende Bodenparameter, schwere
Rasterebenen, und ein Baumkataster mit zehntausenden Einzelobjekten, das den
Baum sonst unbedienbar macht. Diese drei Modi sollten **pro Ebenengruppe
konfigurierbar** sein, nicht global. Das Auge-Symbol des neuen Earth (GE-08)
würde ich **nicht** übernehmen — es transportiert die Elternketten-Logik aus
GE-31 schlechter als ein Kästchen.

**3. Ladezustand und Fehler gehören an den Baumknoten, nicht in eine
Statusleiste.** `open`/`closed`/`error`/`fetching0-2` (GE-30) ist die richtige
Auflösung für BIOME mit entfernten Diensten: Der Nutzer sieht an **der Zeile**,
welche Ebene hakt. Kombiniert mit dem Aktualisierungs-Badge am Ebenennamen aus
GE-10 („a badge may appear on the layer's title in the left-hand panel") ergibt
das eine Ebenenliste, die ihren eigenen Zustand erzählt. Dazu die zweizeilige
Zeile mit `Snippet` (GE-31, max. 2 Zeilen) für Stand und Objektzahl.

**4. Zeit als abschaltbarer Modus mit sichtbarer Verfügbarkeit — und einem
Zusammenfalt-Chip.** Die drei Bausteine aus GE-14 gehören zusammen: (a) Zeit ist
ein Modus, den man ein- und über denselben Knopf wieder ausschaltet; (b) die
Achse zeigt selbst, wo Daten liegen — Punkte für Jahre, kleinere für Monate,
graue für weggefallene Stände; (c) die Leiste faltet sich zu einem Chip
zusammen, **bleibt aber sichtbar aktiv**. Punkt (c) ist die Antwort auf die
häufigste Verwirrung in Zeitkarten. Dazu aus GE-15/GE-16 das **Bereichsfenster**
statt eines Punktreglers (für Sensorzeitreihen unverzichtbar) und den Zustand
„Automatically" aus GE-16: die Zeitleiste erscheint nur, wenn die aktive Auswahl
überhaupt Zeitbezug hat. Und den ausdrücklichen Konfliktumgang: Google schaltet
3D-Gebäude ab, wenn historische Bilder an sind — BIOME muss dasselbe für
Live-Sensorwerte im historischen Modus regeln.

**5. Provenienz permanent, nicht auf Anfrage.** Die untere Statusleiste (GE-03),
die dem Cursor folgt und Aufnahmedatum, Koordinaten und **zwei** Höhen zeigt, ist
das übernehmenswerteste Detail für ein Fachprodukt: Datenherkunft ist immer
sichtbar, kostet aber keinen Platz im Layout. Ergänzt um das Metadaten-Set aus
GE-10 (Titel, Beschreibung, Quelle, Abdeckung, Stand, Nutzungsbedingungen,
Zugriffsstufe, Reifegrad) und das Katalogschema aus GE-11 hat BIOME eine
Provenienzkette von der Katalogzeile bis zum Pixel unter der Maus. Das passt
exakt zu dem, was `refs/standards/` ohnehin verlangt.

**Zwei weitere Beobachtungen, die ich für wichtig halte:**

*Der Import-Vorraum.* „Temporäre Orte" (GE-21) — importierte Daten landen
sichtbar in einem Ordner, der beim Beenden verfällt, sofern man sie nicht
bewusst herauszieht. Für BIOME mit Fremddaten unterschiedlicher Qualität ist das
ein besseres Modell als sofortiges, stilles Speichern.

*Die Kartenoberfläche muss sich wegräumen können.* „Hide menu bar" (GE-01), die
ausblendenden Navigationselemente (GE-23), der Zusammenfalt-Chip (GE-14) — Google
Earth räumt seine eigene Bedienung konsequent aus dem Weg. Ein Kartenprodukt,
dessen Rahmen nicht verschwinden kann, hat den wichtigsten Zug des Vorbilds
nicht verstanden.

**Wovon ich abraten würde, weil es nicht belegt ist:** eine Ableitung „compact →
Bottom Bar, medium → Rail, expanded → Drawer" (MD-11 belegt nur die
Zweiteilung); Hex-Farbwerte aus Material 3 (MD-03 nennt keine); Maße für die
Objektkarte unter Berufung auf Google (es gibt keine); und eine thematische
Gliederung des Ebenenkatalogs mit Verweis auf Google Earth (GE-11: der Katalog
ist flach und alphabetisch).
