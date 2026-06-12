// ─── Fighter: shared combat actor for the champion and every monster ────────
//
// Implements a fighting-game state machine: movement, dashes/backdashes,
// chained attack strings with input-buffered cancels, blocking + blockstun,
// hitstun, launchers → air juggle states, knockdown/wakeup, KO, Heat mode
// and Rage Arts. Tekken 8 is the reference: strings cancel on active-frame
// end, power-crush moves armor through hits, walls splat.

import { CharacterDef, MonsterDef, MoveDef, RigStyle } from '../data/types';
import { Input } from '../engine/input';
import {
  attackPose,
  backdashPose,
  blockPose,
  castIdlePose,
  dashPose,
  downPose,
  getupPose,
  hitstunPose,
  idlePose,
  koPose,
  launchedPose,
  runPose,
  victoryPose,
  walkPose,
} from '../rig/poses';
import { clamp, Pose } from '../rig/skeleton';

export const ARENA = { width: 1760, zMin: 0, zMax: 230 };
const GRAVITY = 1450;
const Z_SPEED_FACTOR = 0.62;
const HEAT_DURATION = 8000;
const RAGE_THRESHOLD = 0.3;

export type FighterState =
  | 'idle'
  | 'walk'
  | 'dash'
  | 'backdash'
  | 'attack'
  | 'block'
  | 'blockstun'
  | 'hitstun'
  | 'launched'
  | 'down'
  | 'getup'
  | 'ko'
  | 'victory';

export interface HitInfo {
  damage: number;
  knockback: number;
  hitstun: number;
  launch?: number;
  knockdown?: boolean;
  dir: 1 | -1;
  heavy: boolean;
  counter: boolean;
  chip?: boolean; // heat-mode attacks chip through block
}

export type HitResult = 'hit' | 'blocked' | 'armored' | 'ko' | 'launched' | 'wallsplat';

export type AttackButton = 'light' | 'heavy' | 'launcher' | 'special' | 'rage';

export interface DashEcho {
  x: number;
  z: number;
  t: number; // remaining seconds
  pose: Pose;
  facing: 1 | -1;
}

export class Fighter {
  // identity
  kind: 'player' | 'monster';
  name: string;
  style: RigStyle;
  charDef: CharacterDef | null = null;
  monsterDef: MonsterDef | null = null;
  boss = false;

  // vitals
  hp: number;
  maxHp: number;
  heat = 0; // 0..100 meter
  heatModeT = 0; // ms remaining of heat mode
  rageUsed = false;
  damageScale: number;
  heatRate: number;

  // position
  x: number;
  z: number;
  y = 0; // height above ground
  vy = 0;
  vx = 0; // knockback / dash impulse, decays
  facing: 1 | -1 = 1;
  walkSpeed: number;
  dashSpeed: number;

  // state machine
  state: FighterState = 'idle';
  stateT = 0; // ms elapsed in state
  stateDur = 0; // ms total for timed states
  currentMove: MoveDef | null = null;
  moveT = 0;
  moveButton: AttackButton | null = null;
  chainQueued = false;
  projectileFired = false;
  private rehit = new Map<Fighter, number>(); // next allowed hit time per target

  // feedback
  flash = 0; // hit flash 0..1
  walkPhase = 0;
  animT = 0; // global seconds for idle breathing etc.
  echoes: DashEcho[] = [];

  // combo bookkeeping (as victim)
  comboHitsTaken = 0;
  // combo bookkeeping (as attacker, player HUD)
  comboCount = 0;
  comboDamage = 0;
  comboTimer = 0;

