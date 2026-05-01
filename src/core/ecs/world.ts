import { World } from 'miniplex';
import { StateMachine } from '../ai/fsm';
import { Point } from '../ai/astar';

export type Entity = {
  id: string;
  type: 'player' | 'monster' | 'item' | 'switch';
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  health?: { current: number; max: number };
  stamina?: { current: number; max: number; regen: number };
  sprite?: { assetId: string; frame: number };
  interactive?: { 
    radius: number;
    onInteract: (player: Entity) => void;
  };
  ai?: {
    fsm: StateMachine;
    currentState: string;
    detectionRadius: number;
    visionAngle: number;
  };
  path?: {
    points: Point[];
    currentIndex: number;
  };
};

export const world = new World<Entity>();
