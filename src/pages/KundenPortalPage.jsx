import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, BG, BORDER, FG, MUTED, SURFACE, CARD, OK, WARN, INFO } from '../lib/theme.js'
import {
  buildLeistungsnachweis, planAmpel, formatStunden, formatDatum, formatProzent,
  anteilVonJahr, sollBisKW, MONATE_KURZ,
} from '../lib/leistungsnachweis.js'
import { druckeLeistungsnachweis } from '../lib/printNachweis.js'
import { beispielFotosFlaeche } from '../lib/placeholderImages.js'
import {
  Leaf, MapPin, FileText, LogOut, CheckCircle2, Clock, Sprout,
  Printer, CalendarDays, Camera, ChevronDown, Info,
} from 'lucide-react'

const STATUS_LABELS = {
  planung:                '🗂 Planung',
  pdf_erstellt:           '📄 PDF erstellt',
  bestellung:             '🛒 Bestellt',
  bestellung_bestaetigt:  '✅ Bestätigt',
  pflanzung_laufend:      '🌱 Pflanzung läuft',
  wachstum:               '🌿 Wachstum',
  maintenance:            '🔧 Pflege',
}

const STATUS_COLORS = {
  planung:                '#6b7280',
  pdf_erstellt:           '#d97706',
  bestellung:             '#ea580c',
  bestellung_bestaetigt:  '#16a34a',
  pflanzung_laufend:      '#15803d',
  wachstum:               '#166534',
  maintenance:            '#047857',
}

const MONTHS = MONATE_KURZ

const GANG_STATUS = {
  geplant:    { label: 'geplant',    color: MUTED },
  terminiert: { label: 'terminiert', color: INFO },
  erledigt:   { label: 'erledigt',   color: OK },
  entfallen:  { label: 'entfallen',  color: WARN },
}

/** Select, das bei fehlender View/Tabelle nicht crasht, sondern leer zurückkommt. */
async function safeRows(query) {
  try {
    const { data, error } = await query
    if (error) return { rows: [], fehlt: true }
    return { rows: data || [], fehlt: false }
  } catch {
    return { rows: [], fehlt: true }
  }
}

