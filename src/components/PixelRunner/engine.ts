import { assetPath } from "@/config/site";
import { ANIMS, CONTACT, type AnimDef, type AnimKey } from "./anims";
import { Fx } from "./fx";
import { measurePerch, measureWorld, readingProgress, type World } from "./world";

/**
 * Behaviour engine for the pixel runner. Plain DOM + requestAnimationFrame, no React.
 *
 * The character works through a queue of timed phases (run, jump, slide, push…).
 * When the queue runs out — or when what it *should* be doing changes (a card is hovered,
 * the reader scrolls into an article…) — the planner builds the next route from wherever
 * it currently stands. Dashed lines are floors, the container edges are walls it can
 * slide down or climb, and the CTA/404 crate are obstacles and props.
 */

interface Point {
  x: number;
  y: number;
}

type Surface = { kind: "floor"; y: number } | { kind: "wall" } | { kind: "pole" } | { kind: "air" };

interface Phase {
  anim: AnimKey;
  duration: number; // seconds (Infinity = until interrupted)
  from: Point;
  to: Point;
  surface: Surface;
  flip?: boolean;
  loop?: boolean;
  arc?: number;
  /** Sub-range of the animation: [first frame, count]. */
  range?: [number, number];
  reverse?: boolean;
  /** Cannot be interrupted by planning, hovering or the pointer (air, walls, attacks). */
  lock?: boolean;
  rail?: [number, number];
  crate?: [number, number];
  onStart?: () => void;
  onFrame?: (frame: number) => void;
  /** Per-tick controller for open-ended phases (the reading pole). */
  follow?: (dt: number) => void;
}

type Intent =
  | { key: string; type: "band" }
  | { key: string; type: "perch"; el: HTMLElement }
  | { key: string; type: "pole" }
  | { key: string; type: "finish" }
  | { key: string; type: "crate" };

const RUN_SPEED = 150;
const FLEE_SPEED = 300;
const SPRINT_SPEED = 320; // heading to a hovered card
const RAIL_SHIFT = 12;
const SCARE_RADIUS = 56;
const BAND_GOALS = ["wall", "shoot", "push", "wall", "push"] as const;
const KATANA_WORD = "katana";
const KATANA_STORAGE = "pixelfork:katana";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const approach = (v: number, target: number, maxStep: number) =>
  v < target ? Math.min(target, v + maxStep) : Math.max(target, v - maxStep);

export class RunnerEngine {
  private world: World | null = null;
  private worldDirty = true;
  private queue: Phase[] = [];
  private elapsed = 0;
  private lastFrame = -1;
  private pos: Point = { x: 0, y: 0 };
  private surface: Surface = { kind: "air" };
  private intentKey = "";
  private goalIndex = 0;
  private vaultNext = true;
  private raf = 0;
  private last = 0;
  private currentDef: AnimDef | null = null;
  private startedPhase: Phase | null = null;
  private celebrated = false;
  private sprinting = false;

  private railShift = 0;
  private crateShift = 0;
  private knock = 0;
  private knockAt = -10;
  private clock = 0;

  private pointer: Point | null = null;
  private scareCooldown = 0;
  private hoverEl: HTMLElement | null = null;
  private hoverClearTimer = 0;
  private perchIds = new WeakMap<HTMLElement, number>();
  private progress = 0;

  private katana = false;
  private typed = "";
  private hits: number[] = [];
  private dying = false;

  private fx: Fx;
  private resizeObserver: ResizeObserver;
  private mutationObserver: MutationObserver;
  private cleanup: (() => void)[] = [];

  constructor(
    private frame: HTMLElement,
    private sprite: HTMLElement,
    private reducedMotion: MediaQueryList,
    fxClassName: string,
  ) {
    this.fx = new Fx(frame, fxClassName);
    try {
      this.katana = localStorage.getItem(KATANA_STORAGE) === "1";
    } catch {}
    this.sprite.dataset.katana = String(this.katana);

    this.resizeObserver = new ResizeObserver(() => this.markDirty());
    this.resizeObserver.observe(frame);
    this.mutationObserver = new MutationObserver((records) => {
      if (records.some((r) => !this.fx.root.contains(r.target))) this.markDirty();
    });
    this.mutationObserver.observe(frame, { childList: true, subtree: true });

    this.listen(window, "pointermove", (e) => this.onPointer(e as PointerEvent));
    this.listen(window, "pointerdown", (e) => this.onPointer(e as PointerEvent));
    this.listen(window, "pointerup", (e) => {
      if ((e as PointerEvent).pointerType !== "mouse") window.setTimeout(() => (this.pointer = null), 300);
    });
    this.listen(document.documentElement, "pointerleave", () => (this.pointer = null));
    this.listen(document, "pointerover", (e) => this.onPointerOver(e as PointerEvent));
    this.listen(document, "pointerout", (e) => this.onPointerOut(e as PointerEvent));
    this.listen(window, "scroll", () => (this.progress = readingProgress(frame)));
    this.listen(window, "keydown", (e) => this.onKey(e as KeyboardEvent));
    this.listen(sprite, "pointerdown", (e) => this.onSpriteClick(e as PointerEvent));
    this.listen(reducedMotion, "change", () => this.restart());
  }

  /* ================================ Lifecycle ================================ */

