import { world } from '../core/ecs/world';

export const createUISystem = () => {
  const playerHPBar = document.getElementById('player-health-bar') as HTMLElement;
  const playerStaminaBar = document.getElementById('player-stamina-bar') as HTMLElement;
  const monsterHPBar = document.getElementById('monster-health-bar') as HTMLElement;

  return () => {
    const player = world.entities.find((e) => e.type === 'player');
    const monster = world.entities.find((e) => e.type === 'monster');

    if (player) {
      if (player.health && playerHPBar) {
        const percent = (player.health.current / player.health.max) * 100;
        playerHPBar.style.width = `${percent}%`;
      }
      if (player.stamina && playerStaminaBar) {
        const percent = (player.stamina.current / player.stamina.max) * 100;
        playerStaminaBar.style.width = `${percent}%`;
      }
    }

    if (monster && monster.health && monsterHPBar) {
      const percent = (monster.health.current / monster.health.max) * 100;
      monsterHPBar.style.width = `${percent}%`;
    }
  };
};

export const addLogEntry = (text: string, type: 'player' | 'monster' | 'system' = 'system') => {
  const logBody = document.getElementById('log-body');
  if (logBody) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `> ${text}`;
    logBody.appendChild(entry);
    
    // Auto-scroll to bottom
    logBody.scrollTop = logBody.scrollHeight;
    
    // Keep only last 10 entries for performance
    while (logBody.children.length > 10) {
      logBody.removeChild(logBody.firstChild!);
    }
  }
};
