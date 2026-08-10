# Standards-Register — Wirkungsnachweis und Berichtswesen

> Stand: 2026-08-10. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.
>
> Abrufhinweis für Nachprüfungen: **EUR-Lex liefert unter `eur-lex.europa.eu` in dieser
> Umgebung durchgängig HTTP 202 mit leerem Body** (fünf Versuche mit Browser-User-Agent
> und Cookie-Jar, auch die ELI-Adresse). Der Rechtstext ist stattdessen über den
> Cellar-Endpunkt des Amts für Veröffentlichungen abrufbar:
> `curl -L -H "Accept: application/xhtml+xml" -H "Accept-Language: deu" https://publications.europa.eu/resource/celex/<CELEX>`
> → HTTP 200. Alle EU-Zitate unten stammen aus dieser amtlichen deutschen Sprachfassung.

## Gedeckte Definitionen

### WIRK-01 · BACI (Before-After-Control-Impact) — Design, vier Datenpunkte, Kontrast
- **Herausgeber:** Van doninck, J.; Bijker, W.; Willemen, L. (Faculty of Geo-Information Science and Earth Observation ITC, University of Twente), „Streamlining counterfactual ecosystem restoration and conservation impact evaluation in R with the spatialBACI package", *Biodiversity Data Journal* 14: e182671, Pensoft, 27.05.2026, CC-BY 4.0
- **Quelle:** https://www.ebi.ac.uk/europepmc/webservices/rest/PMC13234559/fullTextXML (Volltext-XML, Europe PMC) · DOI 10.3897/BDJ.14.e182671
- **Abgerufen:** 2026-08-10 (HTTP 200, 87.433 Byte)
- **Wörtlich** (Abstract und Einleitung):
  „Before-after-control-impact (BACI) assessments are crucial in determining effectiveness of ecosystem conservation and restoration actions."
  „While monitoring of a site after conservation or restoration interventions can provide valuable insights, it can by itself typically not be used to infer causal impact (Baylis et al. 2016)."
  „In the context of conservation or restoration effectiveness monitoring, counterfactual analysis attempts to establish the difference between the (intended or unintended) outcomes of an intervention and the outcomes if no action had been taken (Coetzee and Gaston 2021)."
  „In the absence of the random implementation of conservation and restoration actions, which is typically not feasible nor desirable, the use of counterfactuals provides the most robust way to assess the impact of conservation and restoration actions (Ribas et al. 2020)."
  „The strongest impact evaluation designs are those where outcomes before and after a conservation or restoration intervention are examined for the impact site (also referred to as treatment or intervention) and a control site in a before-after-control-impact (BACI) analysis (Wauchope et al. 2021). Control sites should be environmentally similar to the impact sites to avoid overestimation of conservation or restoration interventions (Andam et al. 2008). The pairing of impact sites with counterfactual control sites is typically done through some form of statistical matching (Schleicher et al. 2020)."
