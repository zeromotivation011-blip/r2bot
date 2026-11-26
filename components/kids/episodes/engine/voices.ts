// components/kids/episodes/engine/voices.ts
// Plays the pre-generated voice clips. One <audio> element for everything:
// once a tap has unlocked it (iOS needs that), it can switch clips freely.
// Clips are fetched up front as blobs so a cut never waits on the network.
// HTMLAudioElement keeps the pitch when the episode is slowed or sped up.

export class Voices {
  readonly el: HTMLAudioElement
  private urls = new Map<string, string>()
  private ext: 'ogg' | 'm4a'
  private currentFile: string | null = null
  private rate = 1
  private disposed = false
  private wantMuted = false

  constructor() {
    this.el = new Audio()
    this.el.preload = 'auto'
    const probe = this.el.canPlayType('audio/ogg; codecs="opus"')
    this.ext = probe === 'probably' || probe === 'maybe' ? 'ogg' : 'm4a'
  }

  private src(file: string): string {
    return this.ext === 'ogg' ? file : file.replace(/\.ogg$/, '.m4a')
  }

  /** Fetch every clip (in parallel, a few at a time). Resolves even if some fail. */
  async preload(files: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
    let done = 0
    const queue = [...new Set(files)]
    const worker = async () => {
      while (queue.length && !this.disposed) {
        const f = queue.shift()
        if (!f) break
        try {
          const res = await fetch(this.src(f))
          if (res.ok) this.urls.set(f, URL.createObjectURL(await res.blob()))
        } catch {
          // A missing clip only silences that line; captions carry on.
        }
        done++
        onProgress?.(done, files.length)
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])
  }

  /** Call inside the Play tap so later clips may start without a gesture. */
  unlock(firstFile?: string): void {
    if (firstFile && !this.el.src) {
      this.el.src = this.urls.get(firstFile) ?? this.src(firstFile)
      this.currentFile = null
    }
    this.el.muted = true
    void this.el.play().then(
      () => {
        this.el.pause()
        this.el.muted = this.wantMuted
      },
      () => {
        this.el.muted = this.wantMuted
      },
    )
  }

  play(file: string, offset: number): void {
    if (this.disposed) return
    const url = this.urls.get(file) ?? this.src(file)
    if (this.currentFile !== file) {
      this.currentFile = file
      this.el.src = url
    }
    const seek = () => {
      try {
        if (offset > 0.05) this.el.currentTime = offset
        else if (this.el.currentTime > 0.05) this.el.currentTime = 0
      } catch {
        // Not seekable yet; starts from 0.
      }
    }
    if (this.el.readyState >= 1) seek()
    else this.el.addEventListener('loadedmetadata', seek, { once: true })
    this.el.playbackRate = this.rate
    void this.el.play().catch(() => undefined)
  }

  stop(): void {
    this.el.pause()
    this.currentFile = null
  }

  pause(): void {
    this.el.pause()
  }

  resume(): void {
    if (this.currentFile && this.el.currentTime < (this.el.duration || 0) - 0.05) void this.el.play().catch(() => undefined)
  }

  setRate(r: number): void {
    this.rate = r
    this.el.playbackRate = r
  }

  setMuted(m: boolean): void {
    this.wantMuted = m
    this.el.muted = m
  }

  dispose(): void {
    this.disposed = true
    this.el.pause()
    this.el.removeAttribute('src')
    this.el.load()
    for (const u of this.urls.values()) URL.revokeObjectURL(u)
    this.urls.clear()
  }
}
