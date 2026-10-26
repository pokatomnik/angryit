import Phaser from "phaser";
import { COLORS } from "../constants";

export const TEXTURES = {
  mr0day: "projectile-mr-0day",
  spectre: "projectile-spectre",
  ransomware: "projectile-ransomware",
} as const;

/** Palette of the source illustration: paper, ink, and a few grey washes. */
export const INK = {
  paper: 0xf7f6f1,
  ink: 0x1b1b1b,
  fill: 0xdededa,
  fillStrong: 0xd2d2ce,
  fillLight: 0xe7e6e1,
  damage: 0xf0b23f,
  critical: 0xe8663f,
  infected: 0xd9524f,
} as const;

function wobble(seed: number, index: number, amplitude: number): number {
  // Deterministic pseudo-noise: the same block always gets the same wobble,
  // so a redraw after damage does not make the outline crawl.
  return Math.sin(seed * 12.9898 + index * 78.233) * amplitude;
}

/**
 * Draws one block the way the illustration does it: a light grey wash with a
 * slightly unsteady black contour and softly cut corners. Drawn in local
 * coordinates around (0, 0) so the graphics object can be rotated like a body.
 */
export function drawInkBlock(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  seed: number,
  fill: number,
): void {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const shortest = Math.min(width, height);
  const radius = Math.max(0.5, Math.min(6, shortest / 3.4));
  const jitter = Math.max(0.2, Math.min(0.85, shortest / 20));

  const corners: Array<[number, number, number]> = [
    [halfWidth - radius, -halfHeight + radius, -Math.PI / 2],
    [halfWidth - radius, halfHeight - radius, 0],
    [-halfWidth + radius, halfHeight - radius, Math.PI / 2],
    [-halfWidth + radius, -halfHeight + radius, Math.PI],
  ];

  const points: Array<Phaser.Types.Math.Vector2Like> = [];
  const samples = Math.max(2, Math.round(radius / 2));
  let index = 0;
  for (const [cornerX, cornerY, startAngle] of corners) {
    for (let step = 0; step <= samples; step += 1) {
      const angle = startAngle + (Math.PI / 2) * (step / samples);
      points.push({
        x: cornerX + Math.cos(angle) * radius + wobble(seed, index, jitter),
        y:
          cornerY + Math.sin(angle) * radius + wobble(seed, index + 41, jitter),
      });
      index += 1;
    }
  }

  graphics.fillStyle(fill, 1);
  graphics.fillPoints(points, true);
  graphics.lineStyle(Phaser.Math.Clamp(shortest / 9, 1.5, 2.8), INK.ink, 0.92);
  graphics.strokePoints(points, true);
}

/** Hand-drawn rectangle used for the paper sheet and its frame. */
export function drawPaperFrame(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const inset = 3;
  const left = x + inset;
  const top = y + inset;
  const right = x + width - inset;
  const bottom = y + height - inset;

  graphics.fillStyle(INK.paper, 1);
  graphics.fillRect(x, y, width, height);

  const outline: Array<Phaser.Types.Math.Vector2Like> = [
    { x: left + 1, y: top + 2 },
    { x: right - 2, y: top + 1 },
    { x: right - 1, y: bottom - 2 },
    { x: left + 2, y: bottom - 1 },
  ];
  graphics.lineStyle(2.5, INK.ink, 0.9);
  graphics.strokePoints(outline, true);
}

/**
 * The little arrow from the source drawing that points at the support block.
 * Drawn from a quadratic curve so it keeps the sketched, hand-drawn feel.
 */
export function drawSupportArrow(
  graphics: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  const controlX = (fromX + toX) / 2 + 6;
  const controlY = fromY + 34;
  const points: Array<Phaser.Types.Math.Vector2Like> = [];
  for (let step = 0; step <= 16; step += 1) {
    const t = step / 16;
    const inverse = 1 - t;
    points.push({
      x: inverse * inverse * fromX + 2 * inverse * t * controlX + t * t * toX,
      y: inverse * inverse * fromY + 2 * inverse * t * controlY + t * t * toY,
    });
  }
  graphics.lineStyle(2, INK.ink, 0.85);
  graphics.strokePoints(points, false);

  const angle = Math.atan2(toY - controlY, toX - controlX);
  const head = 9;
  graphics.lineStyle(2, INK.ink, 0.85);
  graphics.lineBetween(
    toX,
    toY,
    toX + Math.cos(angle + 0.5) * head,
    toY + Math.sin(angle + 0.5) * head,
  );
  graphics.lineBetween(
    toX,
    toY,
    toX + Math.cos(angle - 0.5) * head,
    toY + Math.sin(angle - 0.5) * head,
  );
}

function texture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) return;
  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export function createGameTextures(scene: Phaser.Scene): void {
  texture(scene, TEXTURES.mr0day, 76, 76, (g) => {
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(38, 38, 35);
    g.fillStyle(COLORS.amber, 1);
    g.fillCircle(38, 38, 29);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeCircle(38, 38, 29);
    g.lineStyle(6, 0x6c4319, 1);
    g.strokeCircle(38, 38, 15);
    g.fillStyle(0xfff1c9, 1);
    g.fillCircle(38, 38, 5);
  });

  texture(scene, TEXTURES.spectre, 76, 76, (g) => {
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(38, 38, 35);
    g.fillStyle(COLORS.purple, 1);
    g.fillCircle(38, 38, 29);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeCircle(38, 38, 29);
    g.lineStyle(4, 0x5d3fa5, 1);
    g.beginPath();
    g.moveTo(19, 40);
    g.lineTo(27, 31);
    g.lineTo(35, 45);
    g.lineTo(44, 30);
    g.lineTo(54, 40);
    g.strokePath();
  });

  texture(scene, TEXTURES.ransomware, 76, 76, (g) => {
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(38, 38, 35);
    g.fillStyle(COLORS.red, 1);
    g.fillCircle(38, 38, 29);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeCircle(38, 38, 29);
    g.lineStyle(5, 0x8f3044, 1);
    g.strokeRoundedRect(24, 35, 28, 22, 5);
    g.lineStyle(4, 0xffe2e5, 1);
    g.strokeCircle(38, 35, 9);
    g.fillStyle(0xffe2e5, 1);
    g.fillCircle(38, 45, 3);
  });
}
