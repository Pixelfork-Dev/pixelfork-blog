"use client";

import { useEffect, useRef } from "react";
import { assetPath } from "@/config/site";
import styles from "./PixelRunner.module.css";

/**
 * Decorative pixel-art character living on the page's dashed grid.
 *
 * Routine (alternates forever):
 *  - "push": run to the right rail, push it outward, then pull it back into place.
 *  - "wall": run left, jump onto the left rail, wall-slide down and land.
 * Try to catch it: when the pointer gets close it air-spins away and sprints off
 * (jumping over the cursor when it's cornered).
 *
 * Sprites: 2D Pixel Art Character Template (48×48 frames, character faces right).
 * Animated with requestAnimationFrame writing transform/background-position directly,
 * so there are no React re-renders.
 */

const FRAME = 48;

type AnimName =
  | "idle"
  | "run"
  | "land"
  | "jump"
  | "airSpin"
  | "wallLand"
  | "wallSlide"
  | "push"
  | "pull"
  | "pushIdle";

const ANIMS: Record<AnimName, { src: string; frames: number; fps: number }> = {
  idle: { src: "/sprites/idle.png", frames: 10, fps: 10 },
  run: { src: "/sprites/run.png", frames: 8, fps: 13 },
  land: { src: "/sprites/land.png", frames: 9, fps: 16 },
  jump: { src: "/sprites/jump.png", frames: 6, fps: 11 },
  airSpin: { src: "/sprites/air-spin.png", frames: 6, fps: 12 },
  wallLand: { src: "/sprites/wall-land-left.png", frames: 6, fps: 14 },
  wallSlide: { src: "/sprites/wall-slide-left.png", frames: 3, fps: 8 },
  push: { src: "/sprites/push.png", frames: 10, fps: 9 },
  pull: { src: "/sprites/pull.png", frames: 6, fps: 7 },
  pushIdle: { src: "/sprites/push-idle.png", frames: 8, fps: 10 },
};

/*
 * Pixel metrics measured from the sheets (inside a 48×48 frame):
 * - lowest opaque row: ground anims 39, jump 43, wall slide 44, push/push-idle 37
 * - left-wall sheets touch the wall with column 18
 * - forward-most column: run 36, push/push-idle 35, pull 34
 * - land/idle body starts at column 14
 */
const FEET = { ground: 39, jump: 43, wallSlide: 44, push: 37 };
const WALL_COL = 18;
const HANDS_COL: Partial<Record<AnimName, number>> = { run: 36, push: 35, pushIdle: 35, pull: 34 };

const RUN_SPEED = 150; // px/s
const FLEE_SPEED = 300; // px/s
const SLIDE_SPEED = 48; // px/s
const RAIL_SHIFT = 12; // how far the right rail gets pushed, px
const RAIL_RETURN_SPEED = 40; // px/s, when a push is interrupted
const SCARE_RADIUS = 56; // px from the character's body
const MIN_BAND_HEIGHT = 60; // below this (mobile) there's no room to wall-slide

interface Point {
  x: number;
  y: number;
}

interface Phase {
  anim: AnimName;
  duration: number; // seconds
  from: Point;
  to: Point;
  flip?: boolean;
  loop?: boolean;
  arc?: number; // jump height in px
  /** Right-rail offset animated during this phase. */
  rail?: [number, number];
  /** Play only part of a sheet: [first frame, frame count]. */
  range?: [number, number];
  /** Can't be scared again mid-air. */
  airborne?: boolean;
  /** On (or jumping to) the wall: an escape kicks off the wall instead of running. */
  onWall?: boolean;
}

interface Geometry {
  railLeft: number;
  railRight: number;
  bandTop: number;
  lineY: number;
}

function measure(frame: HTMLElement): Geometry | null {
  const band = frame.querySelector<HTMLElement>("[data-runner-track]");
  const container = band?.querySelector<HTMLElement>(".container");
  if (!band || !container) return null;

  const origin = frame.getBoundingClientRect();
  const bandRect = band.getBoundingClientRect();
  const railRect = container.getBoundingClientRect();
  if (bandRect.height < MIN_BAND_HEIGHT) return null;

  return {
    railLeft: Math.round(railRect.left - origin.left),
    railRight: Math.round(railRect.right - origin.left) - 1,
    bandTop: Math.round(bandRect.top - origin.top),
    lineY: Math.round(bandRect.bottom - origin.top) - 1, // the dashed line is the band's last pixel row
  };
}