  constructor(opts: {
    kind: 'player' | 'monster';
    char?: CharacterDef;
    monster?: MonsterDef;
    x: number;
    z: number;
    hpScale?: number;
    dmgScale?: number;
  }) {
    this.kind = opts.kind;
    if (opts.char) {
      this.charDef = opts.char;
      this.name = opts.char.name;
      this.style = opts.char.style;
      this.maxHp = Math.round(opts.char.stats.hp * (opts.hpScale ?? 1));
      this.walkSpeed = opts.char.stats.walkSpeed;
      this.dashSpeed = opts.char.stats.dashSpeed;
      this.damageScale = opts.char.stats.damageScale * (opts.dmgScale ?? 1);
      this.heatRate = opts.char.stats.heatRate;
    } else {
      const md = opts.monster!;
      this.monsterDef = md;
      this.name = md.name;
      this.style = md.style;
      this.maxHp = Math.round(md.hp * (opts.hpScale ?? 1));
      this.walkSpeed = md.speed;
      this.dashSpeed = md.speed * 2.4;
      this.damageScale = md.damageScale * (opts.dmgScale ?? 1);
      this.heatRate = 0;
      this.boss = !!md.boss;
    }
    this.hp = this.maxHp;
    this.x = opts.x;
    this.z = opts.z;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get heatActive(): boolean {
    return this.heatModeT > 0;
  }

  get rageReady(): boolean {
    return (
      this.kind === 'player' &&
      !this.rageUsed &&
      this.hp > 0 &&
      this.hp / this.maxHp <= RAGE_THRESHOLD
    );
  }

  isActionable(): boolean {
    return this.state === 'idle' || this.state === 'walk' || this.state === 'block';
  }

  isAirborne(): boolean {
    return this.y > 0.5 || this.state === 'launched';
  }

  isVulnerable(): boolean {
    return (
      this.alive &&
      this.state !== 'down' &&
      this.state !== 'getup' &&
      this.state !== 'ko' &&
      this.state !== 'victory'
    );
  }

  /** Active hit window of the current move, if live this frame. */
  activeHit(): MoveDef | null {
    const m = this.currentMove;
    if (!m || this.state !== 'attack') return null;
    if (this.moveT >= m.startup && this.moveT <= m.startup + m.active) return m;
    return null;
  }

  canRehit(target: Fighter, nowMs: number): boolean {
    const next = this.rehit.get(target) ?? 0;
    return nowMs >= next;
  }

  markHit(target: Fighter, nowMs: number, interval = 150): void {
    this.rehit.set(target, nowMs + interval);
  }

  private setState(s: FighterState, dur = 0): void {
    this.state = s;
    this.stateT = 0;
    this.stateDur = dur;
    if (s !== 'attack') {
      this.currentMove = null;
      this.moveButton = null;
      this.chainQueued = false;
    }
  }

  startMove(move: MoveDef, button: AttackButton | null = null): void {
    this.currentMove = move;
    this.moveT = 0;
    this.moveButton = button;
    this.chainQueued = false;
    this.projectileFired = false;
    this.rehit.clear();
    this.setStateAttack();
  }

  private setStateAttack(): void {
    this.state = 'attack';
    this.stateT = 0;
    this.stateDur = this.currentMove
      ? this.currentMove.startup + this.currentMove.active + this.currentMove.recovery
      : 0;
  }

  startDash(dir: -1 | 1): void {
    if (this.charDef?.teleportDash) {
      // Nyx: blink through shadow, leaving afterimages.
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        this.echoes.push({
          x: this.x + dir * (i / steps) * 190,
          z: this.z,
          t: 0.32,
          pose: this.getPose(),
          facing: this.facing,
        });
      }
      this.x = clamp(this.x + dir * 190, 40, ARENA.width - 40);
      this.setState(dir === this.facing ? 'dash' : 'backdash', 200);
      return;
    }
    this.vx = dir * this.dashSpeed;
    this.setState(dir === this.facing ? 'dash' : 'backdash', dir === this.facing ? 260 : 220);
  }

  activateHeat(): boolean {
    if (this.heat < 100 || this.heatActive) return false;
    this.heat = 0;
    this.heatModeT = HEAT_DURATION;
    return true;
  }

  gainHeat(v: number): void {
    if (this.heatActive) return;
    this.heat = clamp(this.heat + v * this.heatRate, 0, 100);
  }

  /** Outgoing damage multiplier (upgrades + heat). */
  attackPower(): number {
    return this.damageScale * (this.heatActive ? 1.25 : 1);
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.stateT += dtMs;
    this.animT += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.heatModeT = Math.max(0, this.heatModeT - dtMs);
    for (const e of this.echoes) e.t -= dt;
    this.echoes = this.echoes.filter((e) => e.t > 0);

    if (this.comboTimer > 0) {
      this.comboTimer -= dtMs;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.comboDamage = 0;
      }
    }

