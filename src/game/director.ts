// ─── Story director: waves, boss phases, chapter flow, scoring ──────────────

import { monsterById } from '../data/monsters';
import { ChapterDef } from '../data/types';
import { audio } from '../engine/audio';
import { fx } from '../engine/fx';
import { AIController } from './ai';
import { ARENA, Fighter } from './fighter';

export type FightPhase = 'waves' | 'boss-intro' | 'boss' | 'cleared';

interface PendingSpawn {
  type: string;
  delay: number;
  side: 1 | -1;
}

export interface ChapterStats {
  damageTaken: number;
  maxCombo: number;
  soulsEarned: number;
  timeMs: number;
}

export interface DirectorEvents {
  announce(title: string, sub: string): void;
  groundY(z: number): number;
  onCleared(): void;
}

export class Director {
  phase: FightPhase = 'waves';
  waveIndex = 0;
  monsters: Fighter[] = [];
  corpses: { f: Fighter; t: number }[] = [];
  boss: Fighter | null = null;
  stats: ChapterStats = { damageTaken: 0, maxCombo: 0, soulsEarned: 0, timeMs: 0 };

  private ai = new Map<Fighter, AIController>();
  private pending: PendingSpawn[] = [];
  private introT = 0;
  private hpScale: number;
  private dmgScale: number;

  constructor(public chapter: ChapterDef) {
    // Gentle difficulty ramp so late chapters stay threatening post-upgrades.
    this.hpScale = 1 + (chapter.id - 1) * 0.07;
    this.dmgScale = 1 + (chapter.id - 1) * 0.09;
    this.queueWave(0);
  }

  get aliveMonsters(): Fighter[] {
    return this.monsters.filter((m) => m.alive);
  }

  get totalWaves(): number {
    return this.chapter.waves.length;
  }

  private queueWave(i: number): void {
    this.waveIndex = i;
    const wave = this.chapter.waves[i];
    let n = 0;
    for (const s of wave.spawns) {
      for (let c = 0; c < s.count; c++) {
        this.pending.push({ type: s.type, delay: 350 + n * 520, side: n % 2 === 0 ? 1 : -1 });
        n++;
      }
    }
  }

  private spawn(type: string, side: 1 | -1, ev: DirectorEvents, isBoss: boolean): Fighter {
    const def = monsterById(type);
    const x = side === 1 ? ARENA.width - 80 - Math.random() * 60 : 80 + Math.random() * 60;
    const z = 40 + Math.random() * (ARENA.zMax - 80);
    const f = new Fighter({
      kind: 'monster',
      monster: def,
      x,
      z,
      hpScale: this.hpScale,
      dmgScale: this.dmgScale,
    });
    f.facing = side === 1 ? -1 : 1;
    this.monsters.push(f);
    this.ai.set(f, new AIController(f));
    fx.dust(x, ev.groundY(z), 10);
    fx.ring(x, ev.groundY(z), 50, def.style.palette.glow);
    if (isBoss) this.boss = f;
    return f;
  }

  update(dtMs: number, player: Fighter, ev: DirectorEvents): void {
    this.stats.timeMs += dtMs;
    if (player.comboCount > this.stats.maxCombo) this.stats.maxCombo = player.comboCount;

    // Fade out corpses
    for (const c of this.corpses) c.t -= dtMs;
    this.corpses = this.corpses.filter((c) => c.t > 0);

    // Move finished KOs from active list to corpses
    for (const m of [...this.monsters]) {
      if (!m.alive && m.state === 'ko' && m.stateT > 1100) {
        this.monsters.splice(this.monsters.indexOf(m), 1);
        this.corpses.push({ f: m, t: 900 });
        if (m === this.boss) this.boss = null;
      }
    }

    // Pending spawns
    for (const p of [...this.pending]) {
      p.delay -= dtMs;
      if (p.delay <= 0) {
        this.pending.splice(this.pending.indexOf(p), 1);
        this.spawn(p.type, p.side, ev, this.phase === 'boss-intro');
      }
    }

    // Drive monster AI
    if (player.alive) {
      for (const m of this.monsters) {
        const ctl = this.ai.get(m);
        if (ctl) ctl.update(dtMs, player);
      }
    }

    switch (this.phase) {
      case 'waves':
        if (
          this.pending.length === 0 &&
          this.aliveMonsters.length === 0 &&
          this.monsters.length === 0
        ) {
          if (this.waveIndex + 1 < this.chapter.waves.length) {
            this.queueWave(this.waveIndex + 1);
            ev.announce(`WAVE ${this.waveIndex + 1} / ${this.totalWaves}`, '');
            audio.sfx('select');
          } else {
            this.phase = 'boss-intro';
            this.introT = 1600;
            const bossDef = monsterById(this.chapter.boss);
            ev.announce(bossDef.name, 'IT COMES');
            audio.sfx('rage');
            audio.setIntensity(0.85);
            this.pending.push({ type: this.chapter.boss, delay: 700, side: 1 });
          }
        }
        break;
      case 'boss-intro':
        this.introT -= dtMs;
        if (this.introT <= 0) this.phase = 'boss';
        break;
      case 'boss':
        if (
          this.pending.length === 0 &&
          this.aliveMonsters.length === 0 &&
          this.monsters.length === 0 &&
          !this.boss
        ) {
          this.phase = 'cleared';
          audio.setIntensity(0.2);
          ev.onCleared();
        }
        break;
      case 'cleared':
        break;
    }
  }

  registerKill(target: Fighter): void {
    const souls = target.monsterDef?.souls ?? 0;
    this.stats.soulsEarned += souls;
  }

  registerPlayerDamage(dmg: number): void {
    this.stats.damageTaken += dmg;
  }
}