/** Anchor positions (sprite top-left) for a given layout. */
function spots(g: Geometry) {
  return {
    groundY: g.lineY - 1 - FEET.ground,
    jumpY: g.lineY - 1 - FEET.jump,
    pushY: g.lineY - 1 - FEET.push,
    wallX: g.railLeft + 1 - WALL_COL,
    wallTop: g.bandTop + 3 - 7, // head (row 7) just below the header line
    wallBottom: g.lineY - 1 - FEET.wallSlide,
    minX: g.railLeft + 3 - 14,
    maxX: g.railRight - 3 - (HANDS_COL.run ?? 36),
    jumpX: g.railLeft + 64,
    /** Sprite x that puts this animation's hands against the (shifted) right rail. */
    handsAt: (anim: AnimName, shift: number) => g.railRight + shift - 1 - (HANDS_COL[anim] ?? 36),
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function PixelRunner() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    const frame = el?.parentElement;
    if (!el || !frame) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let geometry: Geometry | null = null;
    let queue: Phase[] = [];
    let elapsed = 0;
    let last = 0;
    let raf = 0;
    let goal: "push" | "wall" = "wall";
    let pos: Point = { x: 0, y: 0 };
    let railShift = 0;
    let currentAnim: AnimName | null = null;
    let pointer: Point | null = null; // client coordinates

    /* ------------------------------ Rendering ------------------------------ */

    function render(anim: AnimName, frameIndex: number, flip: boolean) {
      if (anim !== currentAnim) {
        el!.style.backgroundImage = `url(${assetPath(ANIMS[anim].src)})`;
        currentAnim = anim;
      }
      el!.style.backgroundPosition = `${-frameIndex * FRAME}px 0`;
      el!.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0) scaleX(${flip ? -1 : 1})`;
    }

    function setRail(shift: number) {
      if (Math.round(shift) !== Math.round(railShift)) {
        frame!.style.setProperty("--rail-right-shift", `${Math.round(shift)}px`);
      }
      railShift = shift;
    }

    /* ------------------------------ Planning ------------------------------- */

    function runTo(from: Point, x: number, speed = RUN_SPEED): Phase[] {
      const distance = Math.abs(x - from.x);
      if (distance < 1) return [];
      return [{ anim: "run", loop: true, from, to: { x, y: from.y }, duration: distance / speed, flip: x < from.x }];
    }

    function plan(g: Geometry) {
      const s = spots(g);
      const start: Point = { x: clamp(pos.x, s.minX, s.maxX), y: s.groundY };

      if (goal === "push") {
        const pushX = s.handsAt("push", 0);
        const pushedX = s.handsAt("push", RAIL_SHIFT);
        const pullFrom = { x: s.handsAt("pull", RAIL_SHIFT), y: s.groundY };
        const pullTo = { x: s.handsAt("pull", 0), y: s.groundY };
        queue.push(
          ...runTo(start, s.handsAt("run", 0)),
          { anim: "pushIdle", loop: true, from: { x: pushX, y: s.pushY }, to: { x: pushX, y: s.pushY }, duration: 0.5 },
          {
            anim: "push",
            loop: true,
            from: { x: pushX, y: s.pushY },
            to: { x: pushedX, y: s.pushY },
            duration: 1.6,
            rail: [0, RAIL_SHIFT],
          },
          {
            anim: "pushIdle",
            loop: true,
            from: { x: pushedX, y: s.pushY },
            to: { x: pushedX, y: s.pushY },
            duration: 0.6,
            rail: [RAIL_SHIFT, RAIL_SHIFT],
          },
          { anim: "pull", loop: true, from: pullFrom, to: pullTo, duration: 1.8, rail: [RAIL_SHIFT, 0] },
          { anim: "idle", loop: true, from: pullTo, to: pullTo, duration: 1.2 },
        );
        goal = "wall";
        return;
      }

      const wall = { x: s.wallX, y: s.wallTop };
      const ground = { x: s.minX, y: s.groundY };
      queue.push(
        ...runTo(start, s.jumpX),
        {
          anim: "jump",
          from: { x: s.jumpX, y: s.jumpY },
          to: wall,
          duration: 6 / 11,
          flip: true,
          arc: 28,
          airborne: true,
          onWall: true,
        },
        { anim: "wallLand", from: wall, to: wall, duration: 6 / 14, onWall: true },
        {
          anim: "wallSlide",
          loop: true,
          from: wall,
          to: { x: s.wallX, y: s.wallBottom },
          duration: Math.max(0.3, (s.wallBottom - s.wallTop) / SLIDE_SPEED),
          onWall: true,
        },
        { anim: "land", from: ground, to: ground, duration: 9 / 16 },
        { anim: "idle", loop: true, from: ground, to: ground, duration: 0.8 },
      );
      goal = "push";
    }

    /** Air-spin away from the pointer and sprint off. */
    function flee(g: Geometry, pointerX: number, onWall: boolean) {
      const s = spots(g);
      let dir = pointerX < pos.x + 24 ? 1 : -1;
      let hop = 80;
      let arc = 30;
      let from: Point = { x: pos.x, y: pos.y };

      if (onWall) {
        // Kick off the wall to the right.
        dir = 1;
        hop = 90;
        arc = 22;
      } else {
        const room = dir > 0 ? s.maxX - pos.x : pos.x - s.minX;
        if (room < 90) {
          // Cornered: leap over the cursor instead.
          dir = -dir;
          hop = 150;
          arc = 46;
        }
        from = { x: clamp(pos.x, s.minX, s.maxX), y: s.groundY };
      }

      const land: Point = { x: clamp(from.x + dir * hop, s.minX, s.maxX), y: s.groundY };
      const runX = clamp(land.x + dir * 170, s.minX, s.maxX);
      const rest = { x: runX, y: s.groundY };

      queue = [
        { anim: "airSpin", from, to: land, duration: 0.5, arc, flip: dir < 0, airborne: true },
        { anim: "land", from: land, to: land, duration: 0.22, range: [5, 4], airborne: true },
        ...runTo(land, runX, FLEE_SPEED),
        { anim: "idle", loop: true, from: rest, to: rest, duration: 0.5 },
      ];
      elapsed = 0;
    }

    /* ------------------------------ Main loop ------------------------------ */

    function tick(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); // clamp after tab switches
      last = now;
      raf = requestAnimationFrame(tick);
      update(dt);
    }

    function update(dt: number) {
      if (!geometry) return;

      const g = geometry;
      if (queue.length === 0) plan(g);

      // Scared by the pointer?
      const current = queue[0];
      if (pointer && !current.airborne) {
        const rect = frame!.getBoundingClientRect();
        const dx = pointer.x - rect.left - (pos.x + 24);
        const dy = pointer.y - rect.top - (pos.y + 28);
        if (dx * dx + dy * dy < SCARE_RADIUS * SCARE_RADIUS) {
          flee(g, pointer.x - rect.left, Boolean(current.onWall));
        }
      }

      elapsed += dt;
      while (elapsed >= queue[0].duration) {
        elapsed -= queue[0].duration;
        pos = { ...queue.shift()!.to };
        if (queue.length === 0) plan(g);
      }

      const phase = queue[0];
      const t = phase.duration ? elapsed / phase.duration : 1;
      pos = {
        x: phase.from.x + (phase.to.x - phase.from.x) * t,
        y: phase.from.y + (phase.to.y - phase.from.y) * t - (phase.arc ? Math.sin(Math.PI * t) * phase.arc : 0),
      };

      if (phase.rail) {
        setRail(phase.rail[0] + (phase.rail[1] - phase.rail[0]) * t);
      } else if (railShift > 0) {
        setRail(Math.max(0, railShift - RAIL_RETURN_SPEED * dt)); // interrupted push: rail eases home
      }

      const { frames, fps } = ANIMS[phase.anim];
      const [first, count] = phase.range ?? [0, frames];
      const f = phase.loop ? Math.floor(elapsed * fps) % count : Math.min(count - 1, Math.floor(t * count));
      render(phase.anim, first + f, Boolean(phase.flip));
    }

    function reset() {
      geometry = measure(frame!);
      el!.hidden = !geometry;
      setRail(0);
      frame!.style.removeProperty("--rail-right-shift");
      queue = [];
      elapsed = 0;
      goal = "wall";
      if (!geometry) return;
      // Start standing near the left rail; the first plan heads for the wall.
      const s = spots(geometry);
      pos = { x: s.minX, y: s.groundY };
      if (reducedMotion.matches) render("idle", 0, false);
    }

    /* ------------------------------ Wiring -------------------------------- */

    // Restart only when the track itself moved (window resize, navigating to a page with a different band),
    // not on every height change as images load further down the page.
    const resetIfChanged = () => {
      if (JSON.stringify(measure(frame)) !== JSON.stringify(geometry)) reset();
    };
    const resizeObserver = new ResizeObserver(resetIfChanged);
    resizeObserver.observe(frame);
    const mutationObserver = new MutationObserver(resetIfChanged);
    mutationObserver.observe(frame, { childList: true, subtree: true });

    const onPointer = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    // A finger doesn't hover: forget touch/pen positions shortly after lifting so an old tap doesn't haunt it.
    let releaseTimer = 0;
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(onPointerLeave, 300);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    // Preload every sheet before the first frame so nothing flickers mid-loop.
    let cancelled = false;
    Promise.all(
      Object.values(ANIMS).map(
        (a) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = assetPath(a.src);
          }),
      ),
    ).then(() => {
      if (cancelled) return;
      reset();
      el.dataset.ready = "true";
      if (!reducedMotion.matches) raf = requestAnimationFrame(tick);
    });

    // Development-only hook for inspecting the simulation without waiting on real frames.
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__pixelRunner = {
        step: (seconds: number, pointerAt?: Point | null) => {
          if (pointerAt !== undefined) pointer = pointerAt;
          for (let i = 0; i < Math.round(seconds * 60); i++) update(1 / 60);
          return { anim: currentAnim, pos: { x: Math.round(pos.x), y: Math.round(pos.y) }, railShift, goal, geometry };
        },
      };
    }

    const onMotionChange = () => {
      cancelAnimationFrame(raf);
      last = 0;
      reset();
      if (!reducedMotion.matches) raf = requestAnimationFrame(tick);
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointerUp);
      window.clearTimeout(releaseTimer);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", onMotionChange);
      frame.style.removeProperty("--rail-right-shift");
    };
  }, []);

  return <div ref={rootRef} className={styles.runner} aria-hidden="true" hidden />;
}
