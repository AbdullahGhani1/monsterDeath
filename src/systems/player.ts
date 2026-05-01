import { world } from '../core/ecs/world';
import { Keyboard } from '../core/input/keyboard';

export const createPlayerSystem = (keyboard: Keyboard) => {
  const ACCELERATION = 0.5;
  const FRICTION = 0.9;
  const MAX_SPEED = 5;

  return () => {
    const players = world.entities.filter((e) => e.type === 'player');

    for (const player of players) {
      if (!player.velocity || !player.position) continue;

      // Apply acceleration from input
      player.velocity.x += keyboard.axisX * ACCELERATION;
      player.velocity.y += keyboard.axisY * ACCELERATION;

      // Apply friction
      player.velocity.x *= FRICTION;
      player.velocity.y *= FRICTION;

      // Clamp speed
      const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
      if (speed > MAX_SPEED) {
        const ratio = MAX_SPEED / speed;
        player.velocity.x *= ratio;
        player.velocity.y *= ratio;
      }
    }
  };
};
