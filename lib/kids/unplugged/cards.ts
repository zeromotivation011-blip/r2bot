// lib/kids/unplugged/cards.ts
//
// The printable command cards for the unplugged lessons (roadmap #85). Each
// card is the paper twin of a Level 1 picture block: the same words and the
// same icon a child sees on screen (ICON in lib/kids/sim/arenas/level1.ts),
// so a class that moves from paper to a tablet recognises every block.
// lib/kids/unplugged/verify.ts checks that every picture block of every
// Level 1 challenge has a card here with the same label.
//
// Pure data, safe on the server and in the browser.

export type CardId =
  | 'forward'
  | 'back'
  | 'creep'
  | 'back-off'
  | 'left'
  | 'right'
  | 'wait'
  | 'beep'
  | 'say'
  | 'pen-down'
  | 'pen-up'
  | 'repeat'
  | 'repeat-lots'
  | 'scoop'
  | 'tip'
  | 'light-on'
  | 'light-off'
  | 'until-bump'
  | 'until-close'
  | 'until-clear'
  | 'if-bump'

export interface CommandCard {
  id: CardId
  /** Exactly the picture block's label. */
  label: string
  icon: string
  /** What the human robot does when this card is played. */
  does: string
  /** Holds other cards (lay them inside a loop of string or a drawn bracket). */
  container: boolean
  /** Card colour family, matching the on-screen palette groups. */
  group: 'move' | 'sound' | 'tool' | 'control' | 'sense'
}

export const CARDS: Record<CardId, CommandCard> = {
  forward: { id: 'forward', label: 'Hop forward', icon: '⬆️', does: 'Take one step forward into the next square.', container: false, group: 'move' },
  back: { id: 'back', label: 'Hop back', icon: '⬇️', does: 'Take one step backwards into the square behind you.', container: false, group: 'move' },
  creep: { id: 'creep', label: 'Creep forward', icon: '🐢', does: 'Slide one foot slowly forward, heel to toe. If your bumper hand touches something, stop.', container: false, group: 'move' },
  'back-off': { id: 'back-off', label: 'Back off a little', icon: '↩️', does: 'Lean back off whatever you touched (or take one small step back).', container: false, group: 'move' },
  left: { id: 'left', label: 'Turn left', icon: '↰', does: 'Turn a quarter turn to your own left, on the spot.', container: false, group: 'move' },
  right: { id: 'right', label: 'Turn right', icon: '↱', does: 'Turn a quarter turn to your own right, on the spot.', container: false, group: 'move' },
  wait: { id: 'wait', label: 'Wait', icon: '⏳', does: 'Freeze and count slowly to the number on the card.', container: false, group: 'control' },
  beep: { id: 'beep', label: 'Beep', icon: '🔔', does: 'Say “beep!” once.', container: false, group: 'sound' },
  say: { id: 'say', label: 'Say', icon: '💬', does: 'Say the words written on the card, clearly.', container: false, group: 'sound' },
  'pen-down': { id: 'pen-down', label: 'Pen down (draw)', icon: '🖊️', does: 'Start leaving a trail: your partner lays a paper strip on every square you step on.', container: false, group: 'tool' },
  'pen-up': { id: 'pen-up', label: 'Pen up (stop drawing)', icon: '✋', does: 'Stop leaving a trail.', container: false, group: 'tool' },
  repeat: { id: 'repeat', label: 'Repeat', icon: '🔁', does: 'Do the cards inside the loop, then do them again — as many times as the number says.', container: true, group: 'control' },
  'repeat-lots': { id: 'repeat-lots', label: 'Repeat lots of times', icon: '🔁', does: 'Keep doing the cards inside the loop until the teacher says “stop” or you reach the goal.', container: true, group: 'control' },
  scoop: { id: 'scoop', label: 'Scoop up', icon: '🥄', does: 'Pick up the object in your square and hold it.', container: false, group: 'tool' },
  tip: { id: 'tip', label: 'Tip out', icon: '📥', does: 'Put down what you are holding, in the square you are in.', container: false, group: 'tool' },
  'light-on': { id: 'light-on', label: 'Light on', icon: '💡', does: 'Switch your torch on (hold up the paper light).', container: false, group: 'tool' },
  'light-off': { id: 'light-off', label: 'Light off', icon: '🌑', does: 'Switch your torch off (put the paper light down).', container: false, group: 'tool' },
  'until-bump': { id: 'until-bump', label: 'Keep going until I feel a bump', icon: '🛡️', does: 'Creep forward square by square, bumper hand out, until your hand touches something. Then stop.', container: false, group: 'sense' },
  'until-close': { id: 'until-close', label: 'Keep going until something is close', icon: '👀', does: 'Step forward square by square, saying “squeak!”. Stop when the echo is quick: something is in the next square.', container: false, group: 'sense' },
  'until-clear': { id: 'until-clear', label: 'Wait until the path is clear', icon: '🚦', does: 'Look ahead. If someone is in the next square, wait. Go on when it is empty.', container: false, group: 'sense' },
  'if-bump': { id: 'if-bump', label: 'If I feel a bump…', icon: '❓', does: 'Only if your bumper hand is touching something, do the cards inside. Otherwise skip them.', container: true, group: 'control' },
}

export const CARD_ORDER: CardId[] = [
  'forward', 'back', 'creep', 'back-off', 'left', 'right', 'wait', 'beep', 'say', 'pen-down', 'pen-up',
  'repeat', 'repeat-lots', 'scoop', 'tip', 'light-on', 'light-off', 'until-bump', 'until-close', 'until-clear', 'if-bump',
]

/** Picture block label → card (for the verify script and for showing a session's palette on paper). */
export function cardForLabel(label: string): CommandCard | undefined {
  return CARD_ORDER.map((id) => CARDS[id]).find((c) => c.label === label)
}

/** Print colours per group (light paper friendly; dark text on all of them). */
export const GROUP_STYLE: Record<CommandCard['group'], { bg: string; border: string; name: string }> = {
  move: { bg: '#FFE7D6', border: '#FC6818', name: 'Move' },
  sound: { bg: '#E0F7FA', border: '#00B8D4', name: 'Sound' },
  tool: { bg: '#E8F5E9', border: '#22C55E', name: 'Tool' },
  control: { bg: '#FFF8E1', border: '#C28A00', name: 'Control' },
  sense: { bg: '#E3F2FD', border: '#1E88E5', name: 'Sense' },
}
