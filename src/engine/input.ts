// ─── Input: keyboard + touch with fighting-game niceties ───────────────────
//
// Supports just-pressed edges, a short input buffer (so combo follow-ups
// pressed during recovery still register, Tekken-style), and double-tap
// forward/back dashes. Virtual buttons feed the same pipeline for touch.

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'light'
  | 'heavy'
  | 'launcher'
  | 'special'
  | 'block'
  | 'dash'
  | 'heat'
  | 'rage'
  | 'pause';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyJ: 'light',
  KeyZ: 'light',
  KeyK: 'heavy',
  KeyX: 'heavy',
  KeyL: 'launcher',
  KeyC: 'launcher',
  KeyU: 'special',
  KeyV: 'special',
  ShiftLeft: 'block',
  ShiftRight: 'block',
  Space: 'dash',
  KeyQ: 'heat',
  KeyE: 'rage',
  Escape: 'pause',
  KeyP: 'pause',
};

const BUFFER_MS = 240;
const DOUBLE_TAP_MS = 260;

export class Input {
  private down = new Set<Action>();
  private justSet = new Set<Action>();
  private buffer: { action: Action; time: number }[] = [];
  private lastTap: { dir: -1 | 1; time: number } | null = null;
  private dashRequest: -1 | 0 | 1 = 0;
  private now = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (a !== 'pause') e.preventDefault();
      if (!this.down.has(a)) this.press(a);
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.release(a);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
  }

  /** Press from keyboard or virtual (touch) button. */
  press(a: Action): void {
    this.down.add(a);
    this.justSet.add(a);
    this.buffer.push({ action: a, time: this.now });

    if (a === 'left' || a === 'right') {
      const dir: -1 | 1 = a === 'left' ? -1 : 1;
      if (
        this.lastTap &&
        this.lastTap.dir === dir &&
        this.now - this.lastTap.time < DOUBLE_TAP_MS
      ) {
        this.dashRequest = dir;
        this.lastTap = null;
      } else {
        this.lastTap = { dir, time: this.now };
      }
    }
  }

  release(a: Action): void {
    this.down.delete(a);
  }

  isDown(a: Action): boolean {
    return this.down.has(a);
  }

  justPressed(a: Action): boolean {
    return this.justSet.has(a);
  }

  /** Consume a buffered press if it happened within the last BUFFER_MS. */
  consumeBuffered(a: Action): boolean {
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const b = this.buffer[i];
      if (b.action === a && this.now - b.time <= BUFFER_MS) {
        this.buffer.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  /** Double-tap dash direction, if one was requested (consumed on read). */
  consumeDoubleTapDash(): -1 | 0 | 1 {
    const d = this.dashRequest;
    this.dashRequest = 0;
    return d;
  }

  moveX(): number {
    return (this.down.has('right') ? 1 : 0) - (this.down.has('left') ? 1 : 0);
  }

  moveZ(): number {
    return (this.down.has('down') ? 1 : 0) - (this.down.has('up') ? 1 : 0);
  }

  /** Call once per frame after all systems have read input. */
  endFrame(dtMs: number): void {
    this.now += dtMs;
    this.justSet.clear();
    this.buffer = this.buffer.filter((b) => this.now - b.time <= BUFFER_MS + 50);
  }
}
