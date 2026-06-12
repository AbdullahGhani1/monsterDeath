// ─── Menu / story screens: title, character select, dialogue, shop, results ─

import { CHARACTERS } from '../data/characters';
import { CharacterDef, DialogueLine } from '../data/types';
import { audio } from '../engine/audio';
import { ChapterStats } from '../game/director';
import { SaveData, UPGRADE_INFO, upgradeCost } from '../game/save';
import { idlePose, victoryPose } from '../rig/poses';
import { drawFighter, drawShadow } from '../rig/render';

export class Screens {
  private root = document.getElementById('screens') as HTMLDivElement;
  private previewRaf = 0;
  private previews: { canvas: HTMLCanvasElement; char: CharacterDef; selected: () => boolean }[] =
    [];

  private show(html: string): HTMLDivElement {
    this.stopPreviews();
    this.root.innerHTML = html;
    this.root.style.display = '';
    return this.root;
  }

  hide(): void {
    this.stopPreviews();
    this.root.style.display = 'none';
    this.root.innerHTML = '';
  }

  private stopPreviews(): void {
    cancelAnimationFrame(this.previewRaf);
    this.previews = [];
  }

  private runPreviews(): void {
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      for (const p of this.previews) {
        const ctx = p.canvas.getContext('2d');
        if (!ctx) continue;
        const w = p.canvas.width;
        const h = p.canvas.height;
        ctx.clearRect(0, 0, w, h);
        const sel = p.selected();
        const pose = sel ? victoryPose((t % 2.4) / 2.4 + 0.4) : idlePose(t);
        drawShadow(ctx, w / 2, h - 14, 30, 1);
        drawFighter(ctx, {
          x: w / 2,
          y: h - 14,
          facing: 1,
          scale: 1.05,
          style: p.char.style,
          pose,
          t,
          heat: sel,
        });
      }
      this.previewRaf = requestAnimationFrame(loop);
    };
    this.previewRaf = requestAnimationFrame(loop);
  }

  // ── Title ──────────────────────────────────────────────────────────────────

  showTitle(save: SaveData, onStart: () => void): void {
    const sub =
      save.victories > 0
        ? `ABYSS CONQUERED ×${save.victories}`
        : save.chapterReached > 1
          ? `CHAPTER ${save.chapterReached} REACHED`
          : 'THE SKY IS GONE. GO GET IT BACK.';
    const root = this.show(`
      <div class="screen title-screen">
        <div class="title-kicker">A STORY OF THE LAST BASTION</div>
        <h1 class="game-logo">MONSTER<span>DEATH</span></h1>
        <div class="title-sub">${sub}</div>
        <button class="btn-primary" id="btn-start">ENTER THE ABYSS</button>
        <div class="title-hint">WASD / ARROWS move · J light · K heavy · L launcher · U special · SHIFT block · SPACE dash · Q heat · E rage</div>
      </div>`);
    root.querySelector('#btn-start')?.addEventListener('click', () => {
      audio.unlock();
      audio.sfx('select');
      onStart();
    });
  }

  // ── Character select ───────────────────────────────────────────────────────

  showSelect(save: SaveData, onPick: (c: CharacterDef, chapter: number) => void): void {
    let selectedId = save.lastCharacter;
    let chapter = Math.min(save.chapterReached, 7);

    const cards = CHARACTERS.map(
      (c) => `
      <div class="char-card" data-id="${c.id}">
        <canvas width="150" height="190"></canvas>
        <div class="char-name">${c.name}</div>
        <div class="char-title">${c.title}</div>
        <div class="char-arch">${c.archetype}</div>
      </div>`
    ).join('');

    const chapterBtns = Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      const locked = n > save.chapterReached;
      const grade = save.bestGrades[n] ? ` <em>${save.bestGrades[n]}</em>` : '';
      return `<button class="chip ${locked ? 'locked' : ''}" data-ch="${n}" ${locked ? 'disabled' : ''}>${n}${grade}</button>`;
    }).join('');

    const root = this.show(`
      <div class="screen select-screen">
        <h2 class="screen-heading">CHOOSE YOUR CHAMPION</h2>
        <div class="char-grid">${cards}</div>
        <div class="char-detail" id="char-detail"></div>
        <div class="chapter-row"><span class="chapter-label">CHAPTER</span>${chapterBtns}</div>
        <button class="btn-primary" id="btn-fight">BEGIN CHAPTER</button>
      </div>`);

    const detail = root.querySelector('#char-detail') as HTMLDivElement;
    const renderDetail = () => {
      const c = CHARACTERS.find((x) => x.id === selectedId) ?? CHARACTERS[0];
      detail.innerHTML = `
        <div class="detail-name">${c.name} — <span>${c.title}</span></div>
        <div class="detail-desc">${c.desc}</div>
        <div class="detail-quote">“${c.quote}”</div>
        <div class="detail-stats">
          <div>HP <b>${c.stats.hp}</b></div>
          <div>SPEED <b>${Math.round(c.stats.walkSpeed / 2.7)}</b></div>
          <div>POWER <b>${Math.round(c.stats.damageScale * 100)}</b></div>
          <div>HEAT <b>${Math.round(c.stats.heatRate * 100)}</b></div>
        </div>`;
      root.querySelectorAll<HTMLDivElement>('.char-card').forEach((card) => {
        card.classList.toggle('selected', card.dataset.id === selectedId);
      });
    };

    root.querySelectorAll<HTMLDivElement>('.char-card').forEach((card) => {
      const char = CHARACTERS.find((c) => c.id === card.dataset.id)!;
      this.previews.push({
        canvas: card.querySelector('canvas')!,
        char,
        selected: () => selectedId === char.id,
      });
      card.addEventListener('click', () => {
        selectedId = char.id;
        audio.sfx('blip');
        renderDetail();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) => {
      b.addEventListener('click', () => {
        chapter = Number(b.dataset.ch);
        root.querySelectorAll('.chip').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        audio.sfx('blip');
      });
      if (Number(b.dataset.ch) === chapter) b.classList.add('selected');
    });

    root.querySelector('#btn-fight')?.addEventListener('click', () => {
      audio.sfx('select');
      onPick(CHARACTERS.find((c) => c.id === selectedId) ?? CHARACTERS[0], chapter);
    });

    renderDetail();
    this.runPreviews();
  }

  // ── Dialogue (typewriter) ──────────────────────────────────────────────────

  showDialogue(lines: DialogueLine[], heroName: string, onDone: () => void): void {
    let idx = 0;
    let chars = 0;
    let timer = 0;

    const root = this.show(`
      <div class="screen dialogue-screen">
        <div class="dialogue-box" id="dlg-box">
          <div class="dialogue-speaker" id="dlg-speaker"></div>
          <div class="dialogue-text" id="dlg-text"></div>
          <div class="dialogue-next">TAP / CLICK ▸</div>
        </div>
      </div>`);

    const speakerEl = root.querySelector('#dlg-speaker') as HTMLDivElement;
    const textEl = root.querySelector('#dlg-text') as HTMLDivElement;
    const boxEl = root.querySelector('#dlg-box') as HTMLDivElement;

    const fill = (line: DialogueLine) => {
      const speaker = line.speaker.replace('{hero}', heroName);
      const text = line.text.replace(/\{hero\}/g, heroName);
      speakerEl.textContent = speaker;
      boxEl.dataset.tone = line.tone;
      return text;
    };

    let full = fill(lines[0]);
    const tick = () => {
      if (chars < full.length) {
        chars += 2;
        textEl.textContent = full.slice(0, chars);
        if (chars % 6 === 0) audio.sfx('blip');
        timer = window.setTimeout(tick, 24);
      }
    };
    tick();

    const advance = () => {
      if (chars < full.length) {
        chars = full.length;
        textEl.textContent = full;
        return;
      }
      idx++;
      if (idx >= lines.length) {
        clearTimeout(timer);
        this.hide();
        onDone();
        return;
      }
      chars = 0;
      full = fill(lines[idx]);
      tick();
    };
    boxEl.addEventListener('click', advance);
  }

  // ── Sanctum (between-chapter shop) ─────────────────────────────────────────

  showShop(save: SaveData, onSave: () => void, onContinue: () => void): void {
    const render = () => {
      const rows = UPGRADE_INFO.map((u) => {
        const lvl = save.upgrades[u.key];
        const cost = upgradeCost(lvl);
        const maxed = lvl >= u.max;
        const afford = save.souls >= cost;
        const pips = Array.from(
          { length: u.max },
          (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`
        ).join('');
        return `
          <div class="shop-row">
            <div class="shop-info"><b>${u.name}</b><span>${u.desc}</span><div class="pips">${pips}</div></div>
            <button class="btn-buy" data-key="${u.key}" ${maxed || !afford ? 'disabled' : ''}>
              ${maxed ? 'MAX' : `◈ ${cost}`}
            </button>
          </div>`;
      }).join('');

      const root = this.show(`
        <div class="screen shop-screen">
          <h2 class="screen-heading">THE SANCTUM</h2>
          <div class="shop-souls">SOULS <b>◈ ${save.souls}</b></div>
          <div class="shop-list">${rows}</div>
          <button class="btn-primary" id="btn-continue">DESCEND FURTHER</button>
        </div>`);

      root.querySelectorAll<HTMLButtonElement>('.btn-buy').forEach((b) => {
        b.addEventListener('click', () => {
          const key = b.dataset.key as keyof typeof save.upgrades;
          const cost = upgradeCost(save.upgrades[key]);
          if (save.souls < cost) return;
          save.souls -= cost;
          save.upgrades[key]++;
          audio.sfx('soul');
          onSave();
          render();
        });
      });
      root.querySelector('#btn-continue')?.addEventListener('click', () => {
        audio.sfx('select');
        onContinue();
      });
    };
    render();
  }

  // ── Results / game over / victory ──────────────────────────────────────────

  showResults(
    chapterTitle: string,
    grade: string,
    stats: ChapterStats,
    bonus: number,
    isBest: boolean,
    onContinue: () => void
  ): void {
    const root = this.show(`
      <div class="screen results-screen">
        <div class="results-kicker">${chapterTitle} — CLEARED</div>
        <div class="grade grade-${grade}">${grade}</div>
        ${isBest ? '<div class="best-badge">NEW BEST</div>' : ''}
        <div class="results-stats">
          <div>MAX COMBO <b>${stats.maxCombo} HITS</b></div>
          <div>DAMAGE TAKEN <b>${Math.round(stats.damageTaken)}</b></div>
          <div>TIME <b>${Math.floor(stats.timeMs / 60000)}:${String(Math.floor((stats.timeMs % 60000) / 1000)).padStart(2, '0')}</b></div>
          <div>SOULS EARNED <b>◈ ${stats.soulsEarned + bonus}</b></div>
        </div>
        <button class="btn-primary" id="btn-next">CONTINUE</button>
      </div>`);
    root.querySelector('#btn-next')?.addEventListener('click', () => {
      audio.sfx('select');
      onContinue();
    });
  }

  showGameOver(souls: number, onRetry: () => void, onQuit: () => void): void {
    const root = this.show(`
      <div class="screen gameover-screen">
        <h2 class="death-title">YOU DIED</h2>
        <div class="death-sub">The Abyss keeps what it kills... but your souls remain. <b>◈ ${souls}</b></div>
        <div class="btn-row">
          <button class="btn-primary" id="btn-retry">RISE AGAIN</button>
          <button class="btn-ghost" id="btn-quit">RETREAT TO SANCTUM</button>
        </div>
      </div>`);
    root.querySelector('#btn-retry')?.addEventListener('click', () => {
      audio.sfx('select');
      onRetry();
    });
    root.querySelector('#btn-quit')?.addEventListener('click', () => {
      audio.sfx('select');
      onQuit();
    });
  }

  showVictory(onDone: () => void): void {
    const root = this.show(`
      <div class="screen victory-screen">
        <div class="title-kicker">THE RIFT IS SEALED</div>
        <h1 class="game-logo small">DAWN<span>RETURNS</span></h1>
        <div class="title-sub">The Sovereign is dust. The Bastion endures. Your legend is written in monster death.</div>
        <button class="btn-primary" id="btn-credits-done">RETURN TO TITLE</button>
      </div>`);
    root.querySelector('#btn-credits-done')?.addEventListener('click', () => {
      audio.sfx('select');
      onDone();
    });
  }

  showPause(muted: boolean, onResume: () => void, onQuit: () => void, onMute: () => boolean): void {
    const root = this.show(`
      <div class="screen pause-screen">
        <h2 class="screen-heading">PAUSED</h2>
        <div class="btn-col">
          <button class="btn-primary" id="btn-resume">RESUME</button>
          <button class="btn-ghost" id="btn-mute">${muted ? 'UNMUTE' : 'MUTE'} AUDIO</button>
          <button class="btn-ghost" id="btn-leave">ABANDON CHAPTER</button>
        </div>
        <div class="title-hint">J light · K heavy · L launcher · U special · SHIFT block · SPACE/double-tap dash · Q heat burst · E rage art</div>
      </div>`);
    root.querySelector('#btn-resume')?.addEventListener('click', onResume);
    root.querySelector('#btn-leave')?.addEventListener('click', onQuit);
    root.querySelector('#btn-mute')?.addEventListener('click', (e) => {
      const m = onMute();
      (e.currentTarget as HTMLButtonElement).textContent = `${m ? 'UNMUTE' : 'MUTE'} AUDIO`;
    });
  }
}
