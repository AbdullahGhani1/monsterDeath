// ─── In-fight HUD: vitals, heat, combo counter, boss bar, announcements ─────

import { Fighter } from '../game/fighter';

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export class HUD {
  private root = el<HTMLDivElement>('hud');
  private hpFill = el<HTMLDivElement>('hud-hp');
  private hpGhost = el<HTMLDivElement>('hud-hp-ghost');
  private heatFill = el<HTMLDivElement>('hud-heat');
  private heatLabel = el<HTMLDivElement>('hud-heat-label');
  private rageEl = el<HTMLDivElement>('hud-rage');
  private nameEl = el<HTMLDivElement>('hud-name');
  private soulsEl = el<HTMLDivElement>('hud-souls');
  private chapterEl = el<HTMLDivElement>('hud-chapter');
  private comboEl = el<HTMLDivElement>('hud-combo');
  private bossWrap = el<HTMLDivElement>('hud-boss');
  private bossName = el<HTMLDivElement>('hud-boss-name');
  private bossFill = el<HTMLDivElement>('hud-boss-fill');
  private announceEl = el<HTMLDivElement>('hud-announce');
  private ghostHp = 1;
  private announceT = 0;
  private comboShownT = 0;

  show(visible: boolean): void {
    this.root.style.display = visible ? '' : 'none';
  }

  setIdentity(name: string): void {
    this.nameEl.textContent = name;
  }

  setChapter(label: string): void {
    this.chapterEl.textContent = label;
  }

  announce(title: string, sub: string): void {
    this.announceEl.innerHTML = `<div class="announce-title">${title}</div>${sub ? `<div class="announce-sub">${sub}</div>` : ''}`;
    this.announceEl.classList.remove('pop');
    void this.announceEl.offsetWidth; // restart animation
    this.announceEl.classList.add('pop');
    this.announceT = 2000;
  }

  update(dtMs: number, player: Fighter, boss: Fighter | null, souls: number): void {
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    this.hpFill.style.width = `${hpRatio * 100}%`;
    // Ghost bar trails behind for that "how much did THAT cost me" readout.
    this.ghostHp += (hpRatio - this.ghostHp) * Math.min(1, dtMs / 600);
    if (this.ghostHp < hpRatio) this.ghostHp = hpRatio;
    this.hpGhost.style.width = `${this.ghostHp * 100}%`;
    this.hpFill.classList.toggle('low', hpRatio <= 0.3);

    if (player.heatActive) {
      this.heatFill.style.width = `${(player.heatModeT / 8000) * 100}%`;
      this.heatFill.classList.add('active');
      this.heatLabel.textContent = 'HEAT ENGAGED';
    } else {
      this.heatFill.style.width = `${player.heat}%`;
      this.heatFill.classList.remove('active');
      this.heatLabel.textContent = player.heat >= 100 ? 'HEAT READY — [Q]' : 'HEAT';
    }
    this.heatLabel.classList.toggle('ready', player.heat >= 100 && !player.heatActive);

    this.rageEl.classList.toggle('ready', player.rageReady);
    this.rageEl.textContent = player.rageUsed
      ? 'RAGE SPENT'
      : player.rageReady
        ? 'RAGE ART READY — [E]'
        : 'RAGE';

    this.soulsEl.textContent = `◈ ${souls}`;

    // Combo popup
    if (player.comboCount >= 2) {
      this.comboEl.style.opacity = '1';
      this.comboEl.innerHTML = `<span class="combo-num">${player.comboCount}</span> HITS<br><span class="combo-dmg">${player.comboDamage} DMG</span>`;
      this.comboShownT = 600;
    } else if (this.comboShownT > 0) {
      this.comboShownT -= dtMs;
      if (this.comboShownT <= 0) this.comboEl.style.opacity = '0';
    }

    // Boss bar
    if (boss && boss.alive) {
      this.bossWrap.style.display = '';
      this.bossName.textContent = boss.name;
      this.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
    } else {
      this.bossWrap.style.display = 'none';
    }

    if (this.announceT > 0) {
      this.announceT -= dtMs;
      if (this.announceT <= 0) this.announceEl.classList.remove('pop');
    }
  }
}
