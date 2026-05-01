import { TileType, Level } from './level';
import { BiomeConfig } from './manager';

export class LevelGenerator {
  static generate(width: number, height: number, tileSize: number, config: BiomeConfig): Level {
    const tiles: TileType[][] = [];

    // Random fill
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        const rand = Math.random();
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          tiles[y][x] = TileType.WALL;
        } else if (rand < config.wallDensity) {
          tiles[y][x] = TileType.WALL;
        } else if (rand < config.wallDensity + config.waterDensity) {
          tiles[y][x] = TileType.WATER;
        } else if (rand < config.wallDensity + config.waterDensity + config.mudDensity) {
          tiles[y][x] = TileType.MUD;
        } else {
          tiles[y][x] = TileType.FLOOR;
        }
      }
    }

    // Cellular Automata pass (simple)
    for (let i = 0; i < 2; i++) {
      this.smooth(tiles, width, height);
    }

    return new Level(width, height, tileSize, tiles);
  }

  private static smooth(tiles: TileType[][], width: number, height: number) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (tiles[y + dy][x + dx] === TileType.WALL) walls++;
          }
        }
        if (walls > 4) tiles[y][x] = TileType.WALL;
        else if (walls < 4 && tiles[y][x] === TileType.WALL) tiles[y][x] = TileType.FLOOR;
      }
    }
  }
}
