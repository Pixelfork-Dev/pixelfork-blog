/**
 * Sprite sheet definitions for the pixel runner.
 * Source: 2D Pixel Art Character Template (the character faces right in every sheet).
 *
 * Positions in the engine are FEET coordinates: `x` is the character's anchor column,
 * `y` is the row of the surface it stands on. A frame is drawn at (x - ax, y - ay), so
 * `ax` is the anchor column inside the frame and `ay` is one below the lowest foot pixel.
 * Metrics were measured from the PNGs.
 */

export interface AnimDef {
  src: string;
  w: number;
  h: number;
  frames: number;
  fps: number;
  ax: number;
  ay: number;
  /** First frame inside the sheet (for sub-animations sharing a sheet). */
  start?: number;
}

const s48 = (src: string, frames: number, fps: number, ay = 40, start?: number): AnimDef => ({
  src: `/sprites/${src}.png`,
  w: 48,
  h: 48,
  frames,
  fps,
  ax: 24,
  ay,
  start,
});

// The 80×64 katana sheets place the body 16px further right and the feet on row 47.
const s80 = (src: string, frames: number, fps: number, start?: number): AnimDef => ({
  src: `/sprites/${src}.png`,
  w: 80,
  h: 64,
  frames,
  fps,
  ax: 40,
  ay: 48,
  start,
});

export const ANIMS = {
  idle: s48("idle", 10, 10),
  run: s48("run", 8, 13),
  land: s48("land", 9, 16),
  jump: s48("jump", 6, 11, 44),
  airSpin: s48("air-spin", 6, 12),
  wallLandL: s48("wall-land-left", 6, 14, 42),
  wallSlideL: s48("wall-slide-left", 3, 8, 45),
  wallLandR: s48("wall-land-right", 6, 14, 42),
  wallSlideR: s48("wall-slide-right", 3, 8, 45),
  climb: s48("climb", 4, 9, 42), // wall on the right; flip for a wall on the left
  push: s48("push", 10, 9, 38),
  pushIdle: s48("push-idle", 8, 10, 38),
  pull: s48("pull", 6, 7),
  shoot: s48("shoot", 10, 14),
  hurt: s48("hurt", 4, 12),
  death: s48("death", 10, 12),
  crouchIdle: s48("crouch-idle", 10, 8),
  katanaRun: s48("katana-run", 8, 13),
  katanaAttack: s80("katana-attack", 9, 14),
  katanaSheathe: s80("katana-sheathe", 10, 12),
  katanaIdle: s80("katana-sheathe", 4, 5, 6),
} satisfies Record<string, AnimDef>;

export type AnimKey = keyof typeof ANIMS;

/** Contact offsets relative to the anchor (x) and feet (y). */
export const CONTACT = {
  /** Wall pixel column when hanging on a wall to the left (left-wall sheets, mirrored climb). */
  wallLeft: -7,
  /** Wall pixel column when hanging on a wall to the right. */
  wallRight: 6,
  /** Front-most hand column for pushing/pulling/running into things. */
  hands: { run: 12, push: 11, pushIdle: 11, pull: 10 },
  /** Land/idle body starts 10px left of the anchor. */
  bodyBack: 10,
  /** Gun muzzle (flash is drawn on frame 2 of the shoot sheet). */
  muzzle: { dx: 22, dy: -23, fireFrame: 2 },
  /** Katana blade reach and the frames where the blade connects. */
  katana: { reach: 37, hitFrames: [1, 4] },
} as const;
