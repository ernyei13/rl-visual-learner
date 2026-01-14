import { Action, CellType, Grid, CellState } from './types';

export const ROWS = 3;
export const COLS = 4;

export const INITIAL_PARAMS = {
  gamma: 0.9, // Discount
  alpha: 0.1, // Learning Rate
  epsilon: 0.2, // Exploration
  rewardStep: -0.04 // Standard penalty for movement from slides
};

// Create the grid from Slide 7
// (1,1) is start. (2,2) is wall. (4,3) is +1. (4,2) is -1.
// In 0-indexed array [row][col], row 0 is top.
// Let's map visual representation to array:
// [0,0] [0,1] [0,2] [0,3] (+1)
// [1,0] [1,1] [1,2] [1,3] (-1)
// [2,0] [2,1] [2,2] [2,3]
export const createInitialGrid = (stepReward: number = -0.04): Grid => {
  const grid: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < COLS; c++) {
      let type = CellType.EMPTY;
      let reward = stepReward;

      // Define walls and terminals based on Slide 7
      if (r === 1 && c === 1) {
        type = CellType.WALL;
        reward = 0;
      } else if (r === 0 && c === 3) {
        type = CellType.TERMINAL;
        reward = 1.0;
      } else if (r === 1 && c === 3) {
        type = CellType.TERMINAL;
        reward = -1.0;
      } else if (r === 2 && c === 0) {
        type = CellType.START;
      }

      row.push({
        row: r,
        col: c,
        type,
        reward,
        utility: 0,
        qValues: {
          [Action.UP]: 0,
          [Action.DOWN]: 0,
          [Action.LEFT]: 0,
          [Action.RIGHT]: 0,
        },
        policy: null,
        visitCount: 0
      });
    }
    grid.push(row);
  }
  return grid;
};

export const ACTIONS = [Action.UP, Action.DOWN, Action.LEFT, Action.RIGHT];

export const ARROW_MAP: Record<Action, string> = {
  [Action.UP]: '↑',
  [Action.DOWN]: '↓',
  [Action.LEFT]: '←',
  [Action.RIGHT]: '→',
};