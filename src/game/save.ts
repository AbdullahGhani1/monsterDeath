// ─── Persistent progression (localStorage) ──────────────────────────────────
//
// Souls, upgrades, chapter unlocks and best grades survive between sessions —
// the run always means something.

export interface UpgradeLevels {
  vitality: number; // +12 max HP each
  ferocity: number; // +7% damage each
  conduit: number; // +12% heat gain each
}

export interface SaveData {
  souls: number;
  upgrades: UpgradeLevels;
  chapterReached: number; // highest unlocked chapter (1-based)
  bestGrades: Record<number, string>;
  lastCharacter: string;
  victories: number;
}

const KEY = 'monster-death-save-v2';

const DEFAULT_SAVE: SaveData = {
  souls: 0,
  upgrades: { vitality: 0, ferocity: 0, conduit: 0 },
  chapterReached: 1,
  bestGrades: {},
  lastCharacter: 'kael',
  victories: 0,
};

export const UPGRADE_INFO: { key: keyof UpgradeLevels; name: string; desc: string; max: number }[] =
  [
    { key: 'vitality', name: 'VITALITY', desc: '+12 max HP', max: 8 },
    { key: 'ferocity', name: 'FEROCITY', desc: '+7% damage', max: 8 },
    { key: 'conduit', name: 'CONDUIT', desc: '+12% heat gain', max: 8 },
  ];

export function upgradeCost(level: number): number {
  return 80 + level * 70;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades ?? {}) },
      bestGrades: { ...(parsed.bestGrades ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function persistSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode) — play on without persistence
  }
}

export function applyUpgrades(save: SaveData): {
  hpScale: number;
  dmgScale: number;
  heatScale: number;
} {
  return {
    hpScale: 1 + save.upgrades.vitality * 0.115,
    dmgScale: 1 + save.upgrades.ferocity * 0.07,
    heatScale: 1 + save.upgrades.conduit * 0.12,
  };
}

const GRADE_ORDER = ['C', 'B', 'A', 'S'];

export function gradeRank(g: string): number {
  return GRADE_ORDER.indexOf(g);
}

export function computeGrade(damageTakenRatio: number, maxCombo: number, timeMs: number): string {
  let score = 0;
  if (damageTakenRatio < 0.25) score += 2;
  else if (damageTakenRatio < 0.6) score += 1;
  if (maxCombo >= 8) score += 2;
  else if (maxCombo >= 4) score += 1;
  if (timeMs < 120000) score += 1;
  if (score >= 5) return 'S';
  if (score >= 3) return 'A';
  if (score >= 2) return 'B';
  return 'C';
}
