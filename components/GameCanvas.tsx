
import React, { useRef, useEffect, useCallback } from 'react';
import { 
  GameState, 
  Difficulty,
  Obstacle, 
  ObstacleType, 
  Player, 
  Particle,
  Collectible,
  CollectibleType
} from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GROUND_HEIGHT, 
  CEILING_HEIGHT, 
  BASE_SPEED, 
  MAX_SPEED, 
  SPEED_INCREMENT, 
  GRAVITY_ACCEL, 
  COLORS,
  NEAR_MISS_THRESHOLD,
  MAX_PARTICLES,
  MAX_OBSTACLES,
  MAX_COLLECTIBLES,
  TERMINAL_VELOCITY
} from '../constants';
import { audio } from '../services/AudioManager';

interface GameCanvasProps {
  gameState: GameState;
  difficulty: Difficulty;
  onGameOver: (score: number, points: number) => void;
  onScoreUpdate: (score: number) => void;
  onPointsUpdate: (points: number) => void;
}

interface Telegraph {
  x: number;
  y: number;
  width: number;
  height: number;
  life: number;
  maxLife: number;
  color: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, difficulty, onGameOver, onScoreUpdate, onPointsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const gameLoopRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const pointsRef = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const telegraphsRef = useRef<Telegraph[]>([]);
  const playerRef = useRef<Player>({
    y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
    vy: 0,
    gravityDir: 1,
    width: 34,
    height: 40,
    isFlipping: false,
    flipProgress: 0
  });
  const screenShakeRef = useRef(0);
  const lastObstacleSpawnRef = useRef(0);
  const lastCollectibleSpawnRef = useRef(0);
  const comboRef = useRef(0);
  const isLoopingRef = useRef(false);
  
  const prevStateRef = useRef<GameState>(gameState);

  const getDifficultySettings = useCallback(() => {
    switch(difficulty) {
      case Difficulty.EASY:
        return { baseSpeed: 6, maxSpeed: 16, spawnOffset: 150, speedInc: SPEED_INCREMENT * 0.7 };
      case Difficulty.HARD:
        return { baseSpeed: 11, maxSpeed: 30, spawnOffset: -80, speedInc: SPEED_INCREMENT * 1.5 };
      case Difficulty.NORMAL:
      default:
        return { baseSpeed: 8, maxSpeed: 22, spawnOffset: 0, speedInc: SPEED_INCREMENT };
    }
  }, [difficulty]);

  const resetGameInternal = useCallback(() => {
    const settings = getDifficultySettings();
    scoreRef.current = 0;
    pointsRef.current = 0;
    speedRef.current = settings.baseSpeed;
    obstaclesRef.current = [];
    collectiblesRef.current = [];
    particlesRef.current = [];
    telegraphsRef.current = [];
    playerRef.current = {
      y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
      vy: 0,
      gravityDir: 1,
      width: 34,
      height: 40,
      isFlipping: false,
      flipProgress: 0
    };
    lastObstacleSpawnRef.current = 0;
    lastCollectibleSpawnRef.current = 0;
    comboRef.current = 0;
    screenShakeRef.current = 0;
    onScoreUpdate(0); 
    onPointsUpdate(0);
  }, [onScoreUpdate, onPointsUpdate, getDifficultySettings]);

