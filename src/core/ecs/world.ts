import { World } from 'miniplex';
import { StateMachine } from '../ai/fsm';
import { Point } from '../ai/astar';

export type AnimationSequence = {
  frames: number[];
  speed: number; // ms per frame
  loop: boolean;
};

export type InventoryItem = {
  id: string;
  count: number;
};

export type Mission = {
  id: string;
  type: 'kill' | 'interact';
  target: string;
  current: number;
  required: number;
  completed: boolean;
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
    attackRange: number;
    attackCooldown: number;
    lastAttackTime: number;
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
    phase?: number;
  };
  particle?: {
    life: number;
    maxLife: number;
    color: string;
    size: number;
    active: boolean;
  };
  inventory?: {
    items: InventoryItem[];
    maxCapacity: number;
  };
  missions?: {
    active: Mission[];
  };
  nightVision?: {
    isActive: boolean;
    hasGoggles: boolean;
  };
};

export const world = new World<Entity>();
