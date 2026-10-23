// Bilder aus Supabase Storage über signierte Links anzeigen.
// Logik und Begründung: src/lib/speicherUrl.js
import { useEffect, useState } from 'react'
import { signiere, speicherOrt } from '../lib/speicherUrl.js'

/**
 * Liefert die anzeigbare URL. Bis das Signieren fertig ist, steht null da —
 * das Bild wird dann noch nicht geladen, statt einmal mit der (nach dem
 * Umschalten der Buckets ungültigen) öffentlichen URL zu scheitern.
 * Fremde URLs (Google-Profilbild, data:, blob:) kommen sofort zurück.
 */
export function useSpeicherUrl(url) {
  const [ergebnis, setErgebnis] = useState({ fuer: null, wert: null })
  useEffect(() => {
    if (!speicherOrt(url)) return
    let aktiv = true
    signiere(url).then((u) => { if (aktiv) setErgebnis({ fuer: url, wert: u }) })
    return () => { aktiv = false }
  }, [url])
  if (!speicherOrt(url)) return url || null
  return ergebnis.fuer === url ? ergebnis.wert : null
}

/** <a> mit signierter URL (Foto in groß öffnen, Datei herunterladen). */
export function SpeicherLink({ href, children, ...rest }) {
  const url = useSpeicherUrl(href)
  return <a href={url || undefined} aria-disabled={!url || undefined} {...rest}>{children}</a>
}

/** <img> mit signierter URL. Alle übrigen Eigenschaften gehen ans <img>. */
export default function SpeicherBild({ src, alt = '', ...rest }) {
  const url = useSpeicherUrl(src)
  if (!url) return null
  return <img src={url} alt={alt} {...rest} />
}
