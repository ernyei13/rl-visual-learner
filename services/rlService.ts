import { ACTIONS, COLS, ROWS } from '../constants';
import { Action, CellState, CellType, Grid } from '../types';

// Deterministic movement for simulation simplicity in basic step
// Or Stochastic movement as per Slide 7 (0.8 forward, 0.1 left, 0.1 right)
export const getNextState = (
  grid: Grid,
  row: number,
  col: number,
  action: Action,
  isStochastic: boolean = true
): { nextRow: number; nextCol: number } => {
  
  let intendedAction = action;

  if (isStochastic) {
    const rand = Math.random();
    if (rand > 0.8) {
        // 20% chance to go sideways
        const orthogonal = getOrthogonalActions(action);
        intendedAction = rand > 0.9 ? orthogonal[0] : orthogonal[1];
    }
  }

  let dRow = 0;
  let dCol = 0;

  switch (intendedAction) {
    case Action.UP: dRow = -1; break;
    case Action.DOWN: dRow = 1; break;
    case Action.LEFT: dCol = -1; break;
    case Action.RIGHT: dCol = 1; break;
  }

  const newRow = row + dRow;
  const newCol = col + dCol;

  // Check boundaries and walls
  if (
    newRow < 0 ||
    newRow >= ROWS ||
    newCol < 0 ||
    newCol >= COLS ||
    grid[newRow][newCol].type === CellType.WALL
  ) {
    return { nextRow: row, nextCol: col }; // Bump into wall
  }

  return { nextRow: newRow, nextCol: newCol };
};

const getOrthogonalActions = (action: Action): [Action, Action] => {
    if (action === Action.UP || action === Action.DOWN) return [Action.LEFT, Action.RIGHT];
    return [Action.UP, Action.DOWN];
}

// === MDP: Value Iteration (Slide 15) ===
export const performValueIterationStep = (grid: Grid, gamma: number): Grid => {
  const newGrid = JSON.parse(JSON.stringify(grid)); // Deep copy

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];

      if (cell.type === CellType.WALL || cell.type === CellType.TERMINAL) {
          // Terminal state utility is just its reward (simplified for this visualization)
          if(cell.type === CellType.TERMINAL) {
             newGrid[r][c].utility = cell.reward;
          }
          continue;
      }

      let maxUtility = -Infinity;
      let bestAction: Action | null = null;

      // Bellman Update: max_a Sum P(s'|s,a) * U(s')
      for (const action of ACTIONS) {
        let expectedUtility = 0;

        // Transition Logic for Slide 7: 0.8 Forward, 0.1 Left, 0.1 Right
        const moves = [
            { act: action, prob: 0.8 },
            { act: getOrthogonalActions(action)[0], prob: 0.1 },
            { act: getOrthogonalActions(action)[1], prob: 0.1 }
        ];

        for(const move of moves) {
             const outcome = getNextState(grid, r, c, move.act, false); // False because we are calculating expectation manually
             const destCell = grid[outcome.nextRow][outcome.nextCol];
             expectedUtility += move.prob * destCell.utility;
        }

        if (expectedUtility > maxUtility) {
          maxUtility = expectedUtility;
          bestAction = action;
        }
      }

      newGrid[r][c].utility = cell.reward + gamma * maxUtility;
      newGrid[r][c].policy = bestAction;
    }
  }
  return newGrid;
};

// === Greedy Strategy ===
export const getGreedyAction = (cell: CellState): Action => {
  let maxQ = -Infinity;
  let bestActions: Action[] = [];

  for (const action of ACTIONS) {
    if (cell.qValues[action] > maxQ) {
      maxQ = cell.qValues[action];
      bestActions = [action];
    } else if (cell.qValues[action] === maxQ) {
      bestActions.push(action);
    }
  }
  // Random tie breaking
  return bestActions[Math.floor(Math.random() * bestActions.length)];
};

// === Epsilon Greedy Strategy (Slide 25) ===
export const getEpsilonGreedyAction = (cell: CellState, epsilon: number): Action => {
  if (Math.random() < epsilon) {
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  }
  return getGreedyAction(cell);
};

// === Q-Learning Update (Slide 28) ===
export const updateQLearning = (
  grid: Grid,
  s: {r: number, c: number},
  a: Action,
  r: number,
  sPrime: {r: number, c: number},
  alpha: number,
  gamma: number
): Grid => {
    const newGrid = [...grid];
    const oldQ = newGrid[s.r][s.c].qValues[a];
    
    // Max Q(s', a')
    let maxQPrime = -Infinity;
    if (newGrid[sPrime.r][sPrime.c].type === CellType.TERMINAL) {
        maxQPrime = 0; // Or value of terminal? Usually 0 for Q next step
    } else {
        const nextCell = newGrid[sPrime.r][sPrime.c];
        maxQPrime = Math.max(...Object.values(nextCell.qValues));
    }

    // Q(s,a) <- Q(s,a) + alpha * (r + gamma * maxQ(s', a') - Q(s,a))
    const newQ = oldQ + alpha * (r + (gamma * maxQPrime) - oldQ);
    
    newGrid[s.r][s.c].qValues = {
        ...newGrid[s.r][s.c].qValues,
        [a]: newQ
    };

    // Update utility for visualization (max Q)
    newGrid[s.r][s.c].utility = Math.max(...Object.values(newGrid[s.r][s.c].qValues));
    newGrid[s.r][s.c].policy = getGreedyAction(newGrid[s.r][s.c]);

    return newGrid;
};

// === SARSA Update (Slide 27) ===
export const updateSARSA = (
  grid: Grid,
  s: {r: number, c: number},
  a: Action,
  r: number,
  sPrime: {r: number, c: number},
  aPrime: Action,
  alpha: number,
  gamma: number
): Grid => {
    const newGrid = [...grid];
    const oldQ = newGrid[s.r][s.c].qValues[a];
    
    let qPrime = 0;
     if (newGrid[sPrime.r][sPrime.c].type !== CellType.TERMINAL) {
        qPrime = newGrid[sPrime.r][sPrime.c].qValues[aPrime];
    }

    // Q(s,a) <- Q(s,a) + alpha * (r + gamma * Q(s', a') - Q(s,a))
    const newQ = oldQ + alpha * (r + (gamma * qPrime) - oldQ);
    
    newGrid[s.r][s.c].qValues = {
        ...newGrid[s.r][s.c].qValues,
        [a]: newQ
    };
    
    // Update visual utility
    newGrid[s.r][s.c].utility = Math.max(...Object.values(newGrid[s.r][s.c].qValues));
    newGrid[s.r][s.c].policy = getGreedyAction(newGrid[s.r][s.c]);

    return newGrid;
};
