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

  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Screen Shake Update
    if (this.shakeTimer > 0) {
      this.shakeTimer -= 16; // Approx 1 frame at 60fps
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(sx, sy);
    }
  }

  triggerShake(duration: number, intensity: number) {
    this.shakeTimer = duration;
    this.shakeIntensity = intensity;
  }

  resetTransform() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  renderLevel(level: { tileSize: number; width: number; height: number; getTile: (x: number, y: number) => number }) {
    const startTile = this.camera.screenToWorld(0, 0);
    const endTile = this.camera.screenToWorld(this.canvas.width, this.canvas.height);

    const startX = Math.floor(startTile.x / level.tileSize);
    const startY = Math.floor(startTile.y / level.tileSize);
    const endX = Math.ceil(endTile.x / level.tileSize);
    const endY = Math.ceil(endTile.y / level.tileSize);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tile = level.getTile(x, y);
        const screenPos = this.camera.worldToScreen(x * level.tileSize, y * level.tileSize);
        
        switch (tile) {
          case 0: // FLOOR
            this.ctx.fillStyle = '#1d100e';
            break;
          case 1: // WALL
            this.ctx.fillStyle = '#362623';
            break;
          case 2: // WATER
            this.ctx.fillStyle = '#006300';
            break;
          case 3: // MUD
            this.ctx.fillStyle = '#42312e';
            break;
        }
        
        this.ctx.fillRect(
          screenPos.x, screenPos.y, 
          level.tileSize * this.camera.zoom + 1, 
          level.tileSize * this.camera.zoom + 1
        );
      }
    }
  }

  renderEntity(entity: { position?: { x: number; y: number }, combat?: { hitFlashTimer: number }, sprite?: { assetId: string, frame: number, width: number, height: number }, type: string }, loader: { getImage: (id: string) => HTMLImageElement | undefined }) {
    if (!entity.position) return;
    const screenPos = this.camera.worldToScreen(entity.position.x, entity.position.y);

    // Hit Flash
    if (entity.combat && entity.combat.hitFlashTimer > 0) {
      this.ctx.filter = 'brightness(5) contrast(2)';
    }

    if (entity.sprite) {
      const img = loader.getImage(entity.sprite.assetId);
      if (img) {
        // High-res static image handling
        const isStatic = entity.sprite.width === img.width && entity.sprite.height === img.height;
        
        if (isStatic) {
          const targetSize = 64; // Scale high-res to standard entity size
          this.ctx.drawImage(
            img,
            screenPos.x - (targetSize * this.camera.zoom) / 2,
            screenPos.y - (targetSize * this.camera.zoom) / 2,
            targetSize * this.camera.zoom,
            targetSize * this.camera.zoom
          );
        } else {
          const sw = entity.sprite.width;
          const sh = entity.sprite.height;
          const cols = Math.floor(img.width / sw);
          const frameX = (entity.sprite.frame % cols) * sw;
          const frameY = Math.floor(entity.sprite.frame / cols) * sh;

          this.ctx.drawImage(
            img,
            frameX, frameY, sw, sh,
            screenPos.x - (sw * this.camera.zoom) / 2,
            screenPos.y - (sh * this.camera.zoom) / 2,
            sw * this.camera.zoom,
            sh * this.camera.zoom
          );
        }
      } else {
        // Placeholder
        this.ctx.fillStyle = entity.type === 'player' ? '#ffb4a8' : '#ffb4ab';
        this.ctx.fillRect(screenPos.x - 15, screenPos.y - 15, 30, 30);
      }
    }

    this.ctx.filter = 'none';
  }

  renderParticles(entities: { type: string, position?: { x: number, y: number }, particle?: { color: string, life: number, maxLife: number, size: number, active: boolean } }[]) {
    for (const e of entities) {
      if (e.type === 'particle' && e.position && e.particle?.active) {
        const screenPos = this.camera.worldToScreen(e.position.x, e.position.y);
        this.ctx.fillStyle = e.particle.color;
        this.ctx.globalAlpha = e.particle.life / e.particle.maxLife;
        this.ctx.fillRect(screenPos.x, screenPos.y, e.particle.size, e.particle.size);
      }
    }
    this.ctx.globalAlpha = 1.0;
  }

  renderLuminance(playerX: number, playerY: number, radius: number, isNightVision: boolean = false) {
    const screenPos = this.camera.worldToScreen(playerX, playerY);
    const grad = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, radius * this.camera.zoom
    );
    
    if (isNightVision) {
      // Green-tinted pierce
      grad.addColorStop(0, 'rgba(0, 255, 0, 0.1)');
      grad.addColorStop(1, 'rgba(0, 50, 0, 0.6)');
    } else {
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    }

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (isNightVision) {
      // Full screen scanline effect or green overlay
      this.ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
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
