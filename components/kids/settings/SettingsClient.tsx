'use client'

// components/kids/settings/SettingsClient.tsx — the controls on /kids/settings.
// Reads and writes ONLY lib/kids/settings.ts (this device's localStorage).
// Access + calm settings: roadmap #25 / #89 (docs/kids-product-review.md).

import { useEffect, useId, useState, type ReactNode } from 'react'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'
import { readAloud, speakFeedback } from '@/lib/kids/read-aloud'
import { requireGrownUp } from '@/components/kids/app/ParentalGateClient'
import { ReadAloud } from './ReadAloudClient'
import {
  DEFAULT_KIDS_SETTINGS,
  KIDS_SCAN_SPEEDS,
  KIDS_TIME_SCALES,
  resetKidsSettings,
  suggestLite3D,
  updateKidsSettings,
  useKidsSettings,
  type KidsScanMode,
  type KidsSettings,
  type KidsTextSize,
  type KidsTimeScale,
} from '@/lib/kids/settings'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const card = 'rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5'
const smallBtn = `min-h-[48px] rounded-2xl border border-white/[0.16] bg-[#19263F] px-4 font-bold text-[#EEF2F8] hover:border-amber-400/60 ${focusRing} disabled:cursor-not-allowed disabled:opacity-60`

interface SwitchRowProps {
  icon: string
  title: string
  line: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  children?: ReactNode
}

