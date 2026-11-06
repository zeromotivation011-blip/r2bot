'use client'
import { useState } from 'react'
import { btn, note, panel, title, ORANGE } from './ui'

const REQS = [
  { q: 'Bring me the red mug', steps: ['Find the red mug (vision)', 'Plan a path to it (planner)', 'Grasp with limited force (arm control)', 'Bring it to the person, slowly near them'], risky: 3 },
  { q: 'Tidy the desk', steps: ['Look at the desk and list objects (vision)', 'Decide where each object goes', 'Pick up each object one by one', 'Move fast to finish sooner'], risky: 3 },
  { q: 'Water the plants', steps: ['Find the plants (vision)', 'Fill the can at the tap', 'Pour a small amount on each plant', 'Pour on the big plant near the laptop until it is wet'], risky: 3 },
]
export default function LlmDemo() {
  const [i, setI] = useState(0)
  const [safe, setSafe] = useState(true)
  const r = REQS[i]
  return (
    <div style={panel}>
      <div style={title}>Try it live: a language model as the planner</div>
      <p style={note}>You type a plain request. The language model turns it into steps. The last step in each plan is a mistake a language model can make. See what catches it.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        {REQS.map((x, n) => <button key={x.q} style={btn(n === i)} onClick={() => setI(n)}>“{x.q}”</button>)}
      </div>
      <ol style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: 22, margin: '6px 0' }}>
        {r.steps.map((s, n) => {
          const bad = n === r.risky
          return <li key={n} style={{ color: bad ? (safe ? '#4ade80' : '#f87171') : '#e2e8f0' }}>
            {s}{bad && (safe ? '  → BLOCKED by the safety layer (speed and force limits)' : '  → runs unchecked')}
          </li>
        })}
      </ol>
      <button style={btn(safe)} onClick={() => setSafe(!safe)}>Safety layer: {safe ? 'ON' : 'OFF'}</button>
      <p style={{ ...note, color: '#e2e8f0' }}>{safe ? <>The plan can be wrong, but fixed limits outside the language model stop the bad step. <b style={{ color: ORANGE }}>Smart planner + simple safety rules.</b></> : <>With no safety layer, one wrong word in the plan becomes a real action. That is why real robots never let the language model drive the motors directly.</>}</p>
    </div>
  )
}
