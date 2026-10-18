import React, { useEffect, useRef } from 'react';

/**
 * Hand-built 3D backdrop: a slowly drifting terrain of contour lines, projected with a
 * simple pinhole camera on a 2D canvas (no WebGL / no dependencies). Muted warm greys,
 * depth fog and a film-grain overlay keep it calm and "printed" rather than glowing.
 *
 * Props: intensity 0..1 (overall opacity), className for positioning.
 */
const COLS = 72;        // samples per contour line
const ROWS = 46;        // number of contour lines (depth)
const SPACING = 26;     // world units between samples
const CAMERA_Y = 150;   // camera height above the terrain
const FOCAL = 420;
const SPEED = 9;        // world units per second the camera glides forward

const height = (x, z, t) =>
  Math.sin(x * 0.011 + t * 0.35) * 22
  + Math.cos(z * 0.014 - t * 0.25) * 18
  + Math.sin((x + z) * 0.0055 + t * 0.15) * 34
  + Math.cos((x - z * 0.6) * 0.021) * 6;

const TerrainBackground = ({ intensity = 1, className = '' }) => {
  const canvasRef = useRef(null);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let heightPx = 0;
    let frame = 0;
    let start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      heightPx = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(heightPx * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now) => {
      const t = (now - start) / 1000;
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.04; // eased parallax
      p.y += (p.ty - p.y) * 0.04;

      ctx.clearRect(0, 0, width, heightPx);
      const cx = width / 2 + p.x * 30;
      const horizon = heightPx * 0.38 + p.y * 18;
      const travel = reduceMotion ? 0 : t * SPEED;
      const offset = travel % SPACING;
      const yaw = p.x * 0.08;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const maxDepth = ROWS * SPACING;

      // far → near so nearer lines paint over farther ones
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        const zWorld = r * SPACING - offset + 40;
        const fog = 1 - zWorld / maxDepth;
        if (fog <= 0) continue;
        ctx.beginPath();
        for (let c = 0; c <= COLS; c += 1) {
          const xLocal = (c - COLS / 2) * SPACING;
          const x = xLocal * cos - zWorld * sin;
          const z = xLocal * sin + zWorld * cos + 60;
          const y = height(xLocal, zWorld + travel, t);
          const scale = FOCAL / z;
          const sx = cx + x * scale;
          const sy = horizon + (CAMERA_Y - y) * scale;
          if (c === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        const a = fog * fog * 0.32;
        // near lines cyan, far lines indigo
        ctx.strokeStyle = `rgba(${Math.round(124 - 90 * fog)}, ${Math.round(108 + 103 * fog)}, ${Math.round(255 - 17 * fog)}, ${a * 1.3})`;
        ctx.lineWidth = 0.6 + fog * 0.7;
        ctx.stroke();
      }

      if (!reduceMotion && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      pointer.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };

    resize();
    frame = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => { resize(); if (reduceMotion) draw(performance.now()); });
    ro.observe(canvas);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden grain transition-opacity duration-700 ${className}`} style={{ opacity: intensity }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* vignette + fade into the surface colour at the top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#0b0d17_85%)]" />
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-app to-transparent" />
    </div>
  );
};

export default TerrainBackground;
