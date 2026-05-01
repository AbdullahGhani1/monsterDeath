import { Entity } from '../core/ecs/world';
import { hasItem, removeItem, addItemToInventory } from './inventory';
import { addLogEntry } from './ui';

export type Recipe = {
  result: string;
  ingredients: { id: string; count: number }[];
};

export const RECIPES: Recipe[] = [
  {
    result: 'Abyssal Blade',
    ingredients: [
      { id: 'Broken Hilt', count: 1 },
      { id: 'Shadow Essence', count: 5 },
    ],
  },
  {
    result: 'Ironbark Plating',
    ingredients: [
      { id: 'Iron Ore', count: 3 },
      { id: 'Bark', count: 1 },
      { id: 'Ember', count: 1 },
    ],
  },
];

export const craftItem = (player: Entity, recipe: Recipe) => {
  // Check if player has all ingredients
  const canCraft = recipe.ingredients.every((ing) => hasItem(player, ing.id, ing.count));

  if (canCraft) {
    // Remove ingredients
    recipe.ingredients.forEach((ing) => removeItem(player, ing.id, ing.count));
    
    // Add result
    addItemToInventory(player, recipe.result);
    addLogEntry(`Crafted: ${recipe.result}`, 'system');
    
    // Update combat stats if it's a weapon
    if (recipe.result === 'Abyssal Blade' && player.combat) {
      player.combat.baseDamage += 20;
      addLogEntry('Base damage increased!', 'system');
    }
    
    return true;
  } else {
    addLogEntry('Insufficient materials for crafting.', 'system');
    return false;
  }
};
