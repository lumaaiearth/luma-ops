// Drohnenbild eckgenau auf der Karte (K12): ein <img> im Overlay-Pane, per
// CSS matrix3d auf die vier Eckpunkte gelegt (src/lib/eckenTransform.js).
// Leaflets ImageOverlay kann nur achsparallele Rechtecke — ein UTM-Bild lag
// damit um ~1° verdreht und an den Rändern mehrere Meter daneben.
//
// Das Bild sitzt in einem Rahmen-<div> im Ursprung der Layer-Koordinaten.
// Am Rahmen setzt der Zeitvergleich (K14) seinen clip-path — am Bild selbst
// ginge das nicht, weil dessen Koordinaten durch matrix3d verzerrt sind.
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { matrix3d } from '../lib/eckenTransform.js'

/**
 * @param {{ url: string, ecken: [number,number][], opacity?: number, aufElement?: (el: HTMLElement|null) => void }} p
 *   ecken: [lng,lat] ol, or, ur, ul
 */
export default function EckenBildEbene({ url, ecken, opacity = 0.8, aufElement }) {
  const map = useMap()
  const img = useRef(null)
  const eckenRef = useRef(ecken)
  useEffect(() => { eckenRef.current = ecken }, [ecken])
  const aufElementRef = useRef(aufElement)
  useEffect(() => { aufElementRef.current = aufElement }, [aufElement])

  useEffect(() => {
    const rahmen = document.createElement('div')
    rahmen.className = 'leaflet-zoom-hide luma-eckenbild-rahmen'
    Object.assign(rahmen.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' })
    const el = document.createElement('img')
    el.className = 'leaflet-image-layer luma-eckenbild'
    el.alt = ''
    el.draggable = false
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', transformOrigin: '0 0', pointerEvents: 'none', visibility: 'hidden' })
    rahmen.appendChild(el)
    img.current = el

    // Bildschirmpunkte im Layer-Koordinatensystem — verschieben sich beim
    // Schwenken mit dem Map-Pane, neu gerechnet wird nur nach dem Zoomen.
    function setzen() {
      const w = el.naturalWidth, h = el.naturalHeight
      const pkt = (eckenRef.current || []).map(([lng, lat]) => {
        const p = map.latLngToLayerPoint([lat, lng])
        return [p.x, p.y]
      })
      const t = w && h && pkt.length === 4 ? matrix3d(w, h, pkt) : null
      if (!t) { el.style.visibility = 'hidden'; return }
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      el.style.transform = t
      el.style.visibility = 'visible'
    }
    el.onload = setzen
    map.getPane('overlayPane').appendChild(rahmen)
    map.on('zoomend viewreset', setzen)
    aufElementRef.current?.(rahmen)
    return () => {
      map.off('zoomend viewreset', setzen)
      el.onload = null
      rahmen.remove()
      aufElementRef.current?.(null)
    }
  }, [map])

  useEffect(() => {
    const el = img.current
    if (el && el.getAttribute('src') !== url) el.src = url
  }, [url])

  useEffect(() => {
    if (img.current) img.current.style.opacity = String(opacity)
  }, [opacity])

  // Neue Ecken (z. B. nach Bearbeitung) ohne neues Bild
  useEffect(() => {
    const el = img.current
    if (el?.complete && el.naturalWidth) el.onload?.()
  }, [ecken])

  return null
}