- **Wörtlich** (Abschnitt „BACI contrast and p-value"):
  „When a single metric represents the condition before and after intervention at impact and control sites, a BACI contrast can be calculated (Meroni et al. 2017, del Río-Mena et al. 2021) to express the difference between sites with and without intervention. The BACI contrast is a difference-in-difference metric expressed as (Meroni et al. 2017): […], where μ represents the observable of interest and the subscripts C, I, A and B stand for the control and impact unit and after and before period, respectively."
  „If more than one control unit is used per impact unit or if several impact units and control units are pooled for analysis, a significance testing of the null hypothesis of no impact can be conducted."
- **Wörtlich** (Abschnitt „Defining impact and control units"):
  „A first critical design consideration in counterfactual impact evaluation is the definition of the spatial unit and scale of analysis (Baylis et al. 2016, Schleicher et al. 2020). This definition of these impact and control units must be informed by a clear theory of change and real world complexity and account for potential positive or negative spillover effects."
- **Deckt in BIOME:**
  - **Die vier Datenpunkte sind namentlich belegt.** Der BACI-Kontrast ist eine Differenz-von-Differenzen über die vier Mittelwerte μ mit den Indizes **C** (control / Referenzfläche), **I** (impact / behandelte Fläche), **B** (before / Baseline) und **A** (after / nach Maßnahme). Ein BIOME-Wirkungsdatensatz braucht damit genau vier Pflicht-Messwerte: `referenz_vorher`, `referenz_nachher`, `flaeche_vorher`, `flaeche_nachher` — je Kennzahl, je Bezugszeitpunkt.
  - **Harte Renderregel, wörtlich gedeckt:** Reines Nach-Monitoring der behandelten Fläche („monitoring of a site after … interventions") kann für sich genommen **keine Kausalwirkung** belegen. BIOME darf aus `flaeche_nachher` allein (oder aus `flaeche_vorher` + `flaeche_nachher` ohne Referenz) **keine Wirkungsaussage** rendern, sondern nur eine Zustands- oder Veränderungsaussage.
  - **Anforderung an die Referenzfläche:** „environmentally similar to the impact sites" — Vergleichbarkeit ist Bedingung, nicht Kür. Andernfalls ist laut Quelle mit **Überschätzung** der Wirkung zu rechnen. BIOME braucht deshalb ein Feld, das die Vergleichbarkeitsprüfung dokumentiert (Verfahren: „some form of statistical matching").
  - **Pflichtfeld Analyseeinheit:** Definition der räumlichen Einheit und des Maßstabs ist „a first critical design consideration" und muss von einer expliziten Wirkungslogik („theory of change") getragen sein; Übertragungseffekte auf Nachbarflächen („spillover effects") sind zu berücksichtigen.
  - **Signifikanz nur bei Mehrfachbelegung:** Ein p-Wert ist laut Quelle erst sinnvoll, „if more than one control unit is used per impact unit or if several impact units and control units are pooled". BIOME darf bei genau einer Fläche und genau einer Referenz **keinen** p-Wert oder „signifikant"-Marker anzeigen.
- **Deckt ausdrücklich nicht:**
  - Die **Formel selbst** liegt in der Quelle als Grafik (`inline-graphic M1.gif`) vor, nicht als Text. Gedeckt sind die Bezeichnung „difference-in-difference" und die Bedeutung der vier Indizes C, I, A, B — **nicht** die Vorzeichenkonvention der Formel. BIOME darf die Rechenrichtung nicht aus dieser Quelle behaupten (siehe „Offene Fragen").
  - Keine Aussage über Mindestzahl von Wiederholungsmessungen, Mindestlänge der Baseline oder Mindestgröße der Referenzfläche.
  - Keine Aussage darüber, welche Kennzahl (NDVI, Artenzahl, Deckungsgrad …) in einem konkreten Fall zulässig ist.

### WIRK-02 · BACI in der Anwendung — mehrere Kontrollflächen, mehrere Vorher-Zeitpunkte
- **Herausgeber:** Rabone, M. et al., „Impacts of an industrial deep-sea mining trial on macrofaunal biodiversity", *Nature Ecology & Evolution*, 2026 (Open Access, Europe PMC)
- **Quelle:** https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12890587/fullTextXML
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich:**
  „The full extent of environmental impacts following a disturbance event can only be accurately detected and assessed when sufficient data are available to disentangle the effect of interest from natural spatial and temporal variability."
  „Considering this, we used an asymmetrical Before-After-Control-Impact (BACI) style experimental design with several control sites […]. A random stratified sampling design was used, with data collected from four control sites (FFE, FFW, NFE and PRZ) chosen to be spatially equivalent to the area being impacted by the mining disturbance and one impacted site […]. Samples were collected at three time points before the collector test (November 2020, May 2021 and September 2022) and again 2 months following the collector test (December 2022)."
  „Following a modified Before-After-Control-Impact (BACI) design, we investigated the variability of macrofaunal density and diversity, to distinguish between natural spatiotemporal changes and those directly resulting from mining impacts […]"
- **Deckt in BIOME:**
  - **Begründung der Kontrollfläche in einem Satz, den BIOME anzeigen darf:** Die Kontrollfläche trennt die natürliche räumliche und zeitliche Schwankung von der Wirkung der Maßnahme. Ohne sie ist beides nicht unterscheidbar.
  - **Belegt ist die „asymmetrische" Variante:** mehrere Kontrollflächen zu einer behandelten Fläche, und **mehr als ein Vorher-Zeitpunkt** (hier drei). Das BIOME-Datenmodell muss n Referenzflächen je Maßnahmenfläche und n Baseline-Messungen zulassen — nicht genau eine.
  - **Belegtes Auswahlkriterium der Kontrollflächen:** „chosen to be spatially equivalent to the area being impacted".
- **Deckt ausdrücklich nicht:** eine Mindest- oder Sollzahl von Kontrollflächen oder Vorher-Zeitpunkten. Vier Kontrollflächen und drei Vorher-Zeitpunkte sind hier eine Studienentscheidung, keine Vorgabe.

### WIRK-03 · BNatSchG § 13 — Vermeidungsvorrang und Kompensationskaskade
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz, „Gesetz über Naturschutz und Landschaftspflege (Bundesnaturschutzgesetz – BNatSchG)"
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__13.html
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (§ 13 „Allgemeiner Grundsatz", vollständig):
  „Erhebliche Beeinträchtigungen von Natur und Landschaft sind vom Verursacher vorrangig zu vermeiden. Nicht vermeidbare erhebliche Beeinträchtigungen sind durch Ausgleichs- oder Ersatzmaßnahmen oder, soweit dies nicht möglich ist, durch einen Ersatz in Geld zu kompensieren."
- **Deckt in BIOME:**
  - **Abgeschlossene, geordnete Auswahlliste `kompensationsstufe`** mit genau drei belegten Stufen in dieser Rangfolge: `vermeiden` → `ausgleichen_oder_ersetzen` → `ersatz_in_geld`. Die Reihenfolge ist normativ („vorrangig", „soweit dies nicht möglich ist"), nicht kosmetisch.
  - **Auslöseschwelle:** nur **erhebliche** Beeinträchtigungen lösen die Kaskade aus. BIOME braucht ein Feld `erheblichkeit` und darf die Kaskade nicht auf jede Veränderung anwenden.
  - **Adressat:** der Verursacher. Ein BIOME-Datensatz zu einer Kompensationsmaßnahme braucht ein Verursacherfeld.
- **Deckt ausdrücklich nicht:** was „erheblich" im Einzelfall bedeutet — der Begriff ist in § 13 nicht definiert.

### WIRK-04 · BNatSchG § 14 — Legaldefinition „Eingriff"
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__14.html
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (§ 14 Absatz 1):
  „Eingriffe in Natur und Landschaft im Sinne dieses Gesetzes sind Veränderungen der Gestalt oder Nutzung von Grundflächen oder Veränderungen des mit der belebten Bodenschicht in Verbindung stehenden Grundwasserspiegels, die die Leistungs- und Funktionsfähigkeit des Naturhaushalts oder das Landschaftsbild erheblich beeinträchtigen können."
- **Wörtlich** (§ 14 Absatz 2 Satz 1):
  „Die land-, forst- und fischereiwirtschaftliche Bodennutzung ist nicht als Eingriff anzusehen, soweit dabei die Ziele des Naturschutzes und der Landschaftspflege berücksichtigt werden."
- **Deckt in BIOME:**
  - **Feld `eingriff_ja_nein`** mit belegter Definition: zwei Tatbestandsvarianten (Veränderung der **Gestalt oder Nutzung von Grundflächen**; Veränderung des **Grundwasserspiegels** mit Verbindung zur belebten Bodenschicht) und zwei Schutzgüter (**Leistungs- und Funktionsfähigkeit des Naturhaushalts**; **Landschaftsbild**).
  - **Wichtig für die Renderlogik:** Der Tatbestand verlangt nur ein **Können** („erheblich beeinträchtigen können"), keinen Nachweis der eingetretenen Beeinträchtigung. BIOME darf für die Eingriffs-Einstufung also **kein** BACI-Ergebnis verlangen — das ist eine andere Frage als die Wirkungsaussage nach WIRK-01.
  - **Belegter Ausschluss:** Land-, forst- und fischereiwirtschaftliche Bodennutzung unter der genannten Bedingung.
- **Deckt ausdrücklich nicht:** die Berliner Fassung. § 14 Abs. 1 ist laut Fußnote der Quelle in Berlin durch § 16 Berliner Naturschutzgesetz abweichend geregelt („Berlin – Abweichung durch § 16 des Berliner Naturschutzgesetzes (NatSchG Bln) v. 29.5.2013 GVBl. BE S. 140 mWv 9.6.2013"). Für Berliner Vorgänge ist die Bundesdefinition nicht ohne Prüfung anwendbar.

### WIRK-05 · BNatSchG § 15 — Ausgleich, Ersatz, Unterhaltungszeitraum, Ersatzzahlung
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__15.html
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (§ 15 Absatz 2):
  „Der Verursacher ist verpflichtet, unvermeidbare Beeinträchtigungen durch Maßnahmen des Naturschutzes und der Landschaftspflege auszugleichen (Ausgleichsmaßnahmen) oder zu ersetzen (Ersatzmaßnahmen). Ausgeglichen ist eine Beeinträchtigung, wenn und sobald die beeinträchtigten Funktionen des Naturhaushalts in gleichartiger Weise wiederhergestellt sind und das Landschaftsbild landschaftsgerecht wiederhergestellt oder neu gestaltet ist. Ersetzt ist eine Beeinträchtigung, wenn und sobald die beeinträchtigten Funktionen des Naturhaushalts in dem betroffenen Naturraum in gleichwertiger Weise hergestellt sind und das Landschaftsbild landschaftsgerecht neu gestaltet ist."
- **Wörtlich** (§ 15 Absatz 1 Sätze 2 und 3):
  „Beeinträchtigungen sind vermeidbar, wenn zumutbare Alternativen, den mit dem Eingriff verfolgten Zweck am gleichen Ort ohne oder mit geringeren Beeinträchtigungen von Natur und Landschaft zu erreichen, gegeben sind. Soweit Beeinträchtigungen nicht vermieden werden können, ist dies zu begründen."
- **Wörtlich** (§ 15 Absatz 4, vollständig):
  „Ausgleichs- und Ersatzmaßnahmen sind in dem jeweils erforderlichen Zeitraum zu unterhalten und rechtlich zu sichern. Der Unterhaltungszeitraum ist durch die zuständige Behörde im Zulassungsbescheid festzusetzen. Verantwortlich für Ausführung, Unterhaltung und Sicherung der Ausgleichs- und Ersatzmaßnahmen ist der Verursacher oder dessen Rechtsnachfolger."
- **Wörtlich** (§ 15 Absatz 6 Sätze 1 und 2):
  „Wird ein Eingriff nach Absatz 5 zugelassen oder durchgeführt, obwohl die Beeinträchtigungen nicht zu vermeiden oder nicht in angemessener Frist auszugleichen oder zu ersetzen sind, hat der Verursacher Ersatz in Geld zu leisten. Die Ersatzzahlung bemisst sich nach den durchschnittlichen Kosten der nicht durchführbaren Ausgleichs- und Ersatzmaßnahmen einschließlich der erforderlichen durchschnittlichen Kosten für deren Planung und Unterhaltung sowie die Flächenbereitstellung unter Einbeziehung der Personal- und sonstigen Verwaltungskosten."
- **Deckt in BIOME:**
  - **Feld `massnahmentyp` mit zwei rechtlich unterschiedenen Werten:** `ausgleich` und `ersatz`. Der Unterschied ist wörtlich belegt und muss in der Oberfläche stehen: Ausgleich = **gleichartige** Wiederherstellung der beeinträchtigten Funktionen; Ersatz = **gleichwertige** Herstellung **im betroffenen Naturraum**. BIOME darf die beiden nicht als Synonyme führen und braucht bei `ersatz` ein Feld `naturraum`.
  - **Zielerreichungslogik:** „wenn und sobald" — Ausgleich/Ersatz ist ein **Zustand**, kein Vorgang. Ein BIOME-Statusfeld darf deshalb „ausgeglichen" erst setzen, wenn die Funktionen wiederhergestellt sind, nicht schon bei Maßnahmendurchführung.
  - **Feld `unterhaltungszeitraum`:** rechtlich vorgesehen, aber **einzelfallbezogen** — „in dem jeweils erforderlichen Zeitraum" und „durch die zuständige Behörde im Zulassungsbescheid festzusetzen". BIOME darf keine Standarddauer (5, 25, 30 Jahre) vorbelegen; das Feld muss aus dem Zulassungsbescheid gefüllt werden und braucht eine Quellenangabe.
  - **Feld `verantwortlich`** mit belegter Rechtsnachfolge: „der Verursacher oder dessen Rechtsnachfolger".
  - **Pflichtfeld `vermeidungsbegruendung`:** Wo nicht vermieden wurde, ist das zu begründen (Abs. 1 Satz 3). Ein Freitextfeld ist damit normativ gedeckt.
  - **Belegte Bemessungsgrundlage der Ersatzzahlung** (Kostenansatz einschließlich Planung, Unterhaltung, Flächenbereitstellung, Personal- und Verwaltungskosten).
- **Deckt ausdrücklich nicht:**
  - **Kein Monitoring-Begriff.** Die Wörter „Monitoring", „Erfolgskontrolle", „Kontrollfläche" oder „Referenzfläche" kommen in §§ 13–15 BNatSchG **nicht vor**. Die Erfolgsprüfung steht in § 17 Abs. 7 (siehe WIRK-06) — nicht in § 15.
  - Keine Methode, wie „gleichartig" oder „gleichwertig" gemessen wird. Kein Bewertungsverfahren, keine Wertpunkte, keine Biotopwertliste.
  - Keine Zahl für „angemessene Frist".

### WIRK-06 · BNatSchG § 17 Abs. 6 und 7 — Kompensationsverzeichnis und Durchführungsprüfung
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__17.html
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (§ 17 Absatz 6):
  „Die Ausgleichs- und Ersatzmaßnahmen und die dafür in Anspruch genommenen Flächen werden in einem Kompensationsverzeichnis erfasst. Hierzu übermitteln die nach den Absätzen 1 und 3 zuständigen Behörden der für die Führung des Kompensationsverzeichnisses zuständigen Stelle die erforderlichen Angaben."
- **Wörtlich** (§ 17 Absatz 7):
  „Die nach Absatz 1 oder Absatz 3 zuständige Behörde prüft die frist- und sachgerechte Durchführung der Vermeidungs- sowie der festgesetzten Ausgleichs- und Ersatzmaßnahmen einschließlich der erforderlichen Unterhaltungsmaßnahmen. Hierzu kann sie vom Verursacher des Eingriffs die Vorlage eines Berichts verlangen."
- **Wörtlich** (§ 17 Absatz 9 Satz 1):
  „Die Beendigung oder eine länger als ein Jahr dauernde Unterbrechung eines Eingriffs ist der zuständigen Behörde anzuzeigen."
- **Deckt in BIOME:**
  - **Der einzige gesetzlich belegte Nachweisvorgang heißt „Prüfung der frist- und sachgerechten Durchführung" — nicht „Wirkungsnachweis".** BIOME muss diese zwei Dinge sprachlich trennen: `durchfuehrungsnachweis` (Recht, § 17 Abs. 7) und `wirkungsaussage` (Wissenschaft, WIRK-01). Ein erfüllter Durchführungsnachweis belegt keine ökologische Wirkung.
  - **Feld `bericht_angefordert` / `bericht_vorgelegt`:** Der Bericht ist ein „kann" der Behörde, keine automatische Pflicht des Verursachers. BIOME darf ihn nicht als generelles Pflichtdokument darstellen.
  - **Registerpflicht:** Maßnahme **und** in Anspruch genommene Fläche gehören ins Kompensationsverzeichnis. Ein BIOME-Maßnahmendatensatz ohne Flächenbezug ist nicht registerfähig.
  - **Ereignisfeld:** Beendigung oder Unterbrechung > 1 Jahr ist anzeigepflichtig — belegter Anlass für einen Vorgangstyp „Unterbrechung".
- **Deckt ausdrücklich nicht:** Inhalt, Form, Frist oder Prüfschema des Berichts; wer das Verzeichnis führt (das regelt Landesrecht, für Berlin siehe WIRK-11).

### WIRK-07 · RL (EU) 2024/825 — Legaldefinition „Umweltaussage" und „allgemeine Umweltaussage"
- **Herausgeber:** Europäisches Parlament und Rat der Europäischen Union, Richtlinie (EU) 2024/825 vom 28. Februar 2024 zur Änderung der Richtlinien 2005/29/EG und 2011/83/EU hinsichtlich der Stärkung der Verbraucher für den ökologischen Wandel (deutsche Sprachfassung, Amt für Veröffentlichungen der EU)
- **Quelle:** https://publications.europa.eu/resource/celex/32024L0825 (Accept: application/xhtml+xml, Accept-Language: deu)
- **Abgerufen:** 2026-08-10 (HTTP 200, 170.621 Byte)
- **Wörtlich** (Artikel 1 Nummer 1 Buchstabe b, neue Buchstaben o und p in Artikel 2 der Richtlinie 2005/29/EG):
  „‚Umweltaussage‘, unabhängig von ihrer Form, eine Aussage oder Darstellung, die nach Unionsrecht oder nationalem Recht nicht verpflichtend ist, einschließlich Darstellungen durch Text, Bilder, grafische Elemente oder Symbole wie beispielsweise Etiketten, Markennamen, Firmennamen oder Produktbezeichnungen, im Kontext einer kommerziellen Kommunikation, und in der ausdrücklich oder stillschweigend angegeben wird, dass ein Produkt, eine Produktkategorie, eine Marke oder ein Gewerbetreibender eine positive oder keine Auswirkung auf die Umwelt hat oder weniger schädlich für die Umwelt ist als andere Produkte, Produktkategorien, Marken bzw. Gewerbetreibende oder seine bzw. ihre Auswirkung im Laufe der Zeit verbessert wurde;"
  „‚allgemeine Umweltaussage‘ eine schriftlich oder mündlich getätigte Umweltaussage, einschließlich über audiovisuelle Medien, die nicht auf einem Nachhaltigkeitssiegel enthalten ist und bei der die Spezifizierung der Aussage nicht auf demselben Medium klar und in hervorgehobener Weise angegeben ist;"
- **Wörtlich** (Erwägungsgrund 37):
  „Beispiele allgemeiner Umweltaussagen umfassen ‚umweltfreundlich‘, ‚umweltschonend‘, ‚grün‘, ‚naturfreundlich‘, ‚ökologisch‘, ‚umweltgerecht‘, ‚klimafreundlich‘, ‚umweltverträglich‘, ‚CO2-freundlich‘, ‚energieeffizient‘ ‚biologisch abbaubar‘, ‚biobasiert‘ oder ähnliche Aussagen, mit denen eine hervorragende Umweltleistung suggeriert wird oder die diesen Eindruck entstehen lassen. Diese allgemeinen Umweltaussagen sollten verboten werden, wenn eine anerkannte hervorragende Umweltleistung nicht nachgewiesen werden kann."
  „Zum Beispiel wäre die Aussage ‚klimafreundliche Verpackungen‘ eine allgemeine Aussage, während die Aussage ‚100 % der für die Herstellung dieser Verpackungen verwendeten Energie stammen aus erneuerbaren Quellen‘ eine spezifische Aussage ist […]"
  „Darüber hinaus könnte eine schriftliche oder mündliche Aussage in Kombination mit impliziten Aussagen wie Farben oder Bildern eine allgemeine Umweltaussage darstellen."
- **Deckt in BIOME:**
  - **Geltungsbereich, den BIOME prüfen muss:** Der Umweltaussagen-Begriff umfasst ausdrücklich **Bilder, grafische Elemente und Symbole**. Eine grüne Ampel, ein Blatt-Icon oder eine Fortschrittsleiste in der BIOME-Oberfläche ist damit selbst eine Umweltaussage, wenn sie in kommerzieller Kommunikation erscheint — nicht nur der Fließtext.
  - **Abgrenzung, die BIOME als Regel implementieren kann:** Eine Aussage ist „allgemein" (und damit ohne anerkannte hervorragende Umweltleistung unzulässig), wenn die **Spezifizierung nicht auf demselben Medium klar und hervorgehoben** danebensteht. BIOME darf ein Wirkungslabel nur zusammen mit der Spezifizierung auf derselben Fläche rendern — nicht hinter einem Tooltip, einem Link oder einer Folgeseite.
  - **Belegte Sperrliste für Etiketten:** die im Erwägungsgrund 37 genannten Begriffe dürfen in BIOME nicht als freistehende Kennzeichnung angeboten werden.
  - **Zeitverlaufsaussagen sind erfasst:** „oder seine bzw. ihre Auswirkung im Laufe der Zeit verbessert wurde". Genau das ist die BACI-Aussage aus WIRK-01. Damit gilt: **eine BIOME-Verbesserungsaussage ist rechtlich eine Umweltaussage.**
- **Deckt ausdrücklich nicht:** Aussagen, die nach Unionsrecht oder nationalem Recht **verpflichtend** sind — die fallen definitionsgemäß nicht unter „Umweltaussage". Eine Pflichtangabe aus § 17 BNatSchG ist also keine Umweltaussage im Sinne dieser Richtlinie.

### WIRK-08 · RL (EU) 2024/825 — Anhang-I-Verbote 4a, 4b, 4c (per-se unlautere Praktiken)
- **Herausgeber:** wie WIRK-07
- **Quelle:** https://publications.europa.eu/resource/celex/32024L0825 (Anhang der Richtlinie, Änderung des Anhangs I der Richtlinie 2005/29/EG)
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (Anhang, Nummer 2 — die folgenden Nummern werden in Anhang I der RL 2005/29/EG eingefügt):
  „4a. Treffen einer allgemeinen Umweltaussage, wobei der Gewerbetreibende die anerkannte hervorragende Umweltleistung, auf die sich die Aussage bezieht, nicht nachweisen kann."
  „4b. Treffen einer Umweltaussage zum gesamten Produkt oder der gesamten Geschäftstätigkeit des Gewerbetreibenden, wenn sie sich nur auf einen bestimmten Aspekt des Produkts oder eine bestimmte Aktivität der Geschäftstätigkeit des Gewerbetreibenden bezieht."
  „4c. Treffen einer Aussage, die sich auf der Kompensation von Treibhausgasemissionen begründet und wonach ein Produkt hinsichtlich der Treibhausgasemissionen neutrale, verringerte oder positive Auswirkungen auf die Umwelt hat."
- **Wörtlich** (Anhang, Nummer 1):
  „2a. Anbringen eines Nachhaltigkeitssiegels, das nicht auf einem Zertifizierungssystem beruht oder nicht von staatlichen Stellen festgesetzt wurde."
- **Wörtlich** (Erwägungsgrund 41, zu 4b):
  „Dieses Verbot fände beispielsweise Anwendung, wenn ein Produkt als ‚mit Recyclingmaterial hergestellt‘ vermarktet wird, um den Eindruck zu erwecken, dass das gesamte Produkt aus Recyclingmaterial besteht, obwohl tatsächlich nur die Verpackung aus Recyclingmaterial besteht […]"
- **Deckt in BIOME:**
  - **Die rechtliche Deckung für die Renderregel.** Anhang I der RL 2005/29/EG ist die Liste der **unter allen Umständen** unlauteren Praktiken — es gibt hier keine Einzelfallabwägung. Nr. 4a trifft BIOME direkt: eine allgemeine Umweltaussage **ohne nachweisbare anerkannte hervorragende Umweltleistung** ist verboten. Fehlt die Referenzfläche, fehlt der Nachweis, und BIOME darf das Label nicht rendern.
  - **Nr. 4b deckt die Hochrechnungssperre:** Ein Ergebnis von einer Teilfläche darf nicht als Aussage über das gesamte Grundstück, das gesamte Portfolio oder das gesamte Unternehmen gerendert werden. BIOME braucht deshalb bei jeder aggregierten Kennzahl ein Feld `bezugsflaeche` und eine Anzeige des Deckungsgrads.
  - **Nr. 4c deckt eine harte Sperre:** Aussagen über Neutralität, Verringerung oder positive Wirkung bei Treibhausgasen, die **auf Kompensation beruhen**, sind per se verboten. BIOME darf kein Feature „klimaneutral durch Ausgleich" anbieten.
  - **Nr. 2a deckt die Siegel-Sperre:** Ein BIOME-eigenes Siegel wäre nur zulässig auf Basis eines Zertifizierungssystems im Sinne der Richtlinie (Definition in Artikel 1 Nr. 1 Buchst. r: Überprüfung durch Dritte, öffentlich einsehbare Bedingungen, diskriminierungsfreier Zugang) oder staatlicher Festsetzung.
- **Deckt ausdrücklich nicht:**
  - Der Anhang deckt **nicht** die Aussage, dass ökologische Wirkungsnachweise eine Kontrollfläche brauchen. Er verlangt einen **Nachweis** und definiert für allgemeine Aussagen dessen Maßstab („anerkannte hervorragende Umweltleistung", laut Erwägungsgrund 39 z. B. EU-Umweltzeichen nach VO (EG) Nr. 66/2010 oder EN ISO 14024). Die Kontrollfläche ist die **fachliche** Antwort auf diese rechtliche Nachweispflicht (WIRK-01), nicht ihr Wortlaut.
  - Eine Richtlinie gilt nicht unmittelbar. Die Umsetzungsfristen und der deutsche Umsetzungsakt sind hier nicht geprüft (siehe „Offene Fragen").

### WIRK-09 · RL (EU) 2024/825 — Aussagen über künftige Umweltleistung (Art. 6 Abs. 2 Buchst. d)
- **Herausgeber:** wie WIRK-07
- **Quelle:** https://publications.europa.eu/resource/celex/32024L0825 (Artikel 1 Nummer 2 Buchstabe b)
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (neuer Buchstabe d in Artikel 6 Absatz 2 der Richtlinie 2005/29/EG):
  „Treffen einer Umweltaussage über die künftige Umweltleistung ohne klare, objektive, öffentlich einsehbare und überprüfbare Verpflichtungen, die in einem detaillierten und realistischen Umsetzungsplan festgelegt sind, der messbare und zeitgebundene Ziele sowie weitere relevante Elemente umfasst, die zur Unterstützung seiner Umsetzung erforderlich sind, wie die Zuweisung von Ressourcen, und der regelmäßig von einem unabhängigen externen Sachverständigen überprüft wird, dessen Erkenntnisse Verbrauchern zur Verfügung gestellt werden;"
- **Wörtlich** (neuer Buchstabe e):
  „Werbung mit Vorteilen für Verbraucher, die irrelevant sind und sich nicht aus einem Merkmal des Produkts oder der Geschäftstätigkeit ergeben."
- **Wörtlich** (Artikel 1 Nummer 3, neuer Artikel 7 Absatz 7 der Richtlinie 2005/29/EG):
  „Bietet ein Gewerbetreibender einen Dienst an, die Produkte vergleicht und dem Verbraucher Informationen über ökologische oder soziale Merkmale oder über Zirkularitätsaspekte […] bereitstellt, werden Informationen über die Vergleichsmethode, die betreffenden Produkte und die Lieferanten dieser Produkte sowie die bestehenden Maßnahmen, um die Informationen auf dem neuesten Stand zu halten, als wesentliche Informationen angesehen."
- **Deckt in BIOME:**
  - **Trennung Prognose / Messwert.** Jede BIOME-Aussage über eine **künftige** Wirkung (Zielwert, Potenzial, Hochrechnung, „wird in 10 Jahren …") ist an fünf wörtlich belegte Bedingungen gebunden: klar, objektiv, öffentlich einsehbar, überprüfbar, in einem detaillierten und realistischen Umsetzungsplan mit **messbaren und zeitgebundenen Zielen** und **Ressourcenzuweisung**, plus **regelmäßige Prüfung durch einen unabhängigen externen Sachverständigen**, deren Erkenntnisse veröffentlicht werden. BIOME sollte Prognosen deshalb als eigenen, gesperrten Feldtyp führen.
  - **Artikel 7 Abs. 7 trifft BIOME direkt, wenn Flächen oder Maßnahmen verglichen werden:** Die **Vergleichsmethode** und die Aktualisierungsmaßnahmen sind dann „wesentliche Informationen" und müssen mit ausgeliefert werden. Ein BIOME-Ranking ohne offengelegte Methode ist damit nicht deckbar.
- **Deckt ausdrücklich nicht:** was „regelmäßig" heißt und welche Qualifikation der „unabhängige externe Sachverständige" braucht (Erwägungsgrund 26 nennt nur „Erfahrungen und Kompetenzen in Umweltfragen" und Unabhängigkeit/Interessenkonfliktfreiheit).

### WIRK-10 · ESRS E4-5 — Auswirkungsparameter, Referenzzustand, Datenherkunft
- **Herausgeber:** Europäische Kommission, Delegierte Verordnung (EU) 2023/2772 vom 31. Juli 2023 zur Ergänzung der Richtlinie 2013/34/EU im Hinblick auf Standards für die Nachhaltigkeitsberichterstattung; Anhang I, ESRS E4 „Biologische Vielfalt und Ökosysteme" (deutsche Sprachfassung)
- **Quelle:** https://publications.europa.eu/resource/celex/32023R2772 (Accept: application/xhtml+xml, Accept-Language: deu)
- **Abgerufen:** 2026-08-10 (HTTP 200, 5.352.711 Byte)
- **Wörtlich** (Angabepflicht E4-5, Absätze 33 und 34):
  „Das Unternehmen hat Parameter in Bezug auf seine wesentlichen Auswirkungen auf die biologische Vielfalt und Ökosysteme anzugeben."
  „Ziel dieser Angabepflicht ist es, ein Verständnis der Leistung des Unternehmens in Bezug auf die Auswirkungen zu vermitteln, die bei der Bewertung der Wesentlichkeit als wesentlich für Veränderungen von biologischer Vielfalt und Ökosystemen ermittelt wurden."
- **Wörtlich** (Absatz 35 — die einzige unbedingte Mengenangabe in E4-5):
  „Hat das Unternehmen Standorte in oder in der Nähe von Gebieten mit schutzbedürftiger Biodiversität ermittelt, auf die es sich negativ auswirkt (siehe Absatz 19 Buchstabe a), gibt es die Anzahl und die Fläche (in Hektar) der Standorte an, die es besitzt, gepachtet hat oder bewirtschaftet und die sich in oder in der Nähe von diesen Schutzgebieten oder Biodiversitäts-Schwerpunktgebieten befinden."
- **Wörtlich** (Absatz 41 Buchstabe b — Zustand der Ökosysteme):
  „i. Parameter, anhand derer die Qualität von Ökosystemen im Vergleich zu einem vorab festgelegten Referenzzustand gemessen wird,"
  „ii. Parameter zur Messung mehrerer Arten innerhalb eines Ökosystems anstatt der Anzahl der Individuen innerhalb einer einzigen Art in einem Ökosystem (z. B. wissenschaftlich anerkannte Indikatoren für Artenreichtum und Abundanz, mit denen die Entwicklung der (einheimischen) Artenzusammensetzung innerhalb eines Ökosystems anhand des Referenzzustands zu Beginn des ersten Berichtszeitraums sowie des im Globalen Biodiversitätsrahmen von Kunming-Montreal festgelegten Zielzustands gemessen wird, oder gegebenenfalls eine Aggregation des Erhaltungszustands der Arten), oder"
  „iii. Parameter, die strukturelle Komponenten des Zustands wie die Vernetzung von Lebensräumen umfassen (d. h., inwieweit Lebensräume miteinander verbunden sind)."
- **Wörtlich** (Absatz 41 Buchstabe a — Ausdehnung der Ökosysteme):
  „in Bezug auf die Ausdehnung der Ökosysteme Parameter, anhand derer die Flächenabdeckung eines bestimmten Ökosystems gemessen wird, ohne notwendigerweise die Qualität des zu bewertenden Gebiets zu berücksichtigen, beispielsweise die Lebensraumfläche."
- **Deckt in BIOME:**
  - **Einheit und Bezugsfläche, unbedingt belegt:** Anzahl der Standorte (ganzzahlig) und Fläche in **Hektar**. Das ist die einzige in E4-5 verpflichtend vorgeschriebene Metrik; alles andere in den Absätzen 38–41 ist als „kann" formuliert. BIOME darf ESRS-Konformität also **nicht** für frei gewählte Kennzahlen behaupten.
  - **Zwei getrennte Kennzahlfamilien:** `ausdehnung` (Flächenmaß, ohne Qualität) und `zustand` (Qualität gegen einen Referenzzustand). BIOME darf sie nicht in ein Feld mischen — die Quelle trennt sie ausdrücklich („ohne dass dabei der Zustand des Ökosystems berücksichtigt wird").
  - **Pflichtbegleitfeld `referenzzustand`:** Zustandskennzahlen sind laut Wortlaut immer relativ zu „einem vorab festgelegten Referenzzustand" bzw. „dem Referenzzustand zu Beginn des ersten Berichtszeitraums". Das deckt genau die Baseline-Pflicht aus WIRK-01, hier aus dem Berichtsrecht.
  - **Belegte Formulierung für die Artenkennzahl:** Mehr-Arten-Indikatoren („Artenreichtum und Abundanz") sind gegenüber Einzelart-Individuenzahlen ausdrücklich vorgezogen.
- **Deckt ausdrücklich nicht:** eine konkrete Methode, Skala oder Klassengrenze für „Zustand". Die Standardtexte nennen keine Wertebereiche. Auch der geltende Rechtsstand ist hier nicht geprüft — 2023/2772 wurde abgerufen, spätere Änderungen des delegierten Rechtsakts nicht (siehe „Offene Fragen").

### WIRK-11 · ESRS E4 AR 27–30 — Anforderungen an Herkunft und Nachvollziehbarkeit
- **Herausgeber:** wie WIRK-10, Anhang I, ESRS E4, Anlage A „Anwendungsanforderungen"
- **Quelle:** https://publications.europa.eu/resource/celex/32023R2772
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (AR 27, Einleitung und die für Herkunft tragenden Buchstaben):
  „Bei der Erstellung der nach dieser Angabepflicht erforderlichen Informationen hat das Unternehmen Folgendes zu berücksichtigen und kann Folgendes beschreiben:
  a) die verwendeten Methoden und Parameter sowie eine Erläuterung der Gründe für die Auswahl dieser Methoden und Parameter sowie ihrer Annahmen, Grenzen und Unsicherheiten und etwaiger Änderungen der Methoden im Laufe der Zeit und die Gründe dafür,"
  „d) die von der Methodik abgedeckten geografischen Angaben und eine Erläuterung, warum relevante geografische Angaben nicht berücksichtigt wurden,"
  „f) Häufigkeit der Überwachung, überwachte Schlüsselparameter, Ausgangszustand/Ausgangswert und Basisjahr/-zeitraum sowie der Bezugszeitraum,"
  „g) ob sich diese Parameter auf Primärdaten, Sekundärdaten, modellierte Daten oder eine Experteneinschätzung oder eine Mischung dieser Daten stützen,"
  „i) ob Parameter verpflichtend (gemäß Rechtsvorschriften) oder freiwillig sind. Sind sie verpflichtend, kann das Unternehmen die einschlägigen Rechtsvorschriften angeben; sind sie freiwillig, kann das Unternehmen sich auf die verwendeten freiwilligen Normen oder Verfahren beziehen, und"
  „j) ob die Parameter auf den Erwartungen oder Empfehlungen relevanter und verlässlicher nationaler, europäischer oder zwischenstaatlicher Leitlinien, Strategien, Rechtsvorschriften oder Vereinbarungen wie dem Übereinkommen über die biologische Vielfalt (CBD) oder der IPBES beruhen oder diesen entsprechen."
- **Wörtlich** (AR 28):
  „Das Unternehmen gibt Parameter an, die nachprüfbar sind und die unter Berücksichtigung der angemessenen zeitlichen Rahmenbedingungen technisch und wissenschaftlich fundiert sind […] Um sicherzustellen, dass der Parameter relevant ist, sollte ein eindeutiger Zusammenhang zwischen dem Indikator und dem Zweck der Messung bestehen. Unsicherheiten sollten so weit wie möglich reduziert werden. Die verwendeten Daten oder Mechanismen sollten von etablierten Organisationen unterstützt und im Zeitverlauf aktualisiert werden. Wenn Datenlücken bestehen, können robuste modellierte Daten und Experteneinschätzungen verwendet werden. Die Methodik muss hinreichend detailliert sein, um einen aussagekräftigen Vergleich der Auswirkungen und der Abhilfemaßnahmen im Zeitverlauf zu ermöglichen. Die Verfahren zur Sammlung von Informationen und die Definitionen müssen systematisch angewandt werden."
- **Wörtlich** (AR 29):
  „Entspricht ein Parameter einem Ziel, so ist der Ausgangswert für beides anzugleichen. Der Ausgangswert für die biologische Vielfalt ist ein wesentlicher Bestandteil des Managementprozesses in Bezug auf biologische Vielfalt und Ökosysteme. Der Ausgangswert ist für die Folgenabschätzung und die Managementplanung sowie für die Überwachung und das adaptive Management erforderlich."
- **Wörtlich** (AR 30, die drei Datenkategorien):
  „a) Primärdaten: Erhebung vor Ort,"
  „b) Sekundärdaten: einschließlich Geodatenschichten, die von geografischen Standortdaten zu den Geschäftstätigkeiten überlagert sind."
  „c) Modellierte Zustandsdaten zur biologischen Vielfalt: Modellbasierte Ansätze werden üblicherweise zur Messung von Indikatoren auf Ökosystemebene (z. B. Umfang, Zustand oder Funktion) verwendet."
