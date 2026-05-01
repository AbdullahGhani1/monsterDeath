export class Keyboard {
  private keys: Map<string, boolean> = new Map();

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.set(e.code, true));
    window.addEventListener('keyup', (e) => this.keys.set(e.code, false));
  }

  isDown(code: string): boolean {
    return this.keys.get(code) || false;
  }

  get axisX(): number {
    let x = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    return x;
  }

  get axisY(): number {
    let y = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    return y;
  }
}
