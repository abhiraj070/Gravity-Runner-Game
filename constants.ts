
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;

export const GROUND_HEIGHT = 60;
export const CEILING_HEIGHT = 60;

export const BASE_SPEED = 8;
export const MAX_SPEED = 22;
export const SPEED_INCREMENT = 0.0008;

export const GRAVITY_ACCEL = 0.9;
export const FLIP_COOLDOWN = 150;

export const COLORS = {
  PLAYER: '#00ffff',
  PLAYER_TRAIL: 'rgba(0, 255, 255, 0.3)',
  FLOOR: '#0a0a1a',
  CEILING: '#0a0a1a',
  GRID: 'rgba(0, 255, 255, 0.05)',
  SPIKE: '#ff0055',
  SAW: '#ffaa00',
  BLOCK: '#7700ff',
  PARTICLE_FLIP: '#00ffff',
  PARTICLE_DEATH: '#ff0055',
  TELEGRAPH: 'rgba(255, 0, 85, 0.2)',
  STAR: '#fffb00',
  STAR_GLOW: 'rgba(255, 251, 0, 0.5)'
};

export const NEAR_MISS_THRESHOLD = 60; // pixels

// Safety & Performance Limits
export const MAX_PARTICLES = 150;
export const MAX_OBSTACLES = 50;
export const MAX_COLLECTIBLES = 20;
export const TERMINAL_VELOCITY = 25;
export const INPUT_DEBOUNCE_MS = 100;
