# Kundenportal — Leistungsnachweis

**Stand:** 29.07.2026 · **Migration:** `supabase/migrations/20260729_kundenportal_leistungsnachweis.sql`

---

## 1. Warum

Das Kundenportal lag bis jetzt auf einem eigenen Datenmodell (`pflanzplaene`) und war
damit von der operativen Realität abgekoppelt: Alles, was LUMA tatsächlich leistet —
Einsätze, Stunden, Pflegegänge, Fotos — liegt in `projects / jobs / time_entries /
pflege_*` und war für Kunden per RLS (`is_internal()`) vollständig gesperrt.

Ein Auftraggeber konnte also **nicht sehen, was für ihn getan wurde**.

Genau das ist die dokumentierte Ursache des „zu teuer"-Feedbacks
(`docs/PFLEGEPLANUNG_KONZEPT.md`, Kap. 2.3): Die JOPE-Nachfakturierung von 134 h
(≈ 6.657 €) kam im Dezember 2025 unangekündigt. Nicht der Stundensatz war das
Problem, sondern die **Überraschung**. Kap. 3 nennt den Leistungsnachweis
ausdrücklich als Gegenmaßnahme („zugleich Rechnungsgrundlage und
Zu-teuer-Prävention").

---

## 2. Was gebaut wurde

### Datenbank (`20260729_kundenportal_leistungsnachweis.sql`)

**Das fehlende Bindeglied:** `clients.org_id` → `organisation(id)`.
Ein Kundenkonto hängt an einer Organisation (`user_profile.org_id`); erst diese
Spalte verbindet die Organisation mit den echten Aufträgen.

**Sieben bereinigte Views** nach dem bewährten `v_public_*`-Muster
(`security_invoker = false`, Mandantentrennung im `WHERE` über
`is_kunde() AND c.org_id = user_org()`):

| View | Inhalt |
|---|---|
| `v_kunde_auftraggeber` | der eigene Auftraggeber — nur id und Name |
| `v_kunde_projekte`   | betreute Flächen (ohne interne Notizen/Kontakte/Lager) |
| `v_kunde_leistungen` | **der Kern:** je Fläche und Tag — Stunden + ausgeführte Arbeiten |
| `v_kunde_pflegeplan` | Jahresplan je Objekt: Soll-Stunden und Fortschritt |
| `v_kunde_gaenge`     | geplante Pflegegänge (KW, Umfang, Status) |
| `v_kunde_einsaetze`  | Termine (ohne Crew, Fahrzeuge, interne Notizen) |
| `v_kunde_fotos`      | Fotodokumentation je Einsatz |

Bewusst **nicht** enthalten: Personendaten (`time_entries.user_id`,
`jobs.assigned_users`, `job_photos.uploaded_by`), eine Zeilenzahl, aus der
sich die Mannschaftsstärke ableiten ließe, und interne Felder
(`kalib_faktor`, `crew_size`, Margen, `notes`/`notizen`, Kontaktdaten).

Drei Entwurfsentscheidungen, die leicht übersehen werden:

- **Keine Lese-Policy auf `clients`.** Eine RLS-Policy gibt immer die *ganze*
  Zeile frei — inklusive `notes`, Kontaktdaten und Adresse, die über die
  REST-API mitlesbar wären. Der Auftraggebername kommt deshalb aus
  `v_kunde_auftraggeber`.
- **Die Rollenprüfung steht in der View, nicht nur im Frontend.** Der
  Gast-Redirect in `App.jsx` ist Kosmetik: Ein Konto, dem der Zugang durch
  Rückstufung auf `gast` entzogen wird, käme über die REST-API sonst
  weiterhin an alle Leistungsdaten. `is_kunde()` schließt das.
- **`org_id` und `leistungstexte_sichtbar` sind für `authenticated`
  gesperrt** (Tabellenrecht entzogen, spaltenweise zurückgegeben — wie bei
  `user_profile`). Geschrieben wird nur über `admin_set_client_org()` mit
  `is_admin()`-Prüfung. Sonst könnte jede:r Mitarbeiter:in den
  Mandantenzugriff umhängen.

### Anwendung

- **`src/lib/leistungsnachweis.js`** — reine Aggregationslogik (Soll/Ist, Monatsverlauf,
  Plan-Ampel). Wird von Portal **und** interner Pflegeseite genutzt.
  Regressionstest: `npm test` (66 Prüfungen gegen echte Produktionszahlen).
- **`src/lib/printNachweis.js`** — Leistungsnachweis als druckfertiges PDF
  (`window.print()`-Muster wie in `TimePage.jsx`, keine neue Abhängigkeit).
- **`src/pages/KundenPortalPage.jsx`** — drei Tabs: *Leistungen* (Nachweis, Verlauf,
  Plan/Ist je Fläche, Fotos, PDF-Export), *Flächen* (Termine, Pflegegänge),
  *Pflanzpläne* (wie bisher).
- **`src/pages/PflegePage.jsx`** — Plan/Ist-Tab: Button **PDF** je Fläche.
- **`src/components/UserManagement.jsx`** — Abschnitt *Kundenzugänge*
  (Auftraggeber ↔ Organisation verknüpfen).

---

## 3. Einen Kunden freischalten

1. **Migration anwenden** (einmalig): Inhalt von
   `supabase/migrations/20260729_kundenportal_leistungsnachweis.sql` im
   Supabase-SQL-Editor ausführen.
2. Kund:in registriert sich selbst (E-Mail oder Google) → erscheint als **Gast**.
3. *Einstellungen → Nutzer & Zugriff*:
   - falls nötig **Organisation anlegen** (z. B. „JOPE AG", Typ Kunde),
   - beim Konto **Rolle = Kunde** und die Organisation zuweisen,
   - unter **Kundenzugänge** den Auftraggeber (`clients`) mit derselben
     Organisation verknüpfen.
4. **Tätigkeitstexte prüfen und freigeben** (Häkchen „Tätigkeitstexte" in
   derselben Zeile) — siehe Kapitel 4. Ohne Freigabe sieht der Kunde Datum
   und Stunden, aber keine Tätigkeitsbeschreibungen.
5. Fertig — das Konto sieht ab sofort nur die eigenen Flächen unter `/portal`.

Ohne Schritt 3 sieht das Konto nichts (kein Datenleck, nur eine leere Ansicht mit
Hinweistext). Zugang entziehen: Verknüpfung entfernen **oder** die Organisation
beim Konto löschen — die Rückstufung auf `gast` allein genügt ebenfalls, weil
die Views auf `is_kunde()` prüfen.

---

## 4. Betriebliche Voraussetzungen — wichtig

### 4.1 Tätigkeitstexte sind standardmäßig gesperrt

`time_entries.description` ist ein **internes** Freitextfeld. In den
Bestandsdaten stehen dort unter anderem Namen von Beschäftigten
(„Absprachen mit … und …") und Verweise auf **andere Auftraggeber**
(„Material holen aus Villa und Lager für BEW MV"). Ungeprüft ausgespielt
wäre das ein Vertraulichkeitsbruch gegenüber beiden Kunden.

Deshalb: `clients.leistungstexte_sichtbar` ist **standardmäßig aus**. Stunden,
Termine und Plan/Ist sind davon unabhängig immer sichtbar — der Nachweis
funktioniert also auch ohne Freigabe. Erst wenn die Texte eines Auftraggebers
einmal durchgesehen sind, wird das Häkchen gesetzt. Danach gilt: Beschreibungen
benennen die ausgeführte Arbeit, keine internen Bemerkungen. Die meisten
bestehenden Einträge („Beikrautentfernung Drainagen, Wegereinigung, Bewässerung
Rankpflanzen") sind bereits genau richtig.

### 4.2 Sonderprojekte nicht auf das Pflegeprojekt buchen

Der Weidendome-Fall (März 2026, ~33 h Teamarbeit als „Pflege" am MV gebucht)
würde im Portal als Pflegeleistung erscheinen und den Plan/Ist-Vergleich
verfälschen — genau das, wovor Kap. 4.2 des Pflegekonzepts warnt.

### 4.3 Fahrtzeit steckt auf beiden Seiten drin

Der Kunden-Planwert ist `soll_stunden + fahrt_stunden` je Gang. Grund: Die
Ist-Seite (Zeiterfassung) enthält die An-/Abfahrt nachweislich mit
(„Fahrtzeit, Rasen mähen …", „Anfahrt, Beikräuter …"). Würde man nur die
Vor-Ort-Stunden als Plan ausweisen, liefe der Fortschrittsbalken über 100 %,
obwohl exakt nach Plan gearbeitet wurde. Entfallene Gänge zählen nicht mit —
gleiche Definition wie in der internen Plan/Ist-Ansicht.

Der Nachweis basiert bewusst auf `time_entries` und **nicht** auf dem Job-Status:
In der Praxis werden Einsätze vor Ort gebucht, aber selten als Job „erledigt"
geklickt (Stand heute: 0 erledigte Jobs, aber 325 h erfasste Zeit). Ein
Nachweis auf Job-Basis wäre leer.

---

## 5. Was als Nächstes sinnvoll ist

- **Fotos je Einsatz** — die Views sind vorbereitet, aber `job_photos` ist noch leer.
  Foto-Pflicht nach jedem Pflegegang macht den Nachweis erst vollständig.
- **E-Mail-Versand** — es gibt bisher keinerlei E-Mail-Infrastruktur. Eine Edge
  Function nach dem Muster von `supabase/functions/claude/` (Resend/Postmark)
  würde den monatlichen Nachweis automatisch zustellen und wäre zugleich die
  Grundlage für die Saison-Benachrichtigungen aus `CUSTOMER_STRATEGY.md`.
- **Biodiversitätsbericht** — `src/lib/bioReport.js` berechnet den Score bereits,
  zeigt ihn aber nur intern. Für Kommunen/Wohnungswirtschaft ist das der
  Compliance-Nachweis (Förderanträge, CSRD).
