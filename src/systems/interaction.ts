import { world, Entity } from '../core/ecs/world';
import { Keyboard } from '../core/input/keyboard';

export const createInteractionSystem = (keyboard: Keyboard) => {
  const prompt = document.getElementById('interaction-prompt');

  return () => {
    const player = world.entities.find((e) => e.type === 'player');
    if (!player || !player.position) return;

    const interactables = world.entities.filter((e) => e.interactive && e.position);
    let closest: Entity | null = null;
    let minDistance = Infinity;

    for (const item of interactables) {
      const dist = Math.sqrt(
        (player.position.x - item.position!.x) ** 2 +
        (player.position.y - item.position!.y) ** 2
      );

      if (dist < item.interactive!.radius && dist < minDistance) {
        minDistance = dist;
        closest = item;
      }
    }

    if (closest) {
      if (prompt) prompt.style.display = 'block';
      if (keyboard.isDown('Space')) {
        closest.interactive!.onInteract(player);
      }
    } else {
      if (prompt) prompt.style.display = 'none';
    }
  };
};
