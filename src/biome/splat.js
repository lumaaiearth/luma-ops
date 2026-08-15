/**
 * BIOME — 3D-Gaussian-Splats nach `KHR_gaussian_splatting`.
 *
 * Was eine Splat-Aufnahme ist: aus vielen Fotos einer Fläche wird ein Feld aus
 * Gaußfunktionen trainiert, das sich frei umfliegen lässt. Für BIOME ist das
 * die dichteste verfügbare Aufnahme eines Bestands — und zugleich der Datentyp,
 * der am leichtesten für mehr gehalten wird, als er ist.
 *
 * Diese Datei ist die eine Stelle, an der das Format gelesen und geprüft wird.
 * Sie kennt weder React noch WebGL noch Three.js: sie läuft im Prüfstand
 * (`scripts/test-biome-splat.mjs`) genauso wie im Browser. Der Renderer liegt
 * in `ui/SplatFeld.jsx` und bekommt von hier nur fertige Zahlenfelder.
 *
 * ── Woher die Regeln stammen ──────────────────────────────────────────────
 *
 * Aus `refs/standards/06-fernerkundung.md`, Eintrag **FE-GS-23**, der die
 * Khronos-Spezifikation wörtlich zitiert (abgerufen 2026-08-15). Alles, was
 * diese Datei als Pflicht behandelt, steht dort als Zitat. Insbesondere:
 *
 * · `mode` MUSS `POINTS` (0) sein.
 * · `kernel` und `colorSpace` sind Pflichteigenschaften der Erweiterung.
 * · Fünf Attribute sind Pflicht; fehlt eines, ist die Datei kein Splat-Feld.
 * · Grade der Kugelflächenfunktionen dürfen nicht teilweise besetzt sein.
 * · Skalen nicht negativ, Deckkraft in [0, 1] — außerhalb ist „invalid".
 * · Diffusfarbe = SH₀ × 0,2820947917738781 + 0,5.
 *
 * ── Was diese Datei ausdrücklich nicht tut ────────────────────────────────
 *
 * Sie verortet nichts. Weder `KHR_gaussian_splatting` noch glTF 2.0 kennen ein
 * Bezugssystem — geprüft am Volltext beider Dokumente, Trefferzahl null für
 * CRS, EPSG, Datum, Georeferenzierung und WGS 84 (FE-GS-23). Ein Splat-Feld
 * ist ein **lagefreies lokales Modell in Metern**. Wo es im Gelände liegt, ist
 * eine Angabe von BIOME mit eigener Herkunft, keine Eigenschaft der Datei.
 * Deshalb kommt aus diesem Modul niemals eine Koordinate.
 *
 * Und sie rechnet nichts aus den Farben. Die Farbwerte sind wörtlich
 * *display-referred*, also für die Anzeige aufbereitet und ausdrücklich nicht
 * die Szenenradianz. Ein NDVI aus Splat-Farben wäre eine andere physikalische
 * Größe unter demselben Namen.
 */

/** Der Bezeichner der Erweiterung, wie er in der Datei steht. */
export const ERWEITERUNG = 'KHR_gaussian_splatting'

/**
 * Die Kernel, die BIOME darstellen kann.
 *
 * Die Spezifikation definiert genau einen: „This extension defines only one
 * kernel type called `ellipse`". Ein anderer Wert stammt zwingend aus einer
 * Fremderweiterung, die BIOME nicht gelesen hat — und wird deshalb abgelehnt
 * statt stillschweigend als Ellipse gerendert.
 */
export const KERNEL = /** @type {const} */ ({ ellipse: 'ellipse' })

/**
 * Die belegten Farbräume. Beide sind **display-referred**: durch ein
 * Color-Rendering für die Anzeige gegangen, nicht die Radianz der Szene.
 */
export const FARBRAUM = /** @type {const} */ ({
  srgb_rec709_display: {
    id: 'srgb_rec709_display',
    name: 'BT.709 sRGB (anzeigebezogen)',
    /** Übertragungsfunktion sRGB — für die Darstellung in Linearlicht zu wandeln. */
    srgb: true,
  },
  lin_rec709_display: {
    id: 'lin_rec709_display',
    name: 'BT.709 linear (anzeigebezogen)',
    srgb: false,
  },
})

/** Projektionsverfahren. Die Basiserweiterung kennt eines, es ist der Vorgabewert. */
export const PROJEKTION = /** @type {const} */ ({ perspective: 'perspective' })

/** Sortierverfahren. Die Basiserweiterung kennt eines, es ist der Vorgabewert. */
export const SORTIERUNG = /** @type {const} */ ({ cameraDistance: 'cameraDistance' })

/** Die Attributnamen der Spezifikation. Groß-/Kleinschreibung ist bedeutsam. */
export const ATTRIBUT = /** @type {const} */ ({
  position: 'POSITION',
  rotation: `${ERWEITERUNG}:ROTATION`,
  skala: `${ERWEITERUNG}:SCALE`,
  deckkraft: `${ERWEITERUNG}:OPACITY`,
  sh0: `${ERWEITERUNG}:SH_DEGREE_0_COEF_0`,
  /** Rückfallfarbe der Basisspezifikation, optional. */
  farbe: 'COLOR_0',
})

/**
 * Normierungskonstante der reellen Kugelflächenfunktion vom Grad 0.
 *
 * Wörtlich belegt: „Color_{diffuse} = SH_{0,0} * 0.2820947917738781 + 0.5".
 * Die Zahl steht hier vollständig, nicht gerundet — die Spezifikation nennt
 * sie an zwei Stellen unterschiedlich genau (0.282095 im Fließtext), und die
 * lange Fassung ist die, die in der Formel steht.
 */
