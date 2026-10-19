import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { readImageSlots, writeImageSlots } from './utils/imageSlotStore.ts'

// Expõe o React do Vite como global para o _ds_bundle.js (UMD)
;(window as unknown as Record<string, unknown>).React = React
;(window as unknown as Record<string, unknown>).ReactDOM = ReactDOM

// ── Persistência de <image-slot> no builder ──────────────────────────────
// O image-slot embutido no bundle persiste via window.omelette.writeFile (sidecar .json) e
// reidrata via fetch(STATE_FILE). No builder não há host omelette → fazemos
// um shim persistente em IndexedDB e interceptamos o fetch do sidecar.
const SLOT_FILE = '.image-slots.state.json'
const DS_BASE = `${import.meta.env.BASE_URL}ds/`
const DS_BUNDLE_VERSION = '2026-08-15.1'
;(window as unknown as Record<string, unknown>).omelette = {
  writeFile: (name: string, content: string) => {
    if (typeof name === 'string' && name.endsWith(SLOT_FILE)) {
      return writeImageSlots(content)
    }
    return Promise.resolve()
  },
}
const _fetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url && url.endsWith(SLOT_FILE)) {
    return readImageSlots({ preferLive: false }).then((content) => (
      new Response(content, { status: 200, headers: { 'Content-Type': 'application/json' } })
    ))
  }
  return _fetch(input, init)
}

// Carrega o DS bundle dinamicamente (já com window.React disponível)
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`))
    document.head.appendChild(s)
  })
}

loadScript(`${DS_BASE}_ds_bundle.js?v=${DS_BUNDLE_VERSION}`).catch(console.error)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
