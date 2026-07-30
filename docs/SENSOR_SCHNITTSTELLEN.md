# Sensor-Schnittstellen — eigene LUMA-Hardware und Fremdsensoren

> Analyse & Schnittstellenplanung, 2026-07-30. Noch nichts davon ist gebaut —
> das Dokument beschreibt den Ist-Zustand, die Lücken und einen Vorschlag,
> wie die Anbindung aussehen sollte.

---

## 1 · Ist-Zustand

### Was schon steht ✅

| Baustein | Ort | Zustand |
|---|---|---|
| Sensorliste, Kacheln, Detailseite | `SensorsPage.jsx`, `SensorPage.jsx`, `SensorTile.jsx` | produktiv |
| Messwert-Historie | `sensor_readings` (Migration 20260710) | produktiv, ~1350 Werte |
| Verlaufslogik, Sparklines, Cache | `sensorSeries.js`, `sensorHistory.js` | produktiv, per `npm test` geprüft |
| Alarmregeln (Schwellen ↑↓, Hysterese, Ruhezeit, Telegram, Aufgabe) | `sensorAlarm.js` (266 Z., reine Logik) | produktiv |
| Projekt-Alarmvorlagen | Migration 20260729 | produktiv |
| GPS je Sensor, Marker auf der BIOME-Karte | Migration 20260721 | produktiv |
| RLS auf `sensor_readings` | Migration 20260715 | nur `is_internal()` |

Die **Auswerteseite ist fertig und gut**. Was fehlt, ist alles vor dem Messwert:
Es gibt derzeit **keinen einzigen Weg, auf dem ein echter Sensor einen Wert in
die Datenbank bekommt.**

### Wie Werte heute entstehen

```
SensorsPage „Simulation starten"
   └─ setInterval(5s) → Math.random() → updateSensorValue()
                                            ├─ sensors.value / status  (UPDATE)
                                            ├─ sensor_readings         (INSERT, 5-Min-Drossel)
                                            ├─ pruefeAlarm() → Telegram
                                            └─ createTask()
```

Alles läuft **im Browser**, im `OpsContext`. Das ist der Kern des Problems für
alles, was jetzt kommt (siehe 2.2).

### Konkrete Lücken ❌

1. **Kein Ingest-Pfad.** Keine Edge Function, kein Webhook, kein MQTT. Ein
   LoRaWAN-Sensor hätte heute niemanden, der ihm zuhört. Die RLS-Migration
   20260715 beschreibt den Webhook-Weg bereits im Kommentar — gebaut ist er nicht.
2. **Kein Gerätebegriff.** `sensors` ist gleichzeitig Gerät, Messstelle und
   Messgröße. Ein Gerät, das Temperatur *und* Feuchte *und* Batteriestand
   sendet, lässt sich nicht abbilden — es würde zu drei unverbundenen Zeilen,
   die dreimal an derselben GPS-Position kleben.
3. **Kein Herkunftsfeld.** „LUMA-Sensor" vs. „Kundengerät" ist nicht
   unterscheidbar — obwohl daran Wartung, Gewährleistung und Abrechnung hängen
   (`docs/BIOME_KUNDENPORTAL.md` §3: der Kunde bucht Messstellen inkl.
   Batteriewechsel).
4. **Keine Ausfallerkennung.** Alarme werden nur bei einem *neuen* Wert
   geprüft. Ein Sensor, der stirbt, löst deshalb nie einen Alarm aus — er wird
   einfach still. Für bezahlte Messstellen ist genau das der wichtigste Alarm.
5. **Nur 4 feste Typen.** `sensorTypes.js` kennt `soil_moisture`, `soil_temp`,
   `air_temp`, `rainfall`. Ein Fremdsensor mit Leitfähigkeit, pH, Windgeschwindigkeit
   oder Füllstand fällt durchs Raster (Label und Icon sind dann `undefined`).
6. **Keine Idempotenz.** `sensor_readings` hat keinen Unique-Index. Der
   Webhook-Retry eines Netzwerkservers (TTN wiederholt bei Timeout) erzeugt
   Duplikate, die Min/Ø/Max verfälschen.
7. **Schema-Drift.** Für `sensors` existiert **keine `CREATE TABLE` im Repo** —
   nur nachträgliche `ALTER`s. Die Tabelle wurde von Hand angelegt. Laut
   `CLAUDE.md` soll genau das nicht passieren.
