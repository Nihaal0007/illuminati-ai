/* =============================================================
   ILLUMINATI AI — ORBIT FIELD
   Strict circular orbits around the centered hero logo.
   Each particle has fixed radius/angularVelocity/inclination —
   never changes after init. No vertical drift, no random walk.
============================================================= */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(host) {
    if (REDUCED || !host) return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'orbit-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    const ctx = canvas.getContext('2d', { alpha: true });
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let fieldSize = 0;
    let particles = [];
    let visible = true;
    let fadeIn = 0;       // 0..1, ramps up after intro:complete
    let fadeStarted = false;

    // Particles orbit within a thin band ~3–4 cm beyond the logo's edge.
    // 1 cm ≈ 37.8 CSS px @ 96dpi, so outer reach ≈ 140 px past the rim.
    const ORBIT_INNER_PX = 10;
    const ORBIT_OUTER_PX = 140;

    function size() {
      const rect = host.getBoundingClientRect();
      const logoR = rect.width / 2;
      // Just enough canvas to contain the outermost orbit (+ a small margin
      // for the halo glow). No giant 3× canvas any more.
      fieldSize = Math.round((logoR + ORBIT_OUTER_PX + 20) * 2);
      canvas.style.width  = fieldSize + 'px';
      canvas.style.height = fieldSize + 'px';
      canvas.width  = fieldSize * dpr;
      canvas.height = fieldSize * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function build() {
      particles = [];
      const rect = host.getBoundingClientRect();
      const logoR = rect.width / 2;
      const innerR = logoR + ORBIT_INNER_PX;
      const outerR = logoR + ORBIT_OUTER_PX;
      const COUNT = 120;
      for (let i = 0; i < COUNT; i++) {
        const t = Math.random();
        const radius = innerR + (outerR - innerR) * Math.pow(t, 0.7);
        // Inner orbits faster, outer slower (25–80s revolution)
        const periodSec = 25 + ((radius - innerR) / (outerR - innerR)) * 55;
        const direction = Math.random() < 0.65 ? 1 : -1;
        const angVel = (Math.PI * 2) / (periodSec * 60) * direction; // rad/frame at 60fps
        particles.push({
          radius,
          angle: Math.random() * Math.PI * 2,
          angVel,
          ellipticity: 0.85 + Math.random() * 0.15,
          // Fixed inclination expressed by squashing y axis only —
          // keeps the path strictly elliptical/circular.
          size: 1.5 + Math.random() * 2.0,
          opacity: 0.5 + Math.random() * 0.45,
        });
      }
    }

    size();
    build();

    window.addEventListener('resize', () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size();
      build();
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => visible = e.isIntersecting);
      }, { rootMargin: '120px' });
      io.observe(host);
    }

    // Fade in after the intro completes (keeps the intro moment clean)
    window.addEventListener('intro:complete', () => { fadeStarted = true; });
    // If the intro was already played this session and we're loading fresh,
    // start the fade immediately.
    if (sessionStorage.getItem('illuminati_intro_played') === '1') {
      fadeStarted = true;
    }

    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      // Ramp fade-in (~1.2s)
      if (fadeStarted && fadeIn < 1) fadeIn = Math.min(1, fadeIn + 1 / (60 * 1.2));
      const dt = Math.min(2, (now - last) / (1000 / 60));
      last = now;
      const cx = fieldSize / 2;
      const cy = fieldSize / 2;
      ctx.clearRect(0, 0, fieldSize, fieldSize);

      // Halo pass (low alpha) for soft glow
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.angVel * dt;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius * p.ellipticity;
        p._x = x; p._y = y;
        ctx.fillStyle = `rgba(212,164,55,${p.opacity * 0.30 * fadeIn})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size + 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Core pass (saturated #D4A437)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = `rgba(212,164,55,${p.opacity * fadeIn})`;
        ctx.beginPath();
        ctx.arc(p._x, p._y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
    return { canvas };
  }

  window.OrbitField = { init };
})();
