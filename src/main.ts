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
import { GameState, gameStateManager } from './core/game-state';
import { createCombatSystem, playerAction } from './systems/combat';
import { createAnimationSystem, setAnimation } from './systems/animation';
import { createParticleSystem } from './systems/particles';

class Game {
  renderer: Renderer;
  audio: AudioMixer;
  loader: AssetLoader;
  keyboard: Keyboard;
  level: Level;
  
  systems: ((dt: number) => void)[];
  lastTime: number = 0;

  constructor() {
    this.renderer = new Renderer('game-canvas');
    this.audio = new AudioMixer();
    this.loader = new AssetLoader();
    this.keyboard = new Keyboard();
    
    // Generate Level
    this.level = LevelGenerator.generate(50, 50, 64);

    // Initialize systems
    this.systems = [
      createAnimationSystem(),
      createPlayerSystem(this.keyboard),
      createStatsSystem(),
      createInteractionSystem(this.keyboard),
      createAISystem(),
      createCombatSystem(),
      createPhysicsSystem(this.level),
      createParticleSystem(),
      createUISystem(),
    ];

    console.log('Phase 4: Combat, Animation & Damage Initialized');
    this.setupWorld();
    this.bindUI();
    this.start();
  }

  bindUI() {
    document.getElementById('btn-strike')?.addEventListener('click', () => playerAction('strike'));
    document.getElementById('btn-guard')?.addEventListener('click', () => playerAction('guard'));
    document.getElementById('btn-heal')?.addEventListener('click', () => playerAction('heal'));
    document.getElementById('btn-retreat')?.addEventListener('click', () => {
      addLogEntry('Attempting to retreat...', 'system');
      // Logic for retreat could be added here
    });
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
      sprite: { assetId: 'player', frame: 0, width: 32, height: 32 },
      animator: {
        sequences: {
          idle: { frames: [0, 1], speed: 500, loop: true },
          walk: { frames: [2, 3], speed: 200, loop: true },
          die: { frames: [4], speed: 1000, loop: false }
        },
        currentSequence: 'idle',
        currentFrameIndex: 0,
        elapsedTime: 0,
        isFinished: false
      },
      combat: {
        isPlayerTurn: true,
        engagedWith: '',
        baseDamage: 25,
        defenseModifier: 1.0,
        hitFlashTimer: 0
      }
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
          health: { current: 50, max: 50 },
          sprite: { assetId: 'monster', frame: 0, width: 32, height: 32 },
          ai: {
            fsm: createMonsterFSM(this.level),
            currentState: 'idle',
            detectionRadius: 200,
            visionAngle: 90,
          },
          combat: {
            isPlayerTurn: false,
            engagedWith: '',
            baseDamage: 10,
            defenseModifier: 1.0,
            hitFlashTimer: 0
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
            sprite: { assetId: 'item-code', frame: 0, width: 16, height: 16 }
          });
        }
      }
    });

    addLogEntry('Welcome to THE ABYSS.', 'system');
  }

  start() {
    requestAnimationFrame((time) => {
      this.lastTime = time;
      this.loop(time);
    });
  }

  loop(time: number) {
    const dt = time - this.lastTime;
    this.lastTime = time;

    // Update systems
    for (const system of this.systems) {
      system(dt);
    }

    // Update Camera to follow player
    const player = world.entities.find(e => e.type === 'player');
    if (player && player.position) {
      this.renderer.camera.x = player.position.x;
      this.renderer.camera.y = player.position.y;

      // Toggle walk/idle animation
      if (gameStateManager.state === GameState.EXPLORATION) {
        const isMoving = player.velocity && (Math.abs(player.velocity.x) > 0.5 || Math.abs(player.velocity.y) > 0.5);
        setAnimation(player, isMoving ? 'walk' : 'idle');
      }
    }

    // Render
    this.renderer.clear();
    this.renderer.renderLevel(this.level);

    // Draw entities
    for (const entity of world.entities) {
      if (entity.type === 'particle') continue;
      this.renderer.renderEntity(entity, this.loader);
    }

    this.renderer.renderParticles(world.entities);

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
