# E-Mail-Versand

**Stand:** 29.07.2026 · **Edge Function:** `supabase/functions/email/` ·
**Migration:** `supabase/migrations/20260729_email_versand.sql`

---

## 1. Warum

Bis jetzt gab es in der Plattform **keinerlei E-Mail-Infrastruktur** — nur
interne Telegram-Digests, ausgelöst aus dem Browser. Damit fehlte der zweite
der drei Hebel aus `CUSTOMER_STRATEGY.md`: die **regelmäßigen „Pull"-Momente**.

> „Kunden kommen nicht wegen der App, sondern weil die App ihnen etwas schickt."

Der Leistungsnachweis im Portal ist gut — aber er setzt voraus, dass der Kunde
sich einloggt. Per E-Mail kommt er von selbst. Genau das verhindert den
Jahresend-Schock aus `PFLEGEPLANUNG_KONZEPT.md`, Kap. 2.3.

---

## 2. Was gebaut wurde

- **Edge Function `email`** — hält den Provider-Schlüssel serverseitig,
  prüft Login und Rolle (admin/mitarbeiter), löst den Empfänger auf,
  verschickt und protokolliert.
- **`email_versand`** — Protokoll jedes Versands (auch der Fehlschläge).
  Nur lesbar fürs Team; geschrieben wird ausschließlich serverseitig.
- **`src/lib/nachweisEmail.js`** — der Leistungsnachweis als E-Mail-HTML
  (tabellenbasiert, Inline-Styles, 600 px — E-Mail-Clients können kein
  modernes CSS). Liefert Betreff, HTML und Nur-Text-Fassung.
- **`src/lib/email.js`** — Frontend-Helfer `sendeEmail()` und
  `versandProtokoll()`.
- **Pflege → Plan/Ist:** Button **E-Mail** je Fläche, mit Vorschau,
  Testversand an sich selbst und ausdrücklicher Freigabe.

Vorschau ohne laufende App: `node scripts/preview-nachweis.mjs vorschau.html`
schreibt zusätzlich `vorschau-email.html`.

---

## 3. Sicherheitsmodell — kein offenes Relay

Das Frontend ist eine statische SPA mit öffentlichem anon-Key. Eine Funktion,
die beliebige Empfänger akzeptiert, wäre damit ein Werkzeug, um unter eurer
Domain Spam zu verschicken. Deshalb:

- **Der Empfänger kommt nicht vom Client.** Übergeben wird eine `client_id`;
  die Adresse liest die Funktion serverseitig aus `clients.contact_email`.
- Eine abweichende Adresse ist **nur** erlaubt, wenn sie die eigene Adresse
  der/des Absendenden ist — für den Testversand.
- Zugriff nur für `admin`/`mitarbeiter` (gleiche Prüfung wie beim
  Claude-Proxy).
- `Reply-To` ist die Adresse der Person, die gesendet hat — Kundenantworten
  landen beim richtigen Menschen, nicht in einem Sammelpostfach.

**Kein automatischer Versand.** Jede Mail geht über die Vorschau und einen
bewussten Klick — dasselbe Human-in-the-Loop-Prinzip wie bei MANA
(`MANA_PLAN.md`, Kap. 4). Automatisierung ist erst sinnvoll, wenn sich die
Zahlen über eine Saison als verlässlich erwiesen haben.

---

## 4. Einrichtung

### 4.1 Provider wählen

Die Funktion unterstützt zwei Anbieter; es genügt **einer**.

| Provider | Secret | Sitz / Datenhaltung |
|---|---|---|
| **Brevo** (ehem. Sendinblue) | `BREVO_API_KEY` | Frankreich, EU-Rechenzentren |
| Resend | `RESEND_API_KEY` | USA (EU-Region separat buchbar) |

**Empfehlung: Brevo.** In `CUSTOMER_STRATEGY.md` ist „Supabase-Server in EU
(Frankfurt), DSGVO-konform, **keine US-Cloud**" ausdrücklich als
Verkaufsargument gegenüber Kommunen und Wohnungswirtschaft aufgeführt. Ein
US-Versanddienst für Kundenmails würde genau dieses Argument untergraben —
gerade bei den institutionellen Kunden, die ihr gewinnen wollt. Beide
Anbieter haben einen kostenlosen Einstiegstarif, der für den Anfang reicht.

Sind beide Schlüssel gesetzt, entscheidet `EMAIL_PROVIDER` (`brevo` |
`resend`); ohne Angabe gewinnt Brevo.

### 4.2 Secrets setzen

Supabase Dashboard → Edge Functions → Secrets:

| Secret | Pflicht | Beispiel |
|---|---|---|
| `EMAIL_FROM` | ja | `LUMA Biome <nachweis@luma.earth>` |
| `BREVO_API_KEY` | eines von beiden | `xkeysib-…` |
| `RESEND_API_KEY` | eines von beiden | `re_…` |
| `EMAIL_PROVIDER` | nein | `brevo` |

Die Absenderdomain muss beim Provider **verifiziert** sein (SPF/DKIM),
sonst landen die Mails im Spam. Das ist ein einmaliger DNS-Schritt bei
`luma.earth`.

### 4.3 Ausrollen

```bash
supabase functions deploy email
```

Migration `20260729_email_versand.sql` einmalig im SQL-Editor ausführen.

Ohne Secrets antwortet die Funktion mit einem verständlichen Hinweis statt
zu scheitern — dasselbe Verhalten wie beim Claude-Proxy.

---

## 5. Voraussetzung: Kontakt-E-Mail pflegen

Der Versand braucht `clients.contact_email`. Aktuell ist das Feld bei den
meisten Auftraggebern leer — zu pflegen unter **Stammdaten → Kunde
bearbeiten**. Ohne Adresse zeigt der Dialog einen Hinweis und lässt nur den
Testversand an die eigene Adresse zu.

---

## 6. Was als Nächstes sinnvoll ist

- **Monatlicher Automatikversand** — als GitHub-Actions-Cron nach dem Muster
  von `mana-scan.yml`, sobald die Zahlen über eine Saison stabil sind.
  Sinnvoll mit Vorlauf: Entwurf erzeugen, Telegram meldet „bereit", ein
  Mensch gibt frei.
- **Saisonale Hinweise** aus `CUSTOMER_STRATEGY.md` („🌱 Pflanzzeit April",
  Blühkalender-Hinweis) — dieselbe Funktion, anderer Inhaltsbaustein.
- **Jahres-Biodiversitätsbericht** als Anhang, sobald `bioReport.js` zum
  Kunden gedreht ist.
