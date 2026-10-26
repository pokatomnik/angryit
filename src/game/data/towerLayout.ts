export type BlockKind = "server" | "platform" | "node" | "cloud";
export type BlockShape =
  | "cabinet"
  | "slab"
  | "box"
  | "foot"
  | "thin"
  | "irregular";

export interface BlockDefinition {
  id: string;
  kind: BlockKind;
  shape: BlockShape;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
}

/**
 * The source drawing is 385x487. Every block below is written in those
 * coordinates, so the silhouette can be checked against the illustration
 * directly instead of being re-invented.
 *
 * The stack is traced bottom-up and each element is placed so that it shares
 * an exact edge with whatever carries it: no gaps to look sloppy, and no
 * overlaps that would let a hidden block take the load.
 */
export const MEME_REFERENCE = {
  originX: 456,
  originY: 15,
  scale: 1.35,
  /** The paper sheet the drawing sits on, in screen pixels. */
  panel: { x: 415, y: 10, width: 505, height: 640 },
  /** Where the arrow in the original points at the single load-bearing foot. */
  groundContact: { x: 184, y: 400 },
};

const screenX = (value: number): number =>
  Math.round(MEME_REFERENCE.originX + value * MEME_REFERENCE.scale);
const screenY = (value: number): number =>
  Math.round(MEME_REFERENCE.originY + value * MEME_REFERENCE.scale);

const block = (
  id: string,
  kind: BlockKind,
  shape: BlockShape,
  left: number,
  top: number,
  width: number,
  height: number,
  health: number,
): BlockDefinition => {
  // Snap both edges before deriving the centre so neighbours share a boundary
  // exactly; otherwise rounding leaves hairline seams or one-pixel overlaps.
  const leftEdge = screenX(left);
  const rightEdge = screenX(left + width);
  const topEdge = screenY(top);
  const bottomEdge = screenY(top + height);
  return {
    id,
    kind,
    shape,
    x: (leftEdge + rightEdge) / 2,
    y: (topEdge + bottomEdge) / 2,
    width: rightEdge - leftEdge,
    height: bottomEdge - topEdge,
    health,
  };
};

export const TOWER_LAYOUT: BlockDefinition[] = [
  block("footing", "platform", "foot", 20, 452, 234, 16, 130),
  block("footing-step", "platform", "slab", 35, 431, 195, 21, 105),
  block("left-foot-bottom", "node", "box", 50, 419, 60, 12, 42),
  block("left-foot", "node", "box", 60, 402, 44, 17, 48),
  block("right-foot", "node", "thin", 192, 402, 8, 29, 38),
  block("beam-underlip", "platform", "slab", 55, 391, 155, 11, 60),
  block("main-beam", "platform", "slab", 44, 341, 173, 50, 112),
  block("main-cabinet", "server", "cabinet", 38, 226, 89, 115, 124),
  block("cabinet-lip", "platform", "slab", 42, 211, 74, 15, 48),
  block("left-low-box", "node", "box", 47, 188, 16, 23, 30),
  block("left-low-post", "node", "thin", 73, 197, 10, 14, 24),
  block("left-low-rod", "node", "thin", 77, 180, 4, 17, 20),
  block("left-mid-box", "node", "box", 89, 189, 28, 22, 40),
  block("left-tall-box", "server", "cabinet", 91, 144, 22, 45, 42),
  block("left-tall-neck", "node", "thin", 98, 125, 7, 19, 26),
  block("left-tall-collar", "platform", "slab", 90, 121, 22, 4, 22),
  block("left-tall-neck-top", "node", "thin", 102, 107, 6, 14, 22),
  block("left-tall-cap", "node", "box", 100, 97, 8, 10, 20),
  block("left-tall-prong", "node", "thin", 111, 97, 5, 9, 18),
  block("left-edge-ledge", "platform", "slab", 42, 180, 28, 8, 28),
  block("left-edge-neck", "node", "thin", 49, 166, 6, 14, 22),
  block("left-edge-collar", "platform", "slab", 43, 160, 20, 6, 22),
  block("left-edge-rod", "node", "thin", 49, 119, 4, 41, 24),
  block("left-edge-button", "node", "box", 58, 150, 9, 10, 20),
  block("left-edge-button-top", "node", "box", 59, 141, 8, 9, 18),
  block("left-edge-ear", "node", "thin", 40, 174, 5, 8, 18),
  block("right-lower-shelf", "platform", "slab", 132, 306, 90, 35, 70),
  block("right-upper-shelf", "platform", "slab", 130, 270, 98, 36, 76),
  block("inner-column", "node", "box", 152, 213, 22, 57, 54),
  block("inner-column-neck", "node", "thin", 158, 187, 8, 26, 28),
  block("inner-column-cap", "node", "box", 151, 169, 18, 18, 30),
  block("inner-column-button", "node", "thin", 169, 201, 9, 12, 22),
  block("outer-column", "node", "box", 184, 195, 25, 75, 58),
  block("outer-column-neck", "node", "box", 188, 179, 16, 16, 28),
  block("outer-column-cap", "node", "thin", 192, 169, 9, 10, 22),
  block("upper-ledge", "platform", "slab", 145, 157, 66, 12, 58),
  block("top-server", "server", "cabinet", 161, 116, 34, 41, 76),
  block("top-neck", "node", "box", 174, 105, 12, 11, 28),
  block("top-collar", "platform", "slab", 161, 105, 37, 11, 34),
  block("top-cap", "node", "box", 168, 94, 24, 11, 30),
  block("antenna-left", "node", "thin", 169, 80, 4, 14, 20),
  block("antenna-middle", "node", "thin", 177, 83, 4, 11, 20),
  block("antenna-right", "node", "thin", 186, 83, 4, 11, 20),
  block("top-ear-left", "node", "box", 145, 146, 10, 11, 24),
  block("top-ear-left-neck", "node", "thin", 148, 130, 4, 16, 20),
  block("top-ear-left-cap", "node", "box", 143, 124, 12, 6, 20),
  block("top-ear-right", "node", "box", 201, 134, 12, 23, 26),
  block("top-ear-right-neck", "node", "thin", 205, 121, 4, 13, 20),
  block("shelf-left-foot", "node", "box", 135, 259, 12, 11, 24),
  block("shelf-left-neck", "node", "thin", 138, 236, 4, 23, 20),
  block("shelf-left-cap", "node", "box", 135, 230, 11, 6, 20),
  block("shelf-left-prong", "node", "thin", 140, 222, 4, 8, 18),
  block("shelf-right-foot", "node", "box", 215, 248, 14, 22, 26),
  block("shelf-right-neck", "node", "thin", 219, 232, 5, 16, 20),
  block("shelf-right-cap", "node", "box", 213, 223, 17, 9, 22),
  block("shelf-right-prong-left", "node", "thin", 215, 215, 4, 8, 18),
  block("shelf-right-prong-right", "node", "thin", 224, 216, 4, 7, 18),
];