export const SH0_FAKTOR = 0.2820947917738781

/**
 * Der Versatz, den das Training auf den nullten Grad legt, damit die
 * Koeffizienten im Bereich [0, 1] bleiben. Beim Rendern wieder aufzuschlagen.
 */
export const SH_VERSATZ = 0.5

/**
 * Abschneidegrenze der Gaußfunktion in Standardabweichungen.
 * Wörtlich: „This kernel assumes a _3σ_ cut-off (Mahalanobis distance of 3
 * units) for correct rendering." Ein Renderer, der anders abschneidet, zeigt
 * nicht das, was die Datei beschreibt.
 */
export const SIGMA_ABSCHNITT = 3

/**
 * Die drei Sätze, die an jeder Splat-Aufnahme stehen müssen.
 *
 * Sie stehen hier und nicht an den Anzeigeorten, weil sie sonst an drei
 * Stellen leicht verschieden formuliert wären — und weil jeder von ihnen eine
 * belegte Grenze der Quelle wiedergibt, nicht eine Vorsichtsformel.
 */
export const SPLAT_HINWEIS = /** @type {const} */ ({
  /** Warum aus diesen Farben kein Index werden darf. */
  farbe: 'Die Farbwerte sind anzeigebezogen (display-referred): sie sind durch eine Aufbereitung für die Anzeige gegangen und geben nicht die Strahldichte der Szene wieder. Sie sind keine Reflektanz. Aus ihnen lässt sich kein NDVI, kein NDRE und kein anderer Vegetationsindex berechnen — auch nicht näherungsweise.',
  /** Warum die Verortung nicht aus der Datei kommen kann. */
  verortung: 'Das Dateiformat kennt kein Bezugssystem: weder KHR_gaussian_splatting noch glTF 2.0 enthalten die Begriffe CRS, EPSG, Datum oder Georeferenzierung. Die Aufnahme ist ein lagefreies lokales Modell in Metern. Wo sie im Gelände liegt, ist eine eigene Erhebung mit eigener Herkunft.',
  /** Warum daraus kein Stammumfang wird. */
  messung: 'Eine Splat-Aufnahme ist ein Trainingsergebnis, keine Messung. Lage, Form und Farbe jeder Gaußfunktion sind gerechnet. Die Spezifikation nennt keine Lagegenauigkeit; BIOME leitet aus einer Aufnahme deshalb keine Maße ab.',
})

/** Wie viele Koeffizienten ein Grad der Kugelflächenfunktionen hat: 2l + 1. */
const KOEFFIZIENTEN_JE_GRAD = [1, 3, 5, 7]

/** `mode` eines Mesh-Primitivs für Punkte. */
const MODUS_POINTS = 0

/* ── glTF-Grundlagen ────────────────────────────────────────────────────── */

const KOMPONENTE = {
  5120: { name: 'BYTE', bytes: 1, feld: Int8Array, maximum: 127 },
  5121: { name: 'UNSIGNED_BYTE', bytes: 1, feld: Uint8Array, maximum: 255 },
  5122: { name: 'SHORT', bytes: 2, feld: Int16Array, maximum: 32767 },
  5123: { name: 'UNSIGNED_SHORT', bytes: 2, feld: Uint16Array, maximum: 65535 },
  5125: { name: 'UNSIGNED_INT', bytes: 4, feld: Uint32Array, maximum: 4294967295 },
  5126: { name: 'FLOAT', bytes: 4, feld: Float32Array, maximum: 1 },
}

const TYPGROESSE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }

/**
 * Die je Attribut zugelassenen Komponententypen, wörtlich aus der
 * Attributtabelle der Spezifikation. `normalisiert` sagt, ob der ganzzahlige
 * Typ als normalisiert vorliegen muss — die Unterscheidung ist keine Feinheit:
 * ein nicht normalisiertes `SHORT` für die Rotation wäre ein Quaternion mit
 * Beträgen um 30.000.
 */
const ERLAUBTE_TYPEN = {
  [ATTRIBUT.position]: { typ: 'VEC3', komponenten: [5126, 5120, 5121, 5122, 5123] },
  [ATTRIBUT.rotation]: { typ: 'VEC4', komponenten: [5126, 5120, 5122], nurNormalisiert: [5120, 5122] },
  [ATTRIBUT.skala]: { typ: 'VEC3', komponenten: [5126, 5121, 5123] },
  [ATTRIBUT.deckkraft]: { typ: 'SCALAR', komponenten: [5126, 5121, 5123], nurNormalisiert: [5121, 5123] },
  [ATTRIBUT.sh0]: { typ: 'VEC3', komponenten: [5126] },
}

/**
 * @typedef {object} Befund
 * @property {'fehler'|'hinweis'} schwere  Ein Fehler verhindert die Anzeige, ein Hinweis nicht.
 * @property {string} regel                Kurzname der verletzten Regel, für die Oberfläche
 * @property {string} text                 Was los ist, in einem Satz
 */

/**
 * @typedef {object} Pruefbericht
 * @property {boolean} tragfaehig    Darf BIOME das darstellen?
 * @property {Befund[]} befunde
 * @property {string|null} kernel
 * @property {string|null} farbraum
 * @property {string} projektion     Vorgabewert eingesetzt, wenn die Datei schweigt
 * @property {string} sortierung     dito
 * @property {number|null} anzahl    Zahl der Gaußfunktionen, oder null
 * @property {number} shGrad         Höchster vollständig besetzter Grad
 * @property {string[]} attribute    Was tatsächlich in der Datei steht
 */

