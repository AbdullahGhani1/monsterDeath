import { World } from 'miniplex';
import { StateMachine } from '../ai/fsm';
import { Point } from '../ai/astar';

export type AnimationSequence = {
  frames: number[];
  speed: number; // ms per frame
  loop: boolean;
};

export type Entity = {
  id: string;
  type: 'player' | 'monster' | 'item' | 'switch' | 'particle';
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  health?: { current: number; max: number };
  stamina?: { current: number; max: number; regen: number };
  sprite?: { assetId: string; frame: number; width: number; height: number };
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
  animator?: {
    sequences: Record<string, AnimationSequence>;
    currentSequence: string;
    currentFrameIndex: number;
    elapsedTime: number;
    isFinished: boolean;
  };
  combat?: {
    isPlayerTurn: boolean;
    engagedWith: string; // ID of target
    baseDamage: number;
    defenseModifier: number;
    hitFlashTimer: number;
  };
  particle?: {
    life: number;
    maxLife: number;
    color: string;
    size: number;
  };
};

export const world = new World<Entity>();
