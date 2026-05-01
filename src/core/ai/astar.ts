import { Level, TileCost } from '../level/level';

export interface Point {
  x: number;
  y: number;
}

class Node {
  constructor(
    public x: number,
    public y: number,
    public g: number = 0,
    public h: number = 0,
    public parent: Node | null = null
  ) {}

  get f(): number {
    return this.g + this.h;
  }
}

export class AStar {
  static findPath(level: Level, start: Point, end: Point): Point[] | null {
    const openSet: Node[] = [];
    const closedSet: Set<string> = new Set();

    const startNode = new Node(start.x, start.y);
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet[currentIndex];

      if (current.x === end.x && current.y === end.y) {
        const path: Point[] = [];
        let temp: Node | null = current;
        while (temp) {
          path.push({ x: temp.x, y: temp.y });
          temp = temp.parent;
        }
        return path.reverse();
      }

      openSet.splice(currentIndex, 1);
      closedSet.add(`${current.x},${current.y}`);

      const neighbors = this.getNeighbors(current, level);

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;

        const tile = level.getTile(neighbor.x, neighbor.y);
        const cost = TileCost[tile];
        if (cost === Infinity) continue;

        const tentativeG = current.g + cost;

        let neighborNode = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);

        if (!neighborNode) {
          neighborNode = new Node(
            neighbor.x,
            neighbor.y,
            tentativeG,
            this.heuristic(neighbor, end),
            current
          );
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.parent = current;
        }
      }
    }

    return null;
  }

  private static getNeighbors(node: Node, level: Level): Point[] {
    const points: Point[] = [];
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const dir of dirs) {
      const nx = node.x + dir.x;
      const ny = node.y + dir.y;
      if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.height) {
        points.push({ x: nx, y: ny });
      }
    }
    return points;
  }

  private static heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
