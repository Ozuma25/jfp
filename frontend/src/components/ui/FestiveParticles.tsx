"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subtle Festive Fireworks — occasional golden bursts in the periphery.
 * 
 * One small firework launches every ~15 seconds from a random edge position,
 * rises, and blooms into a soft golden particle shower. Always placed in the
 * screen edges so it never obstructs content.
 */

type TrailParticle = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  decay: number;
};

type BurstParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  decay: number;
  gravity: number;
  color: string;
  trail: TrailParticle[];
};

type Rocket = {
  x: number;
  y: number;
  targetY: number;
  speed: number;
  opacity: number;
  trail: TrailParticle[];
  exploded: boolean;
};

type Firework = {
  rocket: Rocket | null;
  particles: BurstParticle[];
  done: boolean;
};

const BURST_COLORS = [
  "240, 199, 94",   // bright gold
  "212, 175, 55",   // luxury gold
  "255, 215, 0",    // pure gold
  "245, 178, 86",   // warm amber
  "255, 223, 186",  // champagne
  "255, 182, 193",  // soft pink (rare accent)
];

function randomEdgePosition(w: number, h: number): { x: number; startY: number; targetY: number } {
  // Always spawn in the outer 30% of screen (left or right periphery)
  const side = Math.random() < 0.5 ? "left" : "right";
  const x = side === "left"
    ? Math.random() * w * 0.25 + w * 0.05
    : Math.random() * w * 0.25 + w * 0.7;

  const startY = h + 10;
  const targetY = h * 0.15 + Math.random() * h * 0.35; // burst in top 15-50% of screen

  return { x, startY, targetY };
}

function createBurstParticles(x: number, y: number): BurstParticle[] {
  const count = 30 + Math.floor(Math.random() * 20);
  const particles: BurstParticle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const speed = Math.random() * 3 + 1;
    const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.4 + 0.3, // 0.3 to 0.7 — subtle
      decay: Math.random() * 0.008 + 0.006,
      gravity: 0.03,
      color,
      trail: [],
    });
  }
  return particles;
}

export function FestiveParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireworksRef = useRef<Firework[]>([]);
  const animationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let isVisible = true;
    const onVisibility = () => { isVisible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    // Launch a firework
    const launchFirework = () => {
      if (!isVisible) return;
      const { x, startY, targetY } = randomEdgePosition(canvas.width, canvas.height);

      const fw: Firework = {
        rocket: {
          x,
          y: startY,
          targetY,
          speed: 3 + Math.random() * 2,
          opacity: 0.5,
          trail: [],
          exploded: false,
        },
        particles: [],
        done: false,
      };
      fireworksRef.current.push(fw);
    };

    // First one after a short delay
    const firstTimeout = setTimeout(launchFirework, 3000);

    // Then every 15 seconds
    timerRef.current = setInterval(launchFirework, 5000);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      fireworksRef.current = fireworksRef.current.filter(fw => !fw.done);

      for (const fw of fireworksRef.current) {
        // === ROCKET PHASE ===
        if (fw.rocket && !fw.rocket.exploded) {
          const r = fw.rocket;

          // Add trail particle
          r.trail.push({
            x: r.x + (Math.random() - 0.5) * 2,
            y: r.y,
            size: Math.random() * 2 + 1,
            opacity: 0.4,
            decay: 0.02,
          });

          // Move rocket upward
          r.y -= r.speed;

          // Draw rocket trail
          for (let i = r.trail.length - 1; i >= 0; i--) {
            const t = r.trail[i];
            t.opacity -= t.decay;
            t.size *= 0.97;
            if (t.opacity <= 0) {
              r.trail.splice(i, 1);
              continue;
            }
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240, 199, 94, ${t.opacity})`;
            ctx.fill();
          }

          // Draw rocket head
          ctx.beginPath();
          ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${r.opacity})`;
          ctx.fill();

          // Check if reached target
          if (r.y <= r.targetY) {
            r.exploded = true;
            fw.particles = createBurstParticles(r.x, r.y);
          }
        }

        // === BURST PHASE ===
        if (fw.rocket?.exploded) {
          let allDead = true;

          for (let i = fw.particles.length - 1; i >= 0; i--) {
            const p = fw.particles[i];

            // Micro-trail for each burst particle
            if (p.opacity > 0.15) {
              p.trail.push({
                x: p.x,
                y: p.y,
                size: p.size * 0.6,
                opacity: p.opacity * 0.5,
                decay: 0.025,
              });
              // Keep trail short
              if (p.trail.length > 5) p.trail.shift();
            }

            // Physics
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.99; // friction
            p.opacity -= p.decay;
            p.size *= 0.995;

            if (p.opacity <= 0) {
              fw.particles.splice(i, 1);
              continue;
            }

            allDead = false;

            // Draw particle trail
            for (let j = p.trail.length - 1; j >= 0; j--) {
              const t = p.trail[j];
              t.opacity -= t.decay;
              if (t.opacity <= 0) {
                p.trail.splice(j, 1);
                continue;
              }
              ctx.beginPath();
              ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${p.color}, ${t.opacity})`;
              ctx.fill();
            }

            // Draw burst particle with glow
            ctx.save();
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${p.color}, ${p.opacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
            ctx.fill();
            ctx.restore();
          }

          // Also draw remaining rocket trail
          if (fw.rocket.trail.length > 0) {
            for (let i = fw.rocket.trail.length - 1; i >= 0; i--) {
              const t = fw.rocket.trail[i];
              t.opacity -= t.decay;
              if (t.opacity <= 0) {
                fw.rocket.trail.splice(i, 1);
                continue;
              }
              ctx.beginPath();
              ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(240, 199, 94, ${t.opacity})`;
              ctx.fill();
            }
          }

          if (allDead && fw.particles.length === 0 && fw.rocket.trail.length === 0) {
            fw.done = true;
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden="true"
    />
  );
}
