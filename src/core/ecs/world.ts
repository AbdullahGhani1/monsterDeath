import { World } from 'miniplex';

export type Entity = {
  id: string;
  type: 'player' | 'monster' | 'item';
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  health?: { current: number; max: number };
  sprite?: { assetId: string; frame: number };
};

export const world = new World<Entity>();
