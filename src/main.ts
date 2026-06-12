// ─── MONSTER DEATH — game bootstrap & main loop ─────────────────────────────
//
// Flow: TITLE → CHARACTER SELECT → chapter intro DIALOGUE → FIGHT (waves +
// boss) → RESULTS → SANCTUM (upgrades) → next chapter … → VICTORY.
// The fight runs a fixed-flow loop with hitstop and slow-motion timescales
// for Tekken-style impact feel.

import { CHAPTERS } from './data/story';
import { CharacterDef } from './data/types';
import { audio } from './engine/audio';
import { Camera } from './engine/camera';
import { fx } from './engine/fx';
import { Action, Input } from './engine/input';
import { CombatSystem } from './game/combat';
import { Director } from './game/director';
import { ARENA, Fighter, nearest } from './game/fighter';
import { applyUpgrades, computeGrade, gradeRank, loadSave, persistSave } from './game/save';
import { StageRenderer } from './game/stage';
import { drawFighter, drawShadow } from './rig/render';
import { HUD } from './ui/hud';
import { Screens } from './ui/screens';

type Mode =
  | 'title'
  | 'select'
  | 'dialogue'
  | 'fight'
  | 'paused'
  | 'gameover'
  | 'victory'
  | 'menu-misc';

class Game {
  private canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  private ctx = this.canvas.getContext('2d')!;
  private input = new Input();
  private camera = new Camera(window.innerWidth, window.innerHeight);
  private stage = new StageRenderer();
  private combat = new CombatSystem();
  private screens = new Screens();
  private hud!: HUD;
  private save = loadSave();

  private mode: Mode = 'title';
  private player: Fighter | null = null;
  private director: Director | null = null;
  private chapterIndex = 0; // 0-based into CHAPTERS
  private char: CharacterDef | null = null;

  private lastTime = 0;
  private elapsed = 0; // seconds, for ambient animation
  private hitstopT = 0;
  private slowmoT = 0;
  private deathTimer = 0;
  private clearedHandled = false;

