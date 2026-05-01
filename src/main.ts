import { Renderer } from './core/renderer/renderer';
import { AudioMixer } from './core/audio/mixer';
import { AssetLoader } from './assets/loader';
import { world } from './core/ecs/world';
import { Keyboard } from './core/input/keyboard';
import { createPlayerSystem } from './systems/player';
import { createStatsSystem } from './systems/stats';
import { createUISystem, addLogEntry } from './systems/ui';
import { createInteractionSystem } from './systems/interaction';
import { LevelGenerator } from './core/level/generator';
import { createAISystem, createMonsterFSM } from './systems/ai';
import { createPhysicsSystem } from './systems/physics';
import { Level } from './core/level/level';

class Game {
  renderer: Renderer;
  audio: AudioMixer;
  loader: AssetLoader;
  keyboard: Keyboard;
  level: Level;
  
  systems: (() => void)[];

  constructor() {
    this.renderer = new Renderer('game-canvas');
    this.audio = new AudioMixer();
    this.loader = new AssetLoader();
    this.keyboard = new Keyboard();
    
    // Generate Level
    this.level = LevelGenerator.generate(50, 50, 64);

    // Initialize systems
    this.systems = [
      createPlayerSystem(this.keyboard),
      createStatsSystem(),
      createInteractionSystem(this.keyboard),
      createAISystem(),
      createPhysicsSystem(this.level),
      createUISystem(),
    ];

    console.log('Phase 3: AI & Navigation Initialized');
    this.setupWorld();
    this.start();
  }

  setupWorld() {
    // Find a valid floor tile for player
    let startX = 25 * 64;
    let startY = 25 * 64;
    
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        if (this.level.isPassable(x, y)) {
          startX = x * 64 + 32;
          startY = y * 64 + 32;
          break;
        }
      }
    }

    // Player
    world.add({
      id: 'player-1',
      type: 'player',
      position: { x: startX, y: startY },
      velocity: { x: 0, y: 0 },
      health: { current: 100, max: 100 },
      stamina: { current: 100, max: 100, regen: 0.2 },
    });

    // Spawn some monsters
    for (let i = 0; i < 5; i++) {
      const mx = Math.floor(Math.random() * this.level.width);
      const my = Math.floor(Math.random() * this.level.height);
      
      if (this.level.isPassable(mx, my)) {
        world.add({
          id: `monster-${i}`,
          type: 'monster',
          position: { x: mx * 64 + 32, y: my * 64 + 32 },
          velocity: { x: 0, y: 0 },
          health: { current: 100, max: 100 },
          ai: {
            fsm: createMonsterFSM(this.level),
            currentState: 'idle',
            detectionRadius: 200,
            visionAngle: 90,
          }
        });
      }
    }

    // Interactive Switch
    world.add({
      id: 'switch-1',
      type: 'switch',
      position: { x: startX + 100, y: startY + 100 },
      interactive: {
        radius: 50,
        onInteract: () => {
          addLogEntry('You flipped a heavy iron switch.', 'player');
          addLogEntry('A secret compartment opens...', 'system');
          
          world.add({
            id: 'access-code-1',
            type: 'item',
            position: { x: startX + 120, y: startY + 120 },
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

    // Update Camera to follow player
    const player = world.entities.find(e => e.type === 'player');
    if (player && player.position) {
      this.renderer.camera.x = player.position.x;
      this.renderer.camera.y = player.position.y;
    }

    // Render
    this.renderer.clear();
    
    // Draw Level
    this.renderer.renderLevel(this.level);

    const ctx = this.renderer.ctx;
    
    // Draw entities
    for (const entity of world.entities) {
      if (!entity.position) continue;
      
      const screenPos = this.renderer.camera.worldToScreen(entity.position.x, entity.position.y);
      
      if (entity.type === 'player') {
        ctx.fillStyle = '#ffb4a8';
        ctx.fillRect(screenPos.x - 15, screenPos.y - 15, 30, 30);
      } else if (entity.type === 'monster') {
        ctx.fillStyle = '#ffb4ab'; // --color-error
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - 15);
        ctx.lineTo(screenPos.x - 15, screenPos.y + 15);
        ctx.lineTo(screenPos.x + 15, screenPos.y + 15);
        ctx.fill();
      } else if (entity.type === 'switch') {
        if (player && player.position && entity.interactive) {
          const dist = Math.sqrt(
            (player.position.x - entity.position.x) ** 2 +
            (player.position.y - entity.position.y) ** 2
          );
          if (dist < entity.interactive.radius) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#dfc29f';
          }
        }
        ctx.strokeStyle = '#8b7355';
        ctx.strokeRect(screenPos.x - 10, screenPos.y - 10, 20, 20);
        ctx.shadowBlur = 0;
      } else if (entity.type === 'item') {
        ctx.fillStyle = '#82db6f';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Apply Player Luminance
    if (player && player.position) {
      this.renderer.renderLuminance(player.position.x, player.position.y, 300);
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('load', () => {
  new Game();
});
