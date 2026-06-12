// ─── Camera: smooth follow, dynamic zoom, screen shake ──────────────────────

import { clamp, lerp } from '../rig/skeleton';

export class Camera {
  x = 0; // world x at screen center
  zoom = 1;
  private targetX = 0;
  private targetZoom = 1;
  private shakeTime = 0;
  private shakeAmp = 0;
  offX = 0;
  offY = 0;

  constructor(
    public viewW: number,
    public viewH: number
  ) {}

  resize(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
  }

  /** Frame the player and the nearest threat together. */
  follow(px: number, focusX: number | null, arenaW: number): void {
    if (focusX !== null) {
      const mid = (px + focusX) / 2;
      const spread = Math.abs(px - focusX);
      this.targetX = mid;
      this.targetZoom = clamp(620 / Math.max(420, spread + 260), 0.78, 1.12);
    } else {
      this.targetX = px;
      this.targetZoom = 1;
    }
    const half = this.viewW / (2 * this.targetZoom);
    this.targetX = clamp(this.targetX, half - 80, arenaW - half + 80);
  }

  shake(amp: number, ms: number): void {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeTime = Math.max(this.shakeTime, ms);
  }

  update(dtMs: number): void {
    const k = 1 - Math.pow(0.0015, dtMs / 1000);
    this.x = lerp(this.x, this.targetX, k);
    this.zoom = lerp(this.zoom, this.targetZoom, k * 0.7);

    if (this.shakeTime > 0) {
      this.shakeTime -= dtMs;
      const f = this.shakeAmp * Math.min(1, this.shakeTime / 180);
      this.offX = (Math.random() - 0.5) * 2 * f;
      this.offY = (Math.random() - 0.5) * 2 * f;
    } else {
      this.offX = 0;
      this.offY = 0;
      this.shakeAmp = 0;
    }
  }

  /** World x → screen x. */
  sx(worldX: number): number {
    return (worldX - this.x) * this.zoom + this.viewW / 2 + this.offX;
  }
}
