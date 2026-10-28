// Edge Function: kalender-sync
// Liest die abonnierten Kalender (geheime iCal-Adresse aus kalender_quellen)
// serverseitig und spiegelt die Termine nach kalender_termine. Die Adresse
// verlässt so nie den Server — vorher lief der Import über einen fremden
// CORS-Proxy.
//
// Aufruf:
//   · aus der App von internen Konten (Pflege → Kalender, „Jetzt abgleichen“
//     bzw. automatisch beim Öffnen, wenn der letzte Abgleich älter ist)
//   · stündlich von GitHub Actions (.github/workflows/kalender-sync.yml) mit
//     Kopfzeile x-sync-token = Secret KALENDER_SYNC_TOKEN
// Zeitfenster: 400 Tage zurück bis 500 Tage voraus (Serien werden aufgeschlüsselt).
//
// kalenderIcs.js ist eine Kopie von src/lib/kalenderIcs.js
// (scripts/test-kalender-ics.mjs prüft, dass beide gleich sind).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { icsLesen, plusTage } from "./kalenderIcs.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MIN_ABSTAND_MS = 2 * 60 * 1000;   // App-Aufrufe höchstens alle 2 Minuten

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const token = Deno.env.get("KALENDER_SYNC_TOKEN");
  const perToken = !!token && req.headers.get("x-sync-token") === token;
  if (!perToken) {
    const alsAufrufer = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: intern, error } = await alsAufrufer.rpc("is_internal");
    if (error || !intern) return json({ error: "forbidden" }, 403);
  }

  let erzwingen = false;
  try { erzwingen = !!(await req.json())?.erzwingen; } catch { /* ohne Body */ }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: quellen, error: qErr } = await admin.from("kalender_quellen").select("*").eq("aktiv", true);
  if (qErr) return json({ error: qErr.message }, 500);

  const heute = new Date().toISOString().slice(0, 10);
  const von = plusTage(heute, -400), bis = plusTage(heute, 500);
  const ergebnis = [];

  for (const q of quellen ?? []) {
    if (!perToken && !erzwingen && q.zuletzt_sync && Date.now() - Date.parse(q.zuletzt_sync) < MIN_ABSTAND_MS) {
      ergebnis.push({ id: q.id, name: q.name, uebersprungen: true, anzahl: q.anzahl });
      continue;
    }
    const start = new Date().toISOString();
    try {
      const ab = new AbortController();
      const timer = setTimeout(() => ab.abort(), 25000);
      const res = await fetch(q.ical_url, { signal: ab.signal, headers: { "User-Agent": "LUMA-Ops-Kalender/1.0" } });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Kalender antwortet mit HTTP ${res.status}`);
      const text = await res.text();
      if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Antwort ist keine iCal-Datei — stimmt die Adresse?");
      const termine = icsLesen(text, { von, bis });
      const zeilen = termine.map((t) => ({ ...t, quelle_id: q.id, aktualisiert: start }));
      // Doppelte Schlüssel (gleiche UID am gleichen Tag) vermeiden
      const eindeutig = [...new Map(zeilen.map((z) => [`${z.uid}|${z.start_datum}`, z])).values()];
      for (let i = 0; i < eindeutig.length; i += 500) {
        const { error } = await admin.from("kalender_termine")
          .upsert(eindeutig.slice(i, i + 500), { onConflict: "quelle_id,uid,start_datum" });
        if (error) throw new Error(error.message);
      }
      // Im Fenster nicht mehr vorhandene Termine entfernen
      const { error: dErr } = await admin.from("kalender_termine").delete()
        .eq("quelle_id", q.id).gte("start_datum", von).lte("start_datum", bis).lt("aktualisiert", start);
      if (dErr) throw new Error(dErr.message);
      await admin.from("kalender_quellen").update({ zuletzt_sync: start, anzahl: eindeutig.length, letzter_fehler: null }).eq("id", q.id);
      ergebnis.push({ id: q.id, name: q.name, anzahl: eindeutig.length });
    } catch (e) {
      const fehler = e instanceof Error ? (e.name === "AbortError" ? "Zeitüberschreitung beim Abruf" : e.message) : String(e);
      await admin.from("kalender_quellen").update({ letzter_fehler: fehler.slice(0, 500) }).eq("id", q.id);
      ergebnis.push({ id: q.id, name: q.name, fehler });
    }
  }
  return json({ ok: ergebnis.every((e) => !("fehler" in e)), quellen: ergebnis });
});
