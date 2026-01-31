
import React from 'react';
import { GameState, Difficulty } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  score: number;
  points: number;
  highScore: number;
  highPoints: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
  onPause: () => void;
  onExit: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, 
  difficulty,
  setDifficulty,
  score, 
  points,
  highScore, 
  highPoints,
  isMuted,
  onToggleMute,
  onStart, 
  onRestart,
  onResume,
  onPause,
  onExit
}) => {
  return (
    <>
      {/* HUD: Score and Pause Button */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none select-none z-30 font-bold">
          <div className="flex items-center gap-6 pointer-events-auto">
            <button 
              onClick={onPause}
              className="w-12 h-12 bg-white/10 border border-white/20 hover:bg-white/20 rounded-full flex items-center justify-center transition-all group shadow-lg backdrop-blur-md"
              title="Pause (P / ESC)"
            >
              <div className="flex gap-1">
                <div className="w-1.5 h-4 bg-cyan-400 rounded-full group-hover:scale-110 transition-transform"></div>
                <div className="w-1.5 h-4 bg-cyan-400 rounded-full group-hover:scale-110 transition-transform"></div>
              </div>
            </button>

            <button 
              onClick={onToggleMute}
              className="w-12 h-12 bg-white/10 border border-white/20 hover:bg-white/20 rounded-full flex items-center justify-center transition-all group shadow-lg backdrop-blur-md text-cyan-400"
              title="Toggle Mute (M)"
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <div className="flex flex-col">
              <div className="text-[10px] uppercase tracking-widest opacity-60 text-white">Stars</div>
              <div className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(255,251,0,0.5)]">
                {points}
              </div>
            </div>
            
            <div className="flex flex-col ml-4">
              <div className="text-[10px] uppercase tracking-widest opacity-60 text-white">Mode</div>
              <div className={`text-sm font-black italic tracking-widest uppercase ${
                difficulty === Difficulty.HARD ? 'text-red-500' : difficulty === Difficulty.EASY ? 'text-green-400' : 'text-cyan-400'
              }`}>
                {difficulty}
              </div>
            </div>
          </div>

          <div className="text-white text-right">
            <div className="text-sm uppercase tracking-widest opacity-60">Distance</div>
            <div className="text-5xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
              {Math.floor(score)}m
            </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-white z-40 animate-in fade-in duration-500">
          <div className="relative mb-10">
            <h1 className="text-8xl font-black italic tracking-tighter bg-gradient-to-r from-cyan-400 via-white to-fuchsia-500 bg-clip-text text-transparent drop-shadow-2xl text-center">
              REVERSE GRAVITY
            </h1>
            <h2 className="text-3xl font-bold tracking-[0.4em] text-white/80 text-center mt-2">RUNNER</h2>
          </div>

          <div className="flex gap-4 mb-10">
            {Object.values(Difficulty).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all border-2 ${
                  difficulty === d 
                    ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-110' 
                    : 'bg-transparent text-white/40 border-white/20 hover:border-white/50 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={onStart}
              className="px-16 py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-2xl rounded-full transition-all transform hover:scale-110 active:scale-95 shadow-[0_0_40px_rgba(0,255,255,0.5)] uppercase italic tracking-widest"
            >
              Initialize Run
            </button>
            <div className="text-sm opacity-60 animate-pulse flex items-center gap-3 font-bold mt-4">
              <span className="px-3 py-1 bg-white/10 rounded border border-white/20 font-mono">SPACE</span>
              TO FLIP GRAVITY
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50 animate-in fade-in duration-300">
          <div className="bg-[#0a0a1a]/90 p-12 rounded-3xl border-2 border-cyan-500/50 shadow-[0_0_80px_rgba(0,255,255,0.2)] text-center min-w-[400px]">
            <h2 className="text-5xl font-black mb-10 text-cyan-400 italic tracking-widest uppercase">Paused</h2>
            <div className="flex flex-col gap-4">
              <button onClick={onResume} className="w-full py-4 bg-cyan-500 text-black font-black text-xl rounded-xl transition-all hover:bg-cyan-400 transform hover:scale-105 active:scale-95 uppercase tracking-widest">Resume Run</button>
              <button onClick={onRestart} className="w-full py-4 bg-white/10 text-white font-black text-xl rounded-xl transition-all hover:bg-white/20 border border-white/20 transform hover:scale-105 active:scale-95 uppercase tracking-widest">Restart Sector</button>
              <button onClick={onExit} className="w-full py-4 text-white/50 font-bold text-sm rounded-xl transition-all hover:text-white uppercase tracking-widest mt-4">Exit to Menu</button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-xl flex flex-col items-center justify-center text-white z-50 animate-in fade-in zoom-in duration-500">
          <div className="bg-black/80 p-12 rounded-[40px] border-4 border-red-500 shadow-[0_0_120px_rgba(255,0,0,0.4)] text-center min-w-[480px]">
            <h2 className="text-6xl font-black mb-2 text-red-500 tracking-tighter italic">SYSTEM FAILURE</h2>
            <p className="text-xs font-bold tracking-[0.5em] text-white/40 uppercase mb-8 italic">Mode: {difficulty}</p>
            
            <div className="grid grid-cols-2 gap-8 mb-10 border-y border-white/10 py-8">
              <div className="text-center space-y-4">
                <div>
                  <div className="text-[10px] uppercase opacity-40 font-bold tracking-widest mb-1">Last Run Distance</div>
                  <div className="text-3xl font-black text-white">{Math.floor(score)}m</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase opacity-40 font-bold tracking-widest mb-1">Last Run Stars</div>
                  <div className="text-3xl font-black text-yellow-400">{points}</div>
                </div>
              </div>
              <div className="text-center space-y-4 border-l border-white/10">
                <div>
                  <div className="text-[10px] uppercase opacity-40 font-bold tracking-widest mb-1 text-cyan-400">Personal Best Distance</div>
                  <div className="text-3xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">{highScore}m</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase opacity-40 font-bold tracking-widest mb-1 text-yellow-500">Personal Best Stars</div>
                  <div className="text-3xl font-black text-yellow-500 drop-shadow-[0_0_10px_rgba(255,251,0,0.4)]">{highPoints}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button onClick={onRestart} className="w-full py-5 bg-white text-black font-black text-2xl rounded-2xl transition-all hover:bg-red-500 hover:text-white transform hover:scale-110 active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)] uppercase tracking-tighter italic">Relaunch Sequence</button>
              <button onClick={onExit} className="w-full py-4 bg-transparent text-white/30 hover:text-white/80 font-bold text-sm tracking-widest uppercase transition-colors">Abort to Mainframe</button>
            </div>
            
            <div className="text-[10px] opacity-30 font-bold mt-8 tracking-widest uppercase">
              RE-INITIALIZE ATTAINABLE WITH <span className="text-white px-1.5 py-0.5 bg-white/10 rounded">R</span> KEY
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UIOverlay;
