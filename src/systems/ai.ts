import { world, Entity } from '../core/ecs/world';
import { Level } from '../core/level/level';
import { AStar, Point } from '../core/ai/astar';
import { AIState, StateMachine } from '../core/ai/fsm';

export const createMonsterFSM = (level: Level) => {
  const states = new Map<string, AIState>();

  states.set('idle', {
    name: 'idle',
    update: (entity: Entity) => {
      const player = world.entities.find((e) => e.type === 'player');
      if (player && player.position && entity.position && entity.ai) {
        const dist = Math.sqrt(
          (player.position.x - entity.position.x) ** 2 +
          (player.position.y - entity.position.y) ** 2
        );
        if (dist < entity.ai.detectionRadius) return 'pursuit';
      }
      if (Math.random() < 0.01) return 'patrol';
      return null;
    },
  });

  states.set('patrol', {
    name: 'patrol',
    enter: (entity: Entity) => {
      if (!entity.position) return;
      const target: Point = {
        x: Math.floor((entity.position.x + (Math.random() - 0.5) * 400) / level.tileSize),
        y: Math.floor((entity.position.y + (Math.random() - 0.5) * 400) / level.tileSize),
      };
      const start: Point = {
        x: Math.floor(entity.position.x / level.tileSize),
        y: Math.floor(entity.position.y / level.tileSize),
      };
      
      const path = AStar.findPath(level, start, target);
      if (path) {
        entity.path = { points: path, currentIndex: 0 };
      }
    },
    update: (entity: Entity) => {
      if (!entity.path || entity.path.currentIndex >= entity.path.points.length) return 'idle';
      
      const player = world.entities.find((e) => e.type === 'player');
      if (player && player.position && entity.position && entity.ai) {
        const dist = Math.sqrt(
          (player.position.x - entity.position.x) ** 2 +
          (player.position.y - entity.position.y) ** 2
        );
        if (dist < entity.ai.detectionRadius) return 'pursuit';
      }

      // Move along path
      const targetPoint = entity.path.points[entity.path.currentIndex];
      const targetX = targetPoint.x * level.tileSize + level.tileSize / 2;
      const targetY = targetPoint.y * level.tileSize + level.tileSize / 2;

      if (!entity.position || !entity.velocity) return 'idle';

      const dx = targetX - entity.position.x;
      const dy = targetY - entity.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        entity.path.currentIndex++;
      } else {
        entity.velocity.x += (dx / dist) * 0.2;
        entity.velocity.y += (dy / dist) * 0.2;
      }

      return null;
    },
  });

  states.set('pursuit', {
    name: 'pursuit',
    update: (entity: Entity) => {
      const player = world.entities.find((e) => e.type === 'player');
      if (!player || !player.position || !entity.position || !entity.velocity || !entity.ai) return 'idle';

      const dx = player.position.x - entity.position.x;
      const dy = player.position.y - entity.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > entity.ai.detectionRadius * 1.5) return 'idle';

      entity.velocity.x += (dx / dist) * 0.4;
      entity.velocity.y += (dy / dist) * 0.4;

      return null;
    },
  });

  return new StateMachine(states);
};

export const createAISystem = () => {
  return () => {
    const monsters = world.entities.filter((e) => e.type === 'monster' && e.ai);
    for (const monster of monsters) {
      monster.ai!.fsm.tick(monster, monster.ai!.currentState);
    }
  };
};