/**
 * @typedef {object} Splatfeld
 * @property {number} anzahl
 * @property {Float32Array} position    3 Werte je Splat, Meter, glTF-Achsen (+Y oben)
 * @property {Float32Array} rotation    4 Werte je Splat, Einheitsquaternion (x, y, z, w)
 * @property {Float32Array} skala       3 Werte je Splat, linear, nicht negativ
 * @property {Float32Array} deckkraft   1 Wert je Splat, [0, 1]
 * @property {Float32Array} farbe       3 Werte je Splat, Diffusfarbe [0, 1] nach Spezifikationsformel
 * @property {Pruefbericht} bericht
 * @property {{min: number[], max: number[]}} huelle  Achsparallele Hülle der Mittelpunkte, in Metern
 * @property {Float32Array|null} matrix3  Obere linke 3x3 der Knotenmatrix, spaltenweise; null, wenn keine wirkt
 */

/* ── GLB lesen ──────────────────────────────────────────────────────────── */

const GLB_MAGIE = 0x46546c67       // 'glTF'
const GLB_CHUNK_JSON = 0x4e4f534a  // 'JSON'
const GLB_CHUNK_BIN = 0x004e4942   // 'BIN\0'

/**
 * Zerlegt einen GLB-Container in JSON-Teil und Binärteil.
 *
 * Bewusst mit scharfen Fehlermeldungen statt `null`: eine Datei, die kein GLB
 * ist, soll das sagen. Ein stiller Fehlschlag würde in der Oberfläche als
 * „leere Aufnahme" ankommen — und leer ist etwas anderes als unlesbar.
 *
 * @param {ArrayBuffer} puffer
 * @returns {{ json: any, binaer: Uint8Array|null }}
 */
export function leseGlb(puffer) {
  if (!(puffer instanceof ArrayBuffer) || puffer.byteLength < 12) {
    throw new Error('Die Datei ist zu kurz für einen GLB-Container (mindestens 12 Byte Kopf).')
  }
  const sicht = new DataView(puffer)
  const magie = sicht.getUint32(0, true)
  if (magie !== GLB_MAGIE) {
    throw new Error('Die Datei beginnt nicht mit der GLB-Kennung „glTF". Eine .gltf-Datei mit externem Puffer wird nicht als GLB gelesen.')
  }
  const version = sicht.getUint32(4, true)
  if (version !== 2) {
    throw new Error(`GLB-Version ${version} wird nicht gelesen. BIOME liest glTF 2.0.`)
  }
  const gesamt = sicht.getUint32(8, true)
  if (gesamt > puffer.byteLength) {
    throw new Error(`Der GLB-Kopf nennt ${gesamt} Byte, die Datei hat ${puffer.byteLength}. Die Datei ist unvollständig.`)
  }

  /** @type {any} */
  let json = null
  /** @type {Uint8Array|null} */
  let binaer = null

  let pos = 12
  while (pos + 8 <= gesamt) {
    const laenge = sicht.getUint32(pos, true)
    const art = sicht.getUint32(pos + 4, true)
    const start = pos + 8
    if (start + laenge > gesamt) {
      throw new Error('Ein GLB-Abschnitt reicht über das Dateiende hinaus. Die Datei ist beschädigt.')
    }
    if (art === GLB_CHUNK_JSON && json === null) {
      const text = new TextDecoder('utf-8').decode(new Uint8Array(puffer, start, laenge))
      try {
        json = JSON.parse(text)
      } catch (e) {
        throw new Error(`Der JSON-Abschnitt des GLB ist nicht lesbar: ${e instanceof Error ? e.message : String(e)}`)
      }
    } else if (art === GLB_CHUNK_BIN && binaer === null) {
      binaer = new Uint8Array(puffer, start, laenge)
    }
    // Abschnitte sind auf 4 Byte ausgerichtet.
    pos = start + laenge + ((4 - (laenge % 4)) % 4)
  }

  if (json === null) throw new Error('Das GLB enthält keinen JSON-Abschnitt.')
  return { json, binaer }
}

/* ── Akzessoren lesen ───────────────────────────────────────────────────── */

/**
 * Löst den Puffer eines BufferViews auf.
 *
 * @param {any} gltf
 * @param {number} pufferIndex
 * @param {Uint8Array|null} binaer
 * @returns {Uint8Array}
 */
function pufferDaten(gltf, pufferIndex, binaer) {
  const puffer = gltf.buffers?.[pufferIndex]
  if (!puffer) throw new Error(`Puffer ${pufferIndex} fehlt in der Datei.`)
  const uri = puffer.uri
  if (uri === undefined) {
    if (!binaer) throw new Error('Der Puffer verweist auf den GLB-Binärabschnitt, der in dieser Datei fehlt.')
    return binaer
  }
  if (typeof uri === 'string' && uri.startsWith('data:')) {
    const komma = uri.indexOf(',')
    const nutzlast = uri.slice(komma + 1)
    if (!uri.slice(0, komma).includes('base64')) {
      throw new Error('Eingebettete Puffer werden nur als base64 gelesen.')
    }
    const roh = atob(nutzlast)
    const feld = new Uint8Array(roh.length)
    for (let i = 0; i < roh.length; i++) feld[i] = roh.charCodeAt(i)
    return feld
  }
  // Ein externer Puffer ist kein Fehler des Formats, aber BIOME lädt hier
  // nichts nach: die Aufnahme wird als eine Datei geführt.
  throw new Error(`Der Puffer liegt in einer eigenen Datei (${String(uri)}). BIOME liest Splat-Aufnahmen nur als GLB mit eingebettetem Binärteil.`)
}

