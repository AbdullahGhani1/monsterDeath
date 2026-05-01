import { Renderer } from './core/renderer/renderer';
import { AudioMixer } from './core/audio/mixer';
import { AssetLoader } from './assets/loader';
import { world } from './core/ecs/world';
import { Keyboard } from './core/input/keyboard';
import { createPlayerSystem } from './systems/player';
import { createStatsSystem } from './systems/stats';
import { createUISystem, addLogEntry } from './systems/ui';
import { createInteractionSystem } from './systems/interaction';

class Game {
  renderer: Renderer;
  audio: AudioMixer;
  loader: AssetLoader;
  keyboard: Keyboard;
  
  systems: (() => void)[];

  constructor() {
    this.renderer = new Renderer('game-canvas');
    this.audio = new AudioMixer();
    this.loader = new AssetLoader();
    this.keyboard = new Keyboard();

    // Initialize systems
    this.systems = [
      createPlayerSystem(this.keyboard),
      createStatsSystem(),
      createInteractionSystem(this.keyboard),
      createUISystem(),
    ];

    console.log('Phase 2: Player & Exploration Initialized');
    this.setupWorld();
    this.start();
  }

  setupWorld() {
    // Player
    world.add({
      id: 'player-1',
      type: 'player',
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      velocity: { x: 0, y: 0 },
      health: { current: 100, max: 100 },
      stamina: { current: 100, max: 100, regen: 0.2 },
    });

    // Test Monster (for UI)
    world.add({
      id: 'monster-1',
      type: 'monster',
      health: { current: 3200, max: 5000 },
      position: { x: 200, y: 200 },
    });

    // Interactive Switch
    world.add({
      id: 'switch-1',
      type: 'switch',
      position: { x: 400, y: 300 },
      interactive: {
        radius: 50,
        onInteract: () => {
          addLogEntry('You flipped a heavy iron switch.', 'player');
          addLogEntry('A secret compartment opens...', 'system');
          
          // Spawn Access Code
          world.add({
            id: 'access-code-1',
            type: 'item',
            position: { x: 420, y: 320 },
            sprite: { assetId: 'item-code', frame: 0 }
          });
        }
      }
    });

    addLogEntry('Welcome to THE ABYSS.', 'system');
  }

  start() {
    requestAnimationFrame(this.loop.bind(this));
  }

  loop() {
    // Update systems
    for (const system of this.systems) {
      system();
    }

    // Render
    this.renderer.clear();
    
    const ctx = this.renderer.ctx;
    
    // Draw entities (simple debug shapes)
    for (const entity of world.entities) {
      if (!entity.position) continue;
      
      const screenPos = this.renderer.camera.worldToScreen(entity.position.x, entity.position.y);
      
      if (entity.type === 'player') {
        ctx.fillStyle = '#ffb4a8'; // --color-primary
        ctx.fillRect(screenPos.x - 15, screenPos.y - 15, 30, 30);
      } else if (entity.type === 'switch') {
        // Draw outline if interactive and near
        const player = world.entities.find(e => e.type === 'player');
        if (player && player.position && entity.interactive) {
          const dist = Math.sqrt(
            (player.position.x - entity.position.x) ** 2 +
            (player.position.y - entity.position.y) ** 2
          );
          if (dist < entity.interactive.radius) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#dfc29f'; // --color-tertiary
          }
        }
        
        ctx.strokeStyle = '#8b7355'; // --color-abyss-bronze
        ctx.strokeRect(screenPos.x - 10, screenPos.y - 10, 20, 20);
        
        ctx.shadowBlur = 0; // Reset
      } else if (entity.type === 'item') {
        ctx.fillStyle = '#82db6f'; // --color-secondary
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Apply Player Luminance
    const player = world.entities.find(e => e.type === 'player');
    if (player && player.position) {
      this.renderer.renderLuminance(player.position.x, player.position.y, 250);
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('load', () => {
  new Game();
});
