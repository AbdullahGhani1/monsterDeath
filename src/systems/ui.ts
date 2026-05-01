import { world } from '../core/ecs/world';
import { RECIPES, craftItem } from './crafting';

export const createUISystem = () => {
  const playerHPBar = document.getElementById('player-health-bar') as HTMLElement;
  const playerStaminaBar = document.getElementById('player-stamina-bar') as HTMLElement;
  const mPlayerHP = document.getElementById('m-player-health') as HTMLElement;
  const mPlayerStamina = document.getElementById('m-player-stamina') as HTMLElement;
  const monsterHPBar = document.getElementById('monster-health-bar') as HTMLElement;
  const hitFlash = document.getElementById('hit-flash') as HTMLElement;
  
  const pdaModal = document.getElementById('pda-modal') as HTMLElement;
  const pdaContent = document.getElementById('pda-content') as HTMLElement;

  let currentTab = 'inv';

  // PDA Tab Listeners
  document.getElementById('tab-inv')?.addEventListener('click', () => { currentTab = 'inv'; renderPDA(); });
  document.getElementById('tab-craft')?.addEventListener('click', () => { currentTab = 'craft'; renderPDA(); });
  document.getElementById('tab-mission')?.addEventListener('click', () => { currentTab = 'mission'; renderPDA(); });
  document.getElementById('pda-close')?.addEventListener('click', () => { pdaModal.style.display = 'none'; });

  const renderPDA = () => {
    const player = world.entities.find(e => e.type === 'player');
    if (!player || !pdaContent) return;

    if (currentTab === 'inv') {
      const items = player.inventory?.items || [];
      pdaContent.innerHTML = `
        <h3 style="font-family:var(--font-mono); color:var(--color-tertiary); margin-bottom:15px;">TACTICAL INVENTORY</h3>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px;">
          ${items.map(i => `
            <div class="panel" style="aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:10px;">
              <span class="material-symbols-outlined">inventory_2</span>
              <span>${i.id}</span>
              <span style="color:var(--color-secondary)">x${i.count}</span>
            </div>
          `).join('')}
          ${Array(8 - items.length).fill(0).map(() => `<div class="panel" style="aspect-ratio:1; opacity:0.3; border-style:dashed;"></div>`).join('')}
        </div>
      `;
    } else if (currentTab === 'craft') {
      pdaContent.innerHTML = `
        <h3 style="font-family:var(--font-mono); color:var(--color-tertiary); margin-bottom:15px;">THE FORGE</h3>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${RECIPES.map(r => {
            const canCraft = r.ingredients.every(ing => {
              const item = player.inventory?.items.find(i => i.id === ing.id);
              return (item?.count || 0) >= ing.count;
            });
            return `
              <div class="panel" style="display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${canCraft ? 'var(--color-secondary)' : 'var(--color-outline-variant)'}">
                <div>
                  <div style="font-weight:bold;">${r.result}</div>
                  <div style="font-size:10px; opacity:0.7;">REQ: ${r.ingredients.map(ing => `${ing.count}x ${ing.id}`).join(', ')}</div>
                </div>
                <button class="action-btn" style="height:30px; width:80px; font-size:10px;" ${canCraft ? '' : 'disabled'} id="craft-${r.result.replace(/\s/g, '-')}">
                  CRAFT
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      // Bind craft buttons
      RECIPES.forEach(r => {
        const btn = document.getElementById(`craft-${r.result.replace(/\s/g, '-')}`);
        btn?.addEventListener('click', () => {
          if (craftItem(player, r)) renderPDA();
        });
      });

    } else if (currentTab === 'mission') {
      const missions = player.missions?.active || [];
      pdaContent.innerHTML = `
        <h3 style="font-family:var(--font-mono); color:var(--color-tertiary); margin-bottom:15px;">ACTIVE OBJECTIVES</h3>
        <div style="display:flex; flex-direction:column; gap:15px;">
          ${missions.map(m => `
            <div class="panel" style="border-left:4px solid ${m.completed ? 'var(--color-secondary)' : 'var(--color-error)'}">
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="font-weight:bold;">${m.id}</span>
                <span style="color:var(--color-tertiary)">${Math.floor((m.current / m.required) * 100)}%</span>
              </div>
              <div style="font-size:11px; opacity:0.8;">Target: ${m.target}</div>
              <div class="bar-container" style="height:4px; margin-top:8px;">
                <div class="bar-fill ${m.completed ? 'stamina-fill' : 'hp-fill'}" style="width:${(m.current / m.required) * 100}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  };

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

      if (player.combat && hitFlash) {
        hitFlash.style.display = player.combat.hitFlashTimer > 0 ? 'block' : 'none';
      }

      // Periodically refresh PDA if open (simplified for now, ideally event-driven)
      if (pdaModal.style.display === 'block') {
        // We could limit the refresh rate here
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

export const togglePDA = () => {
  const pdaModal = document.getElementById('pda-modal');
  if (pdaModal) {
    const isHidden = pdaModal.style.display === 'none';
    pdaModal.style.display = isHidden ? 'block' : 'none';
    // Trigger initial render if opening
    if (isHidden) {
      document.getElementById('tab-inv')?.click();
    }
  }
};

export const showLevelSplash = (level: number, title: string) => {
  const splash = document.createElement('div');
  splash.style.cssText = `
    position: fixed; inset: 0; z-index: 1000; background: black;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: var(--font-headline); color: white; transition: opacity 1s;
  `;
  splash.innerHTML = `
    <h2 style="letter-spacing: 0.5em; opacity: 0.6; font-size: 1.5rem;">LEVEL ${level}</h2>
    <h1 style="font-size: 4rem; text-transform: uppercase; margin-top: 10px;">${title}</h1>
    <p style="font-family: var(--font-mono); margin-top: 40px; color: var(--color-tertiary); animate: pulse 2s infinite;">INITIALIZING BIOME...</p>
  `;
  document.body.appendChild(splash);
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 1000);
  }, 3000);
};

export const showVictory = () => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.95);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: var(--font-headline); color: white;
  `;
  modal.innerHTML = `
    <h1 style="font-size: 5rem; color: var(--color-secondary); text-shadow: 0 0 20px var(--color-secondary);">VICTORY</h1>
    <p style="font-family: var(--font-mono); margin-top: 20px;">THE ABYSS HAS BEEN CONQUERED</p>
    <button class="action-btn" style="margin-top: 50px; width: 200px;" onclick="location.reload()">RESTART</button>
  `;
  document.body.appendChild(modal);
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
