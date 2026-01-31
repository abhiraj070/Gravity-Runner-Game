
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum ObstacleType {
  FLOOR_SPIKE = 'FLOOR_SPIKE',
  CEILING_SPIKE = 'CEILING_SPIKE',
  SAW_BLADE = 'SAW_BLADE',
  FALLING_BLOCK = 'FALLING_BLOCK'
}

export enum CollectibleType {
  NORMAL = 'NORMAL',
  MEGA = 'MEGA'
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  speedModifier?: number;
  isFalling?: boolean;
  fallDelay?: number;
  hasPassed?: boolean;
}

export interface Collectible {
  id: string;
  type: CollectibleType;
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  pulseOffset: number;
}

export interface Player {
  y: number;
  vy: number;
  gravityDir: 1 | -1; // 1 = floor, -1 = ceiling
  width: number;
  height: number;
  isFlipping: boolean;
  flipProgress: number;
}