  constructor() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.hud = new HUD();
    this.hud.show(false);
    this.bindTouch();
    this.bindMute();
    this.screens.showTitle(this.save, () => this.toSelect());
    requestAnimationFrame((t) => {
      this.lastTime = t;
      this.loop(t);
    });
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  private bindTouch(): void {
    document.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      const action = btn.dataset.action as Action;
      const press = (e: Event) => {
        e.preventDefault();
        audio.unlock();
        this.input.press(action);
        btn.classList.add('pressed');
      };
      const release = (e: Event) => {
        e.preventDefault();
        this.input.release(action);
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    });
  }

  private bindMute(): void {
    document.getElementById('btn-sound')?.addEventListener('click', () => {
      audio.unlock();
      const muted = audio.toggleMute();
      const el = document.getElementById('btn-sound');
      if (el) el.textContent = muted ? '🔇' : '🔊';
    });
  }

  // ── Flow transitions ───────────────────────────────────────────────────────

  private toTitle(): void {
    this.mode = 'title';
    this.hud.show(false);
    this.player = null;
    this.director = null;
    this.screens.showTitle(this.save, () => this.toSelect());
  }

  private toSelect(): void {
    this.mode = 'select';
    this.hud.show(false);
    this.screens.showSelect(this.save, (c, chapter) => {
      this.char = c;
      this.save.lastCharacter = c.id;
      persistSave(this.save);
      this.chapterIndex = chapter - 1;
      this.startChapterIntro();
    });
  }

  private startChapterIntro(): void {
    const chapter = CHAPTERS[this.chapterIndex];
    this.mode = 'dialogue';
    this.prepareFightWorld(); // build arena behind the dialogue
    this.screens.showDialogue(chapter.intro, this.char?.name ?? 'CHAMPION', () =>
      this.startFight()
    );
  }

  private prepareFightWorld(): void {
    const chapter = CHAPTERS[this.chapterIndex];
    this.stage.setTheme(chapter.theme);
    const up = applyUpgrades(this.save);
    this.player = new Fighter({
      kind: 'player',
      char: this.char!,
      x: 220,
      z: 120,
      hpScale: up.hpScale,
      dmgScale: up.dmgScale,
    });
    this.player.heatRate *= up.heatScale;
    this.director = new Director(chapter);
    this.combat.reset();
    this.clearedHandled = false;
    this.deathTimer = 0;
    this.hud.setIdentity(`${this.char!.name} — ${this.char!.title}`);
    this.hud.setChapter(`${chapter.title} · ${chapter.subtitle}`);
    audio.setIntensity(0.4);
  }

  private startFight(): void {
    this.mode = 'fight';
    this.screens.hide();
    this.hud.show(true);
    this.hud.announce(CHAPTERS[this.chapterIndex].title, CHAPTERS[this.chapterIndex].subtitle);
  }

  private onChapterCleared(): void {
    if (this.clearedHandled || !this.director || !this.player) return;
    this.clearedHandled = true;
    this.player.state = 'victory';
    this.player.stateT = 0;

    const chapter = CHAPTERS[this.chapterIndex];
    const stats = this.director.stats;
    const grade = computeGrade(stats.damageTaken / this.player.maxHp, stats.maxCombo, stats.timeMs);
    const prev = this.save.bestGrades[chapter.id];
    const isBest = !prev || gradeRank(grade) > gradeRank(prev);
    if (isBest) this.save.bestGrades[chapter.id] = grade;
    this.save.souls += stats.soulsEarned + chapter.soulsBonus;
    this.save.chapterReached = Math.max(this.save.chapterReached, Math.min(7, chapter.id + 1));
    persistSave(this.save);

    window.setTimeout(() => {
      this.mode = 'menu-misc';
      this.hud.show(false);
      this.screens.showDialogue(chapter.outro, this.char!.name, () => {
        this.screens.showResults(
          `${chapter.title} · ${chapter.subtitle}`,
          grade,
          stats,
          chapter.soulsBonus,
          isBest,
          () => {
            this.screens.showShop(
              this.save,
              () => persistSave(this.save),
              () => {
                if (chapter.id >= 7) {
                  this.save.victories++;
                  persistSave(this.save);
                  this.mode = 'victory';
                  this.screens.showVictory(() => this.toTitle());
                } else {
                  this.chapterIndex++;
                  this.startChapterIntro();
                }
              }
            );
          }
        );
      });
    }, 1600);
  }

  private onPlayerDeath(): void {
    // Keep what you earned — death still feeds progression.
    if (this.director) {
      this.save.souls += this.director.stats.soulsEarned;
      persistSave(this.save);
    }
    this.mode = 'gameover';
    this.hud.show(false);
    this.screens.showGameOver(
      this.save.souls,
      () => {
        this.prepareFightWorld();
        this.startFight();
      },
      () => this.toSelect()
    );
  }

  private togglePause(): void {
    if (this.mode === 'fight') {
      this.mode = 'paused';
      this.screens.showPause(
        audio.muted,
        () => {
          this.mode = 'fight';
          this.screens.hide();
        },
        () => this.toSelect(),
        () => audio.toggleMute()
      );
    } else if (this.mode === 'paused') {
      this.mode = 'fight';
      this.screens.hide();
    }
  }

  // ── Main loop ──────────────────────────────────────────────────────────────

  private loop(time: number): void {
    const rawDt = Math.min(50, time - this.lastTime);
    this.lastTime = time;
    this.elapsed += rawDt / 1000;

    if (this.input.justPressed('pause') && (this.mode === 'fight' || this.mode === 'paused')) {
      this.togglePause();
    }

    // Timescale: hitstop freezes the world; slow-mo stretches rage arts.
    let dt = rawDt;
    if (this.hitstopT > 0) {
      this.hitstopT -= rawDt;
      dt = 0;
    } else if (this.slowmoT > 0) {
      this.slowmoT -= rawDt;
      dt = rawDt * 0.3;
    }

    if (
      (this.mode === 'fight' ||
        this.mode === 'dialogue' ||
        this.mode === 'gameover' ||
        this.mode === 'menu-misc') &&
      this.player &&
      this.director
    ) {
      this.updateFight(dt, this.mode === 'fight');
    }

    this.render();
    this.input.endFrame(rawDt);
    requestAnimationFrame((t) => this.loop(t));
  }

  private updateFight(dt: number, interactive: boolean): void {
    const player = this.player!;
    const director = this.director!;
    const groundY = (z: number) => this.stage.groundY(z, this.canvas.height) + this.camera.offY;

    if (dt > 0) {
      player.update(dt);
      if (interactive && player.alive) {
        player.control(this.input, dt, director.aliveMonsters);
        if (player.heatJustActivated) {
          player.heatJustActivated = false;
          audio.sfx('heat');
          fx.ring(player.x, groundY(player.z), 70, player.style.palette.glow);
          this.camera.shake(8, 250);
          this.hitstopT = 120;
          this.hud.announce('HEAT BURST', '');
        }
        if (player.rageJustStarted) {
          player.rageJustStarted = false;
          audio.sfx('rage');
          this.slowmoT = 900;
          this.camera.shake(10, 500);
          this.hud.announce(player.charDef!.moves.rage.name.replace('RAGE ART: ', ''), 'RAGE ART');
        }
      }

      for (const m of director.monsters) m.update(dt);
      for (const c of director.corpses) c.f.update(dt);

      if (interactive) {
        director.update(dt, player, {
          announce: (t, s) => this.hud.announce(t, s),
          groundY,
          onCleared: () => this.onChapterCleared(),
        });

        this.combat.update(dt, player, director.monsters, {
          groundY,
          shake: (a, ms) => this.camera.shake(a, ms),
          hitstop: (ms) => (this.hitstopT = Math.max(this.hitstopT, ms)),
          onPlayerLandedHit: () => undefined,
          onPlayerWasHit: (dmg) => director.registerPlayerDamage(dmg),
          onKill: (t) => director.registerKill(t),
        });

        if (!player.alive) {
          this.deathTimer += dt;
          if (this.deathTimer > 1800 && this.mode === 'fight') this.onPlayerDeath();
        }
      }
    }

    fx.update(dt / 1000);

    const focus = nearest(player, director.aliveMonsters);
    this.camera.follow(player.x, focus ? focus.x : null, ARENA.width);
    this.camera.update(Math.max(dt, 1));

    if (this.mode === 'fight') {
      this.hud.update(
        Math.max(dt, 1),
        player,
        director.boss && director.boss.alive ? director.boss : null,
        this.save.souls + director.stats.soulsEarned
      );
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!this.player || !this.director) {
      // Menu backdrop: slow abyss gradient
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a0512');
      g.addColorStop(1, '#241133');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    this.stage.render(ctx, this.camera, this.elapsed, 1 / 60);

    // Depth-sort all actors (far lane first)
    const player = this.player;
    const director = this.director;
    const actors: { f: Fighter; corpseAlpha?: number }[] = [
      ...director.corpses.map((c) => ({ f: c.f, corpseAlpha: Math.min(1, c.t / 900) })),
      ...director.monsters.map((f) => ({ f })),
      { f: player },
    ].sort((a, b) => a.f.z - b.f.z);

    for (const { f, corpseAlpha } of actors) {
      const scale = this.camera.zoom * this.stage.depthScale(f.z);
      const gy = this.stage.groundY(f.z, h) + this.camera.offY;
      const sx = this.camera.sx(f.x);
      const lift = (f.y + f.hoverOffset()) * scale;

      // Teleport echoes
      for (const e of f.echoes) {
        drawFighter(ctx, {
          x: this.camera.sx(e.x),
          y: this.stage.groundY(e.z, h) + this.camera.offY,
          facing: e.facing,
          scale,
          style: f.style,
          pose: e.pose,
          t: this.elapsed,
          ghost: true,
          alpha: e.t * 2,
        });
      }

      drawShadow(
        ctx,
        sx,
        gy,
        34 * scale * f.style.proportions.scale,
        Math.max(0.25, 1 - (f.y + f.hoverOffset()) / 320) * (corpseAlpha ?? 1)
      );
      drawFighter(ctx, {
        x: sx,
        y: gy - lift,
        facing: f.facing,
        scale,
        style: f.style,
        pose: f.getPose(),
        t: this.elapsed,
        flash: f.flash,
        heat: f.heatActive,
        rage: f.kind === 'player' ? f.rageReady : f.boss && f.heatActive,
        alpha: corpseAlpha,
        trail: f.trail(),
      });
    }

    this.combat.renderProjectiles(
      ctx,
      (x) => this.camera.sx(x),
      (z) => this.stage.groundY(z, h),
      this.camera.zoom,
      this.camera.offY
    );

    fx.render(ctx, this.camera);

    // Vignette + low-health pulse
    const vig = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.42,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (player.alive && player.hp / player.maxHp <= 0.3) {
      const pulse = 0.12 + Math.sin(this.elapsed * 5) * 0.06;
      const red = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.4,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.7
      );
      red.addColorStop(0, 'rgba(255,0,30,0)');
      red.addColorStop(1, `rgba(255,0,30,${pulse})`);
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

window.addEventListener('load', () => {
  new Game();
});
