export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GROUND_Y = 650;
export const WORLD_BOTTOM = GAME_HEIGHT + 120;

export const COLORS = {
  background: 0x091525,
  backgroundDeep: 0x07111f,
  grid: 0x1b3449,
  gridBright: 0x2d5369,
  white: 0xf4f7fb,
  muted: 0x9db0c4,
  ink: 0x171717,
  ground: 0x1b3041,
  groundEdge: 0x43687a,
  server: 0xb9bdbe,
  serverDark: 0xa3a8aa,
  platform: 0xc7c9c7,
  platformDark: 0xa8acad,
  cyan: 0x5fe4e8,
  amber: 0xffb84d,
  purple: 0xb78cff,
  red: 0xff6074,
  green: 0x77e0a1,
};

export const SLINGSHOT = {
  x: 205,
  y: 520,
  maxPull: 112,
  launchPower: 0.3,
};

export const PHYSICS = {
  gravityY: 0.72,
  defaultFriction: 0.82,
  defaultStaticFriction: 0.96,
  defaultRestitution: 0.08,
  projectileRestitution: 0.38,
  projectileFriction: 0.24,
  projectileDensity: 0.004,
  bodyDensity: 0.0024,
};