- **Deckt in BIOME:**
  - **Abgeschlossene Werteliste für ein Pflicht-Herkunftsfeld `datenherkunft`:** `primaerdaten` (Erhebung vor Ort), `sekundaerdaten` (u. a. Geodatenschichten), `modelliert`, `experteneinschaetzung` — sowie ausdrücklich „eine Mischung dieser Daten". Jede BIOME-Kennzahl muss eine dieser Ausprägungen tragen. Das ist der wörtliche Beleg für die Herkunftspflicht, die das ganze Register trägt.
  - **Weitere belegte Pflicht-Metafelder je Kennzahl** (aus AR 27 f): `ueberwachungshaeufigkeit`, `ausgangszustand` / `ausgangswert`, `basisjahr` bzw. `basiszeitraum`, `bezugszeitraum`. Zusammen mit `datenherkunft` und dem Methodenfeld aus AR 27 a ist damit das BIOME-Metadatenschema einer Kennzahl vollständig belegt.
  - **Feld `verpflichtend_oder_freiwillig`** mit Angabe der Rechtsvorschrift bzw. der freiwilligen Norm — das ist genau die Funktion dieses Standards-Registers.
  - **Feld `annahmen_grenzen_unsicherheiten`** und `methodenwechsel_begruendung` (AR 27 a: „etwaiger Änderungen der Methoden im Laufe der Zeit und die Gründe dafür"). BIOME darf eine Methode nicht stillschweigend wechseln.
  - **Kohärenzregel, wörtlich:** Ausgangswert von Kennzahl und Ziel müssen angeglichen sein (AR 29). BIOME darf ein Ziel nicht gegen eine andere Baseline rechnen als die Messreihe.
  - **Vergleichbarkeitsregel:** „Die Verfahren zur Sammlung von Informationen und die Definitionen müssen systematisch angewandt werden" — deckt die Sperre, Zeitreihen aus uneinheitlich erhobenen Werten zu bilden.
- **Deckt ausdrücklich nicht:**
  - AR 27 ist als „hat zu berücksichtigen und **kann** beschreiben" formuliert. Die Aufzählung ist damit **keine** unbedingte Angabepflicht; BIOME darf sie als eigenes Qualitätsraster nutzen, aber nicht behaupten, ESRS verlange jede dieser Angaben zwingend.
  - Keine Aussage zu Kontroll- oder Referenzflächen. **Das Wort „Kontrollfläche" kommt in ESRS E4 nicht vor.** ESRS verlangt einen Ausgangswert (Baseline), nicht eine Vergleichsfläche. Die Vergleichsfläche ist nur über WIRK-01/WIRK-02 gedeckt.

### WIRK-12 · ESRS E4-4 — Ziele, ökologische Schwellenwerte, Abhilfemaßnahmenhierarchie
- **Herausgeber:** wie WIRK-10, Anhang I, ESRS E4, Angabepflicht E4-4
- **Quelle:** https://publications.europa.eu/resource/celex/32023R2772
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (Absatz 29 und Absatz 32 Buchstaben a, e, f):
  „Das Unternehmen hat seine festgelegten Ziele im Zusammenhang mit biologischer Vielfalt und Ökosystemen anzugeben."
  „a) ob bei der Festlegung der Ziele ökologische Schwellenwerte und die Zuteilung der Auswirkungen auf das Unternehmen angewandt wurden. Ist dies der Fall, erläutert das Unternehmen Folgendes: i. die ermittelten ökologischen Schwellenwerte und die Methode zur Ermittlung dieser Schwellenwerte, ii. ob die Schwellenwerte unternehmensspezifisch sind und, wenn ja, wie sie festgelegt wurden […]"
  „e) ob das Unternehmen bei der Festlegung seiner Ziele Biodiversitätskompensationsmaßnahmen berücksichtigt hat und"
  „f) welcher Stufe in der Abhilfemaßnahmenhierarchie das Ziel zugeordnet werden kann (d. h. Vermeidung, Minimierung, Wiederherstellung und Sanierung, Ausgleich oder Kompensation)."
