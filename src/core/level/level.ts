export enum TileType {
  FLOOR = 0,
  WALL = 1,
  WATER = 2,
  MUD = 3,
}

export const TileCost: Record<TileType, number> = {
  [TileType.FLOOR]: 1,
  [TileType.WALL]: Infinity,
  [TileType.WATER]: 5,
  [TileType.MUD]: 3,
};

export class Level {
  constructor(
    public width: number,
    public height: number,
    public tileSize: number,
    public tiles: TileType[][]
  ) {}

  getTile(x: number, y: number): TileType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TileType.WALL;
    return this.tiles[y][x];
  }

  isPassable(x: number, y: number): boolean {
    return this.getTile(x, y) !== TileType.WALL;
  }
}