export default function KundenPortalPage() {
  const { profile, displayName, logout } = useAuth()

  const [kunde, setKunde]           = useState(null)
  const [projekte, setProjekte]     = useState([])
  const [leistungen, setLeistungen] = useState([])
  const [plaene, setPlaene]         = useState([])
  const [gaenge, setGaenge]         = useState([])
  const [einsaetze, setEinsaetze]   = useState([])
  const [fotos, setFotos]           = useState([])
  const [plans, setPlans]           = useState([])       // Pflanzpläne (Florales)
  const [loading, setLoading]       = useState(true)
  const [portalFehlt, setPortalFehlt] = useState(false)  // Views noch nicht angelegt

  const [tab, setTab]           = useState('leistungen')
  const [jahr, setJahr]         = useState(new Date().getFullYear())
  const [offenesObjekt, setOffenesObjekt] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let abgebrochen = false
    async function load() {
      const orgId = profile?.org_id
      const [k, pr, le, pl, ga, ei, fo, pp] = await Promise.all([
        safeRows(sb.from('v_kunde_auftraggeber').select('id, name')),
        safeRows(sb.from('v_kunde_projekte').select('*')),
        safeRows(sb.from('v_kunde_leistungen').select('*')),
        safeRows(sb.from('v_kunde_pflegeplan').select('*')),
        safeRows(sb.from('v_kunde_gaenge').select('*')),
        safeRows(sb.from('v_kunde_einsaetze').select('*')),
        safeRows(sb.from('v_kunde_fotos').select('*')),
        orgId
          ? safeRows(sb.from('pflanzplaene').select('*').eq('org_id', orgId).order('updated_at', { ascending: false }))
          : Promise.resolve({ rows: [], fehlt: false }),
      ])
      if (abgebrochen) return

      // Die View liefert ausschließlich den eigenen Auftraggeber (oder nichts).
      setKunde(k.rows[0] || null)
      setProjekte(pr.rows)
      setLeistungen(le.rows)
      setPlaene(pl.rows)
      setGaenge(ga.rows)
      setEinsaetze(ei.rows)
      setFotos(fo.rows)
      setPlans(pp.rows)
      // Wenn die Kunden-Views fehlen (Migration noch nicht angewendet), sagen
      // wir das deutlich, statt eine leere Seite zu zeigen.
      setPortalFehlt(pr.fehlt && le.fehlt)
      setLoading(false)
    }
    load()
    return () => { abgebrochen = true }
  }, [profile])

  // Verfügbare Jahre aus den echten Daten ableiten
  const jahre = useMemo(() => {
    const set = new Set()
    for (const l of leistungen) { const y = parseInt(String(l.date).slice(0, 4), 10); if (y) set.add(y) }
    for (const p of plaene)     { if (p.jahr) set.add(Number(p.jahr)) }
    if (!set.size) set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [leistungen, plaene])

  useEffect(() => {
    if (jahre.length && !jahre.includes(jahr)) setJahr(jahre[0])
  }, [jahre]) // eslint-disable-line react-hooks/exhaustive-deps

  const nachweis = useMemo(() => buildLeistungsnachweis({
    leistungen, projekte, plaene, fotos, jahr,
  }), [leistungen, projekte, plaene, fotos, jahr])

  const hatLeistungsdaten = leistungen.length > 0

  function drucken() {
    const ok = druckeLeistungsnachweis(nachweis, {
      kundeName: kunde?.name || '',
      titel: `Leistungsnachweis ${jahr}`,
    })
    if (!ok) alert('Bitte Pop-ups für diese Seite erlauben, damit der Nachweis geöffnet werden kann.')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: A, fontFamily: 'monospace' }}>
      Laden...
    </div>
  )

  const TABS = [
    { key: 'leistungen', label: 'Leistungen',  icon: CheckCircle2 },
    { key: 'flaechen',   label: 'Flächen',     icon: MapPin },
    { key: 'pflanzung',  label: 'Pflanzpläne', icon: Leaf },
  ]

  return (
    <div style={{ minHeight: '100vh', background: BG, color: FG, fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: SURFACE, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Leaf size={20} color={A} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.2em', textTransform: 'uppercase' }}>LUMA BIOME</span>
          <span style={{ fontSize: 11, color: MUTED }}>/ Kundenportal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: MUTED }}>👋 {displayName}</span>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
            <LogOut size={12} /> Abmelden
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px' }}>
        {/* Begrüßung */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: FG, margin: 0 }}>
            {kunde?.name || 'Ihre Flächen'}
          </h1>
          <p style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>
            Was auf Ihren Flächen passiert — laufend dokumentiert von LUMA.
          </p>
        </div>

        {/* Hinweis, falls der Zugang noch nicht verknüpft ist */}
        {portalFehlt ? (
          <HinweisBox
            titel="Portal wird gerade eingerichtet"
            text="Die Leistungsdaten sind für Ihren Zugang noch nicht freigeschaltet. Ihr LUMA-Ansprechpartner schaltet das in Kürze frei."
          />
        ) : projekte.length === 0 ? (
          <HinweisBox
            titel="Ihr Zugang wird noch verknüpft"
            text="Ihrem Konto sind noch keine Flächen zugeordnet. Sobald Ihr LUMA-Ansprechpartner die Zuordnung vorgenommen hat, sehen Sie hier alle Einsätze auf Ihren Flächen."
          />
        ) : !hatLeistungsdaten ? (
          <HinweisBox
            titel="Noch keine Leistungen erfasst"
            text="Sobald der erste Einsatz auf Ihren Flächen dokumentiert ist, erscheint er hier automatisch — mit Datum, Stunden und ausgeführten Arbeiten."
          />
        ) : null}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}`, marginBottom: 24, overflowX: 'auto' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const aktiv = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
                  background: 'none', border: 'none', borderBottom: `2px solid ${aktiv ? A : 'transparent'}`,
                  color: aktiv ? A : MUTED, cursor: 'pointer', fontSize: 13,
                  fontWeight: aktiv ? 700 : 500, whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}>
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'leistungen' && (
          <TabLeistungen
            nachweis={nachweis} jahr={jahr} jahre={jahre} setJahr={setJahr}
            gaenge={gaenge}
            offenesObjekt={offenesObjekt} setOffenesObjekt={setOffenesObjekt}
            onDrucken={drucken} hatDaten={hatLeistungsdaten}
          />
        )}

        {tab === 'flaechen' && (
          <TabFlaechen projekte={projekte} gaenge={gaenge} einsaetze={einsaetze} plaene={plaene} jahr={jahr} />
        )}

        {tab === 'pflanzung' && (
          <TabPflanzplaene plans={plans} projekte={projekte} selected={selected} setSelected={setSelected} />
        )}
      </div>
    </div>
  )
}

// ── Hinweis-Box ───────────────────────────────────────────────────────────────

function HinweisBox({ titel, text }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: `color-mix(in srgb, ${INFO} 10%, ${CARD})`, border: `1px solid color-mix(in srgb, ${INFO} 35%, transparent)`, borderRadius: 10, padding: '14px 16px', marginBottom: 22 }}>
      <Info size={17} color={INFO} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{titel}</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  )
}

// ── Tab: Leistungen ───────────────────────────────────────────────────────────

function TabLeistungen({ nachweis, jahr, jahre, setJahr, gaenge, offenesObjekt, setOffenesObjekt, onDrucken, hatDaten }) {
  const { objekte, summe, monate } = nachweis
  const maxMonat = Math.max(...monate.map(m => m.stunden), 1)
  // Abgeschlossene Jahre zählen als vollständig — sonst zeigt ein Rückblick
  // fälschlich „Rückstand“. Der lineare Anteil ist nur der Notnagel; primär
  // wird das saisonal fällige Soll aus den Pflegegängen verwendet.
  const anteil = anteilVonJahr(jahr)

  return (
    <>
      {/* Steuerleiste */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {jahre.map(j => (
            <button key={j} onClick={() => setJahr(j)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: j === jahr ? 700 : 500,
                border: `1px solid ${j === jahr ? A : BORDER}`,
                background: j === jahr ? `color-mix(in srgb, ${A} 14%, transparent)` : 'transparent',
                color: j === jahr ? A : MUTED,
              }}>
              {j}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {hatDaten && (
          <button onClick={onDrucken}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', background: A, color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            <Printer size={14} /> Leistungsnachweis als PDF
          </button>
        )}
      </div>

      {/* Kennzahlen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 26 }}>
        <KPI label="Erbrachte Leistung" value={formatStunden(summe.stunden)} icon={<Clock size={17} color={A} />} />
        <KPI label="Einsatztage"        value={summe.einsatztage} icon={<CalendarDays size={17} color={A} />} />
        <KPI label="Betreute Flächen"   value={summe.objekte} icon={<MapPin size={17} color={A} />} />
        {summe.sollStunden > 0
          ? <KPI label={`Jahresplan ${jahr}`} value={formatStunden(summe.sollStunden)} sub={summe.erfuellung != null ? `${formatProzent(summe.erfuellung)} erbracht` : null} icon={<CheckCircle2 size={17} color={A} />} />
          : <KPI label="Fotos" value={summe.fotos} icon={<Camera size={17} color={A} />} />}
      </div>

      {/* Jahresverlauf */}
      {summe.stunden > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', marginBottom: 22 }}>
          <SectionTitle>Verlauf {jahr}</SectionTitle>
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', marginTop: 14 }}>
            {monate.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: m.stunden > 0 ? A : 'transparent', fontWeight: 700 }}>
                  {m.stunden > 0 ? formatStunden(m.stunden, false) : '·'}
                </div>
                <div style={{ height: 62, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div title={`${MONTHS[i]}: ${formatStunden(m.stunden)}`}
                    style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${Math.max((m.stunden / maxMonat) * 100, m.stunden > 0 ? 4 : 0)}%`,
                      background: m.stunden > 0 ? A : BORDER,
                      minHeight: m.stunden > 0 ? 3 : 2,
                    }} />
                </div>
                <span style={{ fontSize: 9.5, color: MUTED }}>{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flächen */}
      {objekte.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: MUTED }}>
          <Clock size={36} color={BORDER} style={{ margin: '0 auto 14px' }} />
          <p style={{ margin: 0 }}>Für {jahr} sind noch keine Leistungen erfasst.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {objekte.map(o => (
            <ObjektKarte key={o.projectId} objekt={o} anteilJahr={anteil}
              erwartet={sollBisKW(gaenge, o.projectId, jahr)}
              offen={offenesObjekt === o.projectId}
              onToggle={() => setOffenesObjekt(offenesObjekt === o.projectId ? null : o.projectId)} />
          ))}
        </div>
      )}
    </>
  )
}

