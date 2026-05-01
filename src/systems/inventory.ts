import { world, Entity } from '../core/ecs/world';
import { addLogEntry } from './ui';

export const createInventorySystem = () => {
  return () => {
    const player = world.entities.find((e) => e.type === 'player' && e.inventory);
    if (!player || !player.position || !player.inventory) return;

    // Pick up items in range
    const items = world.entities.filter((e) => e.type === 'item' && e.position);
    for (const item of items) {
      const dx = player.position.x - item.position!.x;
      const dy = player.position.y - item.position!.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 30) {
        addItemToInventory(player, item.id.split('-')[0]); // Use ID prefix as item name
        addLogEntry(`Acquired: ${item.id}`, 'system');
        world.remove(item);
        
        // Mission Progress (if applicable)
        if (player.missions) {
          for (const m of player.missions.active) {
            if (m.type === 'interact' && m.target === item.id) {
              m.current++;
              if (m.current >= m.required) m.completed = true;
            }
          }
        }
      }
    }
  };
};

export const addItemToInventory = (player: Entity, itemId: string) => {
  if (!player.inventory) return;
  const existing = player.inventory.items.find((i) => i.id === itemId);
  if (existing) {
    existing.count++;
  } else {
    player.inventory.items.push({ id: itemId, count: 1 });
  }

  // Handle special items
  if (itemId === 'night-vision') {
    if (player.nightVision) player.nightVision.hasGoggles = true;
  }
};

export const hasItem = (player: Entity, itemId: string, count: number = 1): boolean => {
  if (!player.inventory) return false;
  const item = player.inventory.items.find((i) => i.id === itemId);
  return (item?.count || 0) >= count;
};

export const removeItem = (player: Entity, itemId: string, count: number = 1) => {
  if (!player.inventory) return;
  const item = player.inventory.items.find((i) => i.id === itemId);
  if (item) {
    item.count -= count;
    if (item.count <= 0) {
      player.inventory.items = player.inventory.items.filter((i) => i.id !== itemId);
    }
  }
};