/**
 * Liest einen Akzessor als Fließkommawerte, ganzzahlige Typen entquantisiert.
 *
 * Die Entquantisierung folgt der glTF-Basisspezifikation; ohne sie käme aus
 * einem normalisierten `SHORT` ein Quaternion mit Beträgen um 30.000 heraus,
 * und das Feld sähe aus wie Rauschen statt wie eine Aufnahme.
 *
 * @param {any} gltf
 * @param {number} index
 * @param {Uint8Array|null} binaer
 * @returns {{ werte: Float32Array, breite: number, anzahl: number }}
 */
function leseAkzessor(gltf, index, binaer) {
  const akz = gltf.accessors?.[index]
  if (!akz) throw new Error(`Akzessor ${index} fehlt in der Datei.`)
  if (akz.sparse) {
    throw new Error('Der Akzessor ist dünn besetzt (sparse). BIOME liest das nicht und rät nichts dazu.')
  }
  const breite = TYPGROESSE[/** @type {keyof typeof TYPGROESSE} */ (akz.type)]
  if (!breite) throw new Error(`Unbekannter Akzessortyp „${String(akz.type)}".`)
  const komp = KOMPONENTE[/** @type {keyof typeof KOMPONENTE} */ (akz.componentType)]
  if (!komp) throw new Error(`Unbekannter Komponententyp ${String(akz.componentType)}.`)

  const anzahl = akz.count | 0
  const werte = new Float32Array(anzahl * breite)

  if (akz.bufferView === undefined) {
    // Erlaubt: der Akzessor beschreibt lauter Nullen. Für ein Pflichtattribut
    // eines Splat-Felds ist das sinnlos, deshalb sagt der Prüfbericht es an.
    return { werte, breite, anzahl }
  }

  const sicht = gltf.bufferViews?.[akz.bufferView]
  if (!sicht) throw new Error(`BufferView ${akz.bufferView} fehlt in der Datei.`)
  const roh = pufferDaten(gltf, sicht.buffer ?? 0, binaer)

  const elementBytes = komp.bytes * breite
  const schritt = sicht.byteStride || elementBytes
  const basis = (roh.byteOffset || 0) + (sicht.byteOffset || 0) + (akz.byteOffset || 0)

  if (basis + (anzahl - 1) * schritt + elementBytes > roh.byteOffset + roh.byteLength) {
    throw new Error('Der Akzessor liest über das Ende des Puffers hinaus. Die Datei ist beschädigt.')
  }

  const daten = new DataView(roh.buffer)
  const normalisiert = !!akz.normalized && akz.componentType !== 5126
  const teiler = komp.maximum

  for (let i = 0; i < anzahl; i++) {
    const versatz = basis + i * schritt
    for (let k = 0; k < breite; k++) {
      const stelle = versatz + k * komp.bytes
      let wert
      switch (akz.componentType) {
        case 5120: wert = daten.getInt8(stelle); break
        case 5121: wert = daten.getUint8(stelle); break
        case 5122: wert = daten.getInt16(stelle, true); break
        case 5123: wert = daten.getUint16(stelle, true); break
        case 5125: wert = daten.getUint32(stelle, true); break
        default: wert = daten.getFloat32(stelle, true); break
      }
      if (normalisiert) {
        // Vorzeichenbehaftete Typen werden nach unten auf −1 geklemmt; das
        // steht so in der Basisspezifikation und betrifft genau den Wert
        // −128 bzw. −32768.
        wert = teiler === 127 || teiler === 32767 ? Math.max(wert / teiler, -1) : wert / teiler
      }
      werte[i * breite + k] = wert
    }
  }
  return { werte, breite, anzahl }
}

/* ── Prüfung ────────────────────────────────────────────────────────────── */

/**
 * Sucht alle Primitive, die sich als Splat-Feld ausgeben.
 *
 * @param {any} gltf
 * @returns {Array<{ meshIndex: number, primitivIndex: number, primitiv: any }>}
 */
export function findeSplatPrimitive(gltf) {
  /** @type {Array<{ meshIndex: number, primitivIndex: number, primitiv: any }>} */
  const treffer = []
  const meshes = Array.isArray(gltf?.meshes) ? gltf.meshes : []
  for (let m = 0; m < meshes.length; m++) {
    const prims = Array.isArray(meshes[m]?.primitives) ? meshes[m].primitives : []
    for (let p = 0; p < prims.length; p++) {
      if (prims[p]?.extensions?.[ERWEITERUNG]) {
        treffer.push({ meshIndex: m, primitivIndex: p, primitiv: prims[p] })
      }
    }
  }
  return treffer
}

/**
 * Prüft ein Primitiv gegen die Spezifikation.
 *
 * Der Bericht ist kein Ja/Nein: er zählt jede verletzte Regel einzeln auf,
 * damit die Oberfläche sagen kann, **was** fehlt. Eine Datei, die nur wegen
 * eines fehlenden Attributs abgelehnt wird, ist etwas anderes als eine, die
 * gar kein Splat-Feld ist — und der Nutzer, der sie exportiert hat, muss den
 * Unterschied sehen.
 *
 * @param {any} gltf
 * @param {any} primitiv
 * @returns {Pruefbericht}
 */
