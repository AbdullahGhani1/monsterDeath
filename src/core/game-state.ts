export enum GameState {
  EXPLORATION = 'EXPLORATION',
  COMBAT = 'COMBAT',
}

export class GameStateManager {
  private currentState: GameState = GameState.EXPLORATION;
  private listeners: ((state: GameState) => void)[] = [];

  get state() {
    return this.currentState;
  }

  set state(newState: GameState) {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.listeners.forEach((l) => l(newState));
  }

  subscribe(listener: (state: GameState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const gameStateManager = new GameStateManager();