  async start() {
    await Promise.all(
      Object.values(ANIMS).map(
        (a) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = assetPath(a.src);
          }),
      ),
    );
    this.restart();
    this.sprite.dataset.ready = "true";
    console.info(
      "%c🗡️ The little Pixelfork runner has a secret. Type “katana” anywhere on the page.",
      "color:#f26207;font-weight:600",
    );
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.mutationObserver.disconnect();
    this.cleanup.forEach((fn) => fn());
    this.fx.destroy();
    this.setRail(0);
    this.frame.style.removeProperty("--rail-right-shift");
  }

  private listen(target: EventTarget, type: string, handler: (e: Event) => void) {
    target.addEventListener(type, handler, { passive: true });
    this.cleanup.push(() => target.removeEventListener(type, handler));
  }

  private restart() {
    cancelAnimationFrame(this.raf);
    this.last = 0;
    this.reset();
    if (!this.reducedMotion.matches) {
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
        this.last = now;
        this.raf = requestAnimationFrame(tick);
        this.update(dt);
      };
      this.raf = requestAnimationFrame(tick);
    }
  }

  private markDirty() {
    this.worldDirty = true;
  }

  /** Put the character on the main floor next to the left rail with a fresh plan. */
  private reset() {
    this.world = measureWorld(this.frame, { button: this.knock, crate: this.crateShift });
    this.worldDirty = false;
    this.sprite.hidden = !this.world;
    this.queue = [];
    this.intentKey = "";
    this.goalIndex = 0;
    this.dying = false;
    this.fx.clear();
    this.setRail(0);
    this.setCrate(0);
    this.setKnock(0);
    this.sprite.style.opacity = "";
    this.progress = readingProgress(this.frame);
    if (!this.world) return;
    this.pos = { x: this.world.railL + 13, y: this.world.bandY };
    this.surface = { kind: "floor", y: this.world.bandY };
    this.render(this.anim("idle"), 0, false);
  }

  /** Re-measure after layout changes; only teleport home when the character's spot moved. */
  private refreshWorld() {
    const prev = this.world;
    const next = measureWorld(this.frame, { button: this.knock, crate: this.crateShift });
    this.worldDirty = false;
    const same =
      prev && next && prev.railL === next.railL && prev.railR === next.railR && prev.bandY === next.bandY;
    const onMainFloor = this.surface.kind === "floor" && prev && this.surface.y === prev.bandY;
    if (!same || !onMainFloor) {
      this.reset();
    } else {
      this.world = next;
    }
  }

  /* ================================= Input ================================== */

  private onPointer(e: PointerEvent) {
    this.pointer = { x: e.clientX, y: e.clientY };
  }

  private onPointerOver(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-runner-perch]");
    if (!el) return;
    window.clearTimeout(this.hoverClearTimer);
    this.hoverEl = el;
  }

  private onPointerOut(e: PointerEvent) {
    if (!this.hoverEl) return;
    const to = e.relatedTarget as Node | null;
    if (to && this.hoverEl.contains(to)) return;
    window.clearTimeout(this.hoverClearTimer);
    this.hoverClearTimer = window.setTimeout(() => (this.hoverEl = null), 150);
  }

  private onKey(e: KeyboardEvent) {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest("input, textarea, select, [contenteditable='true']") || e.key.length !== 1) return;
    this.typed = (this.typed + e.key.toLowerCase()).slice(-KATANA_WORD.length);
    if (this.typed === KATANA_WORD) {
      this.typed = "";
      this.setKatana(!this.katana);
    }
  }

  private setKatana(on: boolean) {
    this.katana = on;
    this.sprite.dataset.katana = String(on);
    try {
      localStorage.setItem(KATANA_STORAGE, on ? "1" : "0");
    } catch {}
    console.info(on ? "%c⚔️ Katana mode unlocked." : "%c🏃 Katana mode off.", "color:#f26207;font-weight:600");
    if (on && this.world && this.canInterrupt() && this.surface.kind === "floor") {
      const at = { ...this.pos };
      this.queue = [
        {
          anim: "katanaSheathe",
          duration: 10 / 12,
          from: at,
          to: at,
          surface: this.surface,
          lock: true,
          onFrame: (f) => f === 2 && this.fx.sparks(at.x + 30, at.y - 24, -1, 6),
        },
      ];
      this.elapsed = 0;
      this.lastFrame = -1;
    }
  }

  private onSpriteClick(e: PointerEvent) {
    if (!this.katana || this.dying || !this.world || this.surface.kind === "pole") return;
    const now = this.clock;
    this.hits = [...this.hits.filter((t) => now - t < 5), now];
    const dir: 1 | -1 = e.clientX - this.frame.getBoundingClientRect().left < this.pos.x ? 1 : -1;
    this.fx.sparks(this.pos.x, this.pos.y - 20, (-dir) as 1 | -1, 5);
    this.setRail(0);

    const floorY = this.surface.kind === "floor" ? this.surface.y : this.world.bandY;
    const at = { x: this.pos.x, y: floorY };
    const knocked = { x: clamp(at.x + dir * 10, this.world.railL + 13, this.world.railR - 13), y: floorY };
    const floor: Surface = { kind: "floor", y: floorY };

    if (this.hits.length < 3) {
      this.queue = [{ anim: "hurt", duration: 0.33, from: at, to: knocked, arc: 6, surface: floor, lock: true, flip: dir > 0 }];
    } else {
      this.hits = [];
      this.dying = true;
      this.queue = [
        { anim: "hurt", duration: 0.33, from: at, to: knocked, arc: 8, surface: floor, lock: true, flip: dir > 0 },
        { anim: "death", duration: 10 / 12, from: knocked, to: knocked, surface: floor, lock: true, flip: dir > 0 },
        { anim: "death", duration: 1.2, from: knocked, to: knocked, surface: floor, lock: true, flip: dir > 0, range: [9, 1] },
        ...this.respawn(),
      ];
    }
    this.elapsed = 0;
    this.lastFrame = -1;
  }

  /* ================================ Main loop =============================== */

  /** Advance the simulation (also driven by the dev hook). */
  update(dt: number) {
    this.clock += dt;
    if (this.worldDirty) this.refreshWorld();
    const w = this.world;
    if (!w) return;

    this.scareCooldown = Math.max(0, this.scareCooldown - dt);

    // Re-plan when the desired activity changes (hovered card, reading, …).
    if (this.canInterrupt()) {
      const intent = this.desiredIntent(w);
      if (intent.key !== this.intentKey || this.queue.length === 0) {
        if (intent.key !== this.intentKey) this.interrupt();
        if (this.queue.length === 0) {
          this.intentKey = intent.key;
          this.plan(w, intent);
        }
      }
      this.checkPointer(w);
    }
    if (this.queue.length === 0) this.plan(w, this.desiredIntent(w));

    this.elapsed += dt;
    let phase = this.queue[0];
    while (this.elapsed >= phase.duration) {
      this.elapsed -= phase.duration;
      this.finishPhase(phase);
      if (this.queue.length === 0) {
        const intent = this.desiredIntent(w);
        this.intentKey = intent.key;
        this.plan(w, intent);
      }
      phase = this.queue[0];
      this.lastFrame = -1;
    }
    if (phase !== this.startedPhase) {
      this.startedPhase = phase;
      phase.onStart?.();
    }

    if (phase.follow) {
      phase.follow(dt);
    } else {
      const t = phase.duration === Infinity ? 0 : phase.duration ? this.elapsed / phase.duration : 1;
      this.pos = {
        x: phase.from.x + (phase.to.x - phase.from.x) * t,
        y: phase.from.y + (phase.to.y - phase.from.y) * t - (phase.arc ? Math.sin(Math.PI * t) * phase.arc : 0),
      };
      if (phase.rail) this.setRail(phase.rail[0] + (phase.rail[1] - phase.rail[0]) * t);
      if (phase.crate) this.setCrate(phase.crate[0] + (phase.crate[1] - phase.crate[0]) * t);
    }
    if (!phase.rail && this.railShift > 0) this.setRail(Math.max(0, this.railShift - 40 * dt));
    if (!phase.crate && this.crateShift > 0) this.setCrate(Math.max(0, this.crateShift - 90 * dt));
    if (this.knock !== 0 && this.clock - this.knockAt > 0.9) this.setKnock(approach(this.knock, 0, 40 * dt));

    this.drawPhase(phase);
    this.fx.update(dt);
  }

  private finishPhase(phase: Phase) {
    this.queue.shift();
    if (!phase.follow) this.pos = { ...phase.to };
    this.surface = phase.surface;
  }

  private drawPhase(phase: Phase) {
    const def = this.anim(phase.anim);
    const [first, count] = phase.range ?? [0, def.frames];
    let f: number;
    if (phase.follow) {
      f = this.lastFrame < 0 ? 0 : this.lastFrame;
    } else if (phase.loop || phase.duration === Infinity) {
      f = Math.floor(this.elapsed * def.fps) % count;
    } else {
      const t = phase.duration ? this.elapsed / phase.duration : 1;
      f = Math.min(count - 1, Math.floor(t * count));
    }
    if (phase.reverse) f = count - 1 - f;
    if (f !== this.lastFrame && !phase.follow) {
      this.lastFrame = f;
      phase.onFrame?.(f);
    }
    this.render(def, first + f, Boolean(phase.flip));
  }

  private canInterrupt() {
    const phase = this.queue[0];
    return !phase || !phase.lock;
  }

  /** Stop the current (interruptible) phase where the character stands. */
  private interrupt() {
    const phase = this.queue[0];
    if (phase) this.surface = phase.surface;
    if (this.surface.kind === "floor") this.pos.y = this.surface.y;
    this.queue = [];
    this.elapsed = 0;
    this.lastFrame = -1;
  }

  private anim(key: AnimKey): AnimDef {
    if (this.katana) {
      if (key === "run") return ANIMS.katanaRun;
      if (key === "idle") return ANIMS.katanaIdle;
    }
    return ANIMS[key];
  }

  /* ================================ Rendering =============================== */

  private render(def: AnimDef, frameIndex: number, flip: boolean) {
    const s = this.sprite.style;
    if (def !== this.currentDef) {
      s.backgroundImage = `url(${assetPath(def.src)})`;
      s.width = `${def.w}px`;
      s.height = `${def.h}px`;
      // Mirror around the anchor column so flipping never shifts the body.
      s.transformOrigin = `${def.ax + 0.5}px 0`;
      this.currentDef = def;
    }
    s.backgroundPosition = `${-((def.start ?? 0) + frameIndex) * def.w}px 0`;
    s.transform = `translate3d(${Math.round(this.pos.x - def.ax)}px, ${Math.round(this.pos.y - def.ay)}px, 0) scaleX(${flip ? -1 : 1})`;
  }

  private setRail(shift: number) {
    if (Math.round(shift) !== Math.round(this.railShift)) {
      this.frame.style.setProperty("--rail-right-shift", `${Math.round(shift)}px`);
    }
    this.railShift = shift;
  }

  private setCrate(shift: number) {
    const el = this.frame.querySelector<HTMLElement>("[data-runner-crate]");
    if (el && Math.round(shift) !== Math.round(this.crateShift)) el.style.setProperty("--crate-x", `${Math.round(shift)}px`);
    this.crateShift = shift;
  }

  private setKnock(offset: number) {
    const el = this.frame.querySelector<HTMLElement>("[data-runner-obstacle]");
    if (el && (Math.round(offset) !== Math.round(this.knock) || offset === 0)) {
      el.style.setProperty("--knock-x", `${Math.round(offset)}px`);
      el.style.setProperty("--knock-r", `${(offset * 0.35).toFixed(1)}deg`);
    }
    this.knock = offset;
  }

  private hitButton(x: number, y: number, dir: 1 | -1) {
    this.fx.sparks(x, y, (-dir) as 1 | -1);
    this.knockAt = this.clock;
    this.setKnock(clamp(this.knock + dir * 5, -16, 16));
  }

  /* ================================= Intents ================================ */

  private desiredIntent(w: World): Intent {
    if (this.hoverEl && this.hoverEl.isConnected) {
      let id = this.perchIds.get(this.hoverEl);
      if (!id) {
        id = Math.random();
        this.perchIds.set(this.hoverEl, id);
      }
      return { key: `perch:${id}`, type: "perch", el: this.hoverEl };
    }
    if (w.crate) return { key: "crate", type: "crate" };
    if (w.pole && this.progress > 0.02) {
      return this.progress >= 0.995 && w.finishY !== undefined
        ? { key: "finish", type: "finish" }
        : { key: "pole", type: "pole" };
    }
    return { key: "band", type: "band" };
  }

  private plan(w: World, intent: Intent) {
    this.elapsed = 0;
    this.lastFrame = -1;
    const q: Phase[] = [];
    if (intent.type !== "finish") this.celebrated = false;

    // Leave the pole first (climb back to the top floor, or drop to the finish line).
    if (this.surface.kind === "pole" && w.pole && intent.type !== "pole") {
      this.dismountPole(q, w, intent.type === "finish");
    } else if (this.surface.kind !== "floor" && this.surface.kind !== "pole") {
      this.pos = { x: clamp(this.pos.x, w.railL + 13, w.railR - 13), y: w.bandY };
      this.surface = { kind: "floor", y: w.bandY };
    }

    const cursor = this.cursorAfter(q);
    switch (intent.type) {
      case "perch":
        this.planPerch(q, w, cursor, intent.el);
        break;
      case "crate":
        this.planCrate(q, w, cursor);
        break;
      case "pole":
        this.planPole(q, w, cursor);
        break;
      case "finish":
        this.planFinish(q, w, cursor);
        break;
      default:
        this.planBand(q, w, cursor);
    }
    if (q.length === 0) {
      const at = { x: cursor.x, y: cursor.y };
      q.push({ anim: "idle", loop: true, duration: 0.5, from: at, to: at, surface: { kind: "floor", y: cursor.y } });
    }
    this.queue = q;
  }

  /** Where the character will be after the given phases (or now). */
  private cursorAfter(q: Phase[]): Point {
    const last = q[q.length - 1];
    if (last) return { ...last.to };
    return { x: this.pos.x, y: this.surface.kind === "floor" ? this.surface.y : this.pos.y };
  }

  /* ================================= Routing ================================ */

  private run(q: Phase[], from: Point, toX: number, speed = this.sprinting ? SPRINT_SPEED : RUN_SPEED, lock = false) {
    const d = Math.abs(toX - from.x);
    if (d < 1) return { ...from };
    const to = { x: toX, y: from.y };
    q.push({ anim: "run", loop: true, from: { ...from }, to, duration: d / speed, flip: toX < from.x, surface: { kind: "floor", y: from.y }, lock });
    return to;
  }

  /** Walk along a floor, vaulting over or running across the CTA when it's in the way. */
  private traverse(q: Phase[], w: World, from: Point, toX: number): Point {
    const b = w.button;
    const onBand = Math.abs(from.y - w.bandY) <= 1;
    if (!b || !onBand) return this.run(q, from, toX);

    const center = (b.x0 + b.x1) / 2;
    const pad = 30;
    if (toX > b.x0 - pad && toX < b.x1 + pad) toX = toX < center ? b.x0 - pad : b.x1 + pad;
    const crosses = Math.min(from.x, toX) < b.x0 - 4 && Math.max(from.x, toX) > b.x1 + 4;
    if (!crosses) return this.run(q, from, toX);

    const dir = toX > from.x ? 1 : -1;
    const near = dir > 0 ? b.x0 : b.x1;
    const far = dir > 0 ? b.x1 : b.x0;
    const floor: Surface = { kind: "floor", y: w.bandY };
    const flip = dir < 0;
    this.vaultNext = !this.vaultNext;

    if (!this.vaultNext) {
      // Vault clean over the button with an air spin.
      const start = this.run(q, from, near - dir * pad);
      const land = { x: far + dir * pad, y: w.bandY };
      q.push({ anim: "airSpin", from: start, to: land, duration: 0.62, arc: w.bandY - b.top + 16, flip, surface: floor, lock: true });
      q.push({ anim: "land", from: land, to: land, duration: 0.2, range: [5, 4], flip, surface: floor, lock: true });
      return this.run(q, land, toX);
    }

    // Hop on top, run across the button, jump down the other side.
    const top: Surface = { kind: "floor", y: b.top };
    const start = this.run(q, from, near - dir * 24);
    const on = { x: near + dir * 12, y: b.top };
    const off = { x: far - dir * 12, y: b.top };
    const down = { x: far + dir * 26, y: w.bandY };
    q.push({ anim: "jump", from: start, to: on, duration: 0.38, arc: 16, flip, surface: top, lock: true });
    q.push({ anim: "land", from: on, to: on, duration: 0.18, range: [5, 4], flip, surface: top, lock: true });
    this.run(q, on, off.x, undefined, true);
    q.push({ anim: "jump", from: off, to: down, duration: 0.36, arc: 12, flip, surface: floor, lock: true });
    q.push({ anim: "land", from: down, to: down, duration: 0.2, range: [5, 4], flip, surface: floor, lock: true });
    return this.run(q, down, toX);
  }

  /** Get from the cursor's floor to another floor (via the side walls) and walk to x. */
  private route(q: Phase[], w: World, from: Point, toY: number, toX: number, reach: "full" | "left" | "right" = "full"): Point {
    if (Math.abs(from.y - toY) <= 1) return this.traverse(q, w, { x: from.x, y: toY }, toX);

    const costL = Math.abs(from.x - w.railL) + Math.abs(toX - w.railL);
    const costR = Math.abs(from.x - w.railR) + Math.abs(toX - w.railR);
    const side: "left" | "right" = reach === "full" ? (costL <= costR ? "left" : "right") : reach;
    const left = side === "left";
    const edgeX = left ? w.railL + 22 : w.railR - 22;
    const wallX = left ? w.railL - CONTACT.wallLeft : w.railR - CONTACT.wallRight;
    const landX = left ? w.railL + 13 : w.railR - 13;
    const air: Surface = { kind: "air" };
    const wall: Surface = { kind: "wall" };

    const atEdge = this.traverse(q, w, from, edgeX);
    const distance = Math.abs(toY - from.y);

    if (toY > from.y) {
      // Drop through the line onto the wall and slide down.
      const grab = { x: wallX, y: from.y + 46 };
      const bottom = { x: wallX, y: toY };
      const speed = distance < 140 ? 60 : clamp(distance / 1.3, 220, 900);
      q.push({ anim: "jump", from: atEdge, to: grab, duration: 0.3, arc: 10, range: [3, 3], flip: left, surface: air, lock: true });
      q.push({ anim: left ? "wallLandL" : "wallLandR", from: grab, to: grab, duration: 6 / 14, surface: wall, lock: true });
      q.push({ anim: left ? "wallSlideL" : "wallSlideR", loop: true, from: grab, to: bottom, duration: Math.max(0.2, (toY - grab.y) / speed), surface: wall, lock: true });
    } else {
      // Grab the wall and climb up, then hop over the ledge.
      const grab = { x: wallX, y: from.y };
      const ledge = { x: wallX, y: toY + 40 };
      const speed = distance < 140 ? 70 : clamp(distance / 1.5, 220, 800);
      q.push({ anim: left ? "wallLandL" : "wallLandR", from: atEdge, to: grab, duration: 6 / 14, surface: wall, lock: true });
      q.push({ anim: "climb", loop: true, from: grab, to: ledge, duration: Math.max(0.2, (grab.y - ledge.y) / speed), flip: left, surface: wall, lock: true });
      q.push({ anim: "jump", from: ledge, to: { x: landX, y: toY }, duration: 0.4, arc: 14, flip: !left, surface: air, lock: true });
    }

    const landed = { x: landX, y: toY };
    const floor: Surface = { kind: "floor", y: toY };
    q.push({ anim: "land", from: landed, to: landed, duration: 0.3, range: [4, 5], flip: !left, surface: floor, lock: true });
    return this.traverse(q, w, landed, toX);
  }

  /* ================================== Plans ================================= */

  private planBand(q: Phase[], w: World, from: Point) {
    const goal = BAND_GOALS[this.goalIndex % BAND_GOALS.length];
    this.goalIndex++;
    const y = w.bandY;
    const floor: Surface = { kind: "floor", y };

    if (goal === "wall") {
      const jumpFrom = this.route(q, w, from, y, w.railL + 64);
      const wallX = w.railL - CONTACT.wallLeft;
      const top = { x: wallX, y: w.bandTop + 38 };
      const bottom = { x: wallX, y };
      const landed = { x: w.railL + 13, y };
      const wall: Surface = { kind: "wall" };
      q.push({ anim: "jump", from: jumpFrom, to: top, duration: 6 / 11, arc: 28, flip: true, surface: { kind: "air" }, lock: true });
      q.push({ anim: "wallLandL", from: top, to: top, duration: 6 / 14, surface: wall, lock: true });
      q.push({ anim: "wallSlideL", loop: true, from: top, to: bottom, duration: Math.max(0.3, (bottom.y - top.y) / 48), surface: wall, lock: true });
      q.push({ anim: "land", from: landed, to: landed, duration: 9 / 16, surface: floor });
      q.push({ anim: "idle", loop: true, from: landed, to: landed, duration: 0.8, surface: floor });
      return;
    }

    if (goal === "push") {
      const hands = CONTACT.hands;
      this.route(q, w, from, y, w.railR - 1 - hands.run);
      const pushX = w.railR - 1 - hands.push;
      const p0 = { x: pushX, y };
      const p1 = { x: pushX + RAIL_SHIFT, y };
      const pullFrom = { x: w.railR - 1 - hands.pull + RAIL_SHIFT, y };
      const pullTo = { x: w.railR - 1 - hands.pull, y };
      q.push({ anim: "pushIdle", loop: true, from: p0, to: p0, duration: 0.5, surface: floor });
      q.push({ anim: "push", loop: true, from: p0, to: p1, duration: 1.6, rail: [0, RAIL_SHIFT], surface: floor });
      q.push({ anim: "pushIdle", loop: true, from: p1, to: p1, duration: 0.6, rail: [RAIL_SHIFT, RAIL_SHIFT], surface: floor });
      q.push({ anim: "pull", loop: true, from: pullFrom, to: pullTo, duration: 1.8, rail: [RAIL_SHIFT, 0], surface: floor });
      q.push({ anim: "idle", loop: true, from: pullTo, to: pullTo, duration: 1.0, surface: floor });
      return;
    }

    // goal === "shoot": blast (or slash) the CTA from whichever side we're on.
    const b = w.button;
    if (!b) return;
    const fromLeft = from.x < (b.x0 + b.x1) / 2;
    const dir: 1 | -1 = fromLeft ? 1 : -1;
    const flip = dir < 0;

    if (this.katana) {
      const standX = fromLeft ? b.x0 - CONTACT.katana.reach : b.x1 + CONTACT.katana.reach;
      const at = this.route(q, w, from, y, standX);
      q.push({
        anim: "katanaAttack",
        duration: 9 / 14,
        from: at,
        to: at,
        flip,
        surface: floor,
        lock: true,
        onFrame: (f) => {
          if (!(CONTACT.katana.hitFrames as readonly number[]).includes(f)) return;
          const edge = (fromLeft ? b.x0 : b.x1) + this.knock;
          this.hitButton(edge, y - 22, dir);
        },
      });
    } else {
      const standX = fromLeft ? b.x0 - 120 : b.x1 + 120;
      const at = this.route(q, w, from, y, standX);
      q.push({
        anim: "shoot",
        loop: true,
        duration: (3 * 10) / 14,
        from: at,
        to: at,
        flip,
        surface: floor,
        lock: true,
        onFrame: (f) => {
          if (f !== CONTACT.muzzle.fireFrame) return;
          const edge = (fromLeft ? b.x0 : b.x1 + 1) + this.knock;
          this.fx.bullet(at.x + dir * CONTACT.muzzle.dx, y + CONTACT.muzzle.dy, dir, edge, (hx, hy) => this.hitButton(hx, hy, dir));
        },
      });
    }
    const rest = q[q.length - 1].to;
    q.push({ anim: "idle", loop: true, from: rest, to: rest, duration: 0.9, surface: floor, flip });
  }

  private planPerch(q: Phase[], w: World, from: Point, el: HTMLElement) {
    const perch = measurePerch(this.frame, el);
    let x = (perch.x0 + perch.x1) / 2;
    // Don't sit right under the cursor — it would just scare itself away.
    if (this.pointer && Math.abs(this.pointer.x - this.frame.getBoundingClientRect().left - x) < 70) {
      x = this.pointer.x - this.frame.getBoundingClientRect().left < x ? perch.x1 - 40 : perch.x0 + 40;
    }
    x = clamp(x, w.railL + 20, w.railR - 20);
    this.sprinting = true;
    const at = this.route(q, w, from, perch.y, x, perch.reach);
    this.sprinting = false;
    q.push({ anim: "crouchIdle", loop: true, from: at, to: at, duration: Infinity, surface: { kind: "floor", y: perch.y }, flip: at.x < from.x });
  }

  private planCrate(q: Phase[], w: World, from: Point) {
    const c = w.crate;
    if (!c) return;
    const y = c.y;
    const floor: Surface = { kind: "floor", y };
    const hands = CONTACT.hands;
    const shift = 36;
    this.route(q, w, from, y, c.x0 - 1 - hands.run);
    const p0 = { x: c.x0 - 1 - hands.push, y };
    const p1 = { x: p0.x + shift, y };
    const bounced = { x: p0.x - 4, y };
    const knocked = { x: p0.x - 30, y };
    q.push({ anim: "pushIdle", loop: true, from: p0, to: p0, duration: 0.4, surface: floor });
    q.push({ anim: "push", loop: true, from: p0, to: p1, duration: 2.2, crate: [0, shift], surface: floor });
    q.push({ anim: "pushIdle", loop: true, from: p1, to: p1, duration: 0.35, crate: [shift, shift], surface: floor, lock: true });
    q.push({ anim: "hurt", from: p1, to: bounced, duration: 0.12, range: [0, 1], crate: [shift, 0], surface: floor, lock: true, onStart: () => this.fx.sparks(p1.x + 14, y - 20, -1, 7) });
    q.push({ anim: "hurt", from: bounced, to: knocked, duration: 0.4, arc: 10, range: [1, 3], surface: floor, lock: true });
    q.push({ anim: "death", from: knocked, to: knocked, duration: 10 / 12, surface: floor, lock: true });
    q.push({ anim: "death", from: knocked, to: knocked, duration: 1.5, range: [9, 1], surface: floor, lock: true });
    q.push({ anim: "death", from: knocked, to: knocked, duration: 10 / 18, reverse: true, surface: floor, lock: true });
    q.push({ anim: "idle", loop: true, from: knocked, to: knocked, duration: 2.4, surface: floor });
  }

  private planPole(q: Phase[], w: World, from: Point) {
    const pole = w.pole;
    if (!pole) return;
    const climbX = pole.x - CONTACT.wallLeft;
    const minY = pole.topY + 46;
    const maxY = pole.bottom - 6;
    const fromBottom = w.finishY !== undefined && Math.abs(from.y - w.finishY) <= 1;

    if (fromBottom) {
      const at = this.traverse(q, w, from, pole.x + 24);
      const grab = { x: climbX, y: Math.min(maxY, at.y - 8) };
      q.push({ anim: "jump", from: at, to: grab, duration: 0.35, arc: 18, flip: true, surface: { kind: "air" }, lock: true });
    } else {
      const at = this.route(q, w, from, pole.topY, pole.x + 24);
      const grab = { x: climbX, y: minY };
      q.push({ anim: "jump", from: at, to: grab, duration: 0.4, arc: 12, flip: true, surface: { kind: "air" }, lock: true });
      q.push({ anim: "wallLandL", from: grab, to: grab, duration: 6 / 14, surface: { kind: "pole" }, lock: true });
    }

    // Follow reading progress: slide down as you read, climb back up if you scroll up.
    const follower: Phase = {
      anim: "wallSlideL",
      duration: Infinity,
      from: { x: climbX, y: minY },
      to: { x: climbX, y: minY },
      surface: { kind: "pole" },
      follow: (dt) => {
        const target = minY + this.progress * (maxY - minY);
        const dy = target - this.pos.y;
        this.pos = { x: climbX, y: approach(this.pos.y, target, 520 * dt) };
        if (Math.abs(dy) < 0.5) {
          follower.anim = "wallSlideL";
          follower.flip = false;
          this.lastFrame = 0;
        } else if (dy > 0) {
          follower.anim = "wallSlideL";
          follower.flip = false;
          this.lastFrame = 1 + (Math.floor(this.clock * 8) % 2);
        } else {
          follower.anim = "climb";
          follower.flip = true;
          this.lastFrame = Math.floor(this.clock * 9) % 4;
        }
      },
    };
    q.push(follower);
  }

  private dismountPole(q: Phase[], w: World, toFinish: boolean) {
    const pole = w.pole!;
    const climbX = pole.x - CONTACT.wallLeft;
    const here = { x: climbX, y: this.pos.y };
    if (toFinish && w.finishY !== undefined) {
      const land = { x: pole.x + 34, y: w.finishY };
      const low = { x: climbX, y: w.finishY - 30 };
      let jumpFrom = here;
      if (low.y - here.y > 40) {
        // Far above the finish line (e.g. jumped to the end): slide down the pole first.
        q.push({ anim: "wallSlideL", loop: true, from: here, to: low, duration: clamp((low.y - here.y) / 900, 0.3, 2), surface: { kind: "pole" }, lock: true });
        jumpFrom = low;
      }
      q.push({ anim: "jump", from: jumpFrom, to: land, duration: 0.45, arc: 8, range: [3, 3], surface: { kind: "air" }, lock: true });
      q.push({ anim: "land", from: land, to: land, duration: 0.3, range: [4, 5], surface: { kind: "floor", y: land.y }, lock: true });
      this.surface = { kind: "floor", y: land.y };
      return;
    }
    const ledge = { x: climbX, y: pole.topY + 40 };
    const top = { x: pole.x + 26, y: pole.topY };
    const d = Math.abs(here.y - ledge.y);
    q.push({ anim: "climb", loop: true, from: here, to: ledge, duration: Math.max(0.2, d / clamp(d / 1.2, 120, 900)), flip: true, surface: { kind: "wall" }, lock: true });
    q.push({ anim: "jump", from: ledge, to: top, duration: 0.35, arc: 12, surface: { kind: "air" }, lock: true });
    q.push({ anim: "land", from: top, to: top, duration: 0.25, range: [4, 5], surface: { kind: "floor", y: top.y }, lock: true });
    this.surface = { kind: "floor", y: top.y };
  }

  private planFinish(q: Phase[], w: World, from: Point) {
    if (w.finishY === undefined) return;
    const y = w.finishY;
    const floor: Surface = { kind: "floor", y };
    const onFinish = Math.abs(from.y - y) <= 1;
    const at = onFinish ? from : this.route(q, w, from, y, (w.pole?.x ?? w.railL) + 34);
    if (!this.celebrated) {
      // Finished the article: celebrate once.
      this.celebrated = true;
      q.push({ anim: "airSpin", from: at, to: at, duration: 0.55, arc: 26, surface: floor, lock: true });
      q.push({ anim: "land", from: at, to: at, duration: 0.25, range: [5, 4], surface: floor, lock: true });
    }
    q.push({ anim: "idle", loop: true, from: at, to: at, duration: Infinity, surface: floor });
  }

  private respawn(): Phase[] {
    const w = this.world!;
    const wallX = w.railL - CONTACT.wallLeft;
    const top = { x: wallX, y: w.bandTop + 38 };
    const bottom = { x: wallX, y: w.bandY };
    const landed = { x: w.railL + 13, y: w.bandY };
    const wall: Surface = { kind: "wall" };
    return [
      {
        anim: "wallLandL",
        from: top,
        to: top,
        duration: 0.5,
        range: [0, 1],
        surface: wall,
        lock: true,
        onStart: () => {
          this.sprite.style.opacity = "0";
        },
      },
      {
        anim: "wallLandL",
        from: top,
        to: top,
        duration: 6 / 14,
        surface: wall,
        lock: true,
        onStart: () => {
          this.sprite.style.opacity = "";
          this.dying = false;
        },
      },
      { anim: "wallSlideL", loop: true, from: top, to: bottom, duration: Math.max(0.3, (bottom.y - top.y) / 48), surface: wall, lock: true },
      { anim: "land", from: landed, to: landed, duration: 9 / 16, surface: { kind: "floor", y: w.bandY }, lock: true },
    ];
  }

  /* ============================== Scared / katana =========================== */

  private checkPointer(w: World) {
    const current = this.queue[0];
    if (!this.pointer || !current || this.scareCooldown > 0 || this.dying) return;
    if (this.surface.kind === "pole" || current.surface.kind === "pole") return;

    const rect = this.frame.getBoundingClientRect();
    const px = this.pointer.x - rect.left;
    const py = this.pointer.y - rect.top;
    const dx = px - this.pos.x;
    const dy = py - (this.pos.y - 18);
    if (dx * dx + dy * dy >= SCARE_RADIUS * SCARE_RADIUS) return;

    const floorY = current.surface.kind === "floor" ? current.surface.y : this.surface.kind === "floor" ? this.surface.y : w.bandY;
    const at = { x: this.pos.x, y: floorY };
    this.interrupt();
    this.surface = { kind: "floor", y: floorY };

    if (this.katana) {
      // Katana mode doesn't run — it fights back.
      const dir: 1 | -1 = px < at.x ? -1 : 1;
      const floor: Surface = { kind: "floor", y: floorY };
      this.queue = [
        {
          anim: "katanaAttack",
          duration: 9 / 14,
          from: at,
          to: at,
          flip: dir < 0,
          surface: floor,
          lock: true,
          onFrame: (f) =>
            (CONTACT.katana.hitFrames as readonly number[]).includes(f) &&
            this.fx.sparks(at.x + dir * 32, floorY - 24, (-dir) as 1 | -1, 5),
        },
        { anim: "idle", loop: true, from: at, to: at, duration: 0.4, flip: dir < 0, surface: floor },
      ];
      this.scareCooldown = 1;
      return;
    }

    this.flee(w, at, px);
    this.scareCooldown = 0.3;
  }

  private flee(w: World, at: Point, pointerX: number) {
    const y = at.y;
    let minX = w.railL + 13;
    let maxX = w.railR - 13;
    if (w.crate && Math.abs(y - w.crate.y) <= 1) maxX = Math.min(maxX, w.crate.x0 - 16);
    const onTopOfButton = w.button && Math.abs(y - w.button.top) <= 1;
    if (onTopOfButton) {
      minX = w.button!.x0 + 8;
      maxX = w.button!.x1 - 8;
    }

    let dir: 1 | -1 = pointerX < at.x ? 1 : -1;
    let hop = 80;
    let arc = 30;
    const room = dir > 0 ? maxX - at.x : at.x - minX;
    if (room < 90) {
      dir = (-dir) as 1 | -1; // cornered: leap over the cursor
      hop = 150;
      arc = 46;
    }

    const q: Phase[] = [];
    let land = { x: clamp(at.x + dir * hop, minX, maxX), y };
    const b = w.button;
    if (onTopOfButton && b) {
      // Jump off the button to the ground.
      land = { x: clamp(dir > 0 ? b.x1 + 30 : b.x0 - 30, w.railL + 13, w.railR - 13), y: w.bandY };
      arc = 20;
    } else if (b && Math.abs(y - w.bandY) <= 1) {
      const lo = Math.min(at.x, land.x);
      const hi = Math.max(at.x, land.x);
      if (hi > b.x0 - 26 && lo < b.x1 + 26) {
        // The escape path meets the button: vault it.
        const beyond = dir > 0 ? b.x1 + 30 : b.x0 - 30;
        land = { x: clamp(beyond, minX, maxX), y };
        arc = w.bandY - b.top + 16;
      }
    }
    const landFloor: Surface = { kind: "floor", y: land.y };
    q.push({ anim: "airSpin", from: at, to: land, duration: 0.5, arc, flip: dir < 0, surface: landFloor, lock: true });
    q.push({ anim: "land", from: land, to: land, duration: 0.2, range: [5, 4], flip: dir < 0, surface: landFloor, lock: true });

    let runX = clamp(land.x + dir * 170, w.railL + 13, w.railR - 13);
    if (w.crate && Math.abs(land.y - w.crate.y) <= 1) runX = Math.min(runX, w.crate.x0 - 16);
    if (b && Math.abs(land.y - w.bandY) <= 1) {
      const blocked = dir > 0 ? land.x < b.x0 && runX > b.x0 - 26 : land.x > b.x1 && runX < b.x1 + 26;
      if (blocked) runX = dir > 0 ? b.x0 - 30 : b.x1 + 30;
    }
    const end = this.run(q, land, runX, FLEE_SPEED);
    q.push({ anim: "idle", loop: true, from: end, to: end, duration: 0.5, surface: { kind: "floor", y: end.y } });
    this.queue = q;
    this.elapsed = 0;
    this.lastFrame = -1;
  }

  /* ================================ Dev hook ================================ */

  debug() {
    return {
      step: (seconds: number, pointer?: Point | null) => {
        if (pointer !== undefined) this.pointer = pointer;
        for (let i = 0; i < Math.round(seconds * 60); i++) this.update(1 / 60);
        return this.snapshot();
      },
      hover: (el: HTMLElement | null) => {
        this.hoverEl = el;
      },
      katana: (on: boolean) => this.setKatana(on),
      click: (clientX: number) => this.onSpriteClick({ clientX } as PointerEvent),
      progress: (p: number) => {
        this.progress = p;
      },
      state: () => this.snapshot(),
    };
  }

  private snapshot() {
    return {
      anim: this.queue[0]?.anim,
      next: this.queue.slice(1, 6).map((p) => p.anim),
      pos: { x: Math.round(this.pos.x), y: Math.round(this.pos.y) },
      surface: this.surface,
      intent: this.intentKey,
      rail: Math.round(this.railShift),
      knock: Math.round(this.knock),
      crate: Math.round(this.crateShift),
      katana: this.katana,
      world: this.world,
    };
  }
}
