"use client";

import { useEffect, useRef } from "react";
import { assetPath } from "@/config/site";
import styles from "./PixelRunner.module.css";

/**
 * Decorative pixel-art character that parkours along the page's dashed grid:
 * grabs the left rail, wall-slides down to the dashed line under the header band,
 * runs to the right rail and back, then jumps onto the wall again.
 *
 * Sprites: 2D Pixel Art Character Template (48×48 frames, character faces right).
 * Animated with requestAnimationFrame writing transform/background-position directly,
 * so there are no React re-renders and no layout work per frame.
 */

const FRAME = 48;

type AnimName = "idle" | "run" | "land" | "jump" | "wallLand" | "wallSlide";

const ANIMS: Record<AnimName, { src: string; frames: number; fps: number }> = {
  idle: { src: "/sprites/idle.png", frames: 10, fps: 10 },
  run: { src: "/sprites/run.png", frames: 8, fps: 13 },
  land: { src: "/sprites/land.png", frames: 9, fps: 16 },
  jump: { src: "/sprites/jump.png", frames: 6, fps: 11 },
  wallLand: { src: "/sprites/wall-land-left.png", frames: 6, fps: 14 },
  wallSlide: { src: "/sprites/wall-slide-left.png", frames: 3, fps: 8 },
};

/*
 * Pixel metrics measured from the sheets (inside a 48×48 frame):
 * - ground animations have their lowest opaque row at y=39
 * - jump frames reach y=43, wall slide y=44
 * - left-wall sheets touch the wall with column x=18
 * - run body ends at column 36 (starts at 11 when mirrored)
 */
const FEET = { ground: 39, jump: 43, wallSlide: 44 };
const WALL_COL = 18;
const RUN_RIGHT_COL = 36;

const RUN_SPEED = 150; // px/s
const SLIDE_SPEED = 48; // px/s
const MIN_BAND_HEIGHT = 60; // below this (mobile) there's no room to wall-slide

interface Point {
  x: number;
  y: number;
}

interface Phase {
  anim: AnimName;
  loop: boolean;
  from: Point;
  to: Point;
  duration: number; // seconds
  flip: boolean;
  arc?: number; // jump height in px
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

function buildCycle(g: Geometry): Phase[] {
  const wallX = g.railLeft + 1 - WALL_COL;
  const wallTop = g.bandTop + 3 - 7; // head (row 7) just below the header line
  const wallBottom = g.lineY - 1 - FEET.wallSlide;
  const groundY = g.lineY - 1 - FEET.ground;
  const startX = g.railLeft + 3 - 14; // land/idle body starts at column 14
  const endX = g.railRight - 3 - RUN_RIGHT_COL;
  const jumpX = g.railLeft + 64;

  const runRight = Math.abs(endX - startX) / RUN_SPEED;
  const runLeft = Math.abs(endX - jumpX) / RUN_SPEED;
  const slide = Math.max(0.3, (wallBottom - wallTop) / SLIDE_SPEED);

  const at = (x: number, y: number): Point => ({ x, y });

  return [
    { anim: "wallLand", loop: false, from: at(wallX, wallTop), to: at(wallX, wallTop), duration: 6 / 14, flip: false },
    { anim: "wallSlide", loop: true, from: at(wallX, wallTop), to: at(wallX, wallBottom), duration: slide, flip: false },
    { anim: "land", loop: false, from: at(startX, groundY), to: at(startX, groundY), duration: 9 / 16, flip: false },
    { anim: "idle", loop: true, from: at(startX, groundY), to: at(startX, groundY), duration: 0.8, flip: false },
    { anim: "run", loop: true, from: at(startX, groundY), to: at(endX, groundY), duration: runRight, flip: false },
    { anim: "idle", loop: true, from: at(endX, groundY), to: at(endX, groundY), duration: 1.4, flip: false },
    { anim: "run", loop: true, from: at(endX, groundY), to: at(jumpX, groundY), duration: runLeft, flip: true },
    {
      anim: "jump",
      loop: false,
      from: at(jumpX, g.lineY - 1 - FEET.jump),
      to: at(wallX, wallTop),
      duration: 6 / 11,
      flip: true,
      arc: 28,
    },
  ];
}

export function PixelRunner() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    const frame = el?.parentElement;
    if (!el || !frame) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let geometry = measure(frame);
    let phases = geometry ? buildCycle(geometry) : [];
    let index = 0;
    let elapsed = 0;
    let last = 0;
    let raf = 0;
    let currentAnim: AnimName | null = null;

    // Preload every sheet before the first frame so nothing flickers mid-loop.
    const ready = Promise.all(
      Object.values(ANIMS).map(
        (a) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = assetPath(a.src);
          }),
      ),
    );

    function render(anim: AnimName, frameIndex: number, pos: Point, flip: boolean) {
      if (!el) return;
      if (anim !== currentAnim) {
        el.style.backgroundImage = `url(${assetPath(ANIMS[anim].src)})`;
        currentAnim = anim;
      }
      el.style.backgroundPosition = `${-frameIndex * FRAME}px 0`;
      el.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0) scaleX(${flip ? -1 : 1})`;
    }

    function remeasure() {
      geometry = measure(frame!);
      phases = geometry ? buildCycle(geometry) : [];
      el!.hidden = !geometry;
      // Restart from the wall so a resize never leaves the character floating mid-air.
      index = 0;
      elapsed = 0;
      if (geometry && reducedMotion.matches) showStill();
    }

    function showStill() {
      const idle = phases[3];
      if (idle) render("idle", 0, idle.from, false);
    }

    function tick(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); // clamp after tab switches
      last = now;

      if (phases.length) {
        elapsed += dt;
        let phase = phases[index];
        while (elapsed >= phase.duration) {
          elapsed -= phase.duration;
          index = (index + 1) % phases.length;
          phase = phases[index];
        }

        const t = phase.duration ? elapsed / phase.duration : 1;
        const pos = {
          x: phase.from.x + (phase.to.x - phase.from.x) * t,
          y: phase.from.y + (phase.to.y - phase.from.y) * t - (phase.arc ? Math.sin(Math.PI * t) * phase.arc : 0),
        };
        const { frames, fps } = ANIMS[phase.anim];
        const f = phase.loop ? Math.floor(elapsed * fps) % frames : Math.min(frames - 1, Math.floor(t * frames));
        render(phase.anim, f, pos, phase.flip);
      }

      raf = requestAnimationFrame(tick);
    }

    // Restart only when the track itself moved (window resize, navigating to a page with a different band),
    // not on every height change as images load further down the page.
    const remeasureIfChanged = () => {
      if (JSON.stringify(measure(frame)) !== JSON.stringify(geometry)) remeasure();
    };
    const resizeObserver = new ResizeObserver(remeasureIfChanged);
    resizeObserver.observe(frame);
    const mutationObserver = new MutationObserver(remeasureIfChanged);
    mutationObserver.observe(frame, { childList: true, subtree: true });

    let cancelled = false;
    ready.then(() => {
      if (cancelled) return;
      remeasure();
      el.dataset.ready = "true";
      if (!reducedMotion.matches) raf = requestAnimationFrame(tick);
    });

    const onMotionChange = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (reducedMotion.matches) showStill();
      else raf = requestAnimationFrame(tick);
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <div ref={rootRef} className={styles.runner} aria-hidden="true" hidden />;
}
