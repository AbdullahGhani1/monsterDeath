import { world } from '../core/ecs/world';
import { Level, TileType } from '../core/level/level';

export const createPhysicsSystem = (level: Level) => {
  return () => {
    const entities = world.entities.filter((e) => e.position && e.velocity);

    for (const entity of entities) {
      if (!entity.position || !entity.velocity) continue;

      const nextX = entity.position.x + entity.velocity.x;
      const nextY = entity.position.y + entity.velocity.y;

      const tx = Math.floor(nextX / level.tileSize);
      const ty = Math.floor(nextY / level.tileSize);

      if (level.getTile(tx, ty) !== TileType.WALL) {
        entity.position.x = nextX;
        entity.position.y = nextY;
      } else {
        // Simple collision: stop velocity
        entity.velocity.x = 0;
        entity.velocity.y = 0;
      }
    }
  };
};
