/**
 * Reads the page's dashed grid into runner coordinates (relative to the layout frame).
 *
 * Pages opt in with data attributes, so the runner never depends on class names:
 *  - [data-runner-track]       the band under the header; its bottom row is the main floor
 *  - [data-runner-obstacle]    the CTA standing on that floor
 *  - [data-runner-perch]       cards the runner can visit on hover ("full" or "right" = which rails reach its floor)
 *  - [data-runner-pole]        article sidebar whose right edge is the reading-progress pole
 *  - [data-runner-reading]     the article body that drives progress
 *  - [data-runner-finish]      section whose top line is the "finished reading" floor
 *  - [data-runner-crate]       the 404 crate; its bottom sits on a dashed line
 */

export const DESKTOP_QUERY = "(min-width: 1024px)";

export interface Box {
  x0: number; // first pixel column
  x1: number; // last pixel column
  top: number; // first pixel row
  y: number; // floor row it stands on
}

export interface World {
  railL: number; // pixel column of the left rail
  railR: number; // pixel column of the right rail (unshifted)
  bandTop: number;
  bandY: number; // dashed line under the band
  button?: Box;
  crate?: Box;
  pole?: { x: number; topY: number; bottom: number };
  finishY?: number;
}

export interface Perch {
  y: number;
  x0: number;
  x1: number;
  reach: "full" | "left" | "right";
}

function rel(el: Element, origin: DOMRect) {
  const r = el.getBoundingClientRect();
  return {
    left: r.left - origin.left,
    right: r.right - origin.left,
    top: r.top - origin.top,
    bottom: r.bottom - origin.top,
    width: r.width,
    height: r.height,
  };
}

/** Element box without a CSS translate the runner applied to it. */
function box(el: HTMLElement, origin: DOMRect, shiftX: number): Box {
  const r = rel(el, origin);
  return {
    x0: Math.round(r.left - shiftX),
    x1: Math.round(r.right - shiftX) - 1,
    top: Math.round(r.top),
    y: Math.round(r.bottom),
  };
}

export function measureWorld(frame: HTMLElement, offsets: { button: number; crate: number }): World | null {
  if (!window.matchMedia(DESKTOP_QUERY).matches) return null;

  const band = frame.querySelector<HTMLElement>("[data-runner-track]");
  const container = band?.querySelector<HTMLElement>(".container");
  if (!band || !container) return null;

  const origin = frame.getBoundingClientRect();
  const b = rel(band, origin);
  const c = rel(container, origin);

  const world: World = {
    railL: Math.round(c.left),
    railR: Math.round(c.right) - 1,
    bandTop: Math.round(b.top),
    bandY: Math.round(b.bottom) - 1,
  };

  const button = frame.querySelector<HTMLElement>("[data-runner-obstacle]");
  if (button && button.offsetParent) world.button = box(button, origin, offsets.button);

  const crate = frame.querySelector<HTMLElement>("[data-runner-crate]");
  if (crate && crate.offsetParent) world.crate = box(crate, origin, offsets.crate);

  const pole = frame.querySelector<HTMLElement>("[data-runner-pole]");
  if (pole) {
    const p = rel(pole, origin);
    world.pole = { x: Math.round(p.right) - 1, topY: Math.round(p.top) - 1, bottom: Math.round(p.bottom) };
  }

  const finish = frame.querySelector<HTMLElement>("[data-runner-finish]");
  if (finish) world.finishY = Math.round(rel(finish, origin).top);

  return world;
}

export function measurePerch(frame: HTMLElement, el: HTMLElement): Perch {
  const r = rel(el, frame.getBoundingClientRect());
  const reach = el.dataset.runnerPerch;
  return {
    y: Math.round(r.top) - 1,
    x0: Math.round(r.left),
    x1: Math.round(r.right) - 1,
    reach: reach === "left" || reach === "right" ? reach : "full",
  };
}

/** 0 before the article body reaches the reading line, 1 once it has scrolled past. */
export function readingProgress(frame: HTMLElement): number {
  const body = frame.querySelector<HTMLElement>("[data-runner-reading]");
  if (!body) return 0;
  const r = body.getBoundingClientRect();
  const readingLine = window.innerHeight * 0.45;
  return Math.min(1, Math.max(0, (readingLine - r.top) / Math.max(1, r.height)));
}