function ObjektKarte({ objekt: o, offen, onToggle, anteilJahr, erwartet }) {
  const ampel = planAmpel(o, anteilJahr, erwartet)
  const ampelFarbe = ampel?.status === 'im_plan' ? OK
    : ampel?.status === 'ueber' ? WARN
    : ampel?.status === 'unter' ? INFO : MUTED

  return (
    <div style={{ background: CARD, border: `1px solid ${offen ? A : BORDER}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: FG }}>{o.name}</span>
            {ampel && (
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: `color-mix(in srgb, ${ampelFarbe} 16%, transparent)`, color: ampelFarbe }}>
                {ampel.text}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: MUTED, flexWrap: 'wrap' }}>
            <span>{o.einsatztage} Einsatztage</span>
            {o.fotos.length > 0 && <span><Camera size={11} style={{ verticalAlign: 'middle' }} /> {o.fotos.length} Fotos</span>}
            {o.ort && <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {o.ort}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: 92 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: A, lineHeight: 1.1 }}>{formatStunden(o.stunden)}</div>
          {o.sollStunden > 0 && (
            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>
              von {formatStunden(o.sollStunden)} geplant
            </div>
          )}
        </div>

        <ChevronDown size={17} color={MUTED} style={{ flexShrink: 0, transform: offen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {/* Fortschrittsbalken Plan/Ist */}
      {o.sollStunden > 0 && (
        <div style={{ padding: '0 18px 14px' }}>
          <div style={{ height: 5, background: BORDER, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(o.erfuellung ?? 0, 100)}%`, background: A, borderRadius: 3, transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {offen && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 18px' }}>
          <SectionTitle>{o.termine.some(t => t.leistungen) ? 'Ausgeführte Arbeiten' : 'Einsätze'}</SectionTitle>
          {o.termine.length === 0 ? (
            <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>
              Auf dieser Fläche wurden in diesem Zeitraum noch keine Stunden erfasst.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 10 }}>
              {o.termine.map((t, i) => (
                <div key={`${t.datum}-${i}`} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: i < o.termine.length - 1 ? `1px solid ${BORDER}` : 'none', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 12, color: MUTED, minWidth: 78, fontFamily: "'Space Mono', monospace" }}>
                    {formatDatum(t.datum)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: A, minWidth: 56, textAlign: 'right' }}>
                    {formatStunden(t.stunden)}
                  </div>
                  {t.leistungen && (
                    <div style={{ fontSize: 13, color: FG, flex: 1, lineHeight: 1.45 }}>
                      {t.leistungen}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <SectionTitle>Fotodokumentation</SectionTitle>
            {o.fotos.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {o.fotos.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer"
                     style={{ display: 'block', width: 104 }}>
                    <img src={f.url} alt="" loading="lazy"
                      style={{ width: 104, height: 78, objectFit: 'cover', borderRadius: 7, border: `1px solid ${BORDER}`, display: 'block' }} />
                    {f.datum && <div style={{ fontSize: 9.5, color: MUTED, marginTop: 3, textAlign: 'center' }}>{formatDatum(f.datum)}</div>}
                  </a>
                ))}
              </div>
            ) : (
              // Platzhalter, solange keine Einsatzfotos vorliegen. Erkennbar
              // generiert und beschriftet — ein Bild, das wie ein echtes Foto
              // aussieht, wäre auf einem Leistungsnachweis ein falscher Beleg.
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {beispielFotosFlaeche().map(f => (
                    <img key={f.id} src={f.url} alt="" aria-hidden="true"
                      style={{ width: 104, height: 78, objectFit: 'cover', borderRadius: 7, border: `1px dashed ${BORDER}`, display: 'block', opacity: 0.55 }} />
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
                  Für diese Fläche liegen noch keine Einsatzfotos vor. Ihr LUMA-Team
                  dokumentiert die Pflegegänge künftig mit Bildern — sie erscheinen
                  dann automatisch an dieser Stelle.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Flächen & Termine ────────────────────────────────────────────────────

function TabFlaechen({ projekte, gaenge, einsaetze, plaene, jahr }) {
  // Lokales Datum (nicht toISOString) — in Berlin liegt UTC nachts noch im
  // Vortag, dann stünde ein erledigter Einsatz weiter unter „Nächste Termine“.
  const heute = new Date().toLocaleDateString('sv-SE')

  const kommende = useMemo(() => einsaetze
    .filter(e => e.date && e.date >= heute)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8), [einsaetze, heute])

  // Eine Fläche kann mehrere Pflegepläne haben (z. B. zwei Objekte unter einem
  // Projekt) — die Soll-Stunden müssen dann summiert, nicht überschrieben werden.
  const planJeProjekt = useMemo(() => {
    const m = new Map()
    for (const p of plaene) {
      if (Number(p.jahr) !== jahr) continue
      let e = m.get(p.project_id)
      if (!e) { e = { jahr: Number(p.jahr), soll: 0, objekte: [] }; m.set(p.project_id, e) }
      e.soll += Number(p.soll_stunden) || 0
      const bez = (p.objekt || '').trim()
      if (bez) e.objekte.push(bez)
    }
    return m
  }, [plaene, jahr])

  const gaengeJeProjekt = useMemo(() => {
    const m = new Map()
    for (const g of gaenge) {
      if (Number(g.jahr) !== jahr) continue
      if (!m.has(g.project_id)) m.set(g.project_id, [])
      m.get(g.project_id).push(g)
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.kw || 0) - (b.kw || 0))
    return m
  }, [gaenge, jahr])

  if (!projekte.length) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: MUTED }}>
        <MapPin size={36} color={BORDER} style={{ margin: '0 auto 14px' }} />
        <p style={{ margin: 0 }}>Noch keine Flächen zugeordnet.</p>
      </div>
    )
  }

  return (
    <>
      {kommende.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <SectionTitle>Nächste Termine</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
            {kommende.map(e => {
              const p = projekte.find(x => x.id === e.project_id)
              return (
                <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: A, minWidth: 78 }}>
                    {formatDatum(e.date)}
                  </span>
                  <span style={{ color: FG, flex: 1 }}>{e.title || 'Einsatz'}</span>
                  <span style={{ color: MUTED, fontSize: 12 }}>{p?.name || ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {projekte.map(p => {
          const plan = planJeProjekt.get(p.id)
          const gg = gaengeJeProjekt.get(p.id) || []
          return (
            <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: FG }}>{p.name}</span>
                {plan && (
                  <span style={{ fontSize: 11, color: MUTED }}>
                    Pflegeplan {plan.jahr} · {formatStunden(plan.soll)} geplant
                  </span>
                )}
              </div>
              {(p.location || plan?.objekte.length > 0) && (
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                  <MapPin size={11} style={{ verticalAlign: 'middle' }} />{' '}
                  {p.location || plan.objekte.join(' · ')}
                </div>
              )}

              {gg.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Pflegegänge {jahr}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {gg.map(g => {
                      const st = GANG_STATUS[g.status] || GANG_STATUS.geplant
                      return (
                        <span key={g.id} title={g.titel || ''}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, color: st.color, background: BG }}>
                          KW {g.kw} · {formatStunden(g.soll_stunden)} · {st.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Tab: Pflanzpläne (Florales) ───────────────────────────────────────────────

function TabPflanzplaene({ plans, projekte, selected, setSelected }) {
  const biodiversitaetScore = (plan) => {
    if (!plan.positionen?.length) return 0
    const heimisch = plan.positionen.filter(p => p.heimisch).length
    return Math.round((heimisch / plan.positionen.length) * 100)
  }

  const totalArten = plans.reduce((s, p) => s + (p.positionen?.length || 0), 0)
  const totalPflanzen = plans.reduce((s, p) =>
    s + (p.positionen?.reduce((ss, pos) => ss + (pos.count || 1), 0) || 0), 0)
  const activePlans = plans.filter(p => !['planung', 'pdf_erstellt'].includes(p.status)).length

  if (plans.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: MUTED }}>
        <Leaf size={36} color={BORDER} style={{ margin: '0 auto 14px' }} />
        <p style={{ margin: 0 }}>Noch keine Pflanzpläne vorhanden.</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Ihr LUMA-Betreuer wird bald einen Plan erstellen.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPI label="Aktive Projekte" value={activePlans} icon={<CheckCircle2 size={17} color={A} />} />
        <KPI label="Pflanzpläne"     value={plans.length} icon={<FileText size={17} color={A} />} />
        <KPI label="Pflanzenarten"   value={totalArten} icon={<Leaf size={17} color={A} />} />
        <KPI label="Pflanzen gesamt" value={totalPflanzen} icon={<Sprout size={17} color={A} />} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plans.map(plan => {
          const score = biodiversitaetScore(plan)
          const projekt = projekte.find(s => s.id === plan.projekt_id)
          const isOpen = selected === plan.id

          return (
            <div key={plan.id} style={{ background: CARD, border: `1px solid ${isOpen ? A : BORDER}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <div onClick={() => setSelected(isOpen ? null : plan.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: FG }}>{plan.titel}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (STATUS_COLORS[plan.status] || MUTED) + '22', color: STATUS_COLORS[plan.status] || MUTED }}>
                      {STATUS_LABELS[plan.status] || plan.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: MUTED, flexWrap: 'wrap' }}>
                    {projekt && <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {projekt.name}</span>}
                    <span><Leaf size={11} style={{ verticalAlign: 'middle' }} /> {plan.positionen?.length || 0} Arten</span>
                    {plan.flaeche_m2 != null && <span>📐 {Number(plan.flaeche_m2).toFixed(0)} m²</span>}
                  </div>
                </div>

                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: score >= 70 ? OK : score >= 40 ? WARN : 'var(--luma-danger)', lineHeight: 1 }}>{score}%</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>heimisch</div>
                </div>

                <ChevronDown size={17} color={MUTED} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {isOpen && (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 20px' }}>
                  {(() => {
                    const steps = ['planung', 'bestellung', 'pflanzung_laufend', 'wachstum', 'maintenance']
                    const normalisiert = String(plan.status || '')
                      .replace('pdf_erstellt', 'planung')
                      .replace('bestellung_bestaetigt', 'bestellung')
                    const cur = steps.indexOf(normalisiert)
                    return (
                      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                        {steps.map((s, i) => (
                          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ height: 4, width: '100%', background: i <= cur ? A : BORDER, borderRadius: 2, transition: 'background 0.3s' }} />
                            <span style={{ fontSize: 10, color: i <= cur ? A : MUTED, textAlign: 'center' }}>
                              {['Planung', 'Bestellung', 'Pflanzung', 'Wachstum', 'Pflege'][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {plan.positionen?.length > 0 && (
                    <div>
                      <SectionTitle>Pflanzliste</SectionTitle>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 10 }}>
                        {plan.positionen.map((pos, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: BG, borderRadius: 8, fontSize: 13 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: pos.bluete_farbe || A, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: FG }}>{pos.name}</div>
                              <div style={{ fontSize: 11, color: MUTED, fontStyle: 'italic' }}>{pos.latin}</div>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>×{pos.count || 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {plan.positionen?.some(p => p.bluete_monate?.length) && (
                    <div style={{ marginTop: 18 }}>
                      <SectionTitle>Blühkalender</SectionTitle>
                      <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
                        {MONTHS.map((m, mi) => {
                          const count = plan.positionen.filter(p => p.bluete_monate?.includes(mi + 1)).length
                          const intensity = count / Math.max(plan.positionen.length, 1)
                          return (
                            <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <div style={{ height: 32, width: '100%', background: intensity > 0 ? `color-mix(in srgb, ${A} ${20 + intensity * 80}%, transparent)` : BORDER, borderRadius: 4, position: 'relative' }}>
                                {count > 0 && <div style={{ position: 'absolute', bottom: 2, right: 3, fontSize: 9, color: FG, fontWeight: 700 }}>{count}</div>}
                              </div>
                              <span style={{ fontSize: 9, color: MUTED }}>{m}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 14, fontSize: 12, color: MUTED }}>
                    Zuletzt aktualisiert: {plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('de-DE') : '—'} · Betreut von LUMA Biome
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Kleinteile ────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, icon }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '15px 17px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 25, fontWeight: 800, color: A, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: MUTED, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  )
}
