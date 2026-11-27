// lib/kids/teach/present-href.ts — the one link every "Present" button uses
// (roadmap #42). Pure and tiny, so a client component can import it without
// pulling the curricula that lib/kids/teach/present.ts needs to build a deck.

export type PresentSource =
  | { kind: 'session'; level: number; number: number; unplugged: boolean }
  | { kind: 'episode'; slug: string }
  | { kind: 'sim'; id: 'lab' | 'power' }
  | { kind: 'path'; path: string }

export const PRESENT_PATH = '/kids/present'

export function presentHref(src: PresentSource): string {
  switch (src.kind) {
    case 'session':
      return `${PRESENT_PATH}?session=${src.level}-${src.number}${src.unplugged ? '&unplugged=1' : ''}`
    case 'episode':
      return `${PRESENT_PATH}?episode=${encodeURIComponent(src.slug)}`
    case 'sim':
      return `${PRESENT_PATH}?sim=${src.id}`
    case 'path':
      return `${PRESENT_PATH}?path=${encodeURIComponent(src.path)}`
  }
}
