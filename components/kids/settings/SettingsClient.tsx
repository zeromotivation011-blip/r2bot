'use client'

// components/kids/settings/SettingsClient.tsx — the controls on /kids/settings.
// Reads and writes ONLY lib/kids/settings.ts (this device's localStorage).

import { useEffect, useId, useState } from 'react'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'
import { resetKidsSettings, suggestLite3D, updateKidsSettings, useKidsSettings, type KidsSettings } from '@/lib/kids/settings'

interface SwitchRowProps {
  icon: string
  title: string
  line: string
  checked: boolean
  onChange: (next: boolean) => void
  children?: React.ReactNode
}

function SwitchRow({ icon, title, line, checked, onChange, children }: SwitchRowProps) {
  const labelId = useId()
  const descId = useId()
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5">
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
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-12 w-[84px] shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
            checked ? 'border-amber-400 bg-amber-500' : 'border-white/[0.16] bg-[#19263F]'
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full shadow-md transition-[left] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
              checked ? 'left-[42px] bg-[#1A1103]' : 'left-[5px] bg-[#A7B0C0]'
            }`}
          />
          <span className="sr-only">{checked ? 'On' : 'Off'}</span>
        </button>
      </div>
      {children}
    </div>
  )
}

export default function SettingsClient() {
  const s = useKidsSettings()
  const [hydrated, setHydrated] = useState(false)
  const [suggestLite, setSuggestLite] = useState(false)
  const [saved, setSaved] = useState('')
  const volumeId = useId()

  useEffect(() => {
    setHydrated(true)
    setSuggestLite(suggestLite3D())
  }, [])

  const set = (patch: Partial<KidsSettings>, message: string) => {
    updateKidsSettings(patch)
    setSaved(message)
  }

  const volumePct = Math.round(s.volume * 100)

  return (
    <div className="mt-8 space-y-6" aria-busy={!hydrated}>
      <p className="sr-only" role="status" aria-live="polite">{saved}</p>

      <section aria-labelledby="kids-set-sound">
        <h2 id="kids-set-sound" className="mb-3 font-display text-xl font-bold text-amber-300">Sound</h2>
        <div className="space-y-3">
          <SwitchRow
            icon="🔔"
            title="Sound effects"
            line="Beeps and fanfares when you tap, win a star or level up."
            checked={s.sound}
            onChange={(v) => {
              set({ sound: v }, v ? 'Sound effects on' : 'Sound effects off')
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
                className="min-h-[48px] rounded-2xl border border-white/[0.16] bg-[#19263F] px-4 font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Test sound
              </button>
            </div>
          </SwitchRow>

          <SwitchRow
            icon="🗣️"
            title="Spark talks"
            line="Spark reads instructions and cheers out loud. The speaker button at the top does the same."
            checked={s.voice}
            onChange={(v) => {
              set({ voice: v }, v ? 'Spark’s voice on' : 'Spark’s voice off')
              if (v) sparkSays('Hi! I am Spark. I will talk to you now.')
            }}
          >
            {s.voice && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => sparkSays('Hi! I am Spark, your robot friend.')}
                  className="min-h-[48px] rounded-2xl border border-white/[0.16] bg-[#19263F] px-4 font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  Hear Spark
                </button>
              </div>
            )}
          </SwitchRow>
        </div>
      </section>

      <section aria-labelledby="kids-set-see">
        <h2 id="kids-set-see" className="mb-3 font-display text-xl font-bold text-amber-300">Seeing and moving</h2>
        <div className="space-y-3">
          <SwitchRow
            icon="🔠"
            title="Bigger text"
            line="Makes the words in lessons and games bigger and easier to read."
            checked={s.largeText}
            onChange={(v) => set({ largeText: v }, v ? 'Bigger text on' : 'Bigger text off')}
          />
          <SwitchRow
            icon="🐢"
            title="Less motion"
            line="Turns off bouncing, sliding and spinning. Your device’s own “reduce motion” setting is always respected too."
            checked={s.reduceMotion}
            onChange={(v) => set({ reduceMotion: v }, v ? 'Less motion on' : 'Less motion off')}
          />
          <SwitchRow
            icon="🪶"
            title="Lite graphics"
            line="Simpler 3D (no shadows, fewer pixels) so robots run smoothly on older phones and tablets. Works the next time a 3D view opens."
            checked={s.lite3d === true}
            onChange={(v) => set({ lite3d: v }, v ? 'Lite graphics on' : 'Lite graphics off')}
          >
            {hydrated && suggestLite && s.lite3d === null && (
              <p className="mt-3 rounded-2xl border border-[#00B8D4]/40 bg-[#00B8D4]/10 px-3 py-2 text-[15px] text-[#EEF2F8]">
                <span aria-hidden>💡 </span>This device looks like it might be happier with Lite graphics. Try switching it on if 3D feels slow.
              </p>
            )}
          </SwitchRow>
        </div>
      </section>

      <section aria-labelledby="kids-set-grownups" className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4 sm:p-5">
        <h2 id="kids-set-grownups" className="font-display text-lg font-bold text-[#EEF2F8]">For grown-ups</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#A7B0C0]">
          These settings are saved on this device only, in the browser. Nothing here is sent to R2BOT or anyone
          else, and no account or personal details are needed. On another phone, tablet or browser they start
          from the defaults again, and clearing this browser’s site data resets them.
        </p>
        <button
          type="button"
          onClick={() => {
            resetKidsSettings()
            setSaved('Settings reset to the defaults')
          }}
          className="mt-4 min-h-[48px] rounded-2xl border border-white/[0.16] bg-[#19263F] px-4 font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Reset to defaults
        </button>
      </section>
    </div>
  )
}
