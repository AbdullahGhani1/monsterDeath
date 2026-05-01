import { Renderer } from './core/renderer/renderer';
import { AudioMixer } from './core/audio/mixer';
import { AssetLoader } from './assets/loader';
import { world, Entity } from './core/ecs/world';
import { Keyboard } from './core/input/keyboard';
import { createPlayerSystem } from './systems/player';
import { createStatsSystem } from './systems/stats';
import { createUISystem, addLogEntry, togglePDA, showLevelSplash, showVictory } from './systems/ui';
import { createInteractionSystem } from './systems/interaction';
import { LevelGenerator } from './core/level/generator';
import { createAISystem, createMonsterFSM } from './systems/ai';
import { createPhysicsSystem } from './systems/physics';
import { Level } from './core/level/level';
import { GameState, gameStateManager } from './core/game-state';
import { createCombatSystem, playerAction } from './systems/combat';
import { createAnimationSystem, setAnimation } from './systems/animation';
import { createParticleSystem } from './systems/particles';
import { createInventorySystem } from './systems/inventory';
import { levelManager } from './core/level/manager';

class Game {
  renderer: Renderer;
  audio: AudioMixer;
  loader: AssetLoader;
  keyboard: Keyboard;
  level!: Level;
  
  systems: ((dt: number) => void)[] = [];
  lastTime: number = 0;

  constructor() {
    this.renderer = new Renderer('game-canvas');
    this.audio = new AudioMixer();
    this.loader = new AssetLoader();
    this.keyboard = new Keyboard();

    console.log('Phase 7: Optimization & Polish');
    this.init();
  }

  async init() {
    // Preload Assets
    await this.loader.loadImage('player', 'assets/3d_character_model_of_a_dark_fantasy_mercenary_protagonist._battle_worn_but/screen.png');
    await this.loader.loadImage('swarm', 'assets/3d_monster_model_design_level_1_enemy._shadow_stalker_an_emaciated_hunched/screen.png');
    await this.loader.loadImage('brute', 'assets/3d_monster_model_design_level_2_enemy._ironhide_behemoth_a_massive_hulking/screen.png');
    await this.loader.loadImage('hexer', 'assets/3d_monster_model_design_level_3_enemy._plague_weaver_a_floating_skeletal_mage/screen.png');
    await this.loader.loadImage('warden', 'assets/3d_monster_model_design_level_4_enemy._corrupted_warden_a_fallen_knight_acting/screen.png');
    await this.loader.loadImage('sovereign', 'assets/3d_monster_model_design_level_5_final_boss_the_abyssal_sovereign._a_towering/screen.png');
    
    // Preload Audio
    try {
      const music = await this.loader.loadAudio('bg-music', 'assets/The_Iron_Rite.mp3', (this.audio as unknown as { context: AudioContext }).context);
      this.audio.playSound(music, 'music');
    } catch {
      console.warn('Audio could not be loaded or auto-played.');
    }

    this.startLevel();
    this.bindUI();
    this.start();
  }

  startLevel() {
    const config = levelManager.getNextBiome();
    if (!config) {
      showVictory();
      return;
    }

    showLevelSplash(levelManager.currentLevel, config.levelTitle);
    
    const playerEntity = world.entities.find(e => e.type === 'player');
    const existingEntities = [...world.entities];
    for (const e of existingEntities) {
      if (e.type !== 'player' && e.type !== 'particle') world.remove(e);
    }

    this.level = LevelGenerator.generate(50, 50, 64, config);

    this.systems = [
      createAnimationSystem(),
      createPlayerSystem(this.keyboard),
      createStatsSystem(),
      createInteractionSystem(this.keyboard),
      createAISystem(),
      createCombatSystem(),
      createInventorySystem(),
      createPhysicsSystem(this.level),
      createParticleSystem(),
      createUISystem(),
    ];

    this.setupWorld(playerEntity);
  }

  advanceLevel() {
    levelManager.advance();
    this.startLevel();
  }

  bindUI() {
    document.getElementById('btn-strike')?.addEventListener('click', () => {
      playerAction('strike', () => this.advanceLevel());
      this.renderer.triggerShake(200, 5);
    });
    document.getElementById('btn-guard')?.addEventListener('click', () => playerAction('guard'));
    document.getElementById('btn-heal')?.addEventListener('click', () => playerAction('heal'));
    
    document.getElementById('btn-nvg')?.addEventListener('click', () => {
      const player = world.entities.find(e => e.type === 'player');
      if (player && player.nightVision) {
        if (player.nightVision.hasGoggles) {
          player.nightVision.isActive = !player.nightVision.isActive;
          addLogEntry(`Night Vision ${player.nightVision.isActive ? 'ON' : 'OFF'}`, 'system');
        } else {
          addLogEntry('Night Vision Goggles required.', 'system');
        }
      }
    });

    document.getElementById('nav-pda')?.addEventListener('click', () => {
      togglePDA();
      this.audio.applyDampening(document.getElementById('pda-modal')?.style.display === 'block');
    });

    document.getElementById('pda-close')?.addEventListener('click', () => {
      this.audio.applyDampening(false);
    });

    document.getElementById('nav-battle')?.addEventListener('click', () => {
       const pdaModal = document.getElementById('pda-modal');
       if (pdaModal) pdaModal.style.display = 'none';
       this.audio.applyDampening(false);
    });
  }