8. **`GaugeBar` rechnet fest `value / 100`** (`SensorsPage.jsx:9`). Für Prozent
   passt das; für °C, hPa, µS/cm oder Lux zeigt der Balken Unsinn.

---

## 2 · Die zwei Entscheidungen, an denen alles hängt

### 2.1 Gerät ≠ Messstelle ≠ Kanal

Das ist die eigentliche Modellierungsfrage. Drei Begriffe, die heute in einer
Tabelle liegen:

| Begriff | Was es ist | Beispiel |
|---|---|---|
| **Gerät** | das physische Ding mit Seriennummer, Batterie, Funk | Dragino LSE01, DevEUI `a84041…` |
| **Messstelle** | der Ort, an dem gemessen wird — das, was der Kunde bucht | „Baumscheibe Nord, Tiny Forest" |
| **Kanal** | eine Messgröße eines Geräts | Bodenfeuchte / Bodentemperatur / Leitfähigkeit |

Ein Gerät hat n Kanäle. Eine Messstelle überlebt den Gerätetausch (Batterie
leer → neues Gerät, gleiche Zeitreihe). Ein Fremdsensor liefert oft Kanäle,
die uns gar nicht interessieren.

**Vorschlag:** `sensors` bleibt, was es faktisch schon ist — die
**Messstelle + Kanal** — und bekommt nur einen Verweis auf ein neues `geraet`.
Damit ändert sich für die gesamte bestehende UI, für `sensorAlarm.js`,
`sensorHistory.js` und die Karte **nichts**. Kein Rewrite, nur ein Anbau.

### 2.2 Alarme müssen auf den Server

Heute steckt der komplette Alarmweg in `OpsContext.updateSensorValue()`, also
im Browser. Sobald Werte per Webhook eintreffen, gilt:

> **Kein offener Browser → kein Alarm.** Ein nachts um drei ausgelöster
> Trockenalarm käme erst, wenn morgens jemand die App öffnet — und dann mit
> dem falschen Zeitstempel.

`sensorAlarm.js` ist glücklicherweise **reine Logik ohne Seiteneffekte** (das
war eine sehr gute Entscheidung) und damit unverändert serverseitig
verwendbar. Vorschlag: Modul nach `supabase/functions/_shared/sensorAlarm.js`
verschieben, `src/lib/sensorAlarm.js` re-exportiert es nur noch. Dann nutzen
Browser, Edge Function und `npm test` **dieselbe** Datei — keine zweite
Wahrheit.

---

## 3 · Zielbild der Schnittstellen

Leitgedanke: **Ein Ingest-Kern, n Adapter.** Jedes fremde Format wird so früh
wie möglich in eine Kanonform übersetzt; alles dahinter (Alarm, Aufgabe,
Historie) kennt nur noch diese eine Form.

```
   LUMA-Hardware        Fremd-Hardware              Fremd-Clouds
   (LoRaWAN/NB-IoT)     (TTN, Gateway, MQTT)   (Netatmo, Ecowitt, HA…)
        │                      │                        │
        │ POST                 │ POST ?adapter=ttn      │ (Cron holt aktiv ab)
        ▼                      ▼                        ▼
   ┌──────────────────────────────────────┐   ┌────────────────────┐
   │  EF  sensor-ingest      (push)       │   │ EF sensor-pull     │
   │  Auth: x-luma-device-key             │   │ alle 15 min        │
   └──────────────┬───────────────────────┘   └────────┬───────────┘
                  │        Adapter: parse/hole          │
                  └──────────────┬──────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │  Kern (gemeinsam)      │
                    │  • Kanal → sensor_id   │
                    │  • Kalibrierung/Einheit│
                    │  • Plausibilität       │
                    │  • sensor_readings     │
                    │  • pruefeAlarm()       │
                    │  • Telegram + Aufgabe  │
                    │  • geraet.last_seen    │
                    └────────────────────────┘
```

### Schnittstelle A — Push-Ingest (LUMA-Geräte, TTN, Gateways)

`POST /functions/v1/sensor-ingest`

Auth **nicht** über den anon-Key und **nicht** über ein User-JWT, sondern über
einen Gerätetoken im Header:

