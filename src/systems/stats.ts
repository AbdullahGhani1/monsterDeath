import { world } from '../core/ecs/world';

export const createStatsSystem = () => {
  return () => {
    const entities = world.entities.filter((e) => e.health || e.stamina);

    for (const entity of entities) {
      if (entity.stamina) {
        // Regenerate stamina if not moving fast
        const isMoving = entity.velocity ? (Math.abs(entity.velocity.x) > 0.1 || Math.abs(entity.velocity.y) > 0.1) : false;
        
        if (!isMoving && entity.stamina.current < entity.stamina.max) {
          entity.stamina.current = Math.min(entity.stamina.max, entity.stamina.current + entity.stamina.regen);
        } else if (isMoving) {
          // Subtle drain while moving
          entity.stamina.current = Math.max(0, entity.stamina.current - 0.05);
        }
      }
    }
  };
};
