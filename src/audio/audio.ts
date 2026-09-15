/**
 * All sound in CyberHack 5250 is synthesised at runtime with the Web Audio API —
 * no sampled recordings, so nothing here is licensed from anyone.
 */

type Mood = 'night' | 'reveal'

const BPM = 84
const BEAT = 60 / BPM
const BAR = BEAT * 4

/** A minor progression: Am – F – C – G, voiced warm and low. */
const PROGRESSION: number[][] = [
  [57, 60, 64, 67], // Am7-ish
  [53, 57, 60, 65], // Fmaj
  [48, 55, 60, 64], // C
  [55, 59, 62, 67], // G
]
const BASS_NOTES = [33, 29, 36, 31]
const ARP_SCALE = [69, 72, 76, 79, 81, 84]

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

function noiseBuffer(ctx: AudioContext, seconds: number, brown = false): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else {
      d[i] = w
    }
  }
  return buf
}

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private ambienceBus!: GainNode
  private delay!: DelayNode
  private delayGain!: GainNode
  private noise!: AudioBuffer
  private brown!: AudioBuffer
  private timer: number | null = null
  private nextNoteTime = 0
  private step = 0
  private mood: Mood = 'night'
  private started = false
  private ambienceNodes: AudioNode[] = []
  private musicVol = 0.6
  private sfxVol = 0.8
  private muted = false

  get ready(): boolean {
    return this.ctx !== null
  }

  /** Must be called from a user gesture. */
  async start(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return
    }
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(ctx.destination)

    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = this.musicVol
    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = this.sfxVol
    this.ambienceBus = ctx.createGain()
    this.ambienceBus.gain.value = this.sfxVol * 0.5

    const glue = ctx.createDynamicsCompressor()
    glue.threshold.value = -16
    glue.knee.value = 24
    glue.ratio.value = 3
    glue.attack.value = 0.008
    glue.release.value = 0.25
    glue.connect(this.master)
    this.musicBus.connect(glue)
    this.sfxBus.connect(glue)
    this.ambienceBus.connect(glue)

    this.delay = ctx.createDelay(1.2)
    this.delay.delayTime.value = BEAT * 0.75
    this.delayGain = ctx.createGain()
    this.delayGain.gain.value = 0.3
    const damp = ctx.createBiquadFilter()
    damp.type = 'lowpass'
    damp.frequency.value = 2200
    this.delay.connect(damp)
    damp.connect(this.delayGain)
    this.delayGain.connect(this.delay)
    this.delayGain.connect(this.musicBus)

    this.noise = noiseBuffer(ctx, 1)
    this.brown = noiseBuffer(ctx, 4, true)

    if (ctx.state === 'suspended') await ctx.resume()
    this.startAmbience()
    this.startMusic()
    this.started = true
  }

  setMusicVolume(v: number): void {
    this.musicVol = v
    if (this.ctx) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
  }

  setSfxVolume(v: number): void {
    this.sfxVol = v
    if (this.ctx) {
      this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
      this.ambienceBus.gain.setTargetAtTime(v * 0.5, this.ctx.currentTime, 0.1)
    }
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05)
  }

  setMood(mood: Mood): void {
    this.mood = mood
  }

  suspend(): void {
    void this.ctx?.suspend()
  }

  resume(): void {
    void this.ctx?.resume()
  }

  dispose(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.ambienceNodes.forEach((n) => {
      if ('stop' in n && typeof (n as AudioScheduledSourceNode).stop === 'function') {
        try {
          ;(n as AudioScheduledSourceNode).stop()
        } catch {
          /* already stopped */
        }
      }
      n.disconnect()
    })
    this.ambienceNodes = []
    void this.ctx?.close()
    this.ctx = null
    this.started = false
  }

  // ---------------------------------------------------------------- ambience

  private startAmbience(): void {
    const ctx = this.ctx
    if (!ctx) return
    // distant city: brown noise, gently swept
    const src = ctx.createBufferSource()
    src.buffer = this.brown
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 60
    const g = ctx.createGain()
    g.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 160
    lfo.connect(lfoGain)
    lfoGain.connect(lp.frequency)
    src.connect(hp)
    hp.connect(lp)
    lp.connect(g)
    g.connect(this.ambienceBus)
    src.start()
    lfo.start()

    // room tone: a hair of hiss so the apartment is never digitally silent
    const room = ctx.createBufferSource()
    room.buffer = this.noise
    room.loop = true
    const rlp = ctx.createBiquadFilter()
    rlp.type = 'lowpass'
    rlp.frequency.value = 900
    const rg = ctx.createGain()
    rg.gain.value = 0.012
    room.connect(rlp)
    rlp.connect(rg)
    rg.connect(this.ambienceBus)
    room.start()

    this.ambienceNodes.push(src, lfo, room, g, rg, lp, hp, rlp, lfoGain)
  }

  // ------------------------------------------------------------------ music

  private startMusic(): void {
    const ctx = this.ctx
    if (!ctx || this.timer !== null) return
    this.nextNoteTime = ctx.currentTime + 0.1
    this.step = 0
    this.timer = window.setInterval(() => this.schedule(), 25)
  }

  private schedule(): void {
    const ctx = this.ctx
    if (!ctx) return
    const lookahead = 0.25
    while (this.nextNoteTime < ctx.currentTime + lookahead) {
      this.scheduleStep(this.step, this.nextNoteTime)
      this.step = (this.step + 1) % 64
      // 16th notes with a light swing
      const swing = this.step % 2 === 1 ? 0.06 : -0.06
      this.nextNoteTime += (BEAT / 4) * (1 + swing)
    }
  }

  private scheduleStep(step: number, t: number): void {
    const bar = Math.floor(step / 16) % 4
    const inBar = step % 16
    const chord = PROGRESSION[bar]
    const bright = this.mood === 'reveal'

    if (inBar === 0) {
      this.pad(chord, t, BAR * 1.02, bright)
      this.bass(BASS_NOTES[bar], t, BEAT * 1.4)
    }
    if (inBar === 6) this.bass(BASS_NOTES[bar] + 12, t, BEAT * 0.5)
    if (inBar === 10) this.bass(BASS_NOTES[bar], t, BEAT * 0.8)

    if (inBar === 0 || inBar === 10) this.kick(t)
    if (inBar === 8) this.clap(t)
    if (inBar % 2 === 0) this.hat(t, inBar % 4 === 0 ? 0.05 : 0.028)

    if (inBar % 4 === 2 || (bright && inBar % 2 === 1)) {
      const note = ARP_SCALE[(step * 3 + bar) % ARP_SCALE.length] + (bright ? 12 : 0)
      this.pluck(note, t, bright ? 0.1 : 0.07)
    }
  }

  private pad(chord: number[], t: number, dur: number, bright: boolean): void {
    const ctx = this.ctx
    if (!ctx) return
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(bright ? 0.1 : 0.072, t + 0.6)
    g.gain.setTargetAtTime(0, t + dur * 0.55, 0.5)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(bright ? 900 : 520, t)
    f.frequency.linearRampToValueAtTime(bright ? 2600 : 1500, t + dur * 0.6)
    f.Q.value = 3
    g.connect(f)
    f.connect(this.musicBus)
    const send = ctx.createGain()
    send.gain.value = 0.18
    f.connect(send)
    send.connect(this.delay)
    chord.forEach((n, i) => {
      ;[-6, 6].forEach((detune) => {
        const o = ctx.createOscillator()
        o.type = i === 0 ? 'triangle' : 'sawtooth'
        o.frequency.value = mtof(n)
        o.detune.value = detune
        const og = ctx.createGain()
        og.gain.value = i === 0 ? 0.5 : 0.28
        o.connect(og)
        og.connect(g)
        o.start(t)
        o.stop(t + dur + 0.8)
      })
    })
  }

  private bass(note: number, t: number, dur: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = mtof(note)
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = mtof(note - 12)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(180, t)
    f.frequency.linearRampToValueAtTime(680, t + 0.05)
    f.frequency.setTargetAtTime(150, t + 0.09, 0.2)
    f.Q.value = 6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.28, t + 0.012)
    g.gain.setTargetAtTime(0, t + dur * 0.5, 0.12)
    o.connect(f)
    const sg = ctx.createGain()
    sg.gain.value = 0.5
    sub.connect(sg)
    sg.connect(g)
    f.connect(g)
    g.connect(this.musicBus)
    o.start(t)
    sub.start(t)
    o.stop(t + dur + 0.3)
    sub.stop(t + dur + 0.3)
  }

  private pluck(note: number, t: number, level: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = mtof(note)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(level, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.5)
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = mtof(note) * 1.6
    f.Q.value = 1.6
    o.connect(f)
    f.connect(g)
    g.connect(this.musicBus)
    const send = ctx.createGain()
    send.gain.value = 0.5
    g.connect(send)
    send.connect(this.delay)
    o.start(t)
    o.stop(t + 0.6)
  }

  private kick(t: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(120, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26)
    o.connect(g)
    g.connect(this.musicBus)
    o.start(t)
    o.stop(t + 0.3)
  }

  private clap(t: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 1700
    f.Q.value = 1.1
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.2, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    s.connect(f)
    f.connect(g)
    g.connect(this.musicBus)
    const send = ctx.createGain()
    send.gain.value = 0.25
    g.connect(send)
    send.connect(this.delay)
    s.start(t)
    s.stop(t + 0.2)
  }

  private hat(t: number, level: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 7200
    const g = ctx.createGain()
    g.gain.setValueAtTime(level, t)
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.055)
    s.connect(f)
    f.connect(g)
    g.connect(this.musicBus)
    s.start(t)
    s.stop(t + 0.08)
  }

  // -------------------------------------------------------------------- sfx

  private env(node: AudioNode, level: number, attack: number, decay: number, t?: number): GainNode {
    const ctx = this.ctx!
    const now = t ?? ctx.currentTime
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(level, now + attack)
    g.gain.exponentialRampToValueAtTime(0.0005, now + attack + decay)
    node.connect(g)
    g.connect(this.sfxBus)
    return g
  }

  footstep(running: boolean): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    s.playbackRate.value = 0.7 + Math.random() * 0.5
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = (running ? 420 : 280) + Math.random() * 120
    f.Q.value = 1.4
    s.connect(f)
    this.env(f, running ? 0.14 : 0.08, 0.004, running ? 0.1 : 0.14, t)
    s.start(t)
    s.stop(t + 0.2)
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(90, t)
    thump.frequency.exponentialRampToValueAtTime(48, t + 0.08)
    this.env(thump, running ? 0.09 : 0.05, 0.003, 0.09, t)
    thump.start(t)
    thump.stop(t + 0.14)
  }

  keypress(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    s.playbackRate.value = 1.4 + Math.random() * 0.8
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 1900 + Math.random() * 900
    f.Q.value = 3
    s.connect(f)
    this.env(f, 0.07, 0.001, 0.035, t)
    s.start(t)
    s.stop(t + 0.06)
    const click = ctx.createOscillator()
    click.type = 'square'
    click.frequency.value = 160 + Math.random() * 60
    this.env(click, 0.025, 0.001, 0.03, t)
    click.start(t)
    click.stop(t + 0.05)
  }

  uiTick(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(880, t)
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.05)
    this.env(o, 0.06, 0.002, 0.08, t)
    o.start(t)
    o.stop(t + 0.12)
  }

  chime(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    ;[
      [0, 76],
      [0.28, 69],
    ].forEach(([d, note]) => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = mtof(note)
      const g = this.env(o, 0.18, 0.004, 1.1, t + d)
      const send = ctx.createGain()
      send.gain.value = 0.55
      g.connect(send)
      send.connect(this.delay)
      o.start(t + d)
      o.stop(t + d + 1.4)
    })
  }

  notify(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    ;[0, 0.14].forEach((d, i) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = mtof(i === 0 ? 81 : 88)
      const g = this.env(o, 0.13, 0.005, 0.7, t + d)
      const send = ctx.createGain()
      send.gain.value = 0.4
      g.connect(send)
      send.connect(this.delay)
      o.start(t + d)
      o.stop(t + d + 0.9)
    })
  }

  denied(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    ;[0, 0.11].forEach((d) => {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.setValueAtTime(150, t + d)
      o.frequency.exponentialRampToValueAtTime(96, t + d + 0.16)
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 900
      o.connect(f)
      this.env(f, 0.1, 0.004, 0.2, t + d)
      o.start(t + d)
      o.stop(t + d + 0.25)
    })
  }

  granted(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    ;[69, 73, 76, 81].forEach((n, i) => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = mtof(n)
      const g = this.env(o, 0.12, 0.01, 0.8, t + i * 0.07)
      const send = ctx.createGain()
      send.gain.value = 0.5
      g.connect(send)
      send.connect(this.delay)
      o.start(t + i * 0.07)
      o.stop(t + i * 0.07 + 1.0)
    })
  }

  servo(duration = 3.4): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(58, t)
    o.frequency.linearRampToValueAtTime(96, t + duration * 0.7)
    o.frequency.linearRampToValueAtTime(44, t + duration)
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.setValueAtTime(320, t)
    f.frequency.linearRampToValueAtTime(900, t + duration * 0.8)
    f.Q.value = 5
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12, t + 0.3)
    g.gain.setValueAtTime(0.12, t + duration - 0.5)
    g.gain.linearRampToValueAtTime(0, t + duration)
    o.connect(f)
    f.connect(g)
    g.connect(this.sfxBus)
    o.start(t)
    o.stop(t + duration + 0.1)

    const rumble = ctx.createBufferSource()
    rumble.buffer = this.brown
    rumble.loop = true
    const rf = ctx.createBiquadFilter()
    rf.type = 'lowpass'
    rf.frequency.value = 260
    const rg = ctx.createGain()
    rg.gain.setValueAtTime(0, t)
    rg.gain.linearRampToValueAtTime(0.3, t + 0.2)
    rg.gain.setValueAtTime(0.3, t + duration - 0.4)
    rg.gain.linearRampToValueAtTime(0, t + duration)
    rumble.connect(rf)
    rf.connect(rg)
    rg.connect(this.sfxBus)
    rumble.start(t)
    rumble.stop(t + duration + 0.1)
  }

  reveal(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    ;[57, 64, 69, 76, 81].forEach((n, i) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = mtof(n)
      const g = this.env(o, 0.09, 0.4, 2.6, t + i * 0.12)
      const send = ctx.createGain()
      send.gain.value = 0.6
      g.connect(send)
      send.connect(this.delay)
      o.start(t + i * 0.12)
      o.stop(t + i * 0.12 + 3.2)
    })
  }

  glitch(): void {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    s.playbackRate.value = 0.4
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.setValueAtTime(3000, t)
    f.frequency.exponentialRampToValueAtTime(400, t + 0.22)
    f.Q.value = 2
    s.connect(f)
    this.env(f, 0.09, 0.002, 0.24, t)
    s.start(t)
    s.stop(t + 0.3)
  }
}

export const audio = new AudioEngine()