```
x-luma-device-key: lum_7f3a…          (nur beim Anlegen einmal im Klartext,
                                        in der DB liegt sha256)
```

Kanonform des Bodys:

```json
{
  "device": "a84041000181bc2f",
  "ts": "2026-07-30T10:12:00Z",
  "readings": [
    { "kanal": "soil_moisture", "wert": 27.4, "einheit": "%"  },
    { "kanal": "soil_temp",     "wert": 18.1, "einheit": "°C" },
    { "kanal": "battery",       "wert": 3.62, "einheit": "V"  }
  ],
  "meta": { "rssi": -103, "snr": 7.5 }
}
```

Antwort: `{ ok: true, angenommen: 2, ignoriert: 1, alarme: 1 }`
(„ignoriert" = Kanal ist am Gerät nicht als Messstelle angelegt — kein Fehler,
sondern der Normalfall bei Fremdgeräten, die mehr senden, als uns interessiert.)

Fremdformate landen auf **demselben** Endpunkt, nur mit
`?adapter=ttn` / `?adapter=chirpstack` / `?adapter=ecowitt`. Der Adapter
übersetzt in die Kanonform, bevor irgendetwas geschrieben wird.

Regeln:
- `ts` fehlt → `now()`. `ts` mehr als 48 h in der Zukunft → ablehnen (400).
- Idempotenz über Unique-Index `(sensor_id, ts)`, `ON CONFLICT DO NOTHING` —
  ein Webhook-Retry darf keine Dublette erzeugen.
- Rate-Limit je Gerät (z. B. 60 Requests/h), sonst ist ein geleakter Token ein
  Kostenhebel.
- Schreiben mit `service_role`; die Tabellen bleiben ohne öffentliche
  Schreibrechte.

### Schnittstelle B — Pull-Adapter (Fremd-Clouds)

Viele „bestehende Sensoren" beim Kunden hängen bereits in einer Hersteller-Cloud
(Netatmo, Ecowitt, Sensoterra, Home Assistant, Shelly). Da kommt kein Webhook
zu uns — wir müssen holen.

`sensor-pull` läuft per pg_cron/Scheduled Function alle 15 min, geht über alle
Geräte mit `anbindung = 'cloud_pull' AND aktiv`, ruft `adapter.hole(geraet, seit)`
und übergibt das Ergebnis an denselben Kern wie A. Zugangsdaten liegen
verschlüsselt in `geraet.config` (bzw. Vault), **nie** im Client.

### Schnittstelle C — Gateway vor Ort

BLE (Xiaomi/Govee), Modbus, LoRa-Direktempfang: Ein Raspberry Pi sammelt lokal
und spricht die Kanonform gegen Schnittstelle A. **Kein eigener Pfad im
Backend** — das Gateway ist aus Sicht der Plattform ein LUMA-Gerät mit vielen
Kanälen. Puffern bei Netzausfall passiert auf dem Pi.

### Adapter-Vertrag

Eine Datei je Treiber unter `supabase/functions/_shared/adapter/`:

```ts
export interface Adapter {
  id: string                       // 'luma' | 'ttn' | 'ecowitt' | 'netatmo' …
  label: string                    // Anzeige im Anlege-Dialog
  richtung: 'push' | 'pull'
  felder: Feld[]                   // was beim Anlegen abgefragt wird
                                   // → das UI rendert sich generisch daraus
  kanaele: string[]                // was das Gerät typischerweise liefert
  parse?(body: unknown, geraet: Geraet): Messung[]        // push
  hole?(geraet: Geraet, seit: Date): Promise<Messung[]>   // pull
}

type Messung = { kanal: string; wert: number; einheit?: string; ts?: string }
```

Der Gewinn: **Ein neuer Sensortyp ist eine Datei, kein UI-Umbau.** Der
Anlege-Dialog kennt keine Hersteller, er rendert `felder`.

---

## 4 · Datenmodell (Vorschlag)

Additiv — keine bestehende Spalte verschwindet, kein bestehender Code bricht.

