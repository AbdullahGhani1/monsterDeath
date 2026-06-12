// ─── Procedural audio: every sound is synthesized, no files needed ──────────

import { SfxId } from '../data/types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private intensity = 0; // 0 calm … 1 boss
  muted = false;

  /** Must be called from a user gesture to satisfy autoplay policies. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
    this.startMusic();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
    return this.muted;
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  private noise(dur: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private env(peak: number, attack: number, decay: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  private tone(
    freq: number,
    type: OscillatorType,
    peak: number,
    attack: number,
    decay: number,
    slideTo?: number
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== undefined)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        ctx.currentTime + attack + decay
      );
    const g = this.env(peak, attack, decay);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + attack + decay + 0.05);
  }

  private thwack(peak: number, dur: number, filterFreq: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const src = this.noise(dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.env(peak, 0.005, dur);
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  sfx(id: SfxId): void {
    if (!this.ctx || !this.master) return;
    switch (id) {
      case 'light':
        this.thwack(0.5, 0.09, 2400);
        this.tone(180, 'sine', 0.35, 0.005, 0.08, 70);
        break;
      case 'heavy':
        this.thwack(0.8, 0.18, 1200);
        this.tone(110, 'sine', 0.6, 0.008, 0.22, 40);
        break;
      case 'hurt':
        this.tone(300, 'sawtooth', 0.18, 0.005, 0.12, 90);
        break;
      case 'magic':
        this.tone(820, 'sawtooth', 0.22, 0.02, 0.25, 240);
        this.tone(1230, 'sine', 0.15, 0.02, 0.3, 500);
        break;
      case 'block':
        this.tone(1900, 'square', 0.12, 0.003, 0.07);
        this.thwack(0.3, 0.05, 5000);
        break;
      case 'launch':
        this.tone(160, 'sawtooth', 0.4, 0.01, 0.3, 640);
        this.thwack(0.5, 0.15, 1800);
        break;
      case 'ko':
        this.thwack(0.9, 0.5, 700);
        this.tone(70, 'sine', 0.8, 0.01, 0.6, 30);
        break;
      case 'heat':
        this.tone(180, 'sawtooth', 0.3, 0.25, 0.4, 880);
        this.tone(90, 'sine', 0.4, 0.2, 0.5, 180);
        break;
      case 'rage':
        this.tone(60, 'sawtooth', 0.5, 0.3, 0.8, 240);
        this.thwack(0.6, 0.7, 900);
        break;
      case 'select':
        this.tone(540, 'square', 0.12, 0.005, 0.1, 760);
        break;
      case 'blip':
        this.tone(900, 'square', 0.05, 0.002, 0.04);
        break;
      case 'soul':
        this.tone(660, 'sine', 0.12, 0.01, 0.18, 1320);
        break;
    }
  }

  // ── Generative dark ambient loop ──────────────────────────────────────────
  private startMusic(): void {
    if (this.musicTimer !== null) return;
    const stepMs = 480;
    const bass = [55, 55, 58.27, 55, 51.91, 51.91, 55, 43.65]; // A1 / Bb1 / Ab1 / F1 drones
    this.musicTimer = window.setInterval(() => {
      const ctx = this.ctx;
      if (!ctx || !this.musicGain || this.muted) return;
      const step = this.musicStep++;
      const t = ctx.currentTime;

      if (step % 2 === 0) {
        const f = bass[(step / 2) % bass.length];
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = f * 1.005;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 160 + this.intensity * 420;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + stepMs / 1000 + 0.35);
        osc.connect(filt);
        osc2.connect(filt);
        filt.connect(g).connect(this.musicGain);
        osc.start(t);
        osc2.start(t);
        osc.stop(t + 1.2);
        osc2.stop(t + 1.2);
      }

      // percussion: kick on beat, noise tick off-beat (denser at high intensity)
      if (step % 4 === 0 || (this.intensity > 0.6 && step % 4 === 2)) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(g).connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 0.25);
      } else if (step % 2 === 1 && (step % 8 === 3 || this.intensity > 0.3)) {
        const src = this.noise(0.05);
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 5000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.05 + this.intensity * 0.05, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        src.connect(f).connect(g).connect(this.musicGain);
        src.start(t);
      }
    }, stepMs);
  }
}

export const audio = new AudioEngine();
