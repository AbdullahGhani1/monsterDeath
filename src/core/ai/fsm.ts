import { Entity } from '../ecs/world';

export interface AIState {
  name: string;
  enter?: (entity: Entity) => void;
  update: (entity: Entity) => string | null; // Returns name of next state or null to stay
  exit?: (entity: Entity) => void;
}

export class StateMachine {
  private currentState: AIState | null = null;

  constructor(private states: Map<string, AIState>) {}

  tick(entity: Entity, initialState: string) {
    if (!this.currentState) {
      this.currentState = this.states.get(initialState) || null;
      this.currentState?.enter?.(entity);
    }

    const nextStateName = this.currentState?.update(entity);
    if (nextStateName && nextStateName !== this.currentState?.name) {
      const nextState = this.states.get(nextStateName);
      if (nextState) {
        this.currentState?.exit?.(entity);
        this.currentState = nextState;
        this.currentState.enter?.(entity);
      }
    }
  }
}