```sql
-- ── Gerät: das physische Ding ────────────────────────────────────────────
create table if not exists public.geraet (
  id            text primary key,
  bezeichnung   text not null,              -- "Dragino LSE01 #3"
  herkunft      text not null default 'luma'
                check (herkunft in ('luma','kunde','fremd')),
  hersteller    text,
  modell        text,
  seriennummer  text,                       -- DevEUI, MAC, Cloud-ID
  anbindung     text not null default 'http'
                check (anbindung in ('http','lorawan','mqtt','cloud_pull','manuell')),
  adapter       text not null default 'luma',
  config        jsonb not null default '{}'::jsonb,   -- Adapter-Einstellungen
  secret_hash   text,                       -- sha256 des Gerätetokens
  projekt_id    text references projects(id),
  lat           double precision,
  lng           double precision,
  aktiv         boolean not null default true,
  status        text not null default 'bestellt'
                check (status in ('bestellt','lager','installiert','aktiv','stumm','defekt','ausgebaut')),
  batterie_pct  numeric,
  rssi          numeric,
  firmware      text,
  last_seen     timestamptz,
  wartung_faellig date,                     -- Batteriewechsel → Aufgabe
  created_at    timestamptz not null default now()
);

-- ── Messstelle: sensors bleibt, bekommt nur den Anbau ────────────────────
alter table public.sensors
  add column if not exists geraet_id  text references public.geraet(id),
  add column if not exists kanal      text,      -- Kanal am Gerät ('soil_moisture')
  add column if not exists quelle     text not null default 'manuell'
      check (quelle in ('manuell','simulation','geraet')),
  add column if not exists kalibrierung jsonb not null default '{}'::jsonb,
      -- { offset, faktor, min_plausibel, max_plausibel }
  add column if not exists stumm_nach_min integer;   -- null = Ausfallalarm aus

create unique index if not exists sensors_geraet_kanal
  on public.sensors (geraet_id, kanal) where geraet_id is not null;

-- ── Messwerte: Dublettenschutz + Rohwert ─────────────────────────────────
alter table public.sensor_readings
  add column if not exists roh_wert numeric,   -- vor Kalibrierung, für Fehlersuche
  add column if not exists quelle   text;

create unique index if not exists sensor_readings_uniq
  on public.sensor_readings (sensor_id, ts);
```

Dazu — **überfällig, unabhängig von diesem Thema** — die fehlende
`CREATE TABLE public.sensors` als Migration nachziehen, damit ein Neuaufbau der
Umgebung dasselbe Schema erzeugt wie die laufende DB.

### Kanalkatalog statt vier fester Typen

`src/data/sensorTypes.js` wird vom Label-Lexikon zum Katalog:

```js
export const KANAELE = {
  soil_moisture: { label: 'Bodenfeuchte',  einheit: '%',    icon: '💧', skala: [0, 100] },
  soil_temp:     { label: 'Bodentemperatur', einheit: '°C', icon: '🌡', skala: [-10, 45] },
  air_temp:      { label: 'Lufttemperatur',  einheit: '°C', icon: '🌤', skala: [-15, 45] },
  rainfall:      { label: 'Niederschlag',    einheit: 'mm', icon: '🌧', skala: [0, 50] },
  air_humidity:  { label: 'Luftfeuchte',   einheit: '%',    icon: '💨', skala: [0, 100] },
  conductivity:  { label: 'Leitfähigkeit', einheit: 'µS/cm', icon: '⚡', skala: [0, 3000] },
  ph:            { label: 'pH-Wert',       einheit: '',     icon: '🧪', skala: [3, 10] },
  level:         { label: 'Füllstand',     einheit: '%',    icon: '🛢', skala: [0, 100] },
  battery:       { label: 'Batterie',      einheit: 'V',    icon: '🔋', skala: [2.8, 3.7], technisch: true },
}
```

`skala` löst nebenbei den `GaugeBar`-Fehler (fest `/100`). Unbekannte Kanäle
werden **generisch angezeigt statt verworfen** — sonst verliert man bei jedem
neuen Fremdgerät still Daten.

---

## 5 · Ausfallerkennung („Sensor stumm")

Die wichtigste fehlende Alarmart, und die einzige, die sich **nicht** aus einem
Messwert ableiten lässt. Vorschlag: eigener Cron-Job, halbstündlich:

```
für jedes Gerät mit aktiv = true und stumm_nach_min gesetzt:
    last_seen älter als stumm_nach_min  →  geraet.status = 'stumm'
                                        →  Telegram (einmalig, nicht im Takt)
                                        →  Aufgabe „Sensor prüfen" (dedupliziert
                                           über source_ref = 'geraet:<id>')
    Wert wieder da                      →  status = 'aktiv', Entwarnung
```