  const createParticle = (x: number, y: number, color: string, count = 10, sizeRange = [2, 7], speedRange = [4, 12]) => {
    if (particlesRef.current.length >= MAX_PARTICLES) return;
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
      particlesRef.current.push({
        x, 
        y, 
        vx: Math.cos(angle) * speed, 
        vy: Math.sin(angle) * speed,
        life: 1.0, 
        color, 
        size: Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0]
      });
    }
  };

  const addTelegraph = (y: number, height: number, color: string, duration = 60) => {
    telegraphsRef.current.push({
      x: CANVAS_WIDTH - 150,
      y,
      width: 250,
      height,
      life: duration,
      maxLife: duration,
      color
    });
  };

  const addObstacle = (type: ObstacleType, xOffset: number, y: number, width: number, height: number, speedMod = 1) => {
    if (obstaclesRef.current.length >= MAX_OBSTACLES) return;
    obstaclesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      type, x: CANVAS_WIDTH + xOffset, y, width, height, speedModifier: speedMod,
      isFalling: false, fallDelay: type === ObstacleType.FALLING_BLOCK ? 35 : 0, hasPassed: false
    });
  };

  const spawnZigZagPattern = (currentSpeed: number) => {
    const intensity = Math.min(1.0, (currentSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED));
    const segments = 4 + Math.floor(intensity * 6);
    const spacing = 180 - (intensity * 60);
    
    // Overall warning
    addTelegraph(CEILING_HEIGHT, CANVAS_HEIGHT - GROUND_HEIGHT - CEILING_HEIGHT, 'rgba(255, 0, 150, 0.1)', 80);

    for (let i = 0; i < segments; i++) {
      const side = i % 2 === 0; // True = Floor, False = Ceiling
      const xOff = i * spacing;
      const yPos = side ? CANVAS_HEIGHT - GROUND_HEIGHT - 30 : CEILING_HEIGHT;
      
      // Individual telegraphs for each segment
      addTelegraph(yPos, 30, COLORS.SPIKE, 40 + i * 10);
      addObstacle(side ? ObstacleType.FLOOR_SPIKE : ObstacleType.CEILING_SPIKE, xOff, yPos, 40, 30);
      
      // Add extra danger for high speed: middle saws
      if (intensity > 0.6 && i % 2 === 1) {
        addObstacle(ObstacleType.SAW_BLADE, xOff + spacing / 2, CANVAS_HEIGHT / 2 - 20, 40, 40, 0.8);
      }
    }
  };

  const spawnPattern = () => {
    const currentSpeed = speedRef.current;
    const settings = getDifficultySettings();
    const speedProgress = (currentSpeed - settings.baseSpeed) / (settings.maxSpeed - settings.baseSpeed);
    
    // As game progresses, increase frequency of complex patterns
    const patternPool = [0, 1, 2, 3, 5, 6];
    // Add zig-zag pattern more frequently as speed increases
    if (speedProgress > 0.3) patternPool.push(7, 7); 
    if (speedProgress > 0.6) patternPool.push(7, 7, 7);

    const patternType = patternPool[Math.floor(Math.random() * patternPool.length)];
    
    if (patternType !== 7) {
      addTelegraph(CEILING_HEIGHT, CANVAS_HEIGHT - GROUND_HEIGHT - CEILING_HEIGHT, 'rgba(0, 255, 255, 0.05)', 40);
    }

    switch (patternType) {
      case 0: // Pillar (Floor)
        addTelegraph(CANVAS_HEIGHT - GROUND_HEIGHT - 40, 40, COLORS.SPIKE, 45);
        addObstacle(ObstacleType.FLOOR_SPIKE, 0, CANVAS_HEIGHT - GROUND_HEIGHT - 30, 40, 30);
        addObstacle(ObstacleType.FLOOR_SPIKE, 20, CANVAS_HEIGHT - GROUND_HEIGHT - 30, 40, 30);
        break;
      case 1: // Pillar (Ceiling)
        addTelegraph(CEILING_HEIGHT, 40, COLORS.SPIKE, 45);
        addObstacle(ObstacleType.CEILING_SPIKE, 0, CEILING_HEIGHT, 40, 30);
        addObstacle(ObstacleType.CEILING_SPIKE, 20, CEILING_HEIGHT, 40, 30);
        break;
      case 2: // Tunnel
        addTelegraph(CEILING_HEIGHT, 40, COLORS.SPIKE, 45);
        addTelegraph(CANVAS_HEIGHT - GROUND_HEIGHT - 40, 40, COLORS.SPIKE, 45);
        addObstacle(ObstacleType.FLOOR_SPIKE, 0, CANVAS_HEIGHT - GROUND_HEIGHT - 30, 40, 30);
        addObstacle(ObstacleType.CEILING_SPIKE, 0, CEILING_HEIGHT, 40, 30);
        break;
      case 3: // Staircase
        addTelegraph(CANVAS_HEIGHT - GROUND_HEIGHT - 40, 40, COLORS.SPIKE, 50);
        addTelegraph(CANVAS_HEIGHT/2 - 30, 60, COLORS.SAW, 70);
        addTelegraph(CEILING_HEIGHT, 40, COLORS.SPIKE, 90);
        addObstacle(ObstacleType.FLOOR_SPIKE, 0, CANVAS_HEIGHT - GROUND_HEIGHT - 30, 40, 30);
        addObstacle(ObstacleType.SAW_BLADE, 150, CANVAS_HEIGHT / 2 - 20, 40, 40);
        addObstacle(ObstacleType.CEILING_SPIKE, 300, CEILING_HEIGHT, 40, 30);
        break;
      case 5: // Falling Gauntlet
        addTelegraph(CEILING_HEIGHT, 50, COLORS.BLOCK, 60);
        for (let i = 0; i < (difficulty === Difficulty.HARD ? 5 : 3); i++) {
          addObstacle(ObstacleType.FALLING_BLOCK, i * (difficulty === Difficulty.HARD ? 140 : 180), CEILING_HEIGHT + 10, 60, 30);
        }
        break;
      case 6: // Triple Threat
        addTelegraph(CANVAS_HEIGHT/2 - 100, 200, COLORS.SAW, 60);
        addObstacle(ObstacleType.SAW_BLADE, 0, CANVAS_HEIGHT - GROUND_HEIGHT - 80, 40, 40, 1.2);
        addObstacle(ObstacleType.SAW_BLADE, 100, CEILING_HEIGHT + 40, 40, 40, 1.2);
        addObstacle(ObstacleType.SAW_BLADE, 200, CANVAS_HEIGHT - GROUND_HEIGHT - 80, 40, 40, 1.2);
        break;
      case 7: // New Zig-Zag Wall
        spawnZigZagPattern(currentSpeed);
        break;
    }
  };

  const addCollectible = () => {
    if (collectiblesRef.current.length >= MAX_COLLECTIBLES) return;
    const side = Math.random() > 0.5 ? 1 : -1;
    const isMega = Math.random() > 0.9;
    const y = side === 1 
      ? CANVAS_HEIGHT - GROUND_HEIGHT - 60 - Math.random() * 80
      : CEILING_HEIGHT + 30 + Math.random() * 80;
    
    collectiblesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      type: isMega ? CollectibleType.MEGA : CollectibleType.NORMAL,
      x: CANVAS_WIDTH + 100,
      y: y,
      width: isMega ? 40 : 25,
      height: isMega ? 40 : 25,
      collected: false,
      pulseOffset: Math.random() * Math.PI * 2
    });
  };

  const checkCollision = (p: Player, obj: { x: number, y: number, width: number, height: number }) => {
    const px = 100;
    const py = p.y;
    const margin = 6;
    return (
      px + margin < obj.x + obj.width &&
      px + p.width - margin > obj.x &&
      py + margin < obj.y + obj.height &&
      py + p.height - margin > obj.y
    );
  };

  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const settings = getDifficultySettings();
    speedRef.current = Math.min(settings.maxSpeed, speedRef.current + settings.speedInc);
    
    audio.updateBGMTempo(speedRef.current);

    const deltaScore = speedRef.current / 10;
    if (!isNaN(deltaScore)) {
      scoreRef.current += deltaScore;
      onScoreUpdate(Math.floor(scoreRef.current));
    }

    const p = playerRef.current;
    p.vy = Math.max(-TERMINAL_VELOCITY, Math.min(TERMINAL_VELOCITY, p.vy + GRAVITY_ACCEL * p.gravityDir));
    p.y += p.vy;

    const floorY = CANVAS_HEIGHT - GROUND_HEIGHT - p.height;
    const ceilingY = CEILING_HEIGHT;

    if (p.y > floorY) { p.y = floorY; p.vy = 0; }
    if (p.y < ceilingY) { p.y = ceilingY; p.vy = 0; }

    if (p.isFlipping) {
      p.flipProgress += 0.18;
      if (p.flipProgress >= 1) {
        p.flipProgress = 0;
        p.isFlipping = false;
      }
    }

    const currentSpeed = speedRef.current;
    
    const spawnThreshold = Math.max(200, 450 - (currentSpeed - settings.baseSpeed) * 20 + settings.spawnOffset);
    if (scoreRef.current - lastObstacleSpawnRef.current > spawnThreshold) {
      spawnPattern();
      lastObstacleSpawnRef.current = scoreRef.current;
    }

    const collectibleSpawnThreshold = 1000; 
    if (scoreRef.current - lastCollectibleSpawnRef.current > collectibleSpawnThreshold) {
      addCollectible();
      lastCollectibleSpawnRef.current = scoreRef.current;
    }

    obstaclesRef.current.forEach((o) => {
      const moveSpeed = o.speedModifier ? currentSpeed * o.speedModifier : currentSpeed;
      o.x -= moveSpeed;

      if (o.type === ObstacleType.FALLING_BLOCK && o.x < 450 && !o.isFalling) {
        if (o.fallDelay && o.fallDelay > 0) o.fallDelay--;
        else o.isFalling = true;
      }
      if (o.isFalling) {
        o.y += (difficulty === Difficulty.HARD ? 18 : 14); 
        if (o.y > CANVAS_HEIGHT - GROUND_HEIGHT - o.height) {
          o.y = CANVAS_HEIGHT - GROUND_HEIGHT - o.height;
          o.isFalling = false;
          screenShakeRef.current = Math.max(screenShakeRef.current, 3);
          createParticle(o.x + o.width/2, o.y + o.height, COLORS.BLOCK, 12, [1, 4], [2, 6]);
        }
      }

      if (checkCollision(p, o)) {
        createParticle(100 + p.width/2, p.y + p.height/2, COLORS.PARTICLE_DEATH, 45, [2, 10], [5, 18]);
        createParticle(100 + p.width/2, p.y + p.height/2, '#ffffff', 15, [1, 3], [3, 10]);
        screenShakeRef.current = 20;
        onGameOver(Math.floor(scoreRef.current), Math.floor(pointsRef.current));
      }

      if (!o.hasPassed && o.x < 100) {
        o.hasPassed = true;
        const dist = Math.abs(p.y - o.y);
        if (dist < NEAR_MISS_THRESHOLD) {
          audio.playNearMiss();
          scoreRef.current += 150;
          comboRef.current++;
          screenShakeRef.current = 6;
          createParticle(100 + p.width/2, p.y + p.height/2, COLORS.PLAYER, 8, [2, 5], [4, 10]);
        }
      }
    });

    collectiblesRef.current.forEach((c) => {
      c.x -= currentSpeed;
      if (!c.collected && checkCollision(p, c)) {
        c.collected = true;
        audio.playCollect();
        
        const baseVal = c.type === CollectibleType.MEGA ? 50 : 10;
        const difficultyMult = difficulty === Difficulty.HARD ? 2 : (difficulty === Difficulty.EASY ? 0.5 : 1);
        pointsRef.current += baseVal * difficultyMult;
        
        onPointsUpdate(pointsRef.current);
        const pColor = c.type === CollectibleType.MEGA ? '#ffffff' : COLORS.STAR;
        createParticle(c.x + c.width/2, c.y + c.height/2, pColor, 25, [2, 6], [3, 12]);
        if (c.type === CollectibleType.MEGA) {
            createParticle(c.x + c.width/2, c.y + c.height/2, '#ffaa00', 10, [1, 4], [5, 15]);
        }
        screenShakeRef.current = Math.max(screenShakeRef.current, 2);
      }
    });

    obstaclesRef.current = obstaclesRef.current.filter(o => o.x + o.width > -100);
    collectiblesRef.current = collectiblesRef.current.filter(c => !c.collected && c.x + c.width > -100);

    telegraphsRef.current.forEach(t => {
      t.life--;
    });
    telegraphsRef.current = telegraphsRef.current.filter(t => t.life > 0);

    particlesRef.current.forEach(pt => {
      pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.025;
      pt.vy += 0.1;
    });
    particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

    if (screenShakeRef.current > 0) screenShakeRef.current *= 0.85;
  }, [gameState, onGameOver, onScoreUpdate, onPointsUpdate, getDifficultySettings, difficulty]);

  const getStableRand = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) / 1000000000;
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    if (screenShakeRef.current > 0.1) {
      ctx.translate((Math.random() - 0.5) * screenShakeRef.current, (Math.random() - 0.5) * screenShakeRef.current);
    }
    const offsetX = (scoreRef.current * 0.6) % 60;
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;
    for (let x = -offsetX; x < CANVAS_WIDTH; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }
    
    telegraphsRef.current.forEach(t => {
      const alpha = (t.life / t.maxLife) * 0.4;
      ctx.fillStyle = t.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.fillRect(t.x, t.y, t.width, t.height);
      
      ctx.strokeStyle = t.color.replace(')', `, ${alpha * 2})`).replace('rgb', 'rgba');
      ctx.lineWidth = 2;
      ctx.strokeRect(t.x, t.y, t.width, t.height);
      
      const scannerY = t.y + (t.height * (1 - t.life / t.maxLife));
      ctx.beginPath();
      ctx.moveTo(t.x, scannerY);
      ctx.lineTo(t.x + t.width, scannerY);
      ctx.stroke();
    });

    ctx.fillStyle = COLORS.FLOOR;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    ctx.fillRect(0, 0, CANVAS_WIDTH, CEILING_HEIGHT);
    ctx.strokeStyle = COLORS.PLAYER;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CEILING_HEIGHT); ctx.lineTo(CANVAS_WIDTH, CEILING_HEIGHT); ctx.stroke();
    
    particlesRef.current.forEach(pt => {
      ctx.globalAlpha = pt.life; 
      ctx.fillStyle = pt.color; 
      ctx.beginPath(); 
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); 
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    
    const currentSpeed = speedRef.current;
    obstaclesRef.current.forEach(o => {
      ctx.shadowBlur = 12; ctx.shadowColor = 'black';
      const rand = getStableRand(o.id);
      
      switch (o.type) {
        case ObstacleType.FLOOR_SPIKE:
        case ObstacleType.CEILING_SPIKE:
          ctx.fillStyle = COLORS.SPIKE; 
          ctx.shadowColor = COLORS.SPIKE;
          ctx.beginPath();
          if (o.type === ObstacleType.FLOOR_SPIKE) {
            if (rand > 0.7) {
              ctx.moveTo(o.x, o.y + o.height); ctx.lineTo(o.x + o.width/4, o.y + o.height/2); ctx.lineTo(o.x + o.width/2, o.y + o.height);
              ctx.moveTo(o.x + o.width/2, o.y + o.height); ctx.lineTo(o.x + (3*o.width)/4, o.y + o.height/2); ctx.lineTo(o.x + o.width, o.y + o.height);
            } else {
              ctx.moveTo(o.x, o.y + o.height); ctx.lineTo(o.x + o.width/2, o.y); ctx.lineTo(o.x + o.width, o.y + o.height);
            }
          } else {
            if (rand > 0.7) {
              ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.width/4, o.y + o.height/2); ctx.lineTo(o.x + o.width/2, o.y);
              ctx.moveTo(o.x + o.width/2, o.y); ctx.lineTo(o.x + (3*o.width)/4, o.y + o.height/2); ctx.lineTo(o.x + o.width, o.y);
            } else {
              ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.width/2, o.y + o.height); ctx.lineTo(o.x + o.width, o.y);
            }
          }
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
          break;
          
        case ObstacleType.SAW_BLADE:
          const teeth = 8 + Math.floor(rand * 12);
          const dir = rand > 0.5 ? 1 : -1;
          
          // Visual cues for high speed
          const speedFactor = Math.max(0, (currentSpeed - 12) / 10);
          const shimmer = Math.sin(Date.now() / 50) * 0.5 + 0.5;
          
          ctx.save();
          ctx.translate(o.x + o.width/2, o.y + o.height/2); 
          ctx.rotate(dir * Date.now() / (60 + rand * 40)); 
          
          // Dynamic glow/shimmer for fast hazards
          ctx.shadowBlur = 12 + (speedFactor * 25);
          ctx.shadowColor = speedFactor > 0.3 ? `rgba(255, 255, 255, ${speedFactor * shimmer})` : COLORS.SAW;
          ctx.fillStyle = COLORS.SAW; 
          
          ctx.beginPath();
          for(let i=0; i < teeth * 2; i++) { 
            const angle = (i / (teeth * 2)) * Math.PI * 2; 
            const radius = i % 2 === 0 ? 22 : (12 + rand * 4); 
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); 
          }
          ctx.closePath(); 
          ctx.fill();
          
          // Shimmer layer
          if (speedFactor > 0.4) {
            ctx.globalAlpha = speedFactor * shimmer * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
          
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = COLORS.SAW; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
          break;
          
        case ObstacleType.FALLING_BLOCK:
          ctx.fillStyle = COLORS.BLOCK; ctx.shadowColor = COLORS.BLOCK;
          ctx.fillRect(o.x, o.y, o.width, o.height);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 2;
          ctx.strokeRect(o.x + 4, o.y + 4, o.width - 8, o.height - 8);
          if (o.isFalling || (o.fallDelay && o.fallDelay < 15)) {
            ctx.fillStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ff0000' : '#440000';
            ctx.fillRect(o.x + o.width/2 - 5, o.y + 10, 10, 5);
          } else {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(o.x + o.width/2 - 5, o.y + 10, 10, 5);
          }
          ctx.beginPath();
          ctx.moveTo(o.x + 10, o.y + o.height - 10); ctx.lineTo(o.x + o.width - 10, o.y + o.height - 10);
          ctx.stroke();
          break;
      }
    });
    
    collectiblesRef.current.forEach(c => {
      const isMega = c.type === CollectibleType.MEGA;
      ctx.save();
      const pulse = Math.sin(Date.now() / 200 + c.pulseOffset) * (isMega ? 8 : 5);
      ctx.translate(c.x + c.width/2, c.y + c.height/2 + pulse); 
      ctx.rotate(Date.now() / (isMega ? 400 : 1000));
      
      ctx.shadowBlur = isMega ? 25 : 15; 
      ctx.shadowColor = isMega ? '#ffffff' : COLORS.STAR; 
      ctx.fillStyle = isMega ? '#ffffff' : COLORS.STAR;
      
      ctx.beginPath();
      const pointsCount = 5;
      const outerRad = isMega ? 18 : 12;
      const innerRad = isMega ? 8 : 5;
      for (let i = 0; i < pointsCount; i++) {
        const angle = (i * Math.PI * 2) / pointsCount - Math.PI / 2;
        ctx.lineTo(Math.cos(angle) * outerRad, Math.sin(angle) * outerRad);
        ctx.lineTo(Math.cos(angle + Math.PI / pointsCount) * innerRad, Math.sin(angle + Math.PI / pointsCount) * innerRad);
      }
      ctx.closePath(); ctx.fill(); 
      
      if (isMega) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
    });

    const p = playerRef.current;
    ctx.save();
    ctx.translate(100 + p.width/2, p.y + p.height/2);
    ctx.rotate(p.gravityDir === 1 ? p.flipProgress * Math.PI : Math.PI + (p.flipProgress * Math.PI));
    ctx.shadowBlur = 20; ctx.shadowColor = COLORS.PLAYER; ctx.fillStyle = COLORS.PLAYER;
    ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
    ctx.fillStyle = '#000'; ctx.fillRect(5, -p.height/2 + 5, 10, 10);
    ctx.restore();
    
    if (currentSpeed > 14 && gameState === GameState.PLAYING) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1;
      for (let i = 0; i < (difficulty === Difficulty.HARD ? 6 : 8); i++) {
        const xLine = (Math.random() * CANVAS_WIDTH); const yLine = (Math.random() * (CANVAS_HEIGHT - 120)) + 60;
        ctx.beginPath(); ctx.moveTo(xLine, yLine); ctx.lineTo(xLine + (currentSpeed - 12) * 15, yLine); ctx.stroke();
      }
    }
    ctx.restore();
    if (gameState === GameState.PAUSED) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }, [gameState, difficulty]);

  const loop = useCallback(() => {
    if (!isLoopingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    update();
    draw(ctx);
    gameLoopRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    isLoopingRef.current = true;
    gameLoopRef.current = requestAnimationFrame(loop);
    return () => { isLoopingRef.current = false; if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === GameState.PLAYING) {
        audio.playFlip();
        const p = playerRef.current;
        p.gravityDir = p.gravityDir === 1 ? -1 : 1;
        p.isFlipping = true;
        p.flipProgress = 0;
        createParticle(100 + p.width/2, p.y + p.height/2, COLORS.PARTICLE_FLIP, 16, [2, 6], [5, 12]);
        createParticle(100 + p.width/2, p.y + p.height/2, '#ffffff', 5, [1, 3], [2, 8]);
        screenShakeRef.current = Math.max(screenShakeRef.current, 3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    const fromGameOver = prevStateRef.current === GameState.GAMEOVER;
    const fromStart = prevStateRef.current === GameState.START;
    const isNowPlaying = gameState === GameState.PLAYING;
    const isNowStart = gameState === GameState.START;
    if (isNowStart || (isNowPlaying && (fromGameOver || fromStart))) {
      resetGameInternal();
    }
    prevStateRef.current = gameState;
  }, [gameState, resetGameInternal]);

  return (
    <div className="relative border-4 border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,255,255,0.2)] bg-[#030308]">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full h-auto" />
    </div>
  );
};

export default GameCanvas;
