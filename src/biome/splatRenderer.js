/**
 * BIOME — Darstellung eines 3D-Gaussian-Splat-Felds (Ellipse-Kernel).
 *
 * Reines WebGL2, ohne Fremdbibliothek. Das ist keine Sparsamkeit um ihrer
 * selbst willen: die Shader für Splats muss man ohnehin selbst schreiben, und
 * was eine 3D-Bibliothek darüber hinaus beisteuert — Matrizen und eine
 * Umlaufkamera — sind zusammen keine zweihundert Zeilen. Dafür bleibt die
 * BIOME-Oberfläche ohne zusätzliches Bündel von einigen hundert Kilobyte, das
 * auf dem Handy mitgeladen werden müsste.
 *
 * ── Was die Spezifikation vorschreibt und hier umgesetzt ist ──────────────
 *
 * Aus `refs/standards/06-fernerkundung.md`, FE-GS-23:
 *
 * · **Rekonstruktion.** Σ = M C Cᵀ Mᵀ, mit C aus Rotation und Skalierung des
 *   Splats. Wird auf der CPU gerechnet (`baueKovarianzen`) — die Werte ändern
 *   sich nicht, es wäre Verschwendung, sie je Bild neu zu bestimmen.
 * · **Projektion.** Σ' = J W Σ Wᵀ Jᵀ, affine Näherung. Im Vertex-Shader.
 * · **Abschneidung** bei 3σ (Mahalanobis-Abstand 3).
 * · **Zusammensetzung.** Rückwärts sortiert, Alpha-Blending mit
 *   vormultipliziertem Alpha — die Spezifikation empfiehlt genau das für
 *   normalisierte Farbpuffer, und einen Fließkommapuffer für die Zwischen-
 *   ergebnisse. Beides ist umgesetzt.
 * · **Farbraum.** Alle Zwischenschritte, ausdrücklich einschließlich des
 *   Blendings, laufen **vor** jeder Übertragungsfunktion. Deshalb wird in
 *   einen RGBA16F-Puffer gezeichnet und erst am Ende umgesetzt.
 *
 * ── Was Umsetzungsentscheidung ist und nicht aus der Quelle stammt ────────
 *
 * Die Spezifikation hält ausdrücklich fest, dass sie die Matrizen W und J
 * nicht definiert: „the formal definitions of W and J are not provided in this
 * specification". Damit sind Umsetzungsentscheidungen von BIOME:
 *
 * · die Form der Jacobi-Matrix (hier die übliche aus dem Ursprungspapier),
 * · der Tiefpass von 0,3 Pixel² auf der Bilddiagonale der 2D-Kovarianz, ohne
 *   den Splats unterhalb Pixelgröße flimmern,
 * · die Begrenzung der Halbachsen auf 1024 Pixel gegen entartete Ausreißer,
 * · die Sortierung als Zählsortierung über 16-Bit-Tiefenklassen.
 *
 * Sie stehen hier zusammen, damit niemand sie für belegt hält.
 */

/** Breite der Datentexturen. Zweierpotenz, damit Index → (x, y) billig ist. */
const TEXTURBREITE = 2048

/**
 * Tiefpass auf der 2D-Kovarianz, in Pixel². Umsetzungsentscheidung: ohne ihn
 * verschwinden Splats, die kleiner als ein Pixel projizieren, und die
 * Darstellung flimmert bei Kamerabewegung.
 */
const TIEFPASS = 0.3

/** Obergrenze einer Halbachse in Pixeln, gegen entartete Projektionen. */
const ACHSE_MAX = 1024

/** Zahl der Tiefenklassen der Zählsortierung. */
const TIEFENKLASSEN = 65536

