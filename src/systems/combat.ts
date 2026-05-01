import { world, Entity } from '../core/ecs/world';
import { GameState, gameStateManager } from '../core/game-state';
import { addLogEntry } from './ui';
import { setAnimation } from './animation';
import { spawnDebris } from './particles';

export const createCombatSystem = () => {
  const ENGAGEMENT_DISTANCE = 80;

  return (dt: number) => {
    const player = world.entities.find((e) => e.type === 'player');
    if (!player || !player.position || !player.combat) return;

    // 1. Proximity Engagement (if not in combat)
    if (gameStateManager.state === GameState.EXPLORATION) {
      const monsters = world.entities.filter((e) => e.type === 'monster' && e.position);
      for (const monster of monsters) {
        const dx = player.position.x - monster.position!.x;
        const dy = player.position.y - monster.position!.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ENGAGEMENT_DISTANCE) {
          enterCombat(player, monster);
          break;
        }
      }
    }

    // 2. Combat Flash Timer
    const entitiesWithCombat = world.entities.filter(e => e.combat);
    for (const e of entitiesWithCombat) {
      if (e.combat!.hitFlashTimer > 0) {
        e.combat!.hitFlashTimer -= dt;
      }
    }

    // 3. Turn-Based Logic (Monsters turn)
    if (gameStateManager.state === GameState.COMBAT && !player.combat.isPlayerTurn) {
      const target = world.entities.find(e => e.id === player.combat!.engagedWith);
      if (target) {
        // Monster attacks player
        setTimeout(() => executeMonsterTurn(target, player), 1000);
        player.combat.isPlayerTurn = true; // Wait for monster action
      } else {
        exitCombat(player);
      }
    }
  };
};

const enterCombat = (player: Entity, monster: Entity) => {
  gameStateManager.state = GameState.COMBAT;
  player.combat!.engagedWith = monster.id;
  player.combat!.isPlayerTurn = true;
  monster.combat = monster.combat || { 
    isPlayerTurn: false, 
    engagedWith: player.id, 
    baseDamage: 10, 
    defenseModifier: 1, 
    hitFlashTimer: 0 
  };
  
  addLogEntry(`Engaged with ${monster.id}!`, 'system');
  setAnimation(player, 'idle');
  if (monster.velocity) {
    monster.velocity.x = 0;
    monster.velocity.y = 0;
  }
};

const exitCombat = (player: Entity) => {
  gameStateManager.state = GameState.EXPLORATION;
  player.combat!.engagedWith = '';
  addLogEntry('Left combat.', 'system');
};

const executeMonsterTurn = (monster: Entity, player: Entity) => {
  if (!monster.combat || !player.health || !player.combat) return;

  const dmg = Math.floor(monster.combat.baseDamage * player.combat.defenseModifier);
  player.health.current = Math.max(0, player.health.current - dmg);
  player.combat.defenseModifier = 1.0; // Reset player guard
  player.combat.hitFlashTimer = 200;

  addLogEntry(`${monster.id} strikes for ${dmg} damage!`, 'monster');
  
  if (player.health.current <= 0) {
    addLogEntry('VANGUARD DEFEATED.', 'system');
    setAnimation(player, 'die');
  } else {
    player.combat.isPlayerTurn = true;
  }
};

export const playerAction = (type: 'strike' | 'guard' | 'heal') => {
  const player = world.entities.find(e => e.type === 'player');
  const monster = world.entities.find(e => e.id === player?.combat?.engagedWith);
  
  if (!player || !player.combat || !player.combat.isPlayerTurn || gameStateManager.state !== GameState.COMBAT) return;

  if (type === 'strike' && monster && monster.health && monster.combat) {
    const dmg = player.combat.baseDamage;
    monster.health.current = Math.max(0, monster.health.current - dmg);
    monster.combat.hitFlashTimer = 200;
    addLogEntry(`You strike for ${dmg} damage.`, 'player');
    
    if (monster.health.current <= 0) {
      addLogEntry(`${monster.id} slain!`, 'system');
      if (monster.position) {
        spawnDebris(monster.position.x, monster.position.y, '#ffb4ab');
      }
      world.remove(monster);
      exitCombat(player);
    } else {
      player.combat.isPlayerTurn = false;
    }
  } else if (type === 'guard') {
    player.combat.defenseModifier = 0.5;
    addLogEntry('You brace for impact.', 'player');
    player.combat.isPlayerTurn = false;
  } else if (type === 'heal' && player.health) {
    const heal = 20;
    player.health.current = Math.min(player.health.max, player.health.current + heal);
    addLogEntry(`You consume an elixir. +${heal} HP`, 'player');
    player.combat.isPlayerTurn = false;
  }
};