- **Deckt in BIOME:**
  - **Abgeschlossene, geordnete Werteliste `abhilfestufe`** mit den vier wörtlich benannten Stufen: `vermeidung`, `minimierung`, `wiederherstellung_und_sanierung`, `ausgleich_oder_kompensation`. Das ist die europäische Berichtsfassung der Kaskade und **weicht von der deutschen Rechtsfassung ab** (WIRK-03 kennt drei Stufen und führt „Ersatz in Geld" als eigene Stufe). BIOME braucht deshalb zwei getrennte Felder oder eine dokumentierte Zuordnung — kein gemeinsames Feld.
  - **Feld `schwellenwert_methode`:** Wenn BIOME einen ökologischen Schwellenwert anzeigt, muss die Methode zu seiner Ermittlung mitgeführt werden und ob er unternehmensspezifisch ist.
  - **Feld `kompensation_beruecksichtigt`** (ja/nein) auf Zielebene ist belegt.
- **Deckt ausdrücklich nicht:** konkrete Schwellenwerte. Die Quelle nennt in AR 27 e nur Beispiele für Schwellenwertkonzepte („die Integrität der Biosphäre und Landsystemwandel, die Belastbarkeitsgrenzen des Planeten"), keine Zahlen.

### WIRK-13 · Berlin — Kompensationsverzeichnis: Rechtsgrundlage, Umfang, Zugang
- **Herausgeber:** Senatsverwaltung für Mobilität, Verkehr, Klimaschutz und Umwelt Berlin (SenMVKU), Abteilung Klimaschutz, Naturschutz und Stadtgrün, Referat Naturschutz, Landschaftsplanung, Forstwesen
- **Quelle:** https://www.berlin.de/sen/uvk/natur-und-gruen/landschaftsplanung/kompensation-von-eingriffen/kompensationsinformationssystem/
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich:**
  „Die oberste Naturschutzbehörde des Landes Berlin führt bereits seit 2003 ein gesamtstädtisches, digitales Kataster zur Verwaltung und Zuordnung von Kompensationsflächen und Kompensationsmaßnahmen. Rechtliche Grundlage für das Kataster stellt § 17 Absatz 6 Bundesnaturschutzgesetz ergänzt durch § 19 Absatz 4 Berliner Naturschutzgesetz dar."
  „Im sogenannten KompensationsInformationsSystem (KIS) finden sich alle relevanten Informationen über Ausgleichsmaßnahmen und Ersatzmaßnahmen, einschließlich der Flächen, auf denen diese durchgeführt wurden. Damit kann verhindert werden, dass Flächen doppelt mit Kompensationsmaßnahmen belegt oder durch Unkenntnis überplant werden. Über die gesetzliche Vorgabe hinaus umfasst das KIS auch die Flächen des Berliner Ökokontos und des naturschutzrechtlichen Ökokontos."
  „Der aktuelle Datenstand ist jederzeit für die zuständigen Behörden über eine eigene Webseite abrufbar. Sie können auch Flächen, Eingriffe und Maßnahmen bearbeiten und ergänzen."
  „Interessierte können sich die eingetragenen Flächen und Maßnahmen sowie ausgewählte Sachdaten über das Geoportal Berlin ansehen. Es sind Kompensationsflächen (grün) und Ökokontoflächen (blau) dargestellt."
  „Zur Ermittlung und Bewertung des Eingriffs und des erforderlichen Kompensationsumfangs steht der eingeführte und anerkannte „Berliner Leitfaden zur Bewertung und Bilanzierung von Eingriffen" zur Verfügung."
- **Deckt in BIOME:**
  - **Belegter Zweck des Katasters: Doppelbelegungsschutz.** Ein BIOME-Feature, das eine Fläche als Kompensationsfläche vorschlägt, muss gegen das KIS geprüft werden — die Quelle nennt Doppelbelegung ausdrücklich als das zu verhindernde Risiko.
  - **Zwei belegte Layer-Kennungen im Geoportal:** `kis:kfk` (Kompensationsflächenkataster, grün) und `kis:oek` (Ökokontoflächen, blau) — aus dem auf der Seite abgedruckten Viewer-Link. Das sind die Namen, unter denen BIOME die Daten adressieren kann.
  - **Zwei getrennte Flächenkategorien:** Kompensationsflächen (gesetzlich) und Ökokontoflächen (über die gesetzliche Vorgabe hinaus, zwei Arten: Berliner Ökokonto und naturschutzrechtliches Ökokonto). BIOME darf sie nicht zu einer Kategorie zusammenfassen.
  - **Zugriffsmodell:** Schreibrechte nur für zuständige Behörden; für Interessierte nur Ansicht ausgewählter Sachdaten. BIOME kann Bürgerinnen und Bürgern keinen vollständigen Sachdatensatz versprechen.
- **Deckt ausdrücklich nicht:**
  - **Kein Wort zu Nachweisführung, Erfolgskontrolle, Kontrollintervallen oder Unterhaltungszeiträumen.** Die Seite beschreibt ein Verwaltungskataster, keine Monitoringpflicht. Der Unterhaltungszeitraum bleibt damit einzelfallbezogen nach § 15 Abs. 4 BNatSchG (WIRK-05).
  - Kein Attributschema, keine Feldliste, keine Wertelisten des KIS.

## Nicht zugänglich

| Norm/Quelle | Warum | Status | Was dadurch in BIOME NICHT belegbar ist |
|---|---|---|---|
| EUR-Lex-Weboberfläche `eur-lex.europa.eu` (HTML und ELI, DE) | Antwortet in dieser Umgebung durchgängig mit leerem Body; fünf Versuche mit Browser-User-Agent, Sprachheader und Cookie-Jar | HTTP 202, 0 Byte | Nichts — die identischen amtlichen Sprachfassungen waren über `publications.europa.eu/resource/celex/…` (HTTP 200) erreichbar. Aufgeführt, damit Nachprüfungen nicht am falschen Host scheitern. |

## Offene Fragen an Malte

Vier davon sind im Text oben schon als offen markiert; hier stehen sie
zusammen, damit sie nicht in den Einträgen untergehen.

- **Vorzeichenrichtung des BACI-Kontrasts.** WIRK-01 belegt die vier Indizes
  (C, I, B, A) und die Bezeichnung „difference-in-difference". Die Formel selbst
  liegt in der Quelle als Grafik vor, nicht als Text — die **Rechenrichtung** ist
  damit nicht belegt. Praktisch heißt das: BIOME weiß, dass zwei Differenzen
  voneinander abzuziehen sind, aber nicht aus dieser Quelle, welche von welcher.
  Bevor die erste Wirkungszahl gerendert wird, muss das aus einer Quelle
  festgelegt werden, die die Formel als Text führt. Bis dahin: **keine
  Kontrastzahl**, nur die vier Messwerte nebeneinander.

- **Geltungsstand der RL (EU) 2024/825.** Eine Richtlinie gilt nicht
  unmittelbar. Belegt ist der Richtlinientext (WIRK-07 bis WIRK-09), nicht der
  deutsche Umsetzungsakt und nicht die Frist. Solange das nicht geprüft ist,
  darf BIOME die Verbote als **Gestaltungsregel** anwenden — das ist ohnehin
  richtig — aber sie nicht als geltendes deutsches Recht zitieren.

- **Rechtsstand der ESRS.** Abgerufen ist die Delegierte Verordnung (EU)
  2023/2772 in der Fassung vom 31.07.2023. Spätere Änderungen des delegierten
  Rechtsakts wurden nicht geprüft. Für ein Kundendokument, das sich auf ESRS E4
  beruft, ist der Stand vorher nachzusehen.

- **Welche Kennzahl gilt als Wirkungsnachweis?** Keine der dreizehn Quellen
  sagt, welche Größe (NDVI, Artenzahl, Deckungsgrad, Bodenfeuchte …) eine
  bestimmte Wirkung belegt. Das ist eine fachliche Setzung je Maßnahmentyp und
  gehört Malte, nicht dem Register. Ohne sie kann BIOME BACI-Datensätze
  speichern, aber keinen Vorschlag machen, was zu messen ist.

- **Verhältnis zum Berliner KIS.** WIRK-13 belegt, dass Berlin ein
  Kompensationsverzeichnis führt und dass Doppelbelegung das ausdrücklich zu
  verhindernde Risiko ist. Nicht belegt ist ein Zugang für Dritte über die
  Ansicht hinaus. Frage: Soll BIOME für LUMA-Flächen einen KIS-Abgleich
  vorsehen, und gibt es dafür einen Zugang? Das ist eine Zugangsfrage, keine
  Recherchefrage — ich komme an das Verfahren nicht heran.
