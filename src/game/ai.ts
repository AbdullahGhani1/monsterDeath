// ─── Monster AI controller ──────────────────────────────────────────────────
//
// Each monster re-decides its behavior on a cooldown: close in (aligning
// depth first like a brawler), circle, back off, block reactively, or attack
// with a move suited to the current range. Bosses enter an enraged phase at
// half health: faster decisions, higher aggression.

import { MoveDef } from '../data/types';
import { clamp } from '../rig/skeleton';
import { Fighter } from './fighter';

type Behavior = 'approach' | 'circle' | 'retreat' | 'wait';

export class AIController {
  private behavior: Behavior = 'approach';
  private decideIn = 300;
  private circleDir: 1 | -1 = 1;
  private attackCooldown = 600;
  enraged = false;

  constructor(private self: Fighter) {}

  update(dtMs: number, player: Fighter): void {
    const self = this.self;
    const def = self.monsterDef;
    if (!def || !self.alive || !player.alive) return;

    // Boss phase 2
    if (self.boss && !this.enraged && self.hp / self.maxHp <= 0.5) {
      this.enraged = true;
      self.heatModeT = 1e9; // permanent aura + damage bonus
    }

    this.decideIn -= dtMs;
    this.attackCooldown -= dtMs;

    if (!self.isActionable()) return;

    const aggro = clamp(def.ai.aggression * (this.enraged ? 1.35 : 1), 0, 0.95);
    const dx = player.x - self.x;
    const dz = player.z - self.z;
    const dist = Math.abs(dx);
    self.facing = dx >= 0 ? 1 : -1;

    if (this.decideIn <= 0) {
      this.decideIn = def.ai.cooldown * (this.enraged ? 0.7 : 1) * (0.7 + Math.random() * 0.6);
      const r = Math.random();
      if (r < 0.55) this.behavior = 'approach';
      else if (r < 0.75) this.behavior = 'circle';
      else if (r < 0.88) this.behavior = 'wait';
      else this.behavior = 'retreat';
      this.circleDir = Math.random() < 0.5 ? 1 : -1;
    }

    // Try to attack whenever in preferred range.
    const inRange = dist <= def.ai.range + 25 && Math.abs(dz) < 46;
    if (inRange && this.attackCooldown <= 0 && Math.random() < aggro) {
      const move = this.pickMove(def.moves, dist);
      if (move) {
        self.startMove(move);
        this.attackCooldown = def.ai.cooldown * (this.enraged ? 0.65 : 1);
        return;
      }
    }

    // Reactive guard
    if (player.state === 'attack' && dist < 170 && Math.abs(dz) < 50) {
      if (Math.random() < def.ai.blockChance * (dtMs / 160)) {
        self.state = 'block';
        self.stateT = 0;
        return;
      }
    } else if (self.state === 'block') {
      self.state = 'idle';
    }

    // Locomotion
    const dt = dtMs / 1000;
    const sp = self.walkSpeed * (this.enraged ? 1.25 : 1);
    let mx = 0;
    let mz = 0;
    switch (this.behavior) {
      case 'approach':
        if (Math.abs(dz) > 14) mz = Math.sign(dz);
        if (dist > def.ai.range * 0.8) mx = Math.sign(dx);
        else if (dist < def.ai.range * 0.4) mx = -Math.sign(dx) * 0.5;
        break;
      case 'circle':
        mz = this.circleDir;
        if (dist > def.ai.range * 1.3) mx = Math.sign(dx) * 0.6;
        break;
      case 'retreat':
        mx = -Math.sign(dx) * 0.7;
        break;
      case 'wait':
        if (Math.abs(dz) > 20) mz = Math.sign(dz) * 0.5;
        break;
    }

    if (mx !== 0 || mz !== 0) {
      self.x += mx * sp * dt;
      self.z += mz * sp * 0.6 * dt;
      self.walkPhase += dt * (sp / 52);
      if (self.state !== 'walk') {
        self.state = 'walk';
        self.stateT = 0;
      }
    } else if (self.state === 'walk') {
      self.state = 'idle';
      self.stateT = 0;
    }
  }

  private pickMove(moves: MoveDef[], dist: number): MoveDef | null {
    // Prefer ranged moves at distance, melee up close.
    const usable = moves.filter((m) => (m.projectile ? dist > 150 : dist <= m.reach + 60));
    const pool = usable.length > 0 ? usable : moves;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }
}
