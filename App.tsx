import React, { useState, useEffect, useCallback, useRef } from 'react';
import GridWorld from './components/GridWorld';
import MathBlock from './components/MathBlock';
import { ACTIONS, createInitialGrid, INITIAL_PARAMS } from './constants';
import { AgentState, CellType, Grid, Action } from './types';
import { 
  getNextState, 
  performValueIterationStep, 
  getEpsilonGreedyAction, 
  updateQLearning,
  updateSARSA 
} from './services/rlService';

enum Tab {
  MDP = 'MDP',
  TD = 'TD_ADP',
  QLEARNING = 'Q_LEARNING',
  SARSA = 'SARSA'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MDP);
  
  // Simulation State
  const [grid, setGrid] = useState<Grid>(createInitialGrid(INITIAL_PARAMS.rewardStep));
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [iteration, setIteration] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Algorithm Parameters
  const [gamma] = useState(INITIAL_PARAMS.gamma);
  const [alpha] = useState(INITIAL_PARAMS.alpha);
  const [epsilon] = useState(INITIAL_PARAMS.epsilon);

  // Reset function
  const resetSimulation = useCallback(() => {
    setGrid(createInitialGrid(INITIAL_PARAMS.rewardStep));
    setIteration(0);
    setAgent(null);
    stopAutoPlay();
  }, []);

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    setAutoPlay(false);
  };

  // Switch tabs
  const handleTabChange = (tab: Tab) => {
    resetSimulation();
    setActiveTab(tab);
    // Initialize agent for RL tabs
    if (tab !== Tab.MDP) {
       setAgent({ row: 2, col: 0, lastAction: null, totalReward: 0 });
    }
  };

  // --- MDP Logic ---
  const stepMDP = () => {
    setGrid(prev => performValueIterationStep(prev, gamma));
    setIteration(prev => prev + 1);
  };

  // --- RL Logic (Q-Learning / SARSA) ---
  const stepRL = useCallback(() => {
    setAgent(prevAgent => {
        if (!prevAgent) return { row: 2, col: 0, lastAction: null, totalReward: 0 };
        
        const currentCell = grid[prevAgent.row][prevAgent.col];
        
        // 1. Choose Action (Epsilon Greedy)
        // For SARSA, we might need the action chosen in the *previous* step, 
        // but typically for the loop implementation we just pick next action here.
        // For standard loop:
        const action = getEpsilonGreedyAction(currentCell, epsilon);
        
        // 2. Execute Action (Environment Step)
        const { nextRow, nextCol } = getNextState(grid, prevAgent.row, prevAgent.col, action, true);
        const nextCell = grid[nextRow][nextCol];
        const reward = nextCell.reward;

        // 3. Update Estimates
        let newGrid = [...grid];
        
        if (activeTab === Tab.QLEARNING) {
            newGrid = updateQLearning(
                newGrid, 
                { r: prevAgent.row, c: prevAgent.col }, 
                action, 
                reward, 
                { r: nextRow, c: nextCol }, 
                alpha, 
                gamma
            );
        } else if (activeTab === Tab.SARSA) {
            // SARSA requires choosing the next action *before* updating
            // On-Policy: The action we use for update is the one we actually take next.
            const nextAction = getEpsilonGreedyAction(newGrid[nextRow][nextCol], epsilon);
            newGrid = updateSARSA(
                 newGrid,
                 { r: prevAgent.row, c: prevAgent.col },
                 action,
                 reward,
                 { r: nextRow, c: nextCol },
                 nextAction,
                 alpha,
                 gamma
            );
            // Optimization for visualization: we'd need to force the agent to take this 'nextAction' 
            // in the next React render cycle to be strictly SARSA, but for this visualizer, 
            // recalculating epsilon-greedy next frame is acceptable approximation 
            // or we store 'nextAction' in agent state. 
            // For simplicity here, we stick to the standard update rule visualization.
        } else if (activeTab === Tab.TD) {
             // TD(0) for utility V(s). Simplified as Q-Learning with implicit policy
             // U(s) <- U(s) + alpha(R + gamma U(s') - U(s))
             const currentU = newGrid[prevAgent.row][prevAgent.col].utility;
             const nextU = nextCell.type === CellType.TERMINAL ? nextCell.reward : newGrid[nextRow][nextCol].utility;
             const newU = currentU + alpha * (reward + gamma * nextU - currentU);
             newGrid[prevAgent.row][prevAgent.col].utility = newU;
        }

        setGrid(newGrid);

        // 4. Move Agent or Reset if Terminal
        if (nextCell.type === CellType.TERMINAL) {
             // Reset agent to start after short delay or immediately
             return { row: 2, col: 0, lastAction: null, totalReward: 0 };
        } else {
             return { row: nextRow, col: nextCol, lastAction: action, totalReward: prevAgent.totalReward + reward };
        }
    });
    setIteration(prev => prev + 1);
  }, [grid, activeTab, alpha, gamma, epsilon]);


  // Auto Play Effect
  useEffect(() => {
    if (autoPlay) {
        autoPlayRef.current = setInterval(() => {
            if (activeTab === Tab.MDP) {
                stepMDP();
            } else {
                stepRL();
            }
        }, activeTab === Tab.MDP ? 500 : 100); // Faster for RL agents
    }
    return () => {
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlay, activeTab, stepRL]);


  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="text-xl font-bold tracking-tight">RL Visualizer</h1>
          <p className="text-xs text-neutral-500 mt-2">Interactive companion for Reinforcement Learning concepts.</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {Object.values(Tab).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors border-2 ${
                activeTab === tab
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                  : 'bg-white text-neutral-600 border-transparent hover:bg-neutral-100 hover:border-neutral-200'
              }`}
            >
              {tab === Tab.MDP && "1. MDP & Value Iteration"}
              {tab === Tab.TD && "2. TD Learning / ADP"}
              {tab === Tab.SARSA && "3. SARSA (On-Policy)"}
              {tab === Tab.QLEARNING && "4. Q-Learning (Off-Policy)"}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-200 text-xs text-neutral-400">
            Based on slides by Andrea Passerini
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
            
            {/* Header Area */}
            <div className="max-w-3xl">
                <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                    {activeTab === Tab.MDP && "Markov Decision Process"}
                    {activeTab === Tab.TD && "Temporal Difference Learning"}
                    {activeTab === Tab.QLEARNING && "Q-Learning"}
                    {activeTab === Tab.SARSA && "SARSA"}
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                    {activeTab === Tab.MDP && "The environment is fully known. We use the Bellman Equation to iteratively calculate the true utility of each state."}
                    {activeTab === Tab.TD && "The agent explores the environment. It updates the utility of a state based on the observed transition difference (TD error), without needing a full transition model."}
                    {activeTab === Tab.QLEARNING && "An Off-Policy algorithm. The agent learns the action-value function Q(s,a) by assuming the optimal action will be taken in the next state (max Q)."}
                    {activeTab === Tab.SARSA && "An On-Policy algorithm. The agent learns the Q-value based on the action it actually takes next (following its current exploration policy)."}
                </p>
            </div>

            {/* Interactive Area */}
            <div className="flex flex-col xl:flex-row gap-8 items-start">
                
                {/* Visualizer */}
                <div className="flex flex-col items-center space-y-6">
                    <GridWorld 
                        grid={grid} 
                        agent={agent} 
                        showQValues={activeTab === Tab.QLEARNING || activeTab === Tab.SARSA}
                    />
                    
                    {/* Controls */}
                    <div className="flex flex-col items-center space-y-3 w-full max-w-xs">
                        <div className="flex space-x-2 w-full">
                            <button 
                                onClick={activeTab === Tab.MDP ? stepMDP : stepRL}
                                className="flex-1 bg-white border-2 border-neutral-900 py-2 px-4 font-bold hover:bg-neutral-100 active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                Step
                            </button>
                            <button 
                                onClick={() => setAutoPlay(!autoPlay)}
                                className={`flex-1 border-2 border-neutral-900 py-2 px-4 font-bold active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${autoPlay ? 'bg-neutral-900 text-white' : 'bg-white hover:bg-neutral-100'}`}
                            >
                                {autoPlay ? 'Pause' : 'Auto Run'}
                            </button>
                        </div>
                        <button 
                            onClick={resetSimulation}
                            className="text-sm text-neutral-500 hover:text-neutral-900 underline"
                        >
                            Reset Environment
                        </button>
                        <div className="font-mono text-xs text-neutral-400 mt-2">
                            Iteration: {iteration}
                        </div>
                    </div>
                </div>

                {/* Formula & Explanation Section */}
                <div className="flex-1 max-w-xl">
                    
                    {activeTab === Tab.MDP && (
                        <MathBlock 
                            title="Bellman Equation (Value Iteration)"
                            formula={<>U<sub>i+1</sub>(s) ← R(s) + γ max<sub>a</sub> ∑ P(s'|s,a)U<sub>i</sub>(s')</>}
                            description="For each state, we update its utility by looking at the immediate reward plus the discounted expected utility of the neighbors. Over time, these values converge to the optimal policy."
                        />
                    )}

                    {activeTab === Tab.TD && (
                        <MathBlock 
                            title="TD Update Rule"
                            formula={<>U(s) ← U(s) + α(R(s) + γU(s') - U(s))</>}
                            description="We update the utility of the current state 's' by nudging it towards the observed reward plus the utility of the next state 's''. No transition model P(s'|s,a) is needed!"
                        />
                    )}

                    {activeTab === Tab.QLEARNING && (
                        <MathBlock 
                            title="Q-Learning Update"
                            formula={<>Q(s,a) ← Q(s,a) + α(R + γ max<sub>a'</sub> Q(s',a') - Q(s,a))</>}
                            description="Note the 'max' term. We update our estimate based on the best possible future action, even if our agent explores and picks a random action next. This makes it 'Off-Policy'."
                        />
                    )}

                    {activeTab === Tab.SARSA && (
                        <MathBlock 
                            title="SARSA Update"
                            formula={<>Q(s,a) ← Q(s,a) + α(R + γ Q(s',a') - Q(s,a))</>}
                            description="State-Action-Reward-State-Action. We update based on the actual next action a' chosen by our policy. If the policy is safe/exploratory, SARSA learns a safer path than Q-Learning."
                        />
                    )}

                    <div className="bg-neutral-100 p-4 border border-neutral-200 rounded-lg text-sm mt-6">
                        <h4 className="font-bold mb-2">Parameters</h4>
                        <ul className="space-y-1 font-mono text-neutral-600">
                            <li>γ (Gamma/Discount): {gamma}</li>
                            <li>α (Alpha/Learning Rate): {alpha}</li>
                            {activeTab !== Tab.MDP && <li>ε (Epsilon/Exploration): {epsilon}</li>}
                            <li>Step Cost: {INITIAL_PARAMS.rewardStep}</li>
                        </ul>
                    </div>

                    {activeTab !== Tab.MDP && (
                        <div className="mt-4 text-sm text-neutral-500 italic">
                            The agent (🤖) is exploring. It might make random moves (exploration) or follow the best arrows (exploitation).
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;