export function pruefeSplatPrimitive(gltf, primitiv) {
  /** @type {Befund[]} */
  const befunde = []
  const fehler = (regel, text) => befunde.push({ schwere: 'fehler', regel, text })
  const hinweis = (regel, text) => befunde.push({ schwere: 'hinweis', regel, text })

  const ext = primitiv?.extensions?.[ERWEITERUNG]
  const attribute = primitiv?.attributes && typeof primitiv.attributes === 'object'
    ? Object.keys(primitiv.attributes)
    : []

  if (!ext) {
    fehler('erweiterung', `Das Primitiv trägt keine Erweiterung ${ERWEITERUNG}. Es ist kein Splat-Feld.`)
    return {
      tragfaehig: false, befunde, kernel: null, farbraum: null,
      projektion: PROJEKTION.perspective, sortierung: SORTIERUNG.cameraDistance,
      anzahl: null, shGrad: 0, attribute,
    }
  }

  /* Primitivtyp. Der glTF-Vorgabewert für `mode` ist 4 (TRIANGLES) — ein
     fehlendes `mode` ist deshalb nicht „unbestimmt", sondern falsch. */
  const modus = primitiv.mode === undefined ? 4 : primitiv.mode
  if (modus !== MODUS_POINTS) {
    fehler('modus', `Der Primitivtyp ist ${modus}, die Spezifikation verlangt POINTS (0)${primitiv.mode === undefined ? ' — die Datei nennt keinen, und der glTF-Vorgabewert ist TRIANGLES' : ''}.`)
  }

  /* Kernel und Farbraum sind Pflichteigenschaften. */
  const kernel = typeof ext.kernel === 'string' ? ext.kernel : null
  if (kernel === null) {
    fehler('kernel', 'Die Pflichtangabe „kernel" fehlt.')
  } else if (kernel !== KERNEL.ellipse) {
    fehler('kernel', `Der Kernel „${kernel}" stammt aus einer Erweiterung, die BIOME nicht belegt hat. Dargestellt wird nur „${KERNEL.ellipse}".`)
  }

  const farbraum = typeof ext.colorSpace === 'string' ? ext.colorSpace : null
  if (farbraum === null) {
    fehler('farbraum', 'Die Pflichtangabe „colorSpace" fehlt.')
  } else if (!(farbraum in FARBRAUM)) {
    fehler('farbraum', `Der Farbraum „${farbraum}" ist in der Basiserweiterung nicht definiert. Die Farben ließen sich nur raten.`)
  }

  /* Projektion und Sortierung sind optional — mit belegten Vorgabewerten.
     Ein fehlender Wert ist hier also nicht „keine Angabe": die Spezifikation
     sagt, was dann gilt. */
  const projektion = typeof ext.projection === 'string' ? ext.projection : PROJEKTION.perspective
  if (!(projektion in PROJEKTION)) {
    fehler('projektion', `Das Projektionsverfahren „${projektion}" ist nicht belegt.`)
  }
  const sortierung = typeof ext.sortingMethod === 'string' ? ext.sortingMethod : SORTIERUNG.cameraDistance
  if (!(sortierung in SORTIERUNG)) {
    fehler('sortierung', `Das Sortierverfahren „${sortierung}" ist nicht belegt.`)
  }

  /* Fremderweiterungen im Erweiterungsobjekt. Kein Fehler, aber die Anzeige
     weicht dann von dem ab, was der Erzeuger gemeint hat. */
  const genestet = ext.extensions && typeof ext.extensions === 'object' ? Object.keys(ext.extensions) : []
  if (genestet.length) {
    hinweis('fremderweiterung', `Die Aufnahme trägt zusätzlich ${genestet.join(', ')}. BIOME kennt diese Erweiterung nicht und stellt das Grundformat dar.`)
  }
  const noetig = Array.isArray(gltf?.extensionsRequired) ? gltf.extensionsRequired : []
  for (const name of noetig) {
    if (name !== ERWEITERUNG) {
      fehler('erweiterung_noetig', `Die Datei verlangt die Erweiterung ${name}, die BIOME nicht gelesen hat. Ohne sie wäre die Darstellung falsch.`)
    }
  }

  /* Pflichtattribute. */
  const pflicht = [ATTRIBUT.position, ATTRIBUT.rotation, ATTRIBUT.skala, ATTRIBUT.deckkraft, ATTRIBUT.sh0]
  for (const name of pflicht) {
    if (primitiv.attributes?.[name] === undefined) {
      fehler('attribut', `Das Pflichtattribut ${name} fehlt.`)
    }
  }

  /* Typen der vorhandenen Pflichtattribute. */
  for (const [name, regel] of Object.entries(ERLAUBTE_TYPEN)) {
    const index = primitiv.attributes?.[name]
    if (index === undefined) continue
    const akz = gltf?.accessors?.[index]
    if (!akz) {
      fehler('akzessor', `${name} verweist auf Akzessor ${index}, den es nicht gibt.`)
      continue
    }
    if (akz.type !== regel.typ) {
      fehler('akzessor', `${name} ist ${String(akz.type)}, die Spezifikation verlangt ${regel.typ}.`)
    }
    if (!regel.komponenten.includes(akz.componentType)) {
      const erlaubt = regel.komponenten
        .map(c => KOMPONENTE[/** @type {keyof typeof KOMPONENTE} */ (c)]?.name ?? String(c))
        .join(', ')
      fehler('akzessor', `${name} hat den Komponententyp ${KOMPONENTE[/** @type {keyof typeof KOMPONENTE} */ (akz.componentType)]?.name ?? String(akz.componentType)}; zugelassen sind ${erlaubt}.`)
    }
    const nurNorm = 'nurNormalisiert' in regel ? regel.nurNormalisiert : []
    if (Array.isArray(nurNorm) && nurNorm.includes(akz.componentType) && !akz.normalized) {
      fehler('akzessor', `${name} ist ganzzahlig, aber nicht als normalisiert gekennzeichnet. Die Werte wären um Größenordnungen falsch.`)
    }
  }

  /* Gleiche Länge. Ein Feld mit 100.000 Positionen und 99.999 Deckkraftwerten
     ist keine Aufnahme, der ein Wert fehlt — es ist eine kaputte Datei. */
  /** @type {number|null} */
  let anzahl = null
  for (const name of pflicht) {
    const index = primitiv.attributes?.[name]
    if (index === undefined) continue
    const n = gltf?.accessors?.[index]?.count
    if (typeof n !== 'number') continue
    if (anzahl === null) anzahl = n
    else if (anzahl !== n) {
      fehler('laenge', `${name} hat ${n} Einträge, ein anderes Pflichtattribut ${anzahl}. Alle Attribute eines Primitivs müssen gleich lang sein.`)
    }
  }
  if (anzahl === 0) {
    hinweis('leer', 'Die Aufnahme enthält null Gaußfunktionen. Das ist eine leere Aufnahme, kein Ladefehler.')
  }

  /* Kugelflächenfunktionen: Vollständigkeit je Grad, und kein Grad ohne den
     darunter. Wörtlich: „Spherical harmonic degrees MUST NOT be partially
     defined". */
  let shGrad = 0
  let luecke = false
  for (let grad = 1; grad <= 3; grad++) {
    const soll = KOEFFIZIENTEN_JE_GRAD[grad]
    let vorhanden = 0
    for (let k = 0; k < soll; k++) {
      if (primitiv.attributes?.[`${ERWEITERUNG}:SH_DEGREE_${grad}_COEF_${k}`] !== undefined) vorhanden++
    }
    if (vorhanden === 0) { luecke = true; continue }
    if (vorhanden !== soll) {
      fehler('kugelflaeche', `Grad ${grad} der Kugelflächenfunktionen ist mit ${vorhanden} von ${soll} Koeffizienten nur teilweise besetzt. Teilweise besetzte Grade sind unzulässig.`)
      continue
    }
    if (luecke) {
      fehler('kugelflaeche', `Grad ${grad} ist besetzt, ein niedrigerer Grad aber nicht. Ein höherer Grad setzt alle niedrigeren voraus.`)
      continue
    }
    shGrad = grad
  }
  if (shGrad > 0) {
    hinweis('kugelflaeche_grad', `Die Aufnahme trägt Kugelflächenfunktionen bis Grad ${shGrad}. BIOME stellt den nullten Grad dar — die blickwinkelabhängigen Glanzanteile bleiben ungenutzt. Die Spezifikation lässt das ausdrücklich zu.`)
  }

  const tragfaehig = !befunde.some(b => b.schwere === 'fehler')
  return { tragfaehig, befunde, kernel, farbraum, projektion, sortierung, anzahl, shGrad, attribute }
}

