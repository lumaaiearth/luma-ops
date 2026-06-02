import { useState, useEffect } from 'react'

// Breakpoints (px)
// xs  < 480   → kleines Smartphone (iPhone SE, kleine Androids)
// sm  480–767 → großes Smartphone (iPhone Pro Max, Pixel)
// md  768–1023→ Tablet / iPad / iPad Mini
// lg  1024+   → Desktop / iPad Pro / Laptop

export function useBreakpoint() {
  const [bp, setBp] = useState(() => calcBp(window.innerWidth))

  useEffect(() => {
    const handler = () => setBp(calcBp(window.innerWidth))
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return bp
}

function calcBp(w) {
  if (w < 480)  return 'xs'
  if (w < 768)  return 'sm'
  if (w < 1024) return 'md'
  return 'lg'
}

// Convenience hook — returns true if screen ≤ given breakpoint
export function useMaxBp(max) {
  const ORDER = { xs: 0, sm: 1, md: 2, lg: 3 }
  const bp = useBreakpoint()
  return ORDER[bp] <= ORDER[max]
}

// Legacy alias
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}
