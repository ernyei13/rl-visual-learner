export enum CellType {
  EMPTY = 'EMPTY',
  WALL = 'WALL',
  TERMINAL = 'TERMINAL',
  START = 'START'
}

export enum Action {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface CellState {
  row: number;
  col: number;
  type: CellType;
  reward: number; // Immediate reward R(s)
  utility: number; // V(s) or U(s)
  qValues: Record<Action, number>; // Q(s,a)
  policy: Action | null; // Best action
  visitCount: number; // For exploration visualization
}

export interface AgentState {
  row: number;
  col: number;
  lastAction: Action | null;
  totalReward: number;
}

export type Grid = CellState[][];

export interface AlgorithmParams {
  gamma: number; // Discount factor
  alpha: number; // Learning rate
  epsilon: number; // Exploration rate
  rewardStep: number; // Reward for non-terminal steps
}