    // Horizontal impulse decay (knockback, dashes)
    if (Math.abs(this.vx) > 1) {
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.0035, dt); // exponential decay
      if (Math.abs(this.vx) < 12) this.vx = 0;
    }

    // Airborne physics
    if (this.y > 0 || this.vy !== 0) {
      this.y += this.vy * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        if (this.state === 'launched') {
          this.setState(this.alive ? 'down' : 'ko', 900);
          this.comboHitsTaken = 0;
        }
      }
    }

    this.x = clamp(this.x, 40, ARENA.width - 40);
    this.z = clamp(this.z, ARENA.zMin, ARENA.zMax);

    // Timed state transitions
    switch (this.state) {
      case 'attack': {
        const m = this.currentMove;
        if (m) {
          this.moveT += dtMs;
          if (m.lungeSpeed && this.moveT >= m.startup * 0.5 && this.moveT <= m.startup + m.active) {
            this.x += this.facing * m.lungeSpeed * dt;
          }
          // Chain cancel: branch into next string hit once active frames end.
          if (this.chainQueued && m.chain && this.moveT >= m.startup + m.active) {
            const next = this.charDef?.moves[m.chain] ?? null;
            if (next) {
              this.startMove(next, this.moveButton);
              break;
            }
          }
          if (this.moveT >= this.stateDur) this.setState('idle');
        } else {
          this.setState('idle');
        }
        break;
      }
      case 'dash':
      case 'backdash':
      case 'blockstun':
      case 'hitstun':
        if (this.stateT >= this.stateDur) this.setState('idle');
        break;
      case 'down':
        if (this.stateT >= this.stateDur && this.alive) this.setState('getup', 420);
        break;
      case 'getup':
        if (this.stateT >= this.stateDur) this.setState('idle');
        break;
      default:
        break;
    }
  }

  /** Player-controlled update; call after update(). */
  control(input: Input, dtMs: number, opponents: Fighter[]): void {
    if (!this.alive) return;
    const dt = dtMs / 1000;

    // Face the nearest living threat when actionable.
    if (this.isActionable()) {
      const near = nearest(this, opponents);
      if (near) this.facing = near.x >= this.x ? 1 : -1;
    }

    // Rage Art has priority and armors through pressure.
    if (
      this.rageReady &&
      input.consumeBuffered('rage') &&
      (this.isActionable() || this.state === 'hitstun')
    ) {
      const rage = this.charDef!.moves[this.charDef!.buttons.rage];
      this.rageUsed = true;
      this.rageJustStarted = true;
      this.startMove(rage, 'rage');
      return;
    }

    if (this.isActionable()) {
      if (input.justPressed('heat') && this.activateHeat()) {
        // burst handled by caller via heatJustActivated flag
        this.heatJustActivated = true;
      }

      const dashDir = input.consumeDoubleTapDash();
      if (dashDir !== 0) {
        this.startDash(dashDir);
        return;
      }
      if (input.justPressed('dash')) {
        const mx = input.moveX();
        this.startDash((mx !== 0 ? (mx as -1 | 1) : this.facing) as -1 | 1);
        return;
      }

      // Attack buttons (buffered so mashing during recovery still works)
      const buttons: ('light' | 'heavy' | 'launcher' | 'special')[] = [
        'special',
        'launcher',
        'heavy',
        'light',
      ];
      for (const b of buttons) {
        if (input.consumeBuffered(b)) {
          const moveId = this.charDef!.buttons[b];
          this.startMove(this.charDef!.moves[moveId], b);
          return;
        }
      }

      // Block
      if (input.isDown('block')) {
        this.setState('block');
        return;
      }
      if (this.state === 'block') this.setState('idle');

      // Walk
      const mx = input.moveX();
      const mz = input.moveZ();
      if (mx !== 0 || mz !== 0) {
        const sp = this.walkSpeed;
        this.x += mx * sp * dt;
        this.z += mz * sp * Z_SPEED_FACTOR * dt;
        this.walkPhase += dt * (sp / 52);
        if (this.state !== 'walk') this.setState('walk');
        this.walkBack = mx !== 0 && mx !== this.facing;
      } else if (this.state === 'walk') {
        this.setState('idle');
      }
    } else if (
      this.state === 'attack' &&
      this.currentMove?.chain &&
      this.moveButton &&
      this.moveButton !== 'rage'
    ) {
      // Buffer the next hit of the string during the current swing.
      if (input.consumeBuffered(this.moveButton)) this.chainQueued = true;
    }
  }

  walkBack = false;
  heatJustActivated = false;
  rageJustStarted = false;

  // ── Receiving hits ─────────────────────────────────────────────────────────

  receiveHit(hit: HitInfo): HitResult {
    if (!this.isVulnerable()) return 'hit';

    // Blocking: must be grounded, in block, and facing the attacker.
    const facingAttacker = this.facing === -hit.dir;
    if (
      (this.state === 'block' || this.state === 'blockstun') &&
      facingAttacker &&
      !this.isAirborne()
    ) {
      const chip = hit.chip ? Math.round(hit.damage * 0.12) : 0;
      this.hp = Math.max(1, this.hp - chip);
      this.vx = hit.dir * hit.knockback * 0.45;
      this.setState('blockstun', 200);
      return 'blocked';
    }

    // Power crush: armor through (still take damage, no stun).
    if (this.state === 'attack' && this.currentMove?.armor) {
      this.hp -= Math.round(hit.damage * 0.7);
      this.flash = 1;
      if (this.hp <= 0) return this.die();
      return 'armored';
    }

    // Juggle damage scaling on the victim.
    const scale = Math.max(0.4, Math.pow(0.91, this.comboHitsTaken));
    const dmg = Math.max(1, Math.round(hit.damage * scale));
    this.hp -= dmg;
    this.flash = 1;
    this.comboHitsTaken++;

    if (this.hp <= 0) return this.die();

    if (hit.launch || this.isAirborne()) {
      // Launch or juggle re-float.
      this.vy = hit.launch ?? Math.max(260, this.vy * 0.4 + 200);
      if (this.y <= 0) this.y = 1;
      this.vx = hit.dir * hit.knockback * 0.8;
      this.setState('launched');
      return 'launched';
    }

    this.vx = hit.dir * hit.knockback;

    // Wall splat: heavy knockback into an arena wall.
    const nearWall = (hit.dir < 0 && this.x < 110) || (hit.dir > 0 && this.x > ARENA.width - 110);
    if (nearWall && hit.knockback >= 240) {
      this.setState('hitstun', hit.hitstun + 340);
      return 'wallsplat';
    }

    if (hit.knockdown) {
      this.vy = 180;
      this.y = Math.max(this.y, 1);
      this.setState('launched');
      return 'hit';
    }

    this.setState('hitstun', hit.hitstun);
    return 'hit';
  }

  private die(): HitResult {
    this.hp = 0;
    this.vy = Math.max(this.vy, 220);
    this.y = Math.max(this.y, 1);
    this.setState('ko', 1200);
    return 'ko';
  }

  // ── Animation ──────────────────────────────────────────────────────────────

  getPose(): Pose {
    const t = this.animT;
    switch (this.state) {
      case 'attack': {
        const m = this.currentMove;
        if (!m) return idlePose(t);
        return attackPose(m.anim, clamp(this.moveT / this.stateDur, 0, 1));
      }
      case 'walk':
        return this.walkSpeed > 240
          ? runPose(this.walkPhase)
          : walkPose(this.walkPhase, this.walkBack ? 0.7 : 1);
      case 'dash':
        return dashPose(this.stateT / Math.max(1, this.stateDur));
      case 'backdash':
        return backdashPose(this.stateT / Math.max(1, this.stateDur));
      case 'block':
      case 'blockstun':
        return blockPose;
      case 'hitstun':
        return hitstunPose(this.stateT / Math.max(1, this.stateDur));
      case 'launched':
        return launchedPose(t);
      case 'down':
        return downPose;
      case 'getup':
        return getupPose(this.stateT / Math.max(1, this.stateDur));
      case 'ko':
        return koPose(clamp(this.stateT / 600, 0, 1));
      case 'victory':
        return victoryPose(this.stateT / 1000);
      case 'idle':
      default:
        return this.style.float || this.style.robe ? castIdlePose(t) : idlePose(t);
    }
  }

  /** Weapon trail intensity for the renderer. */
  trail(): number {
    const m = this.activeHit();
    return m ? 1 : 0;
  }

  /** Visual hover for floating monsters. */
  hoverOffset(): number {
    return this.style.float ? 16 + Math.sin(this.animT * 2.4) * 6 : 0;
  }
}

export function nearest(self: Fighter, others: Fighter[]): Fighter | null {
  let best: Fighter | null = null;
  let bd = Infinity;
  for (const o of others) {
    if (!o.alive) continue;
    const d = Math.abs(o.x - self.x) + Math.abs(o.z - self.z) * 0.5;
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}