/* ── Knotenmatrix ───────────────────────────────────────────────────────── */

/**
 * Multipliziert zwei 4x4-Matrizen, beide spaltenweise wie in glTF und WebGL.
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {Float32Array}
 */
function malMatrix(a, b) {
  const m = new Float32Array(16)
  for (let s = 0; s < 4; s++) {
    for (let z = 0; z < 4; z++) {
      let summe = 0
      for (let k = 0; k < 4; k++) summe += a[k * 4 + z] * b[s * 4 + k]
      m[s * 4 + z] = summe
    }
  }
  return m
}

/**
 * Die lokale Matrix eines Knotens: entweder direkt angegeben oder aus
 * Verschiebung, Drehung und Skalierung zusammengesetzt.
 * @param {any} knoten
 * @returns {Float32Array}
 */
function lokaleMatrix(knoten) {
  if (Array.isArray(knoten?.matrix) && knoten.matrix.length === 16) {
    return new Float32Array(knoten.matrix)
  }
  const t = Array.isArray(knoten?.translation) ? knoten.translation : [0, 0, 0]
  const r = Array.isArray(knoten?.rotation) ? knoten.rotation : [0, 0, 0, 1]
  const s = Array.isArray(knoten?.scale) ? knoten.scale : [1, 1, 1]
  const [x, y, z, w] = r
  const m = new Float32Array(16)
  m[0] = (1 - 2 * (y * y + z * z)) * s[0]
  m[1] = (2 * (x * y + w * z)) * s[0]
  m[2] = (2 * (x * z - w * y)) * s[0]
  m[4] = (2 * (x * y - w * z)) * s[1]
  m[5] = (1 - 2 * (x * x + z * z)) * s[1]
  m[6] = (2 * (y * z + w * x)) * s[1]
  m[8] = (2 * (x * z + w * y)) * s[2]
  m[9] = (2 * (y * z - w * x)) * s[2]
  m[10] = (1 - 2 * (x * x + y * y)) * s[2]
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1
  return m
}