const VERTEX_QUELLE = `#version 300 es
precision highp float;
precision highp int;

in vec2 aEcke;          // Eckpunkt des Vierecks, -1 bis 1
in uint aIndex;         // welcher Splat — kommt sortiert aus dem Indexpuffer

uniform sampler2D uMittel;   // RGBA32F: Mittelpunkt xyz, Farbe gepackt in w
uniform sampler2D uKov0;     // RGBA32F: Sxx, Sxy, Sxz, Syy
uniform sampler2D uKov1;     // RG32F:   Syz, Szz

uniform mat4 uAnsicht;
uniform mat4 uProjektion;
uniform vec2 uBrennweite;    // fx, fy in Pixeln
uniform vec2 uFenster;       // Breite, Höhe in Pixeln
uniform float uSigma;

out vec4 vFarbe;
out vec2 vKern;

void main() {
  ivec2 st = ivec2(int(aIndex) % ${TEXTURBREITE}, int(aIndex) / ${TEXTURBREITE});
  vec4 a = texelFetch(uMittel, st, 0);
  vec4 k0 = texelFetch(uKov0, st, 0);
  vec2 k1 = texelFetch(uKov1, st, 0).rg;

  vec4 sicht = uAnsicht * vec4(a.xyz, 1.0);

  // Hinter der Kamera oder auf ihr: die affine Näherung der Projektion gilt
  // dort nicht. Solche Splats werden verworfen, nicht verzerrt gezeichnet.
  if (sicht.z > -0.01) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }

  // Σ ist symmetrisch, gespeichert sind die sechs eigenen Werte.
  mat3 S = mat3(
    k0.x, k0.y, k0.z,
    k0.y, k0.w, k1.x,
    k0.z, k1.x, k1.y);

  float z = sicht.z;
  // Jacobi-Matrix der perspektivischen Abbildung, spaltenweise notiert.
  mat3 J = mat3(
    uBrennweite.x / z, 0.0, 0.0,
    0.0, uBrennweite.y / z, 0.0,
    -(uBrennweite.x * sicht.x) / (z * z), -(uBrennweite.y * sicht.y) / (z * z), 0.0);

  mat3 T = J * mat3(uAnsicht);
  mat3 kov = T * S * transpose(T);

  float k00 = kov[0][0] + ${TIEFPASS.toFixed(1)};
  float k11 = kov[1][1] + ${TIEFPASS.toFixed(1)};
  float k01 = kov[0][1];

  // Eigenwerte der 2x2-Bildkovarianz — die beiden Halbachsen der Ellipse.
  float mitte = 0.5 * (k00 + k11);
  float det = k00 * k11 - k01 * k01;
  float wurzel = sqrt(max(1e-9, mitte * mitte - det));
  float l1 = mitte + wurzel;
  float l2 = max(mitte - wurzel, 1e-9);

  // Bei einer achsparallelen Ellipse ist der Eigenvektor entartet; dann ist
  // die Hauptachse die x-Achse.
  vec2 v1 = abs(k01) < 1e-9 ? vec2(1.0, 0.0) : normalize(vec2(k01, l1 - k00));
  vec2 achse1 = min(sqrt(l1), ${ACHSE_MAX}.0) * v1;
  vec2 achse2 = min(sqrt(l2), ${ACHSE_MAX}.0) * vec2(-v1.y, v1.x);

  vec4 clip = uProjektion * sicht;
  vec2 versatz = (aEcke.x * achse1 + aEcke.y * achse2) * uSigma;

  gl_Position = vec4(
    clip.xy / clip.w + versatz / uFenster * 2.0,
    clip.z / clip.w,
    1.0);

  uint gepackt = floatBitsToUint(a.w);
  vFarbe = vec4(uvec4(gepackt, gepackt >> 8, gepackt >> 16, gepackt >> 24) & 255u) / 255.0;
  vKern = aEcke * uSigma;
}
`

const FRAGMENT_QUELLE = `#version 300 es
precision highp float;

in vec4 vFarbe;
in vec2 vKern;
uniform float uSigma;
out vec4 fFarbe;

void main() {
  float r2 = dot(vKern, vKern);
  // 3σ-Abschneidung: außerhalb trägt die Gaußfunktion nichts bei.
  if (r2 > uSigma * uSigma) discard;

  float g = exp(-0.5 * r2);
  float alpha = vFarbe.a * g;
  if (alpha < 0.00392) discard;   // unter 1/255 ist der Beitrag nicht sichtbar

  // Vormultipliziert: die Spezifikation empfiehlt, das Produkt c·α an die
  // Blendstufe zu geben und den Quellfaktor auf eins zu setzen.
  fFarbe = vec4(vFarbe.rgb * alpha, alpha);
}
`

/** Auflösungspass: Fließkommapuffer auf den Bildschirm, mit Farbraumbehandlung. */
const AUFLOESUNG_VERTEX = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  // Ein großes Dreieck statt zweier Vierecke — kein Naht in der Mitte.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`

const AUFLOESUNG_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBild;
uniform bool uNachSrgb;
out vec4 fFarbe;

