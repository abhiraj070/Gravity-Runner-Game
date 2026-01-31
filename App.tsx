
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, Difficulty } from './types';
import { INPUT_DEBOUNCE_MS } from './constants';
import { audio } from './services/AudioManager';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('reverse_gravity_highscore');
    if (!saved) return 0;
    const parsed = parseInt(saved);
    return isNaN(parsed) ? 0 : parsed;
  });

  const [highPoints, setHighPoints] = useState(() => {
    const saved = localStorage.getItem('reverse_gravity_highpoints');
    if (!saved) return 0;
    const parsed = parseInt(saved);
    return isNaN(parsed) ? 0 : parsed;
  });

  const lastInputTime = useRef(0);

  const validateAndSetScore = useCallback((val: number) => {
    if (typeof val !== 'number' || isNaN(val)) return;
    setScore(Math.max(0, Math.floor(val)));
  }, []);

  const validateAndSetPoints = useCallback((val: number) => {
    if (typeof val !== 'number' || isNaN(val)) return;
    setPoints(Math.max(0, Math.floor(val)));
  }, []);

  const transitionTo = useCallback((nextState: GameState) => {
    const now = Date.now();
    if (now - lastInputTime.current < INPUT_DEBOUNCE_MS) return;
    lastInputTime.current = now;

    setGameState((current) => {
      if (nextState === GameState.PLAYING && current !== GameState.PLAYING) {
        audio.startBGM();
      } else if (nextState === GameState.GAMEOVER || nextState === GameState.START) {
        audio.stopBGM();
      }

      if (nextState !== current) {
        audio.playClick();
      }

      if (current === GameState.START && nextState === GameState.PLAYING) return nextState;
      if (current === GameState.PLAYING && (nextState === GameState.PAUSED || nextState === GameState.GAMEOVER)) return nextState;
      if (current === GameState.PAUSED && (nextState === GameState.PLAYING || nextState === GameState.START)) return nextState;
      if (current === GameState.GAMEOVER && (nextState === GameState.PLAYING || nextState === GameState.START)) return nextState;
      
      if (nextState === GameState.PLAYING && (current === GameState.GAMEOVER || current === GameState.PAUSED)) {
        setScore(0);
        setPoints(0);
        return nextState;
      }
      return current;
    });
  }, []);

  const handleGameOver = useCallback((finalScore: number, finalPoints: number) => {
    const sanitizedScore = isNaN(finalScore) ? 0 : Math.floor(finalScore);
    const sanitizedPoints = isNaN(finalPoints) ? 0 : Math.floor(finalPoints);
    
    audio.playDeath();
    setGameState(GameState.GAMEOVER);
    setScore(sanitizedScore);
    setPoints(sanitizedPoints);
    
    if (sanitizedScore > highScore) {
      setHighScore(sanitizedScore);
      localStorage.setItem('reverse_gravity_highscore', sanitizedScore.toString());
    }

    if (sanitizedPoints > highPoints) {
      setHighPoints(sanitizedPoints);
      localStorage.setItem('reverse_gravity_highpoints', sanitizedPoints.toString());
    }
  }, [highScore, highPoints]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newVal = !prev;
      audio.setMute(newVal);
      return newVal;
    });
  }, []);

  const startGame = () => transitionTo(GameState.PLAYING);
  const restartGame = () => transitionTo(GameState.PLAYING);
  const pauseGame = useCallback(() => transitionTo(GameState.PAUSED), [transitionTo]);
  const resumeGame = useCallback(() => transitionTo(GameState.PLAYING), [transitionTo]);
  const exitToMenu = () => transitionTo(GameState.START);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === GameState.GAMEOVER && e.code === 'KeyR') {
        restartGame();
      }
      if (gameState === GameState.START && e.code === 'Space') {
        startGame();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === GameState.PLAYING) pauseGame();
        else if (gameState === GameState.PAUSED) resumeGame();
      }
      if (e.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, pauseGame, resumeGame, toggleMute]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
      <GameCanvas 
        gameState={gameState} 
        difficulty={difficulty}
        onGameOver={handleGameOver}
        onScoreUpdate={validateAndSetScore}
        onPointsUpdate={validateAndSetPoints}
      />
      
      <UIOverlay 
        gameState={gameState}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        score={score}
        points={points}
        highScore={highScore}
        highPoints={highPoints}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onStart={startGame}
        onRestart={restartGame}
        onResume={resumeGame}
        onPause={pauseGame}
        onExit={exitToMenu}
      />

      <div className="absolute inset-0 pointer-events-none z-[-1] opacity-20">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-transparent to-red-900" />
      </div>
    </div>
  );
};

export default App;