/**
 * Die globale Matrix des Knotens, der ein Mesh einbindet.
 *
 * Warum das nicht wegzulassen ist: die Spezifikation sagt wörtlich, der
 * wirksame Mittelpunkt eines Splats ergebe sich aus `POSITION` **und** der
 * globalen Matrix des einbindenden Knotens, und die wirksame Kovarianz aus
 * Rotation, Skalierung **und** derselben Matrix. Ein Exportprogramm, das die
 * übliche Achsdrehung als Knotenmatrix ablegt, liefert sonst eine Aufnahme,
 * die auf der Seite liegt.
 *
 * @param {any} gltf
 * @param {number} meshIndex
 * @returns {Float32Array|null}  null, wenn kein Knoten das Mesh einbindet
 */
export function knotenMatrix(gltf, meshIndex) {
  const knoten = Array.isArray(gltf?.nodes) ? gltf.nodes : []
  if (!knoten.length) return null

  /** @type {Map<number, number>} Kind → Elternteil */
  const eltern = new Map()
  for (let i = 0; i < knoten.length; i++) {
    for (const kind of knoten[i]?.children || []) eltern.set(kind, i)
  }

  let ziel = -1
  for (let i = 0; i < knoten.length; i++) {
    if (knoten[i]?.mesh === meshIndex) { ziel = i; break }
  }
  if (ziel < 0) return null

  // Kette bis zur Wurzel sammeln, dann von oben nach unten multiplizieren.
  /** @type {number[]} */
  const kette = []
  let lauf = ziel
  const gesehen = new Set()
  while (lauf !== undefined && lauf >= 0 && !gesehen.has(lauf)) {
    gesehen.add(lauf)
    kette.unshift(lauf)
    const oben = eltern.get(lauf)
    if (oben === undefined) break
    lauf = oben
  }

  /** @type {Float32Array} */
  let m = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  for (const i of kette) m = malMatrix(m, lokaleMatrix(knoten[i]))
  return m
}

/**
 * Prüft die drei Bedingungen, die die Spezifikation an die Knotenmatrix
 * stellt, und gibt die obere linke 3x3 zurück.
 *
 * Wörtlich verlangt sind: letzte Zeile (0,0,0,1); die Längen der ersten drei
 * Spalten endlich und positiv; die Determinante der spaltenweise normierten
 * 3x3 nahe +1. „Splat rendering with non-decomposable transformation matrices
 * or with negative scale values is undefined" — deshalb wird eine solche
 * Aufnahme gemeldet und nicht stillschweigend gezeichnet.
 *
 * @param {Float32Array} m
 * @returns {{ matrix3: Float32Array, befunde: Befund[] }}
 */
export function pruefeKnotenmatrix(m) {
  /** @type {Befund[]} */
  const befunde = []
  const matrix3 = new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]])

  if (m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1) {
    befunde.push({
      schwere: 'fehler', regel: 'knotenmatrix',
      text: 'Die letzte Zeile der Knotenmatrix ist nicht (0, 0, 0, 1). Eine solche Matrix ist keine Starrkörper-Abbildung mit Skalierung.',
    })
  }

  const laengen = [0, 1, 2].map(s => Math.hypot(matrix3[s * 3], matrix3[s * 3 + 1], matrix3[s * 3 + 2]))
  if (laengen.some(l => !Number.isFinite(l) || l <= 0)) {
    befunde.push({
      schwere: 'fehler', regel: 'knotenmatrix',
      text: 'Eine Spalte der Knotenmatrix hat die Länge null oder ist keine Zahl. Die Matrix lässt sich nicht in Drehung und Skalierung zerlegen.',
    })
    return { matrix3, befunde }
  }

  const n = new Float32Array(9)
  for (let s = 0; s < 3; s++) {
    for (let z = 0; z < 3; z++) n[s * 3 + z] = matrix3[s * 3 + z] / laengen[s]
  }
  const det =
    n[0] * (n[4] * n[8] - n[5] * n[7])
    - n[3] * (n[1] * n[8] - n[2] * n[7])
    + n[6] * (n[1] * n[5] - n[2] * n[4])

  if (Math.abs(det - 1) > 0.01) {
    befunde.push({
      schwere: 'fehler', regel: 'knotenmatrix',
      text: det < 0
        ? 'Die Knotenmatrix enthält eine Spiegelung (negative Skalierung). Die Darstellung ist dafür nicht definiert.'
        : `Die Knotenmatrix ist nicht in Drehung und positive Skalierung zerlegbar (Determinante ${det.toFixed(3)} statt 1).`,
    })
  }
  return { matrix3, befunde }
}

/* ── Dekodierung ────────────────────────────────────────────────────────── */

/**
 * Diffusfarbe eines Splats aus dem nullten Grad der Kugelflächenfunktionen.
 *
 * Wörtlich belegt: `Color_diffuse = SH_{0,0} * 0.2820947917738781 + 0.5`.
 * Geklemmt auf [0, 1], wie es die Spezifikation für den Rückfallweg über
 * `COLOR_0` beschreibt.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]}
 */
export function diffusfarbe(r, g, b) {
  /** @type {(w: number) => number} */
  const f = w => Math.min(1, Math.max(0, w * SH0_FAKTOR + SH_VERSATZ))
  return [f(r), f(g), f(b)]
}

/**
 * Liest ein geprüftes Splat-Primitiv in Zahlenfelder.
 *
 * Gibt **nur** aus, was die Datei hergibt. Nichts wird ergänzt, nichts
 * geglättet, nichts skaliert: was hier herauskommt, steht so in der Aufnahme.
 * Werte außerhalb der belegten Bereiche werden gezählt und im Bericht
 * genannt, aber nicht stillschweigend zurechtgebogen — eine Aufnahme mit
 * negativen Skalen ist fehlerhaft, und das gehört auf den Bildschirm.
 *
 * @param {any} gltf
 * @param {any} primitiv
 * @param {Uint8Array|null} binaer
 * @param {{ matrix?: Float32Array|null }} [opt]
 * @returns {Splatfeld}
 */
