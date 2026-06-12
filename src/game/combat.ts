// ─── Combat resolution: hitboxes, juggles, counters, walls, projectiles ─────

import { audio } from '../engine/audio';
import { fx } from '../engine/fx';
import { Fighter, HitInfo, HitResult } from './fighter';

export interface Projectile {
  x: number;
  z: number;
  h: number; // height above ground
  vx: number;
  owner: Fighter;
  damage: number;
  knockback: number;
  hitstun: number;
  knockdown: boolean;
  color: string;
  life: number; // seconds
  dead: boolean;
}

export interface CombatEvents {
  groundY(z: number): number; // world z → screen y (for fx spawn)
  shake(amp: number, ms: number): void;
  hitstop(ms: number): void;
  onPlayerLandedHit(target: Fighter, damage: number, result: HitResult): void;
  onPlayerWasHit(damage: number): void;
  onKill(target: Fighter): void;
}

export class CombatSystem {
  projectiles: Projectile[] = [];
  private now = 0;

  reset(): void {
    this.projectiles = [];
  }

  update(dtMs: number, player: Fighter, monsters: Fighter[], ev: CombatEvents): void {
    this.now += dtMs;
    const dt = dtMs / 1000;

    // Spawn projectiles when a projectile move enters active frames.
    for (const f of [player, ...monsters]) {
      const m = f.activeHit();
      if (m?.projectile && !f.projectileFired) {
        f.projectileFired = true;
        this.projectiles.push({
          x: f.x + f.facing * 50,
          z: f.z,
          h: 60 * f.style.proportions.scale,
          vx: f.facing * 660,
          owner: f,
          damage: Math.round(m.damage * f.attackPower()),
          knockback: m.knockback,
          hitstun: m.hitstun,
          knockdown: !!m.knockdown,
          color: f.style.palette.glow,
          life: 1.1,
          dead: false,
        });
        audio.sfx('magic');
      }
    }

    // Melee hits
    this.meleeHits(player, monsters, ev);
    for (const mo of monsters) this.meleeHits(mo, [player], ev);

    // Projectiles
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      fx.embers(p.x, ev.groundY(p.z) - p.h, p.color);
      const targets = p.owner.kind === 'player' ? monsters : [player];
      for (const t of targets) {
        if (!t.isVulnerable()) continue;
        if (Math.abs(t.z - p.z) > 42 || Math.abs(t.x - p.x) > 46) continue;
        const dir: 1 | -1 = p.vx >= 0 ? 1 : -1;
        const result = t.receiveHit({
          damage: p.damage,
          knockback: p.knockback,
          hitstun: p.hitstun,
          knockdown: p.knockdown,
          dir,
          heavy: true,
          counter: false,
          chip: p.owner.heatActive,
        });
        this.feedback(p.owner, t, p.damage, result, true, ev);
        p.dead = true;
        break;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private meleeHits(attacker: Fighter, targets: Fighter[], ev: CombatEvents): void {
    const m = attacker.activeHit();
    if (!m || m.projectile) return;

    for (const t of targets) {
      if (t === attacker || !t.isVulnerable()) continue;
      if (!attacker.canRehit(t, this.now)) continue;

      // Hitbox: a reach-long band in front of the attacker, same depth lane.
      if (Math.abs(t.z - attacker.z) > 46) continue;
      const dx = (t.x - attacker.x) * attacker.facing;
      const reach = m.reach * attacker.style.proportions.scale;
      if (dx < -20 || dx > reach + 34) continue;
      // Grounded swings still tag airborne victims (juggles), but not too high.
      if (t.y > 190) continue;

      attacker.markHit(t, this.now, m.active > 180 ? 140 : m.active + m.recovery);

      const counter = t.state === 'attack' && t.moveT < (t.currentMove?.startup ?? 0);
      const dmg = Math.round(m.damage * attacker.attackPower() * (counter ? 1.3 : 1));
      const hit: HitInfo = {
        damage: dmg,
        knockback: m.knockback,
        hitstun: m.hitstun,
        launch: m.launch,
        knockdown: m.knockdown,
        dir: attacker.facing,
        heavy: m.sfx !== 'light',
        counter,
        chip: attacker.heatActive,
      };
      const result = t.receiveHit(hit);
      attacker.gainHeat(m.heatGain);
      if (counter && result === 'hit')
        fx.damageText(t.x, ev.groundY(t.z), 130, 'COUNTER!', '#ffd75e');
      this.feedback(attacker, t, dmg, result, m.sfx !== 'light', ev);
    }
  }

  private feedback(
    attacker: Fighter,
    target: Fighter,
    dmg: number,
    result: HitResult,
    heavy: boolean,
    ev: CombatEvents
  ): void {
    const gy = ev.groundY(target.z);
    const hitH = 60 * target.style.proportions.scale + target.y;

    if (result === 'blocked') {
      audio.sfx('block');
      fx.blockSpark(target.x + target.facing * -30, gy, hitH);
      return;
    }

    audio.sfx(heavy ? 'heavy' : 'light');
    if (target.kind === 'player') audio.sfx('hurt');
    fx.hitSpark(target.x, gy, hitH, attacker.style.palette.glow, heavy);
    fx.damageText(
      target.x,
      gy,
      hitH + 30,
      String(dmg),
      target.kind === 'player' ? '#ff5e6a' : '#ffffff',
      dmg >= 20
    );

    ev.shake(heavy ? 7 : 3, heavy ? 200 : 110);
    ev.hitstop(result === 'ko' ? 220 : heavy ? 95 : 45);

    if (result === 'launched') audio.sfx('launch');
    if (result === 'wallsplat') {
      fx.damageText(target.x, gy, hitH + 70, 'WALL SPLAT!', '#9fd8ff');
      ev.shake(10, 260);
    }

    if (attacker.kind === 'player') {
      attacker.comboCount++;
      attacker.comboDamage += dmg;
      attacker.comboTimer = 1300;
      ev.onPlayerLandedHit(target, dmg, result);
    } else {
      ev.onPlayerWasHit(dmg);
    }

    if (result === 'ko') {
      audio.sfx('ko');
      ev.shake(12, 400);
      if (target.kind === 'monster') {
        fx.souls(target.x, gy, 8);
        audio.sfx('soul');
        ev.onKill(target);
      }
    }
  }

  renderProjectiles(
    ctx: CanvasRenderingContext2D,
    sx: (x: number) => number,
    groundY: (z: number) => number,
    zoom: number,
    offY: number
  ): void {
    for (const p of this.projectiles) {
      const x = sx(p.x);
      const y = groundY(p.z) + offY - p.h * zoom;
      const r = 9 * zoom;
      const grd = ctx.createRadialGradient(x, y, 1, x, y, r * 2.4);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.35, p.color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
