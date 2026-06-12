// ─── Visual effects: pooled particles, damage numbers, impact rings ─────────

import { Camera } from './camera';

type ParticleKind = 'spark' | 'blood' | 'ember' | 'dust' | 'ring' | 'soul';

interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number; // world x
  y: number; // screen-space height above ground (px, + = up)
  groundY: number; // screen y of the ground at spawn
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatText {
  active: boolean;
  x: number;
  groundY: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  big: boolean;
}

const POOL = 320;
const TEXT_POOL = 32;

export class FX {
  private particles: Particle[] = [];
  private texts: FloatText[] = [];

  constructor() {
    for (let i = 0; i < POOL; i++) {
      this.particles.push({
        active: false,
        kind: 'spark',
        x: 0,
        y: 0,
        groundY: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#fff',
      });
    }
    for (let i = 0; i < TEXT_POOL; i++) {
      this.texts.push({
        active: false,
        x: 0,
        groundY: 0,
        y: 0,
        text: '',
        color: '#fff',
        life: 0,
        maxLife: 1,
        big: false,
      });
    }
  }

  private spawn(
    kind: ParticleKind,
    x: number,
    groundY: number,
    y: number,
    color: string,
    count: number,
    speed: number,
    size: number,
    life: number
  ): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.kind = kind;
      p.x = x;
      p.groundY = groundY;
      p.y = y;
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      p.vx = Math.cos(a) * v;
      p.vy = Math.abs(Math.sin(a)) * v * (kind === 'dust' ? 0.3 : 1);
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color;
      p.maxLife = life * (0.6 + Math.random() * 0.8);
      p.life = p.maxLife;
      if (++spawned >= count) break;
    }
  }

  hitSpark(x: number, groundY: number, h: number, color: string, heavy: boolean): void {
    this.spawn('spark', x, groundY, h, color, heavy ? 18 : 9, heavy ? 420 : 260, 3, 0.35);
    this.spawn('blood', x, groundY, h, '#a31226', heavy ? 10 : 5, 200, 3.4, 0.55);
    if (heavy) this.ring(x, groundY, h, color);
  }

  blockSpark(x: number, groundY: number, h: number): void {
    this.spawn('spark', x, groundY, h, '#9fd8ff', 7, 220, 2.4, 0.25);
  }

  ring(x: number, groundY: number, h: number, color: string): void {
    this.spawn('ring', x, groundY, h, color, 1, 0, 8, 0.3);
  }

  dust(x: number, groundY: number, count = 6): void {
    this.spawn('dust', x, groundY, 4, '#8a7a66', count, 90, 4, 0.5);
  }

  embers(x: number, groundY: number, color: string): void {
    this.spawn('ember', x, groundY, 10 + Math.random() * 60, color, 2, 40, 2.2, 1.6);
  }

  souls(x: number, groundY: number, count: number): void {
    this.spawn('soul', x, groundY, 30, '#7ef0d4', count, 120, 3, 1.1);
  }

  damageText(
    x: number,
    groundY: number,
    h: number,
    text: string,
    color: string,
    big = false
  ): void {
    for (const t of this.texts) {
      if (t.active) continue;
      t.active = true;
      t.x = x + (Math.random() - 0.5) * 30;
      t.groundY = groundY;
      t.y = h + 40;
      t.text = text;
      t.color = color;
      t.maxLife = big ? 1.1 : 0.75;
      t.life = t.maxLife;
      t.big = big;
      return;
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark' || p.kind === 'blood' || p.kind === 'dust') {
        p.vy -= (p.kind === 'dust' ? 120 : 900) * dt;
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -0.3;
          p.vx *= 0.6;
        }
      } else if (p.kind === 'ember' || p.kind === 'soul') {
        p.vy += 30 * dt; // drift upward
        p.vx += Math.sin(p.life * 7) * 18 * dt;
      }
    }
    for (const t of this.texts) {
      if (!t.active) continue;
      t.life -= dt;
      t.y += 55 * dt;
      if (t.life <= 0) t.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D, cam: Camera): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      const sx = cam.sx(p.x);
      const sy = p.groundY + cam.offY - p.y * cam.zoom;
      const a = p.life / p.maxLife;
      ctx.globalAlpha = a;
      if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, (1 - a) * 70 + 8, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        const s = p.size * cam.zoom;
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      if (!t.active) continue;
      const a = Math.min(1, (t.life / t.maxLife) * 2);
      const sx = cam.sx(t.x);
      const sy = t.groundY + cam.offY - t.y * cam.zoom;
      ctx.globalAlpha = a;
      ctx.font = t.big ? '900 30px Epilogue, sans-serif' : '800 19px Epilogue, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
}

export const fx = new FX();
