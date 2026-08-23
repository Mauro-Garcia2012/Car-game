/**
 * Synthesised sound: no audio files, everything is generated with WebAudio.
 * The engine is a pair of detuned saws through a resonant low-pass whose
 * frequency tracks the rev counter; tyre noise is filtered white noise.
 */

/** Remembered across sessions: silence is a preference, not a mode. */
const MUTE_KEY = 'desert-run.muted';
const VOLUME = 0.65;

export class Audio {
  constructor() {
    this.ctx = null;
    this.started = false;
    // A game that comes back loud after you silenced it is a game people
    // stop opening at their desk.
    let muted = false;
    try {
      muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // Private browsing with storage blocked: start audible.
    }
    this.muted = muted;
  }

  /** Must be called from a user gesture. */
  start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : VOLUME;
    this.master.connect(ctx.destination);

    // --- engine -----------------------------------------------------
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 700;
    this.engineFilter.Q.value = 6;
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);

    this.oscs = [];
    for (const [type, detune, gain] of [
      ['sawtooth', 0, 0.5],
      ['sawtooth', 12, 0.35],
      ['square', -7, 0.22],
    ]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(this.engineFilter);
      o.start();
      this.oscs.push(o);
    }

    // --- tyre / wind noise ------------------------------------------
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = noiseBuf;

    this.noise = ctx.createBufferSource();
    this.noise.buffer = noiseBuf;
    this.noise.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 900;
    this.noiseFilter.Q.value = 0.8;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noise.connect(this.noiseFilter).connect(this.noiseGain).connect(this.master);
    this.noise.start();

    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : VOLUME;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // Nothing to do: it just will not be remembered next time.
    }
  }

  /** @param {{rpm:number, throttle:number, speed:number, slip:number, engineOn:boolean, surface:string}} s */
  updateEngine(s) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const base = 48 + s.rpm * 210;
    for (const o of this.oscs) o.frequency.setTargetAtTime(base, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(
      420 + s.rpm * 2600 + s.throttle * 700,
      now,
      0.06
    );
    const vol = s.engineOn ? 0.1 + s.throttle * 0.16 + s.rpm * 0.1 : 0;
    this.engineGain.gain.setTargetAtTime(vol, now, 0.08);

    const rough = s.surface === 'road' ? 0.35 : 1.0;
    // The same band of noise doubles as the storm: sand on the panels is
    // tyre roar you did not earn, and it does not go away when you lift off.
    const wind = s.wind || 0;
    const noiseVol = Math.min(
      0.42,
      (s.speed / 90) * 0.22 * rough + s.slip * 0.16 + wind * 0.2
    );
    this.noiseGain.gain.setTargetAtTime(noiseVol, now, 0.1);
    this.noiseFilter.frequency.setTargetAtTime(
      600 + s.speed * 14 + s.slip * 900 - wind * 320,
      now,
      0.1
    );
  }

  blip(freq = 880, duration = 0.08, type = 'square', gain = 0.18) {
    if (!this.started) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(ctx.currentTime + duration + 0.02);
  }

  /** Filtered noise burst — used for crashes and the fuel nozzle. */
  burst({ duration = 0.5, freq = 300, q = 1, gain = 0.4, type = 'lowpass' } = {}) {
    if (!this.started) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + duration + 0.05);
  }

  crash(severity = 1) {
    this.burst({ duration: 0.45 + severity * 0.3, freq: 160 + severity * 260, gain: 0.5 });
    this.blip(90 + severity * 40, 0.35, 'sawtooth', 0.25);
  }

  refuelTick() {
    this.blip(1180, 0.05, 'square', 0.08);
  }

  warn() {
    this.blip(660, 0.12, 'triangle', 0.16);
  }

  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.16, 'triangle', 0.16), i * 90)
    );
  }

  fail() {
    [440, 349, 262, 196].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.3, 'sawtooth', 0.16), i * 160)
    );
  }
}
