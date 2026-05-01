export interface BiomeConfig {
  name: string;
  levelTitle: string;
  wallDensity: number;
  mudDensity: number;
  waterDensity: number;
  lightRadius: number;
  monsterCount: number;
  monsterType: 'swarm' | 'brute' | 'hexer' | 'warden' | 'sovereign';
}

export const BIOMES: Record<number, BiomeConfig> = {
  1: {
    name: 'Village',
    levelTitle: 'The Last Ember',
    wallDensity: 0.15,
    mudDensity: 0.02,
    waterDensity: 0.02,
    lightRadius: 350,
    monsterCount: 5,
    monsterType: 'swarm',
  },
  2: {
    name: 'Cave',
    levelTitle: 'The Hollow Vein',
    wallDensity: 0.3,
    mudDensity: 0.05,
    waterDensity: 0.1,
    lightRadius: 200,
    monsterCount: 4,
    monsterType: 'brute',
  },
  3: {
    name: 'Forest',
    levelTitle: 'Whispering Murk',
    wallDensity: 0.2,
    mudDensity: 0.3,
    waterDensity: 0.05,
    lightRadius: 150,
    monsterCount: 6,
    monsterType: 'hexer',
  },
  4: {
    name: 'City',
    levelTitle: 'Obsidian Spire',
    wallDensity: 0.4,
    mudDensity: 0.05,
    waterDensity: 0.05,
    lightRadius: 250,
    monsterCount: 3,
    monsterType: 'warden',
  },
  5: {
    name: 'TheAbyss',
    levelTitle: 'The Abyss',
    wallDensity: 0.1,
    mudDensity: 0,
    waterDensity: 0,
    lightRadius: 400,
    monsterCount: 1,
    monsterType: 'sovereign',
  },
};

export class LevelManager {
  currentLevel: number = 1;

  getNextBiome(): BiomeConfig | null {
    if (this.currentLevel > 5) return null;
    return BIOMES[this.currentLevel];
  }

  advance() {
    this.currentLevel++;
  }
}

export const levelManager = new LevelManager();