vec3 nachSrgb(vec3 linear) {
  vec3 tief = linear * 12.92;
  vec3 hoch = 1.055 * pow(max(linear, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(tief, hoch, step(vec3(0.0031308), linear));
}

void main() {
  vec4 farbe = texture(uBild, vUv);
  vec3 rgb = clamp(farbe.rgb, 0.0, 1.0);
  // Nur wenn die Aufnahme in Linearlicht vorliegt, wird für die Anzeige
  // umgesetzt. Bei srgb_rec709_display sind die Werte bereits anzeige-
  // codiert und dürfen nicht ein zweites Mal durch die Kennlinie.
  fFarbe = vec4(uNachSrgb ? nachSrgb(rgb) : rgb, 1.0);
}
`

/* ── Matrizen, spaltenweise wie in WebGL ────────────────────────────────── */

/**
 * @param {number} sichtfeld  in Bogenmaß
 * @param {number} seite      Breite durch Höhe
 * @param {number} nah
 * @param {number} fern
 * @returns {Float32Array}
 */
function perspektive(sichtfeld, seite, nah, fern) {
  const f = 1 / Math.tan(sichtfeld / 2)
  const m = new Float32Array(16)
  m[0] = f / seite
  m[5] = f
  m[10] = (fern + nah) / (nah - fern)
  m[11] = -1
  m[14] = (2 * fern * nah) / (nah - fern)
  return m
}

/**
 * Blickmatrix (Welt → Kamera).
 * @param {number[]} auge
 * @param {number[]} ziel
 * @returns {Float32Array}
 */
function blickMatrix(auge, ziel) {
  // z zeigt von der Szene zur Kamera — die Kamera blickt nach −z.
  let zx = auge[0] - ziel[0], zy = auge[1] - ziel[1], zz = auge[2] - ziel[2]
  let l = Math.hypot(zx, zy, zz) || 1
  zx /= l; zy /= l; zz /= l

  // x = oben × z, mit oben = +Y (die glTF-Konvention, FE-GS-23).
  // (0,1,0) × (zx,zy,zz) = (zz, 0, −zx)
  let xx = zz, xy = 0, xz = -zx
  l = Math.hypot(xx, xy, xz)
  if (l < 1e-6) {
    // Blick genau von oben oder unten: die x-Achse ist dann unbestimmt.
    xx = 1; xy = 0; xz = 0
  } else {
    xx /= l; xy /= l; xz /= l
  }

  // y = z × x
  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx

  const m = new Float32Array(16)
  m[0] = xx; m[4] = xy; m[8] = xz
  m[1] = yx; m[5] = yy; m[9] = yz
  m[2] = zx; m[6] = zy; m[10] = zz
  m[12] = -(xx * auge[0] + xy * auge[1] + xz * auge[2])
  m[13] = -(yx * auge[0] + yy * auge[1] + yz * auge[2])
  m[14] = -(zx * auge[0] + zy * auge[1] + zz * auge[2])
  m[15] = 1
  return m
}

/* ── Kovarianzen ────────────────────────────────────────────────────────── */

/**
 * Baut die sechs eigenen Werte der 3x3-Kovarianz je Splat.
 *
 * Nach FE-GS-23: Σ = M C Cᵀ Mᵀ, wobei C spaltenweise aus der Rotationsmatrix
 * des Quaternions und den drei Skalen besteht. `M` ist die obere linke 3x3 der
 * globalen Knotenmatrix; ist sie die Einheitsmatrix, entfällt sie.
 *
 * @param {Float32Array} rotation  4 Werte je Splat (x, y, z, w)
 * @param {Float32Array} skala     3 Werte je Splat
 * @param {number} anzahl
 * @param {Float32Array|null} m3   obere linke 3x3 der Knotenmatrix, spaltenweise
 * @returns {{ kov0: Float32Array, kov1: Float32Array }}
 */
export function baueKovarianzen(rotation, skala, anzahl, m3) {
  const kov0 = new Float32Array(anzahl * 4)   // Sxx, Sxy, Sxz, Syy
  const kov1 = new Float32Array(anzahl * 2)   // Syz, Szz

  for (let i = 0; i < anzahl; i++) {
    const qx = rotation[i * 4], qy = rotation[i * 4 + 1]
    const qz = rotation[i * 4 + 2], qw = rotation[i * 4 + 3]
    const sx = skala[i * 3], sy = skala[i * 3 + 1], sz = skala[i * 3 + 2]

    // C = R · diag(s), spaltenweise: Spalte j ist s_j mal die j-te Achse von R.
    let c00 = sx * (1 - 2 * (qy * qy + qz * qz))
    let c10 = sx * (2 * (qx * qy + qw * qz))
    let c20 = sx * (2 * (qx * qz - qw * qy))
    let c01 = sy * (2 * (qx * qy - qw * qz))
    let c11 = sy * (1 - 2 * (qx * qx + qz * qz))
    let c21 = sy * (2 * (qy * qz + qw * qx))
    let c02 = sz * (2 * (qx * qz + qw * qy))
    let c12 = sz * (2 * (qy * qz - qw * qx))
    let c22 = sz * (1 - 2 * (qx * qx + qy * qy))

    if (m3) {
      // M · C, ebenfalls spaltenweise gelesen.
      const a00 = m3[0], a10 = m3[1], a20 = m3[2]
      const a01 = m3[3], a11 = m3[4], a21 = m3[5]
      const a02 = m3[6], a12 = m3[7], a22 = m3[8]
      const n00 = a00 * c00 + a01 * c10 + a02 * c20
      const n10 = a10 * c00 + a11 * c10 + a12 * c20
      const n20 = a20 * c00 + a21 * c10 + a22 * c20
      const n01 = a00 * c01 + a01 * c11 + a02 * c21
      const n11 = a10 * c01 + a11 * c11 + a12 * c21
      const n21 = a20 * c01 + a21 * c11 + a22 * c21
      const n02 = a00 * c02 + a01 * c12 + a02 * c22
      const n12 = a10 * c02 + a11 * c12 + a12 * c22
      const n22 = a20 * c02 + a21 * c12 + a22 * c22
      c00 = n00; c10 = n10; c20 = n20
      c01 = n01; c11 = n11; c21 = n21
      c02 = n02; c12 = n12; c22 = n22
    }

    // Σ = C Cᵀ — symmetrisch, sechs eigene Werte.
    kov0[i * 4] = c00 * c00 + c01 * c01 + c02 * c02          // Sxx
    kov0[i * 4 + 1] = c00 * c10 + c01 * c11 + c02 * c12      // Sxy
    kov0[i * 4 + 2] = c00 * c20 + c01 * c21 + c02 * c22      // Sxz
    kov0[i * 4 + 3] = c10 * c10 + c11 * c11 + c12 * c12      // Syy
    kov1[i * 2] = c10 * c20 + c11 * c21 + c12 * c22          // Syz
    kov1[i * 2 + 1] = c20 * c20 + c21 * c21 + c22 * c22      // Szz
  }
  return { kov0, kov1 }
}

/* ── Sortierung ─────────────────────────────────────────────────────────── */

/**
 * Sortiert die Splats von hinten nach vorn — die Reihenfolge, in der das
 * Alpha-Blending stimmt.
 *
 * Zählsortierung über 16-Bit-Tiefenklassen statt eines Vergleichssortierers:
 * bei einer Million Gaußfunktionen ist das der Unterschied zwischen etwa
 * 20 Millisekunden und einer Sekunde, und die Sortierung läuft bei jeder
 * Kamerabewegung neu.
 *
 * @param {Float32Array} mittel   4 Werte je Splat (xyz + gepackte Farbe)
 * @param {number} anzahl
 * @param {Float32Array} ansicht  Blickmatrix, spaltenweise
 * @param {Uint32Array} ziel      Indexpuffer, wird überschrieben
 * @param {{ tiefen: Float32Array, zaehler: Uint32Array }} arbeit
 */
export function sortiereNachTiefe(mittel, anzahl, ansicht, ziel, arbeit) {
  const { tiefen, zaehler } = arbeit
  const m2 = ansicht[2], m6 = ansicht[6], m10 = ansicht[10], m14 = ansicht[14]

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < anzahl; i++) {
    // z im Kamerasystem. Die Kamera blickt nach −z, weiter entfernt heißt
    // also kleiner.
    const z = m2 * mittel[i * 4] + m6 * mittel[i * 4 + 1] + m10 * mittel[i * 4 + 2] + m14
    tiefen[i] = z
    if (z < min) min = z
    if (z > max) max = z
  }

  if (!(max > min)) {
    // Alle Splats in derselben Ebene — jede Reihenfolge ist gleich richtig.
    for (let i = 0; i < anzahl; i++) ziel[i] = i
    return
  }

  zaehler.fill(0)
  const faktor = (TIEFENKLASSEN - 1) / (max - min)
  for (let i = 0; i < anzahl; i++) {
    // Aufsteigend nach z: das entfernteste (kleinste z) kommt zuerst.
    tiefen[i] = ((tiefen[i] - min) * faktor) | 0
    zaehler[tiefen[i]]++
  }
  let summe = 0
  for (let k = 0; k < TIEFENKLASSEN; k++) {
    const n = zaehler[k]
    zaehler[k] = summe
    summe += n
  }
  for (let i = 0; i < anzahl; i++) ziel[zaehler[tiefen[i]]++] = i
}

/* ── Der Renderer ───────────────────────────────────────────────────────── */

/**
 * @param {WebGL2RenderingContext} gl
 * @param {number} art
 * @param {string} quelle
 * @returns {WebGLShader}
 */
function baueShader(gl, art, quelle) {
  const shader = gl.createShader(art)
  if (!shader) throw new Error('WebGL konnte keinen Shader anlegen.')
  gl.shaderSource(shader, quelle)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const protokoll = gl.getShaderInfoLog(shader) || 'ohne Meldung'
    gl.deleteShader(shader)
    throw new Error(`Shader ließ sich nicht übersetzen: ${protokoll}`)
  }
  return shader
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertex
 * @param {string} fragment
 * @returns {WebGLProgram}
 */
function baueProgramm(gl, vertex, fragment) {
  const programm = gl.createProgram()
  if (!programm) throw new Error('WebGL konnte kein Programm anlegen.')
  const v = baueShader(gl, gl.VERTEX_SHADER, vertex)
  const f = baueShader(gl, gl.FRAGMENT_SHADER, fragment)
  gl.attachShader(programm, v)
  gl.attachShader(programm, f)
  gl.linkProgram(programm)
  gl.deleteShader(v)
  gl.deleteShader(f)
  if (!gl.getProgramParameter(programm, gl.LINK_STATUS)) {
    const protokoll = gl.getProgramInfoLog(programm) || 'ohne Meldung'
    gl.deleteProgram(programm)
    throw new Error(`Shader-Programm ließ sich nicht binden: ${protokoll}`)
  }
  return programm
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {number} innen
 * @param {number} format
 * @param {number} typ
 * @param {number} breite
 * @param {number} hoehe
 * @param {ArrayBufferView} daten
 * @returns {WebGLTexture}
 */
function baueTextur(gl, innen, format, typ, breite, hoehe, daten) {
  const tex = gl.createTexture()
  if (!tex) throw new Error('WebGL konnte keine Textur anlegen.')
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, innen, breite, hoehe, 0, format, typ, daten)
  return tex
}

/**
 * Zeichnet ein Splat-Feld auf ein Canvas und lässt es umlaufen.
 *
 * Bewusst eine Klasse ohne React: der Renderer soll nichts über die Oberfläche
 * wissen, und die Oberfläche nichts über WebGL. `ui/SplatAnsicht.jsx` hängt nur
 * Ereignisse daran.
 */
export class SplatRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    })
    if (!gl) {
      throw new Error('Dieses Gerät bietet kein WebGL2. Eine Splat-Aufnahme lässt sich hier nicht darstellen.')
    }
    this.canvas = canvas
    this.gl = gl

    // Fließkommapuffer für die Zwischenergebnisse — die Spezifikation
    // empfiehlt ihn ausdrücklich. Fehlt die Erweiterung, wird direkt in den
    // Bildschirmpuffer gezeichnet; das sagt `this.fliesskomma` an, damit die
    // Oberfläche es benennen kann statt es zu verschweigen.
    this.fliesskomma = !!gl.getExtension('EXT_color_buffer_float')
      || !!gl.getExtension('EXT_color_buffer_half_float')

    this.programm = baueProgramm(gl, VERTEX_QUELLE, FRAGMENT_QUELLE)
    this.aufloesung = baueProgramm(gl, AUFLOESUNG_VERTEX, AUFLOESUNG_FRAGMENT)

    this.ortAnsicht = gl.getUniformLocation(this.programm, 'uAnsicht')
    this.ortProjektion = gl.getUniformLocation(this.programm, 'uProjektion')
    this.ortBrennweite = gl.getUniformLocation(this.programm, 'uBrennweite')
    this.ortFenster = gl.getUniformLocation(this.programm, 'uFenster')
    // uSigma steht in beiden Shaderstufen desselben Programms und hat deshalb
    // genau eine Adresse.
    this.ortSigma = gl.getUniformLocation(this.programm, 'uSigma')
    this.ortMittel = gl.getUniformLocation(this.programm, 'uMittel')
    this.ortKov0 = gl.getUniformLocation(this.programm, 'uKov0')
    this.ortKov1 = gl.getUniformLocation(this.programm, 'uKov1')
    this.ortBild = gl.getUniformLocation(this.aufloesung, 'uBild')
    this.ortNachSrgb = gl.getUniformLocation(this.aufloesung, 'uNachSrgb')

    /** @type {WebGLVertexArrayObject|null} */
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)

    this.eckenPuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.eckenPuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW)
    const ortEcke = gl.getAttribLocation(this.programm, 'aEcke')
    gl.enableVertexAttribArray(ortEcke)
    gl.vertexAttribPointer(ortEcke, 2, gl.FLOAT, false, 0, 0)

    this.indexPuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexPuffer)
    const ortIndex = gl.getAttribLocation(this.programm, 'aIndex')
    gl.enableVertexAttribArray(ortIndex)
    gl.vertexAttribIPointer(ortIndex, 1, gl.UNSIGNED_INT, 0, 0)
    gl.vertexAttribDivisor(ortIndex, 1)

    gl.bindVertexArray(null)

    this.leerVao = gl.createVertexArray()

    /** @type {WebGLTexture|null} */ this.texMittel = null
    /** @type {WebGLTexture|null} */ this.texKov0 = null
    /** @type {WebGLTexture|null} */ this.texKov1 = null
    /** @type {WebGLFramebuffer|null} */ this.fbo = null
    /** @type {WebGLTexture|null} */ this.fboTextur = null

    this.anzahl = 0
    /** @type {Float32Array} */ this.mittel = new Float32Array(0)
    /** @type {Uint32Array} */ this.reihenfolge = new Uint32Array(0)
    /** @type {{ tiefen: Float32Array, zaehler: Uint32Array }} */
    this.sortierArbeit = { tiefen: new Float32Array(0), zaehler: new Uint32Array(TIEFENKLASSEN) }
    this.nachSrgb = false

    // Umlaufkamera.
    this.ziel = [0, 0, 0]
    this.abstand = 4
    this.azimut = 0
    this.hoehe = 0.3
    this.sichtfeld = (55 * Math.PI) / 180
    this.szenenradius = 1

    /** Letzte Blickmatrix, gegen die sortiert wurde. */
    this.letzteSortierung = new Float32Array(16)
    this.fensterBreite = 1
    this.fensterHoehe = 1
  }

  /**
   * Lädt ein Splat-Feld auf die Grafikkarte.
   *
   * @param {import('./splat.js').Splatfeld} feld
   * @param {{ nachSrgb?: boolean, knotenMatrix3?: Float32Array|null }} [opt]
   */
  setzeFeld(feld, opt = {}) {
    const gl = this.gl
    const n = feld.anzahl
    this.anzahl = n
    this.nachSrgb = !!opt.nachSrgb

    const hoehe = Math.max(1, Math.ceil(n / TEXTURBREITE))
    const texel = TEXTURBREITE * hoehe

    // Mittelpunkt und Farbe: die Farbe als vier Bytes in die Bitfolge eines
    // Float gepackt. Spart eine Textur und damit ein Drittel Speicher.
    const mittel = new Float32Array(texel * 4)
    const bytes = new Uint8Array(mittel.buffer)
    for (let i = 0; i < n; i++) {
      mittel[i * 4] = feld.position[i * 3]
      mittel[i * 4 + 1] = feld.position[i * 3 + 1]
      mittel[i * 4 + 2] = feld.position[i * 3 + 2]
      const b = i * 16 + 12
      bytes[b] = Math.max(0, Math.min(255, Math.round(feld.farbe[i * 3] * 255)))
      bytes[b + 1] = Math.max(0, Math.min(255, Math.round(feld.farbe[i * 3 + 1] * 255)))
      bytes[b + 2] = Math.max(0, Math.min(255, Math.round(feld.farbe[i * 3 + 2] * 255)))
      bytes[b + 3] = Math.max(0, Math.min(255, Math.round(feld.deckkraft[i] * 255)))
    }
    this.mittel = mittel

    const { kov0, kov1 } = baueKovarianzen(feld.rotation, feld.skala, n, opt.knotenMatrix3 || null)
    const kov0Voll = new Float32Array(texel * 4)
    kov0Voll.set(kov0.subarray(0, n * 4))
    const kov1Voll = new Float32Array(texel * 2)
    kov1Voll.set(kov1.subarray(0, n * 2))

    this.loescheTexturen()
    this.texMittel = baueTextur(gl, gl.RGBA32F, gl.RGBA, gl.FLOAT, TEXTURBREITE, hoehe, mittel)
    this.texKov0 = baueTextur(gl, gl.RGBA32F, gl.RGBA, gl.FLOAT, TEXTURBREITE, hoehe, kov0Voll)
    this.texKov1 = baueTextur(gl, gl.RG32F, gl.RG, gl.FLOAT, TEXTURBREITE, hoehe, kov1Voll)

    this.reihenfolge = new Uint32Array(Math.max(1, n))
    for (let i = 0; i < n; i++) this.reihenfolge[i] = i
    this.sortierArbeit = { tiefen: new Float32Array(Math.max(1, n)), zaehler: new Uint32Array(TIEFENKLASSEN) }
    this.letzteSortierung = new Float32Array(16)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexPuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.reihenfolge, gl.DYNAMIC_DRAW)

    this.einpassen(feld.huelle)
  }

  /**
   * Stellt die Kamera so, dass die ganze Aufnahme im Bild ist.
   * @param {{ min: number[], max: number[] }} huelle
   */
  einpassen(huelle) {
    const mitte = [
      (huelle.min[0] + huelle.max[0]) / 2,
      (huelle.min[1] + huelle.max[1]) / 2,
      (huelle.min[2] + huelle.max[2]) / 2,
    ]
    const spanne = Math.max(
      huelle.max[0] - huelle.min[0],
      huelle.max[1] - huelle.min[1],
      huelle.max[2] - huelle.min[2],
    )
    this.szenenradius = Math.max(spanne / 2, 0.01)
    this.ziel = mitte
    this.abstand = (this.szenenradius / Math.tan(this.sichtfeld / 2)) * 1.6
    this.azimut = 0
    this.hoehe = 0.35
  }

  /**
   * @param {number} breite
   * @param {number} hoehe
   * @param {number} pixelverhaeltnis
   */
  setzeGroesse(breite, hoehe, pixelverhaeltnis) {
    const gl = this.gl
    const b = Math.max(1, Math.round(breite * pixelverhaeltnis))
    const h = Math.max(1, Math.round(hoehe * pixelverhaeltnis))
    if (b === this.fensterBreite && h === this.fensterHoehe) return
    this.fensterBreite = b
    this.fensterHoehe = h
    this.canvas.width = b
    this.canvas.height = h

    if (!this.fliesskomma) return

    if (this.fboTextur) gl.deleteTexture(this.fboTextur)
    if (this.fbo) gl.deleteFramebuffer(this.fbo)
    this.fboTextur = baueTextur(gl, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, b, h, /** @type {any} */ (null))
    this.fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTextur, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      // Kein Grund abzubrechen: dann eben ohne Zwischenpuffer, und die
      // Oberfläche sagt es.
      this.fliesskomma = false
      gl.deleteFramebuffer(this.fbo)
      this.fbo = null
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  /** Position der Kamera aus Azimut, Höhe und Abstand. */
  kameraPosition() {
    const cx = Math.cos(this.hoehe) * Math.sin(this.azimut)
    const cy = Math.sin(this.hoehe)
    const cz = Math.cos(this.hoehe) * Math.cos(this.azimut)
    return [
      this.ziel[0] + cx * this.abstand,
      this.ziel[1] + cy * this.abstand,
      this.ziel[2] + cz * this.abstand,
    ]
  }

  /**
   * @param {number} dAzimut
   * @param {number} dHoehe
   */
  drehen(dAzimut, dHoehe) {
    this.azimut -= dAzimut
    const grenze = Math.PI / 2 - 0.01
    this.hoehe = Math.max(-grenze, Math.min(grenze, this.hoehe + dHoehe))
  }

  /** @param {number} faktor */
  zoomen(faktor) {
    this.abstand = Math.max(this.szenenradius * 0.05, Math.min(this.szenenradius * 40, this.abstand * faktor))
  }

  /**
   * Verschiebt den Blickpunkt in der Bildebene.
   * @param {number} dx  Anteil der Fensterbreite
   * @param {number} dy  Anteil der Fensterhöhe
   */
  schieben(dx, dy) {
    const auge = this.kameraPosition()
    let fx = this.ziel[0] - auge[0], fy = this.ziel[1] - auge[1], fz = this.ziel[2] - auge[2]
    const l = Math.hypot(fx, fy, fz) || 1
    fx /= l; fy /= l; fz /= l

    // rechts = vorwärts × oben, mit oben = +Y: (fy·0 − fz·1, fz·0 − fx·0, fx·1 − fy·0)
    let rx = -fz, ry = 0, rz = fx
    const rl = Math.hypot(rx, ry, rz) || 1
    rx /= rl; ry /= rl; rz /= rl

    // oben' = rechts × vorwärts
    const ux = ry * fz - rz * fy
    const uy = rz * fx - rx * fz
    const uz = rx * fy - ry * fx

    // Die Bildhöhe in Weltmetern auf Höhe des Blickpunkts — so schiebt der
    // Finger die Szene genau so weit, wie er sich bewegt.
    const weite = 2 * this.abstand * Math.tan(this.sichtfeld / 2)
    this.ziel[0] += (-rx * dx + ux * dy) * weite
    this.ziel[1] += (-ry * dx + uy * dy) * weite
    this.ziel[2] += (-rz * dx + uz * dy) * weite
  }

  /** Zeichnet ein Bild. */
  zeichne() {
    const gl = this.gl
    if (!this.anzahl) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.fensterBreite, this.fensterHoehe)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return
    }

    const auge = this.kameraPosition()
    const ansicht = blickMatrix(auge, this.ziel)
    const seite = this.fensterBreite / this.fensterHoehe
    const nah = Math.max(this.szenenradius * 0.001, 0.01)
    const projektion = perspektive(this.sichtfeld, seite, nah, this.szenenradius * 100)

    // Neu sortieren, wenn sich die Blickrichtung nennenswert geändert hat.
    // Ein Schwellwert statt „immer": bei einer Million Gaußfunktionen kostet
    // die Sortierung mehr als das Zeichnen.
    let abweichung = 0
    for (let i = 0; i < 16; i++) abweichung += Math.abs(ansicht[i] - this.letzteSortierung[i])
    if (abweichung > 0.002) {
      sortiereNachTiefe(this.mittel, this.anzahl, ansicht, this.reihenfolge, this.sortierArbeit)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.indexPuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.reihenfolge)
      this.letzteSortierung.set(ansicht)
    }

    const inPuffer = this.fliesskomma && this.fbo
    gl.bindFramebuffer(gl.FRAMEBUFFER, inPuffer ? this.fbo : null)
    gl.viewport(0, 0, this.fensterBreite, this.fensterHoehe)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    // Vormultipliziertes Alpha, wie in FE-GS-23 empfohlen.
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.blendEquation(gl.FUNC_ADD)

    gl.useProgram(this.programm)
    // Brennweite in Pixeln aus dem Sichtfeld.
    const fy = this.fensterHoehe / (2 * Math.tan(this.sichtfeld / 2))
    gl.uniformMatrix4fv(this.ortAnsicht, false, ansicht)
    gl.uniformMatrix4fv(this.ortProjektion, false, projektion)
    gl.uniform2f(this.ortBrennweite, fy, fy)
    gl.uniform2f(this.ortFenster, this.fensterBreite, this.fensterHoehe)
    gl.uniform1f(this.ortSigma, 3)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texMittel)
    gl.uniform1i(this.ortMittel, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.texKov0)
    gl.uniform1i(this.ortKov0, 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.texKov1)
    gl.uniform1i(this.ortKov1, 2)

    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this.anzahl)
    gl.bindVertexArray(null)

    if (inPuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.fensterBreite, this.fensterHoehe)
      gl.disable(gl.BLEND)
      gl.useProgram(this.aufloesung)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.fboTextur)
      gl.uniform1i(this.ortBild, 0)
      gl.uniform1i(this.ortNachSrgb, this.nachSrgb ? 1 : 0)
      gl.bindVertexArray(this.leerVao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
    }
  }

  loescheTexturen() {
    const gl = this.gl
    if (this.texMittel) gl.deleteTexture(this.texMittel)
    if (this.texKov0) gl.deleteTexture(this.texKov0)
    if (this.texKov1) gl.deleteTexture(this.texKov1)
    this.texMittel = null
    this.texKov0 = null
    this.texKov1 = null
  }

  freigeben() {
    const gl = this.gl
    this.loescheTexturen()
    if (this.fboTextur) gl.deleteTexture(this.fboTextur)
    if (this.fbo) gl.deleteFramebuffer(this.fbo)
    if (this.indexPuffer) gl.deleteBuffer(this.indexPuffer)
    if (this.eckenPuffer) gl.deleteBuffer(this.eckenPuffer)
    if (this.vao) gl.deleteVertexArray(this.vao)
    if (this.leerVao) gl.deleteVertexArray(this.leerVao)
    gl.deleteProgram(this.programm)
    gl.deleteProgram(this.aufloesung)
    this.mittel = new Float32Array(0)
    this.reihenfolge = new Uint32Array(0)
    this.anzahl = 0
  }
}
