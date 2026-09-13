/**
 * Tiny pixel particle system: bullets, sparks and impact flashes.
 * Uses a fixed pool of absolutely positioned divs (no canvas sizing, no DOM churn).
 */

interface Particle {
  el: HTMLDivElement;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  fade: boolean;
  /** Bullets travel until they reach this column, then call onHit. */
  targetX?: number;
  onHit?: (x: number, y: number) => void;
}

const POOL_SIZE = 40;
const SPARK_COLORS = ["#fff6c2", "#ffd23f", "#ff9d2e", "#f26207"];

export class Fx {
  private particles: Particle[] = [];
  readonly root: HTMLDivElement;

  constructor(parent: HTMLElement, className: string) {
    this.root = document.createElement("div");
    this.root.className = className;
    this.root.setAttribute("aria-hidden", "true");
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement("div");
      el.style.display = "none";
      this.root.appendChild(el);
      this.particles.push({ el, active: false, x: 0, y: 0, vx: 0, vy: 0, gravity: 0, life: 0, maxLife: 0, fade: true });
    }
    parent.appendChild(this.root);
  }

  private spawn(opts: Partial<Particle> & { w: number; h: number; color: string; glow?: string }) {
    const p = this.particles.find((q) => !q.active);
    if (!p) return;
    Object.assign(p, { vx: 0, vy: 0, gravity: 0, fade: true, targetX: undefined, onHit: undefined }, opts, {
      active: true,
    });
    const s = p.el.style;
    s.display = "block";
    s.width = `${opts.w}px`;
    s.height = `${opts.h}px`;
    s.background = opts.color;
    s.boxShadow = opts.glow ?? "none";
    s.opacity = "1";
    this.place(p);
  }

  private place(p: Particle) {
    p.el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
  }

  bullet(x: number, y: number, dir: 1 | -1, targetX: number, onHit: (x: number, y: number) => void) {
    this.spawn({
      x,
      y: y - 1,
      vx: dir * 720,
      life: 2,
      maxLife: 2,
      fade: false,
      targetX,
      onHit,
      w: 5,
      h: 2,
      color: "#ffe680",
      glow: "0 0 3px #ff9d2e",
    });
  }

  /** Sparks spraying back toward `dir` (the side the hit came from). */
  sparks(x: number, y: number, dir: 1 | -1, count = 9) {
    this.spawn({ x: x - 3, y: y - 3, life: 0.07, maxLife: 0.07, w: 6, h: 6, color: "#fffbe6", glow: "0 0 6px #ffd23f" });
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * 1.4 - 0.7) + (dir > 0 ? 0 : Math.PI); // cone toward dir
      const speed = 70 + Math.random() * 150;
      const life = 0.22 + Math.random() * 0.28;
      this.spawn({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        gravity: 520,
        life,
        maxLife: life,
        w: Math.random() < 0.3 ? 3 : 2,
        h: 2,
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      });
    }
  }

  update(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      p.vy += p.gravity * dt;
      const nextX = p.x + p.vx * dt;
      p.y += p.vy * dt;

      if (p.targetX !== undefined && (p.vx > 0 ? nextX + 5 >= p.targetX : nextX <= p.targetX)) {
        const hitX = p.targetX;
        const onHit = p.onHit;
        this.kill(p);
        onHit?.(hitX, p.y);
        continue;
      }
      p.x = nextX;

      if (p.life <= 0) {
        this.kill(p);
        continue;
      }
      if (p.fade) p.el.style.opacity = String(Math.max(0, p.life / p.maxLife));
      this.place(p);
    }
  }

  private kill(p: Particle) {
    p.active = false;
    p.el.style.display = "none";
  }

  clear() {
    for (const p of this.particles) if (p.active) this.kill(p);
  }

  destroy() {
    this.root.remove();
  }
}
