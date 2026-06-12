// ─── Stage renderer: procedural parallax arenas per chapter theme ───────────
//
// Each arena is generated from its StageTheme: gradient sky, two parallax
// silhouette layers seeded per-theme, a perspective ground band (the fight
// plane), fog and drifting embers. No image assets anywhere.

import { StageTheme } from '../data/types';
import { Camera } from '../engine/camera';
import { ARENA } from './fighter';

/** Deterministic PRNG so each theme always generates the same skyline. */
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashTheme(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Prop {
  x: number;
  w: number;
  h: number;
  kind: number;
}

export class StageRenderer {
  private far: Prop[] = [];
  private mid: Prop[] = [];
  private theme!: StageTheme;
  private emberT = 0;

  setTheme(theme: StageTheme): void {
    this.theme = theme;
    const rnd = mulberry(hashTheme(theme.id));
    this.far = [];
    this.mid = [];
    for (let x = -400; x < ARENA.width + 800; x += 90 + rnd() * 160) {
      this.far.push({ x, w: 60 + rnd() * 180, h: 90 + rnd() * 190, kind: Math.floor(rnd() * 3) });
    }
    for (let x = -400; x < ARENA.width + 800; x += 160 + rnd() * 260) {
      this.mid.push({ x, w: 50 + rnd() * 120, h: 60 + rnd() * 150, kind: Math.floor(rnd() * 3) });
    }
  }

  /** Screen y of the ground for a world depth z (0 = far lane). */
  groundY(z: number, viewH: number): number {
    const base = viewH * 0.64;
    return base + (z / ARENA.zMax) * viewH * 0.26;
  }

  /** Perspective scale for a world depth z. */
  depthScale(z: number): number {
    return 0.82 + (z / ARENA.zMax) * 0.3;
  }

  render(ctx: CanvasRenderingContext2D, cam: Camera, t: number, dt: number): void {
    const th = this.theme;
    const w = cam.viewW;
    const h = cam.viewH;
    const horizonY = h * 0.6;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY * 1.1);
    sky.addColorStop(0, th.skyTop);
    sky.addColorStop(1, th.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizonY * 1.1);

    // The Abyss rift — a slow-pulsing tear in the sky
    const riftX = w * 0.5 - (cam.x - ARENA.width / 2) * 0.05;
    const pulse = 0.5 + Math.sin(t * 0.8) * 0.2;
    const rift = ctx.createRadialGradient(
      riftX,
      horizonY * 0.34,
      4,
      riftX,
      horizonY * 0.34,
      h * 0.34
    );
    rift.addColorStop(0, th.ember + 'cc');
    rift.addColorStop(0.25, th.ember + '33');
    rift.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = pulse;
    ctx.fillStyle = rift;
    ctx.fillRect(0, 0, w, horizonY);
    ctx.globalAlpha = 1;

    // Parallax silhouettes
    this.silhouettes(ctx, this.far, th.horizon, 0.22, horizonY, cam, t);
    this.silhouettes(ctx, this.mid, th.mid, 0.45, horizonY + 14, cam, t);

    // Ground band (fight plane) with perspective shading
    const gground = ctx.createLinearGradient(0, horizonY, 0, h);
    gground.addColorStop(0, th.groundFar);
    gground.addColorStop(1, th.ground);
    ctx.fillStyle = gground;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Subtle depth lines anchored to world space
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = this.groundY((i / 4) * ARENA.zMax, h) - 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Vertical ticks scrolling with the camera
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    for (let wx = 0; wx <= ARENA.width; wx += 160) {
      const x = cam.sx(wx);
      if (x < -40 || x > w + 40) continue;
      ctx.beginPath();
      ctx.moveTo(x, horizonY + 8);
      ctx.lineTo(x + 24, h);
      ctx.stroke();
    }

    // Arena walls (the splat zones)
    for (const wallX of [0, ARENA.width]) {
      const x = cam.sx(wallX);
      if (x < -120 || x > w + 120) continue;
      const wgrad = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
      const c = th.ember;
      wgrad.addColorStop(0, 'rgba(0,0,0,0)');
      wgrad.addColorStop(0.5, c + '22');
      wgrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wgrad;
      ctx.fillRect(x - 50, horizonY * 0.4, 100, h);
      ctx.strokeStyle = c + '55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, horizonY * 0.45);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Fog over the far lane
    const fog = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 80);
    fog.addColorStop(0, th.fog + '66');
    fog.addColorStop(1, th.fog + '00');
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizonY - 30, w, 110);

    // Drifting embers
    this.emberT += dt;
    ctx.fillStyle = th.ember;
    for (let i = 0; i < 26; i++) {
      const seed = i * 127.3;
      const ex = ((seed * 31 + this.emberT * (12 + (i % 5) * 7)) % (w + 80)) - 40;
      const ey = h - (((seed * 17 + this.emberT * (26 + (i % 7) * 9)) % (h * 1.1)) % h);
      const a = 0.25 + 0.3 * Math.sin(this.emberT * 2 + i);
      ctx.globalAlpha = Math.max(0.05, a);
      ctx.fillRect(ex, ey, 2.4, 2.4);
    }
    ctx.globalAlpha = 1;
  }

  private silhouettes(
    ctx: CanvasRenderingContext2D,
    props: Prop[],
    color: string,
    parallax: number,
    baseY: number,
    cam: Camera,
    t: number
  ): void {
    const th = this.theme;
    ctx.fillStyle = color;
    for (const p of props) {
      const x = cam.viewW / 2 + (p.x - cam.x) * parallax * cam.zoom;
      if (x + p.w < -60 || x > cam.viewW + 60) continue;
      const y = baseY;
      switch (th.props) {
        case 'ruins':
        case 'keep': {
          // broken towers
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - p.h);
          ctx.lineTo(x + p.w * 0.3, y - p.h - (p.kind === 1 ? 24 : 0));
          ctx.lineTo(x + p.w * 0.55, y - p.h * 0.82);
          ctx.lineTo(x + p.w, y - p.h * 0.7);
          ctx.lineTo(x + p.w, y);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'crypt': {
          // arches & headstones
          ctx.fillRect(x, y - p.h * 0.5, p.w, p.h * 0.5);
          ctx.beginPath();
          ctx.arc(x + p.w / 2, y - p.h * 0.5, p.w / 2, Math.PI, 0);
          ctx.fill();
          break;
        }
        case 'foundry': {
          // chimneys with glowing tips
          ctx.fillRect(x, y - p.h, p.w * 0.34, p.h);
          ctx.fillRect(x + p.w * 0.5, y - p.h * 0.7, p.w * 0.3, p.h * 0.7);
          ctx.save();
          ctx.fillStyle = th.ember;
          ctx.globalAlpha = 0.5 + Math.sin(t * 3 + x) * 0.3;
          ctx.fillRect(x + p.w * 0.05, y - p.h - 6, p.w * 0.24, 5);
          ctx.restore();
          ctx.fillStyle = color;
          break;
        }
        case 'garden': {
          // bulbous fungal stalks
          ctx.beginPath();
          ctx.moveTo(x + p.w * 0.42, y);
          ctx.quadraticCurveTo(x + p.w * 0.3, y - p.h * 0.7, x + p.w * 0.5, y - p.h * 0.78);
          ctx.quadraticCurveTo(x + p.w * 0.72, y - p.h * 0.7, x + p.w * 0.58, y);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + p.w * 0.5, y - p.h * 0.8, p.w * 0.5, p.h * 0.22, 0, Math.PI, 0);
          ctx.fill();
          break;
        }
        case 'maw':
        case 'throne': {
          // jagged fangs of rock
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + p.w * 0.5, y - p.h * (1 + (p.kind === 2 ? 0.3 : 0)));
          ctx.lineTo(x + p.w, y);
          ctx.closePath();
          ctx.fill();
          break;
        }
      }
    }
  }
}