export function dekodiereSplatfeld(gltf, primitiv, binaer, opt = {}) {
  const bericht = pruefeSplatPrimitive(gltf, primitiv)

  /** @type {Float32Array|null} */
  let matrix3 = null
  if (opt.matrix) {
    const geprueft = pruefeKnotenmatrix(opt.matrix)
    bericht.befunde.push(...geprueft.befunde)
    if (geprueft.befunde.some(b => b.schwere === 'fehler')) bericht.tragfaehig = false
    // Die Einheitsmatrix kostet je Splat neun Multiplikationen für nichts.
    const einheit = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    if (geprueft.matrix3.some((w, i) => Math.abs(w - einheit[i]) > 1e-6)) matrix3 = geprueft.matrix3
  }

  if (!bericht.tragfaehig) {
    const ersterFehler = bericht.befunde.find(b => b.schwere === 'fehler')
    throw new Error(`Die Aufnahme ist nicht darstellbar: ${ersterFehler ? ersterFehler.text : 'unbekannter Grund'}`)
  }

  const p = leseAkzessor(gltf, primitiv.attributes[ATTRIBUT.position], binaer)
  const r = leseAkzessor(gltf, primitiv.attributes[ATTRIBUT.rotation], binaer)
  const s = leseAkzessor(gltf, primitiv.attributes[ATTRIBUT.skala], binaer)
  const o = leseAkzessor(gltf, primitiv.attributes[ATTRIBUT.deckkraft], binaer)
  const c = leseAkzessor(gltf, primitiv.attributes[ATTRIBUT.sh0], binaer)

  const anzahl = p.anzahl
  const farbe = new Float32Array(anzahl * 3)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  let negativeSkala = 0
  let deckkraftAusserhalb = 0

  // Die Mittelpunkte werden mit der Knotenmatrix in ihre wirksame Lage
  // gebracht — die Spezifikation nennt das den „effective global mean vector".
  // Die Kovarianz behält ihre 3x3 (`matrix3`) und wird erst beim Zeichnen
  // damit gedreht.
  const m = opt.matrix || null
  for (let i = 0; i < anzahl; i++) {
    if (m) {
      const x = p.werte[i * 3], y = p.werte[i * 3 + 1], z = p.werte[i * 3 + 2]
      p.werte[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12]
      p.werte[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
      p.werte[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
    }
    for (let k = 0; k < 3; k++) {
      const wert = p.werte[i * 3 + k]
      if (wert < min[k]) min[k] = wert
      if (wert > max[k]) max[k] = wert
      if (s.werte[i * 3 + k] < 0) negativeSkala++
    }
    const d = o.werte[i]
    if (!(d >= 0 && d <= 1)) deckkraftAusserhalb++
    const [fr, fg, fb] = diffusfarbe(c.werte[i * 3], c.werte[i * 3 + 1], c.werte[i * 3 + 2])
    farbe[i * 3] = fr
    farbe[i * 3 + 1] = fg
    farbe[i * 3 + 2] = fb
  }

  if (negativeSkala > 0) {
    bericht.befunde.push({
      schwere: 'hinweis', regel: 'skala_negativ',
      text: `${negativeSkala} Skalenwerte sind negativ. Die Spezifikation schließt das aus („MUST NOT be negative"); die Darstellung dieser Gaußfunktionen ist nicht definiert.`,
    })
  }
  if (deckkraftAusserhalb > 0) {
    bericht.befunde.push({
      schwere: 'hinweis', regel: 'deckkraft_ausserhalb',
      text: `${deckkraftAusserhalb} Deckkraftwerte liegen außerhalb von 0 bis 1. Die Spezifikation nennt solche Werte „invalid".`,
    })
  }

  return {
    anzahl,
    position: p.werte,
    rotation: r.werte,
    skala: s.werte,
    deckkraft: o.werte,
    farbe,
    bericht,
    huelle: anzahl > 0 ? { min, max } : { min: [0, 0, 0], max: [0, 0, 0] },
    matrix3,
  }
}

/**
 * Der bequeme Weg: GLB hinein, geprüftes Splat-Feld heraus.
 *
 * Nimmt bewusst das **erste** Splat-Primitiv und sagt es an, wenn es mehrere
 * gibt. Eine Aufnahme, von der stillschweigend nur ein Teil zu sehen ist,
 * wäre die Art Halbwahrheit, gegen die dieses Modul gebaut ist.
 *
 * @param {ArrayBuffer} puffer
 * @returns {Splatfeld}
 */
export function ladeSplatGlb(puffer) {
  const { json, binaer } = leseGlb(puffer)
  const treffer = findeSplatPrimitive(json)
  if (!treffer.length) {
    throw new Error(`Die Datei enthält kein Primitiv mit der Erweiterung ${ERWEITERUNG}. Sie ist kein Splat-Feld.`)
  }
  const feld = dekodiereSplatfeld(json, treffer[0].primitiv, binaer, {
    matrix: knotenMatrix(json, treffer[0].meshIndex),
  })
  if (treffer.length > 1) {
    feld.bericht.befunde.push({
      schwere: 'hinweis', regel: 'mehrere_primitive',
      text: `Die Datei enthält ${treffer.length} Splat-Primitive. Dargestellt wird das erste.`,
    })
  }
  return feld
}
