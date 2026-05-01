export class SpatialHash<T extends { position?: { x: number; y: number } }> {
  private cells: Map<string, T[]> = new Map();

  constructor(private cellSize: number) {}

  private key(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  clear() {
    this.cells.clear();
  }

  insert(entity: T) {
    if (!entity.position) return;
    const k = this.key(entity.position.x, entity.position.y);
    if (!this.cells.has(k)) {
      this.cells.set(k, []);
    }
    this.cells.get(k)!.push(entity);
  }

  query(x: number, y: number, width: number, height: number): T[] {
    const result: T[] = [];
    const startX = Math.floor(x / this.cellSize);
    const startY = Math.floor(y / this.cellSize);
    const endX = Math.floor((x + width) / this.cellSize);
    const endY = Math.floor((y + height) / this.cellSize);

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const k = `${cx},${cy}`;
        const cell = this.cells.get(k);
        if (cell) {
          result.push(...cell);
        }
      }
    }
    return result;
  }
}
