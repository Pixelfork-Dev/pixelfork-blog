"use client";

import { useEffect, useRef } from "react";
import { RunnerEngine } from "./engine";
import styles from "./PixelRunner.module.css";

/**
 * Decorative pixel-art character living on the page's dashed grid (desktop only).
 * All behaviour lives in RunnerEngine; this component just mounts it.
 * Try to catch it — and type “katana”.
 */
export function PixelRunner() {
  const spriteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sprite = spriteRef.current;
    const frame = sprite?.parentElement;
    if (!sprite || !frame) return;

    const engine = new RunnerEngine(
      frame,
      sprite,
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      styles.fx,
    );
    engine.start();

    // Development-only hook for stepping the simulation without waiting on real frames.
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__pixelRunner = engine.debug();
    }
    return () => engine.destroy();
  }, []);

  return <div ref={spriteRef} className={styles.runner} aria-hidden="true" hidden />;
}
