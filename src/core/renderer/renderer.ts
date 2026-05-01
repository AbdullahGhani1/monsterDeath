export class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;

  constructor(public width: number, public height: number) {}

  worldToScreen(worldX: number, worldY: number) {
    return {
      x: (worldX - this.x) * this.zoom + this.width / 2,
      y: (worldY - this.y) * this.zoom + this.height / 2,
    };
  }

  screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - this.width / 2) / this.zoom + this.x,
      y: (screenY - this.height / 2) / this.zoom + this.y,
    };
  }
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.camera = new Camera(this.canvas.width, this.canvas.height);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.width = this.canvas.width;
    this.camera.height = this.canvas.height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderLuminance(playerX: number, playerY: number, radius: number) {
    const screenPos = this.camera.worldToScreen(playerX, playerY);
    const grad = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, radius * this.camera.zoom
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.8)');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Basic frustum culling check
  isVisible(x: number, y: number, width: number, height: number) {
    const screenPos = this.camera.worldToScreen(x, y);
    const screenWidth = width * this.camera.zoom;
    const screenHeight = height * this.camera.zoom;

    return (
      screenPos.x + screenWidth > 0 &&
      screenPos.x < this.canvas.width &&
      screenPos.y + screenHeight > 0 &&
      screenPos.y < this.canvas.height
    );
  }
}