Sinnvolle Vorgabe: das Vierfache des erwarteten Sendeintervalls, mindestens
6 h. `sensorSeries.js` kennt mit `STALE_TAGE = 3` bereits einen verwandten
Begriff für die Anzeige — der Alarm sollte deutlich früher greifen.

Batteriewarnung läuft über denselben Weg: Kanal `battery` unter Schwelle →
Wartungsaufgabe. Bei LUMA-Geräten ist das eine **Leistung, die der Kunde
bezahlt hat**, bei Fremdgeräten nur ein Hinweis.

---

## 6 · Eigene vs. fremde Sensoren — was sich wirklich unterscheidet

Technisch ist beides derselbe Pfad. Unterschiedlich ist das Drumherum:

| | LUMA-Gerät | Fremdgerät |
|---|---|---|
| Anbindung | wir wählen sie (LoRaWAN/HTTP) | vorgegeben → Adapter nötig |
| Token | wir vergeben ihn | Cloud-Zugangsdaten des Kunden |
| Kalibrierung | bekannt, geprüft | unbekannt → als „ungeprüft" kennzeichnen |
| Wartung/Batterie | LUMA-Leistung, Aufgabe automatisch | Sache des Kunden |
| Ausfall | unser SLA | wir melden, wir haften nicht |
| Verwendung in Reports | volle Datenqualität | im Bericht als Fremdquelle ausweisen |

Der letzte Punkt ist der heikelste: Wenn ein Kunde einen billigen
Baumarkt-Feuchtefühler anschließt und der Wert landet ungekennzeichnet in einem
BIOME-Bericht, steht LUMAs Name unter fremden Rohdaten. Deshalb gehört
`herkunft` nicht nur ins Schema, sondern sichtbar an die Kachel, in den Bericht
und in die Aggregation (Fremdwerte standardmäßig **nicht** in Gebietsmittelwerte).

---

## 7 · Reihenfolge

| Phase | Inhalt | Aufwand |
|---|---|---|
| **0 · Fundament** | `sensors`-DDL als Migration nachziehen, Unique-Index auf `sensor_readings`, `sensorAlarm.js` nach `_shared/` | ½ Tag |
| **1 · Ingest** | `geraet`-Tabelle, Edge Function `sensor-ingest`, Kanonform, Gerätetoken, Alarm serverseitig, Adapter `luma` + `ttn` | 2–3 Tage |
| **2 · Oberfläche** | Kanalkatalog, generischer Geräte-Anlegedialog aus `adapter.felder`, Geräteliste, `GaugeBar` bereichsbasiert, Herkunft sichtbar | 2 Tage |
| **3 · Fremdsysteme** | `sensor-pull` + Cron, 1–2 Cloud-Adapter, Ausfall- und Batterieerkennung | 2–3 Tage |
| **4 · Portal** | RLS für `kunde_viewer` auf eigene Messstellen, Wartungsaufgaben, Bestellstrecke „Sensor hier setzen" (`BIOME_KUNDENPORTAL.md` §3) | offen |

Phase 0+1 ist der Punkt, ab dem echte Hardware Werte liefern kann. Alles davor
ist Simulation, alles danach Komfort.

---

## 8 · Was ich von dir brauche

1. **Welche Fremdsysteme zuerst?** Der erste Adapter bestimmt den Zuschnitt.
   LoRaWAN über TTN ist die naheliegende Vermutung — oder liegen konkret
   Ecowitt-/Netatmo-Stationen bei Kunden?
2. **Dürfen Kunden selbst Geräte anbinden** (Self-Service-Token im Portal), oder
   legt LUMA jedes Gerät an? Das ist eine Support- und Sicherheitsfrage, keine
   technische.
3. **Wem gehören Fremdmessdaten?** Dürfen sie in BIOME-Gebietsauswertungen
   einfließen? Das gehört vor dem ersten Adapter geklärt, nicht danach.
4. **Bestätigst du „Messstelle überlebt Gerätetausch"?** Also: Zeitreihe hängt
   an `sensors`, nicht am Gerät. Ich halte das für richtig (der Kunde bucht den
   Ort, nicht das Gerät) — es ist aber die eine Modellentscheidung, die sich
   später nur mit Datenmigration korrigieren lässt.
