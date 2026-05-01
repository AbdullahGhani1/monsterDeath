import { Renderer } from './core/renderer/renderer';
import { AudioMixer } from './core/audio/mixer';
import { AssetLoader } from './assets/loader';
import { world } from './core/ecs/world';

class Game {
  renderer: Renderer;
  audio: AudioMixer;
  loader: AssetLoader;

  constructor() {
    this.renderer = new Renderer('game-canvas');
    this.audio = new AudioMixer();
    this.loader = new AssetLoader();

    console.log('Engine Bootstrap Complete');
    this.start();
  }

  start() {
    // Add a test entity
    world.add({
      id: 'player-1',
      type: 'player',
      position: { x: 0, y: 0 },
      health: { current: 100, max: 100 },
    });

    requestAnimationFrame(this.loop.bind(this));
  }

  loop() {
    this.renderer.clear();
    
    // Simple debug render
    const ctx = this.renderer.ctx;
    ctx.fillStyle = 'white';
    ctx.fillText('THE ABYSS - Engine Bootstrap Active', 20, 30);

    const player = world.entities.find(e => e.type === 'player');
    if (player && player.position) {
      const screenPos = this.renderer.camera.worldToScreen(player.position.x, player.position.y);
      ctx.fillStyle = 'blue';
      ctx.fillRect(screenPos.x - 10, screenPos.y - 10, 20, 20);
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('load', () => {
  new Game();
});