  setupWorld(existingPlayer: Entity | undefined) {
    const config = levelManager.getNextBiome()!;

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

    if (existingPlayer) {
        existingPlayer.position = { x: startX, y: startY };
        existingPlayer.velocity = { x: 0, y: 0 };
        existingPlayer.missions = {
            active: [
                { 
                    id: `${config.monsterType === 'sovereign' ? 'Final Boss' : 'Elimination'}`, 
                    type: 'kill', 
                    target: config.monsterType, 
                    current: 0, 
                    required: config.monsterCount, 
                    completed: false 
                }
            ]
        };
    } else {
        const img = this.loader.getImage('player')!;
        world.add({
            id: 'player-1',
            type: 'player',
            position: { x: startX, y: startY },
            velocity: { x: 0, y: 0 },
            health: { current: 100, max: 100 },
            stamina: { current: 100, max: 100, regen: 0.2 },
            sprite: { assetId: 'player', frame: 0, width: img.width, height: img.height },
            animator: {
              sequences: {
                idle: { frames: [0], speed: 500, loop: true },
                walk: { frames: [0], speed: 200, loop: true },
                die: { frames: [0], speed: 1000, loop: false }
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
            },
            inventory: {
              items: [],
              maxCapacity: 20
            },
            missions: {
              active: [
                { id: 'Elimination', type: 'kill', target: 'swarm', current: 0, required: 5, completed: false }
              ]
            },
            nightVision: {
              isActive: false,
              hasGoggles: true
            }
          });
    }

    for (let i = 0; i < config.monsterCount; i++) {
      const mx = Math.floor(Math.random() * this.level.width);
      const my = Math.floor(Math.random() * this.level.height);
      
      if (this.level.isPassable(mx, my)) {
        const isBoss = config.monsterType === 'sovereign';
        let hp = 50;
        let dmg = 10;
        let radius = config.lightRadius;
        
        if (config.monsterType === 'brute') { hp = 150; dmg = 15; }
        if (config.monsterType === 'hexer') { hp = 40; dmg = 25; radius = 400; }
        if (config.monsterType === 'warden') { hp = 100; dmg = 20; }
        if (isBoss) { hp = 800; dmg = 35; }

        const mImg = this.loader.getImage(config.monsterType)!;

        world.add({
          id: `${config.monsterType}-${i}`,
          type: 'monster',
          position: { x: mx * 64 + 32, y: my * 64 + 32 },
          velocity: { x: 0, y: 0 },
          health: { current: hp, max: hp },
          sprite: { assetId: config.monsterType, frame: 0, width: mImg.width, height: mImg.height },
          ai: {
            fsm: createMonsterFSM(this.level),
            currentState: 'idle',
            detectionRadius: radius,
            visionAngle: 90,
            attackRange: 50,
            attackCooldown: 2000,
            lastAttackTime: 0
          },
          combat: {
            isPlayerTurn: false,
            engagedWith: '',
            baseDamage: dmg,
            defenseModifier: 1.0,
            hitFlashTimer: 0,
            phase: 1
          }
        });
      }
    }

    addLogEntry(`Entered ${config.levelTitle}.`, 'system');
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

    for (const system of this.systems) {
      system(dt);
    }

    const player = world.entities.find(e => e.type === 'player');
    if (player && player.position) {
      this.renderer.camera.x = player.position.x;
      this.renderer.camera.y = player.position.y;

      if (gameStateManager.state === GameState.EXPLORATION) {
        const isMoving = player.velocity && (Math.abs(player.velocity.x) > 0.5 || Math.abs(player.velocity.y) > 0.5);
        setAnimation(player, isMoving ? 'walk' : 'idle');
      }
    }

    this.renderer.clear();
    this.renderer.renderLevel(this.level);

    for (const entity of world.entities) {
      if (entity.type === 'particle') continue;
      this.renderer.renderEntity(entity, this.loader);
    }

    this.renderer.renderParticles(world.entities as { type: string, position?: { x: number, y: number }, particle?: { color: string, life: number, maxLife: number, size: number, active: boolean } }[]);

    if (player && player.position) {
      const config = levelManager.getNextBiome();
      this.renderer.renderLuminance(
        player.position.x, 
        player.position.y, 
        config?.lightRadius || 300, 
        player.nightVision?.isActive
      );
    }

    this.renderer.resetTransform();
    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('load', () => {
  new Game();
});
