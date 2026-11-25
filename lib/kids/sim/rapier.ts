// lib/kids/sim/rapier.ts
// Loads the Rapier physics engine (WebAssembly, inlined in the -compat build)
// once per page or process. Dynamic import so nothing pulls ~2 MB of WASM into
// a bundle unless this function is actually called.

export type Rapier = typeof import('@dimforge/rapier3d-compat')

let loading: Promise<Rapier> | null = null

export function loadRapier(): Promise<Rapier> {
  if (!loading) {
    loading = import('@dimforge/rapier3d-compat').then(async (mod) => {
      // The ESM build exposes the namespace as the default export; the CJS
      // build (tsx / node) exposes it directly. Both carry init().
      const ns = ((mod as unknown as { default?: Rapier }).default ?? mod) as Rapier
      await ns.init()
      return ns
    })
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}
