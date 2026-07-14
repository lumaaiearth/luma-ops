import { sb } from './supabase.js'

// Bildgenerierung über die Edge Function `generate-image` (Black Forest Labs / FLUX).
// Der API-Key liegt serverseitig als Supabase-Secret – hier wird nichts Geheimes verwendet.
//
//   const { imageUrl } = await generateImage('a lush green biotope, aerial view')
//
// opts (alle optional):
//   model            z.B. 'flux-pro-1.1' (default), 'flux-pro-1.1-ultra', 'flux-dev'
//   width, height    Pixel (Vielfache von 32), für größenbasierte Modelle
//   aspect_ratio     z.B. '16:9' (für ultra/kontext-Modelle)
//   seed             für reproduzierbare Ergebnisse
//   prompt_upsampling  BFL verfeinert den Prompt automatisch
//   persist          true → Bild dauerhaft in Supabase Storage sichern
//                    (sonst läuft die zurückgegebene URL nach ~10 Min ab)
//
// Rückgabe: { imageUrl, bflUrl, persisted, prompt, model, seed, width, height }
export async function generateImage(prompt, opts = {}) {
  const { data, error } = await sb.functions.invoke('generate-image', {
    body: { prompt, ...opts },
  })

  if (error) {
    // FunctionsHttpError: die eigentliche Fehlermeldung steckt im Response-Body
    let message = error.message
    try {
      const ctx = await error.context?.json?.()
      if (ctx?.error) message = ctx.error
    } catch { /* Body nicht lesbar → generische Meldung behalten */ }
    throw new Error(message)
  }

  return data
}