function SwitchRow({ icon, title, line, checked, onChange, disabled, children }: SwitchRowProps) {
  const labelId = useId()
  const descId = useId()
  return (
    <div className={card}>
      <div className="flex items-center gap-4">
        <span aria-hidden className="text-3xl leading-none">{icon}</span>
        <div className="min-w-0 flex-1">
          <p id={labelId} className="font-display text-lg font-bold text-[#EEF2F8]">{title}</p>
          <p id={descId} className="text-[15px] leading-snug text-[#A7B0C0]">{line}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          aria-describedby={descId}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-12 w-[84px] shrink-0 items-center rounded-full border transition-colors duration-200 ${focusRing} disabled:cursor-not-allowed disabled:opacity-50 ${
            checked ? 'border-amber-400 bg-amber-500' : 'border-white/[0.16] bg-[#19263F]'
          }`}
        >
          {/* The knob carries a tick or a cross, so on/off never depends on colour alone. */}
          <span
            aria-hidden
            className={`absolute top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-base font-black shadow-md transition-[left] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
              checked ? 'left-[42px] bg-[#1A1103] text-amber-300' : 'left-[5px] bg-[#A7B0C0] text-[#0A1120]'
            }`}
          >
            {checked ? '✓' : '✕'}
          </span>
          <span className="sr-only">{checked ? 'On' : 'Off'}</span>
        </button>
      </div>
      {children}
    </div>
  )
}

interface Choice<T extends string | number> {
  value: T
  label: string
  /** Read aloud / screen readers. */
  long?: string
}

interface ChoiceRowProps<T extends string | number> {
  icon: string
  title: string
  line: string
  value: T
  choices: readonly Choice<T>[]
  onChange: (v: T) => void
  disabled?: boolean
  children?: ReactNode
}

/** A row of big radio buttons (role="radiogroup", arrow keys move between them). */
function ChoiceRow<T extends string | number>({ icon, title, line, value, choices, onChange, disabled, children }: ChoiceRowProps<T>) {
  const labelId = useId()
  const descId = useId()
  const move = (dir: 1 | -1, from: number) => {
    const next = choices[(from + dir + choices.length) % choices.length]
    onChange(next.value)
    // Keep focus on the newly chosen button (roving tabindex).
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLButtonElement>(`[data-choice="${labelId}-${String(next.value)}"]`)
      el?.focus()
    })
  }
  return (
    <div className={card}>
      <div className="flex items-start gap-4">
        <span aria-hidden className="text-3xl leading-none">{icon}</span>
        <div className="min-w-0 flex-1">
          <p id={labelId} className="font-display text-lg font-bold text-[#EEF2F8]">{title}</p>
          <p id={descId} className="text-[15px] leading-snug text-[#A7B0C0]">{line}</p>
        </div>
      </div>
      <div role="radiogroup" aria-labelledby={labelId} aria-describedby={descId} aria-disabled={disabled || undefined} className="mt-4 grid grid-cols-3 gap-2">
        {choices.map((c, i) => {
          const on = c.value === value
          return (
            <button
              key={String(c.value)}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.long}
              tabIndex={on ? 0 : -1}
              disabled={disabled}
              data-choice={`${labelId}-${String(c.value)}`}
              onClick={() => onChange(c.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1, i) }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1, i) }
              }}
              className={`min-h-[52px] rounded-2xl border px-2 font-display text-[16px] font-bold ${focusRing} disabled:cursor-not-allowed disabled:opacity-50 ${
                on ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/[0.16] bg-[#19263F] text-[#EEF2F8] hover:border-amber-400/60'
              }`}
            >
              {on && <span aria-hidden>✓ </span>}
              {c.label}
            </button>
          )
        })}
      </div>
      {children}
    </div>
  )
}

function Section({ id, title, line, children }: { id: string; title: string; line?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-1 font-display text-xl font-bold text-amber-300">{title}</h2>
      {line && <p className="mb-3 text-[15px] text-[#A7B0C0]">{line}</p>}
      <div className={`space-y-3 ${line ? '' : 'mt-3'}`}>{children}</div>
    </section>
  )
}

const TEXT_SIZES: readonly Choice<KidsTextSize>[] = [
  { value: 'normal', label: 'Normal', long: 'Normal text' },
  { value: 'large', label: 'Big', long: 'Big text' },
  { value: 'larger', label: 'Bigger', long: 'Bigger text' },
]
const TIME_LABEL: Record<KidsTimeScale, string> = { 1: 'Normal', 1.5: '1½ ×', 2: 'Double' }
const TIME_CHOICES: readonly Choice<KidsTimeScale>[] = KIDS_TIME_SCALES.map((v) => ({
  value: v,
  label: TIME_LABEL[v],
  long: v === 1 ? 'Normal time' : v === 2 ? 'Double time' : 'One and a half times as long',
}))
const SCAN_CHOICES: readonly Choice<KidsScanMode>[] = [
  { value: 'off', label: 'Off', long: 'Scanning off' },
  { value: 'step', label: 'Step', long: 'Step scanning: Space moves, Enter picks' },
  { value: 'auto', label: 'Auto', long: 'Auto scanning: one switch picks' },
]
const SPEED_LABEL = ['Quick', 'Medium', 'Slow']
const SPEED_CHOICES: readonly Choice<number>[] = KIDS_SCAN_SPEEDS.map((v, i) => ({ value: v, label: SPEED_LABEL[i] ?? `${v}s`, long: `${SPEED_LABEL[i] ?? ''}, ${v} seconds on each button` }))

interface Preset {
  id: string
  icon: string
  title: string
  line: string
  patch: Partial<KidsSettings>
  isOn: (s: KidsSettings) => boolean
}

const PRESETS: readonly Preset[] = [
  {
    id: 'calm',
    icon: '🌙',
    title: 'Calm and quiet',
    line: 'No confetti, no music, soft sounds, less motion.',
    patch: { calm: true, music: false, reduceMotion: true },
    isOn: (s) => s.calm && !s.music && s.reduceMotion,
  },
  {
    id: 'read',
    icon: '👂',
    title: 'Help me read',
    line: 'Everything read aloud, bigger, easier letters.',
    patch: { readAloud: true, voice: true, dyslexia: true, textSize: 'large' },
    isOn: (s) => s.readAloud && s.voice && s.dyslexia && s.textSize !== 'normal',
  },
  {
    id: 'see',
    icon: '👀',
    title: 'Easy to see',
    line: 'High contrast, big text, shapes as well as colours.',
    patch: { highContrast: true, colourSafe: true, textSize: 'large' },
    isOn: (s) => s.highContrast && s.colourSafe && s.textSize !== 'normal',
  },
]

/** The default values of some settings (for undoing a quick setup). */
function defaultsFor(keys: readonly (keyof KidsSettings)[]): Partial<KidsSettings> {
  const out: Partial<KidsSettings> = {}
  for (const k of keys) Object.assign(out, { [k]: DEFAULT_KIDS_SETTINGS[k] })
  return out
}

export default function SettingsClient() {
  const s = useKidsSettings()
  const [hydrated, setHydrated] = useState(false)
  const [suggestLite, setSuggestLite] = useState(false)
  const [saved, setSaved] = useState('')
  const [tryPick, setTryPick] = useState<'motor' | 'sensor' | null>(null)
  const volumeId = useId()

  useEffect(() => {
    setHydrated(true)
    setSuggestLite(suggestLite3D())
  }, [])

  const set = (patch: Partial<KidsSettings>, message: string) => {
    updateKidsSettings(patch)
    setSaved(message)
  }
  const onOff = (v: boolean) => (v ? 'on' : 'off')

  const volumePct = Math.round(s.volume * 100)
  const readNeedsVoice = s.readAloud && !s.voice

  return (
    <div className="mt-8 space-y-8" aria-busy={!hydrated}>
      <p className="sr-only" role="status" aria-live="polite">{saved}</p>

      {/* Quick setups: one tap for the three most common needs; each switch below can still be changed. */}
      <section aria-labelledby="kids-set-quick">
        <h2 id="kids-set-quick" className="mb-1 font-display text-xl font-bold text-amber-300">Quick setups</h2>
        <p className="mb-3 text-[15px] text-[#A7B0C0]">One tap turns on a few helpful switches together. Tap again to turn them off.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PRESETS.map((p) => {
            const on = hydrated && p.isOn(s)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (on) {
                    // Back to the defaults for exactly the switches this setup turned on (voice stays as it is).
                    const keys = (Object.keys(p.patch) as (keyof KidsSettings)[]).filter((k) => k !== 'voice')
                    set(defaultsFor(keys), `${p.title} off`)
                  } else {
                    set(p.patch, `${p.title} on`)
                    if (p.patch.readAloud) readAloud('Read everything to me is on. Tap any words to hear them.')
                  }
                }}
                className={`flex min-h-[96px] flex-col items-start gap-1 rounded-[20px] border p-4 text-left ${focusRing} ${
                  on ? 'border-amber-400 bg-amber-500/15' : 'border-white/[0.12] bg-[#111C32] hover:border-amber-400/60'
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-display text-[17px] font-bold text-[#EEF2F8]"><span aria-hidden>{p.icon} </span>{p.title}</span>
                  <span aria-hidden className={`grid h-7 w-7 place-items-center rounded-full text-sm font-black ${on ? 'bg-amber-500 text-[#1A1103]' : 'border border-white/[0.2] text-[#A7B0C0]'}`}>{on ? '✓' : '+'}</span>
                </span>
                <span className="text-[14px] leading-snug text-[#A7B0C0]">{p.line}</span>
              </button>
            )
          })}
        </div>
      </section>

      <Section id="kids-set-sound" title="Hearing" line="Sound effects, music and voices each have their own switch.">
        <SwitchRow
          icon="🔔"
          title="Sound effects"
          line="Beeps and chimes when you tap, win a star or level up."
          checked={s.sound}
          onChange={(v) => {
            set({ sound: v }, `Sound effects ${onOff(v)}`)
            if (v) {
              primeAudio()
              playSound('click')
            }
          }}
        >
          <div className={`mt-4 flex flex-wrap items-center gap-3 ${s.sound ? '' : 'opacity-50'}`}>
            <label htmlFor={volumeId} className="text-[15px] font-semibold text-[#EEF2F8]">Volume</label>
            <input
              id={volumeId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={volumePct}
              disabled={!s.sound}
              aria-valuetext={`${volumePct} percent`}
              onChange={(e) => updateKidsSettings({ volume: Number(e.target.value) / 100 })}
              onPointerUp={() => playSound('click')}
              onKeyUp={() => playSound('click')}
              className="h-12 min-w-[160px] flex-1 cursor-pointer accent-amber-500 disabled:cursor-not-allowed"
            />
            <span className="w-12 text-right font-display font-bold tabular-nums text-[#EEF2F8]" aria-hidden>{volumePct}%</span>
            <button
              type="button"
              disabled={!s.sound}
              onClick={() => {
                primeAudio()
                playSound('star')
              }}
              className={smallBtn}
            >
              Test sound
            </button>
          </div>
        </SwitchRow>

        <SwitchRow
          icon="🎵"
          title="Music"
          line="Background music in Story Theatre episodes. Sound effects and voices are separate."
          checked={s.music}
          onChange={(v) => set({ music: v }, `Music ${onOff(v)}`)}
        />

        <SwitchRow
          icon="🗣️"
          title="Spark talks"
          line="Spark reads instructions and cheers out loud. The speaker button at the top does the same."
          checked={s.voice}
          onChange={(v) => {
            set({ voice: v }, `Voices ${onOff(v)}`)
            if (v) sparkSays('Hi! I am Spark. I will talk to you now.')
          }}
        >
          {s.voice && (
            <div className="mt-4">
              <button type="button" onClick={() => sparkSays('Hi! I am Spark, your robot friend.')} className={smallBtn}>
                Hear Spark
              </button>
            </div>
          )}
        </SwitchRow>

        <SwitchRow
          icon="👂"
          title="Read everything to me"
          line="Tap any words to hear them. Tap a button and it says its name. Hold a button to hear it without pressing it. Answers and hints are read out too."
          checked={s.readAloud && s.voice}
          onChange={(v) => {
            set(v ? { readAloud: true, voice: true } : { readAloud: false }, `Read everything to me ${onOff(v)}`)
            if (v) readAloud('Read everything to me is on. Tap any words to hear them.')
          }}
        >
          {readNeedsVoice && (
            <p className="mt-3 text-[15px] text-amber-300" data-cue="warn">Voices are off, so nothing is read. Switch “Spark talks” on to hear it.</p>
          )}
        </SwitchRow>
      </Section>

      <Section id="kids-set-see" title="Reading and seeing">
        <ChoiceRow
          icon="🔠"
          title="Text size"
          line="Makes the words in lessons and games bigger."
          value={s.textSize}
          choices={TEXT_SIZES}
          onChange={(v) => set({ textSize: v }, `Text size ${TEXT_SIZES.find((c) => c.value === v)?.label ?? ''}`)}
        />
        <SwitchRow
          icon="🌓"
          title="High contrast"
          line="Brighter words, clearer edges and a thick ring around the button you are on."
          checked={s.highContrast}
          onChange={(v) => set({ highContrast: v }, `High contrast ${onOff(v)}`)}
        />
        <SwitchRow
          icon="📖"
          title="Easier reading letters"
          line="Dyslexia-friendly: plain, clear letters with more space between letters, words and lines."
          checked={s.dyslexia}
          onChange={(v) => set({ dyslexia: v }, `Easier reading letters ${onOff(v)}`)}
        />
        <SwitchRow
          icon="🔷"
          title="Shapes as well as colours"
          line="Colour-blind safe: right answers get a tick, wrong ones a cross and a dashed edge, and chosen buttons a double ring."
          checked={s.colourSafe}
          onChange={(v) => set({ colourSafe: v }, `Shapes as well as colours ${onOff(v)}`)}
        />
      </Section>

      <Section id="kids-set-move" title="Moving and calm">
        <SwitchRow
          icon="🐢"
          title="Less motion"
          line="Turns off bouncing, sliding and spinning. Your device’s own “reduce motion” setting is always respected too."
          checked={s.reduceMotion}
          onChange={(v) => set({ reduceMotion: v }, `Less motion ${onOff(v)}`)}
        />
        <SwitchRow
          icon="🌙"
          title="Calm mode"
          line="No confetti, no fanfares: wins get one soft chime and a quiet well done."
          checked={s.calm}
          onChange={(v) => {
            set({ calm: v }, `Calm mode ${onOff(v)}`)
            if (v) {
              primeAudio()
              playSound('levelup')
            }
          }}
        />
        <SwitchRow
          icon="🪶"
          title="Lite graphics"
          line="Simpler 3D (no shadows, fewer pixels) so robots run smoothly on older phones and tablets. Works the next time a 3D view opens."
          checked={s.lite3d === true}
          onChange={(v) => set({ lite3d: v }, `Lite graphics ${onOff(v)}`)}
        >
          {hydrated && suggestLite && s.lite3d === null && (
            <p className="mt-3 rounded-2xl border border-[#00B8D4]/40 bg-[#00B8D4]/10 px-3 py-2 text-[15px] text-[#EEF2F8]">
              <span aria-hidden>💡 </span>This device looks like it might be happier with Lite graphics. Try switching it on if 3D feels slow.
            </p>
          )}
        </SwitchRow>
      </Section>

      <Section id="kids-set-time" title="Time" line="Nobody races anybody here. Take the time you need.">
        <ChoiceRow
          icon="⏳"
          title="More time"
          line="Games with a clock give you longer."
          value={s.timeScale}
          choices={TIME_CHOICES}
          disabled={s.untimed}
          onChange={(v) => set({ timeScale: v }, `More time: ${TIME_CHOICES.find((c) => c.value === v)?.long ?? ''}`)}
        />
        <SwitchRow
          icon="♾️"
          title="No clock"
          line="Untimed play: games that can run without a clock do, and nothing runs out."
          checked={s.untimed}
          onChange={(v) => set({ untimed: v }, `No clock ${onOff(v)}`)}
        />
      </Section>

      <Section id="kids-set-controls" title="Keyboard and switch" line="For children who use a keyboard, one or two switches, or a switch interface.">
        <ChoiceRow
          icon="🎛️"
          title="Scanning"
          line="Step: Space moves to the next button, Enter picks it. Auto: the ring moves by itself, and Space or Enter (one switch) picks."
          value={s.scanMode}
          choices={SCAN_CHOICES}
          onChange={(v) => set({ scanMode: v }, `Scanning ${SCAN_CHOICES.find((c) => c.value === v)?.long ?? ''}`)}
        >
          {s.scanMode === 'auto' && (
            <div className="mt-4">
              <ChoiceRowInline label="Speed" value={s.scanSpeed} choices={SPEED_CHOICES} onChange={(v) => set({ scanSpeed: v }, `Scan speed ${SPEED_CHOICES.find((c) => c.value === v)?.long ?? ''}`)} />
            </div>
          )}
          <p className="mt-3 text-[14px] leading-snug text-[#A7B0C0]">
            Tab and Shift+Tab always work too. The control you are on wears a big orange-and-white ring. Inside a pop-up, scanning stays inside it.
          </p>
        </ChoiceRow>
      </Section>

      {/* Try it: a small live sample so a child (or a grown-up setting this up) can see and hear each setting work. */}
      <section aria-labelledby="kids-set-try" className={card}>
        <h2 id="kids-set-try" className="font-display text-xl font-bold text-amber-300">Try it here</h2>
        <ReadAloud className="mt-3" text="Which part makes a robot’s wheel turn?">
          <p className="text-[17px] font-semibold text-[#EEF2F8]">Which part makes a robot’s wheel turn?</p>
        </ReadAloud>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([
            { id: 'motor', label: 'Motor', icon: '⚙️' },
            { id: 'sensor', label: 'Sensor', icon: '👁️' },
          ] as const).map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={tryPick === o.id}
              onClick={() => {
                setTryPick(o.id)
                if (s.sound) playSound(o.id === 'motor' ? 'correct' : 'wrong')
              }}
              className={`min-h-[56px] rounded-2xl border-2 px-3 font-display text-[17px] font-bold text-[#EEF2F8] ${focusRing} ${
                tryPick === o.id ? (o.id === 'motor' ? 'border-[#22C55E] bg-[#22C55E]/15' : 'border-[#F87171] bg-[#F87171]/10') : 'border-white/[0.16] bg-[#19263F] hover:border-amber-400/60'
              }`}
            >
              <span aria-hidden>{o.icon} </span>{o.label}
            </button>
          ))}
        </div>
        <p
          role="status"
          aria-live="polite"
          data-cue={tryPick === 'motor' ? 'ok' : tryPick === 'sensor' ? 'no' : undefined}
          className={`mt-3 min-h-[48px] rounded-2xl border-2 px-3 py-2 text-[16px] ${
            tryPick === 'motor' ? 'border-[#22C55E] text-[#86EFAC]' : tryPick === 'sensor' ? 'border-[#F87171] text-[#FCA5A5]' : 'border-transparent text-[#A7B0C0]'
          }`}
        >
          {tryPick === 'motor'
            ? 'Yes! The motor turns the wheel.'
            : tryPick === 'sensor'
              ? 'Not quite. A sensor helps the robot notice things. Try the other one.'
              : 'Pick an answer.'}
        </p>
        <button type="button" className={`${smallBtn} mt-3`} onClick={() => speakFeedback('This is how a hint sounds when Read everything to me is on.')}>
          Hear a hint
        </button>
      </section>

      <section aria-labelledby="kids-set-grownups" className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4 sm:p-5">
        <h2 id="kids-set-grownups" className="font-display text-lg font-bold text-[#EEF2F8]">For grown-ups</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#A7B0C0]">
          These settings are saved on this device only, in the browser. Nothing here is sent to R2BOT or anyone
          else, and no account or personal details are needed. On another phone, tablet or browser they start
          from the defaults again, and clearing this browser’s site data resets them. Read-aloud uses the
          device’s own built-in voice; scanning works with any switch interface that sends Space or Enter.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!(await requireGrownUp({ message: 'This resets the settings.' }))) return
            resetKidsSettings()
            setSaved('Settings reset to the defaults')
          }}
          className={`${smallBtn} mt-4`}
        >
          Reset to defaults
        </button>
      </section>
    </div>
  )
}

/** A compact radio row used inside another card (scan speed). */
function ChoiceRowInline<T extends string | number>({ label, value, choices, onChange }: { label: string; value: T; choices: readonly Choice<T>[]; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <div>
      <p id={id} className="mb-2 text-[15px] font-semibold text-[#EEF2F8]">{label}</p>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-3 gap-2">
        {choices.map((c) => {
          const on = c.value === value
          return (
            <button
              key={String(c.value)}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.long}
              onClick={() => onChange(c.value)}
              className={`min-h-[48px] rounded-2xl border px-2 font-bold ${focusRing} ${on ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/[0.16] bg-[#19263F] text-[#EEF2F8] hover:border-amber-400/60'}`}
            >
              {on && <span aria-hidden>✓ </span>}
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
