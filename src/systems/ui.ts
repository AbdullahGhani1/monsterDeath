import { world } from '../core/ecs/world';

export const createUISystem = () => {
  const playerHPBar = document.getElementById('player-health-bar') as HTMLElement;
  const playerStaminaBar = document.getElementById('player-stamina-bar') as HTMLElement;
  const mPlayerHP = document.getElementById('m-player-health') as HTMLElement;
  const mPlayerStamina = document.getElementById('m-player-stamina') as HTMLElement;
  const monsterHPBar = document.getElementById('monster-health-bar') as HTMLElement;
  const hitFlash = document.getElementById('hit-flash') as HTMLElement;

  return () => {
    const player = world.entities.find((e) => e.type === 'player');
    const monsterId = player?.combat?.engagedWith;
    const monster = monsterId ? world.entities.find((e) => e.id === monsterId) : null;

    if (player) {
      if (player.health) {
        const percent = (player.health.current / player.health.max) * 100;
        if (playerHPBar) playerHPBar.style.width = `${percent}%`;
        if (mPlayerHP) mPlayerHP.style.width = `${percent}%`;
      }
      if (player.stamina) {
        const percent = (player.stamina.current / player.stamina.max) * 100;
        if (playerStaminaBar) playerStaminaBar.style.width = `${percent}%`;
        if (mPlayerStamina) mPlayerStamina.style.width = `${percent}%`;
      }

      // Hit Flash (Player side)
      if (player.combat && hitFlash) {
        hitFlash.style.display = player.combat.hitFlashTimer > 0 ? 'block' : 'none';
      }
    }

    if (monster && monster.health && monsterHPBar) {
      const percent = (monster.health.current / monster.health.max) * 100;
      monsterHPBar.style.width = `${percent}%`;
    } else if (monsterHPBar) {
      monsterHPBar.style.width = '0%';
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
    logBody.scrollTop = logBody.scrollHeight;
    
    while (logBody.children.length > 15) {
      logBody.removeChild(logBody.firstChild!);
    }
  }
};
