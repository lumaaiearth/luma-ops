// Drohnenbild eckgenau auf der Karte (K12): ein <img> im Overlay-Pane, per
// CSS matrix3d auf die vier Eckpunkte gelegt (src/lib/eckenTransform.js).
// Leaflets ImageOverlay kann nur achsparallele Rechtecke — ein UTM-Bild lag
// damit um ~1° verdreht und an den Rändern mehrere Meter daneben.
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { matrix3d } from '../lib/eckenTransform.js'

/**
 * @param {{ url: string, ecken: [number,number][], opacity?: number }} p  ecken: [lng,lat] ol, or, ur, ul
 */
export default function EckenBildEbene({ url, ecken, opacity = 0.8 }) {
  const map = useMap()
  const img = useRef(null)
  const eckenRef = useRef(ecken)
  useEffect(() => { eckenRef.current = ecken }, [ecken])

  useEffect(() => {
    const el = document.createElement('img')
    el.className = 'leaflet-image-layer leaflet-zoom-hide luma-eckenbild'
    el.alt = ''
    el.draggable = false
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', transformOrigin: '0 0', pointerEvents: 'none', visibility: 'hidden' })
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
    map.getPane('overlayPane').appendChild(el)
    map.on('zoomend viewreset', setzen)
    return () => {
      map.off('zoomend viewreset', setzen)
      el.onload = null
      el.remove()
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
