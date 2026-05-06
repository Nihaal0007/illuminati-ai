/* =============================================================
   ILLUMINATI AI — PARTICLE GENESIS (v3)
   Quality refinements:
   - Wider spawn region (1.8× canvas) so dust looks scattered
   - Slow-then-snap spring stiffness curve (0–1.5s drift,
     1.5–3.0s coalesce, 3.0–4.2s lock)
   - Aggressively staggered group delays
   - Bbox-recentered targets — geometric center sits exactly on
     canvas center
   - Per-group particle counts rebalanced for crisper geometry
   - Tighter glow radii so adjacent particles don't bleed
   - Warmer metallic gold palette
   - Genesis fog + lock-in shimmer wave + idle eye pulse
   - Halo pushed farther out (1.15–1.6× outer ring)

   Public API (unchanged):
     ParticleGenesis.run({
       host, skipIntro, reducedMotion, onIntroComplete
     })
============================================================= */
(function () {
  'use strict';

  // Logo geometric constants in 0..1024 SVG-space (centered on 512,512)
  const C = 512;
  const R_OUTER  = 480;
  const R_BAND   = 462;
  const R_INNER  = 432;
  const R_HEX    = 232;
  const R_HEX_IN = 132;
  const ROS_LOBES = 12;
  const ROS_R   = 305;
  const ROS_ARC = 188;
  const EYE_CX  = 512;
  const EYE_CY  = 524;
  const EYE_W   = 102;
  const EYE_H   = 64;
  const EYE_PUPIL_R = 19;
  const RAY_INNER = 65;
  const RAY_OUTER = 130;

  // Aggressive staggering — each group gets visual breathing room
  const GROUP_DELAY = {
    'outer-ring':      600,
    'inner-ring':     1000,
    'cardinal-stars': 1400,
    'zodiac-band':    1800,
    'hexagram-outer': 2400,
    'hexagram-inner': 2800,
    'rosette':        3000,
    'eye-outline':    3400,
    'eye-pupil':      3700,
    'eye-rays':       3900,
  };

  // Phase windows (ms, measured from particle spawn moment)
  const PHASE2_END_MS = 4200;        // genesis ends
  const LOCK_DEADLINE_MS = 4500;     // all locked by then
  const HOLD_MS = 700;
  const EXIT_MS = 1200;
  const SPARK_DELAY = 400;
  const PARTICLE_SPAWN_AT = SPARK_DELAY + 900;  // 1300ms — after spark fades up

  // ---------- Target generation -------------------------------
  function buildTargets() {
    const T = [];
    function push(x, y, group, intensity, extra) {
      const o = { x, y, group, intensity: intensity || 1.0 };
      if (extra) Object.assign(o, extra);
      T.push(o);
    }

    // OUTER RING — 320 points
    for (let i = 0; i < 320; i++) {
      const a = (i / 320) * Math.PI * 2;
      push(C + Math.cos(a) * R_OUTER, C + Math.sin(a) * R_OUTER, 'outer-ring');
    }
    // INNER RING — 220 points
    for (let i = 0; i < 220; i++) {
      const a = (i / 220) * Math.PI * 2;
      push(C + Math.cos(a) * R_INNER, C + Math.sin(a) * R_INNER, 'inner-ring');
    }

    // ZODIAC BAND — 180 total, denser ticks
    const BAND_GLYPHS = 24;
    const ptsPerGlyph = Math.floor(180 / BAND_GLYPHS); // 7-8
    for (let i = 0; i < BAND_GLYPHS; i++) {
      const a = (i / BAND_GLYPHS) * Math.PI * 2 - Math.PI / 2;
      const cx = C + Math.cos(a) * R_BAND;
      const cy = C + Math.sin(a) * R_BAND;
      const isAsterisk = i % 3 === 0;
      if (isAsterisk) {
        for (let k = 0; k < 6; k++) {
          const ang = (k * 30) * Math.PI / 180;
          for (let s = 0; s < 2; s++) {
            const t = s * 9;
            push(cx + Math.cos(ang) * t, cy + Math.sin(ang) * t, 'zodiac-band');
          }
        }
      } else {
        // Tick mark — short radial line
        for (let s = 0; s < ptsPerGlyph; s++) {
          const offset = (s / (ptsPerGlyph - 1) - 0.5) * 8;
          push(cx + Math.cos(a) * offset, cy + Math.sin(a) * offset, 'zodiac-band');
        }
      }
    }

    // CARDINAL STARS — 80 total, 20 per asterisk
    [-90, 0, 90, 180].forEach(degA => {
      const a = degA * Math.PI / 180;
      const cx = C + Math.cos(a) * (R_OUTER + 28);
      const cy = C + Math.sin(a) * (R_OUTER + 28);
      // 8-arm asterisk, ~2.5 pts per arm + center
      for (let k = 0; k < 8; k++) {
        const ang = (k * 45) * Math.PI / 180;
        for (let s = 0; s < 2; s++) {
          const t = (s + 1) * 8;
          push(cx + Math.cos(ang) * t, cy + Math.sin(ang) * t, 'cardinal-stars', 1.4);
        }
      }
      for (let s = 0; s < 4; s++) push(cx + (Math.random() - 0.5) * 3, cy + (Math.random() - 0.5) * 3, 'cardinal-stars', 1.4);
    });

    // ROSETTE — 850 total, dense web
    // 12 lobes, 50 pts each = 600. Plus two guide circles 125 each = 250. Total 850.
    for (let i = 0; i < ROS_LOBES; i++) {
      const a = (i / ROS_LOBES) * Math.PI * 2;
      const cx = C + Math.cos(a) * (ROS_R - ROS_ARC);
      const cy = C + Math.sin(a) * (ROS_R - ROS_ARC);
      for (let k = 0; k < 50; k++) {
        const ang = (k / 50) * Math.PI * 2;
        push(cx + Math.cos(ang) * ROS_ARC, cy + Math.sin(ang) * ROS_ARC, 'rosette', 0.95);
      }
    }
    for (let i = 0; i < 125; i++) {
      const a = (i / 125) * Math.PI * 2;
      push(C + Math.cos(a) * 308, C + Math.sin(a) * 308, 'rosette', 0.9);
      push(C + Math.cos(a) * 270, C + Math.sin(a) * 270, 'rosette', 0.9);
    }

    // HEXAGRAM OUTER — 320 (53 per edge × 6 edges)
    function pushTriangle(R, rotateDeg, group, density, intensity) {
      const verts = [];
      for (let i = 0; i < 3; i++) {
        const a = ((i * 120 + rotateDeg) - 90) * Math.PI / 180;
        verts.push([C + Math.cos(a) * R, C + Math.sin(a) * R]);
      }
      for (let s = 0; s < 3; s++) {
        const [x1, y1] = verts[s];
        const [x2, y2] = verts[(s + 1) % 3];
        for (let k = 0; k < density; k++) {
          const t = k / (density - 1);
          push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, group, intensity);
        }
      }
    }
    pushTriangle(R_HEX,    0,  'hexagram-outer', 53, 1.0);
    pushTriangle(R_HEX,    60, 'hexagram-outer', 53, 1.0);
    // HEXAGRAM INNER — 200 (33 per edge × 6 edges)
    pushTriangle(R_HEX_IN, 0,  'hexagram-inner', 33, 1.0);
    pushTriangle(R_HEX_IN, 60, 'hexagram-inner', 33, 1.0);

    // EYE OUTLINE — 80 around the almond
    for (let i = 0; i < 80; i++) {
      const t = i / 80;
      const a = t * Math.PI * 2;
      const x = EYE_CX + Math.cos(a) * EYE_W;
      const y = EYE_CY + Math.sin(a) * EYE_H * (0.6 + 0.4 * Math.sin(a) * Math.sin(a));
      push(x, y, 'eye-outline', 1.25);
    }

    // EYE PUPIL — 40 (just the iris ring + a few inside, NO disc fill)
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      push(EYE_CX + Math.cos(a) * EYE_PUPIL_R, EYE_CY + Math.sin(a) * EYE_PUPIL_R, 'eye-pupil', 1.25);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      push(EYE_CX + Math.cos(a) * 5, EYE_CY + Math.sin(a) * 5, 'eye-pupil', 1.3);
    }

    // EYE RAYS — 24 rays × 7 points = 168 (≈160)
    const RAYS = 24;
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2 - Math.PI / 2;
      const long = i % 3 === 0;
      const r2 = long ? RAY_OUTER + 12 : RAY_OUTER;
      for (let k = 0; k < 7; k++) {
        const t = k / 6;
        const r = RAY_INNER + (r2 - RAY_INNER) * t;
        push(EYE_CX + Math.cos(a) * r, EYE_CY + Math.sin(a) * r, 'eye-rays', 1.25, { rayAngle: a });
      }
    }

    // ---- BBOX RECENTER ----
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < T.length; i++) {
      if (T[i].x < minX) minX = T[i].x;
      if (T[i].x > maxX) maxX = T[i].x;
      if (T[i].y < minY) minY = T[i].y;
      if (T[i].y > maxY) maxY = T[i].y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const dx = C - cx;
    const dy = C - cy;
    for (let i = 0; i < T.length; i++) {
      T[i].x += dx;
      T[i].y += dy;
    }
    return T;
  }

  // ---------- Color helpers ---------------------------------
  // Warmer metallic gold base. h=38° (deeper than 43°) keeps it from going lemony.
  function midGoldRGBA(hueShift, alpha) {
    // Approx rgba(245, 195, 95, a) with subtle hue variation
    const h = (38 + hueShift + 360) % 360;
    return `hsla(${h}, 75%, 55%, ${alpha})`;
  }
  function atmoGoldRGBA(hueShift, alpha) {
    const h = (38 + hueShift + 360) % 360;
    return `hsla(${h}, 70%, 50%, ${alpha})`;
  }
  // Hot core: most particles top out at warm gold rgba(252, 225, 165, a).
  // Only cardinal-stars and eye-pupil get a near-white core.
  function coreColor(p, alpha) {
    if (p.group === 'cardinal-stars' || p.group === 'eye-pupil') {
      return `rgba(255, 240, 200, ${alpha})`;
    }
    return `rgba(252, 225, 165, ${alpha})`;
  }

  // ---------- Class ----------------------------------------
  class ParticleGenesis {
    constructor(opts) {
      this.host = opts.host;
      this.skipIntro = !!opts.skipIntro;
      this.reducedMotion = !!opts.reducedMotion;
      this.onIntroComplete = opts.onIntroComplete || (() => {});
      this.fineCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      this.isMobile = window.matchMedia('(max-width: 768px)').matches;

      this.particles = [];
      this.haloParticles = [];
      this.targets = [];
      this.cursor = { x: -9999, y: -9999, active: false };
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this._debugCenter = /[?&]debug=center/.test(location.search);
      this.startedAt = 0;
      this.running = false;
      this.mode = 'pre-spark';   // pre-spark|spark|genesis|hold|exit|idle
      this.lastEscape = 0;
      this.lastRayPulse = 0;
      this.lastEyePulse = 0;
      this._raf = null;
      this._completeFired = false;
      this._fogOpacity = 0;     // ramps in during genesis, fades during idle
      this._groupShimmer = {};  // group → ms timestamp of last shimmer flash
    }

    run() {
      if (this.reducedMotion) {
        this.onIntroComplete();
        return;
      }
      this._buildTargets();

      if (this.skipIntro) {
        this._mountCanvas(this.host);
        this._sizeCanvas();
        this._spawnLogoParticles({ atTarget: true });
        this._spawnHaloParticles();
        this.mode = 'idle';
        this._fogOpacity = 0;
        this.running = true;
        this._loop();
        this.onIntroComplete();
        this._enableIdleBreath(this.host);
        return;
      }

      this._buildOverlay();
      this._mountCanvas(this.preloaderStage);
      this._sizeCanvas();
      this._spawnLogoParticles({ atTarget: false });
      this._spawnHaloParticles();
      this.startedAt = performance.now();
      this.running = true;
      this._loop();
    }

    pause() { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }
    resume() { if (this.running) return; this.running = true; this._loop(); }
    destroy() {
      this.pause();
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      if (this._io) this._io.disconnect();
      if (this._ro) this._ro.disconnect();
      if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
      this.particles = null;
      this.haloParticles = null;
      this.targets = null;
    }

    // ---- internal ----
    _buildTargets() {
      let raw = buildTargets();
      if (this.isMobile && raw.length > 1700) {
        const stride = raw.length / 1700;
        const ds = [];
        for (let i = 0; i < 1700; i++) ds.push(raw[Math.floor(i * stride)]);
        raw = ds;
      }
      this.targets = raw;
    }

    _buildOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'genesis-overlay';
      overlay.id = 'genesisOverlay';
      overlay.setAttribute('aria-hidden', 'true');

      const stage = document.createElement('div');
      stage.className = 'genesis-stage';
      const stageSize = this.isMobile ? 320 : 540;
      stage.style.width  = stageSize + 'px';
      stage.style.height = stageSize + 'px';

      const spark = document.createElement('div');
      spark.className = 'genesis-spark';

      stage.appendChild(spark);
      overlay.appendChild(stage);
      document.body.appendChild(overlay);
      document.body.classList.add('genesis-locked');

      this.overlay = overlay;
      this.preloaderStage = stage;
      this.spark = spark;
      this.preloaderStageSize = stageSize;
    }

    _mountCanvas(parent) {
      let canvas = this.canvas;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'genesis-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
      }
      if (canvas.parentNode !== parent) parent.appendChild(canvas);
      this._bindOnce();
    }

    _bindOnce() {
      if (this._bound) return;
      this._bound = true;
      this._onResize = () => {
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this._sizeCanvas();
      };
      this._onMouseMove = (e) => {
        if (!this.fineCursor) return;
        const r = this.canvas.getBoundingClientRect();
        this.cursor.x = e.clientX - r.left;
        this.cursor.y = e.clientY - r.top;
        this.cursor.active = true;
      };
      window.addEventListener('resize', this._onResize, { passive: true });
      window.addEventListener('mousemove', this._onMouseMove, { passive: true });

      if ('ResizeObserver' in window) {
        this._ro = new ResizeObserver(() => this._sizeCanvas());
        this._ro.observe(this.canvas);
      }
      if ('IntersectionObserver' in window) {
        this._io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.intersectionRatio < 0.05) this.pause();
            else if (!this.running) this.resume();
          });
        }, { threshold: [0, 0.05, 0.5] });
        this._io.observe(this.canvas);
      }
    }

    _sizeCanvas() {
      const r = this.canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      this.canvas.width  = w * this.dpr;
      this.canvas.height = h * this.dpr;
      this.canvas.style.width  = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const size = Math.min(w, h);
      this._logoScale = size / 1024;
      this._logoOffX  = (w - size) / 2;
      this._logoOffY  = (h - size) / 2;
      this._cw = w; this._ch = h;
    }

    _spawnLogoParticles({ atTarget }) {
      const N = this.targets.length;
      const cw = this._cw || this.canvas.clientWidth;
      const ch = this._ch || this.canvas.clientHeight;
      // Wide spawn: 1.8× canvas, centered on canvas. Particles can sit in
      // the negative coords zone too — the canvas just won't render them
      // until they cross into bounds (they're effectively offscreen dust).
      const spawnW = cw * 1.8;
      const spawnH = ch * 1.8;
      const spawnOffX = (cw - spawnW) / 2;     // negative — offscreen left/top
      const spawnOffY = (ch - spawnH) / 2;
      this._spawnRect = { x: spawnOffX, y: spawnOffY, w: spawnW, h: spawnH };
      this.particles = new Array(N);
      for (let i = 0; i < N; i++) {
        const t = this.targets[i];
        const tx = t.x * this._logoScale + this._logoOffX;
        const ty = t.y * this._logoScale + this._logoOffY;
        // Softer drift velocities so the dust meanders rather than darts
        this.particles[i] = {
          x: atTarget ? tx : (spawnOffX + Math.random() * spawnW),
          y: atTarget ? ty : (spawnOffY + Math.random() * spawnH),
          tx: t.x, ty: t.y,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: 1.2 + Math.pow(Math.random(), 2) * 3.3,
          intensity: t.intensity || 1.0,
          group: t.group,
          state: atTarget ? 'locked' : 'drifting',
          jitterPhase: Math.random() * Math.PI * 2,
          jitterFreq: 0.8 + Math.random() * 0.6,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleFreq: 0.4 + Math.random() * 0.8,
          hueShift: (Math.random() - 0.5) * 16,
          escapeTimer: 0,
          rayAngle: t.rayAngle || 0,
          rayPulseT: 0,
          startDelay: GROUP_DELAY[t.group] || 0,
          lockShimmerT: 0,   // ms timestamp when this particle locked
          eyePulseAdd: 0,    // transient brightness for eye pulse
        };
      }
    }

    _spawnHaloParticles() {
      // 100–130 halo particles
      const count = this.isMobile ? 90 : 120;
      this.haloParticles = new Array(count);
      const baseR = R_OUTER * this._logoScale;
      for (let i = 0; i < count; i++) {
        this.haloParticles[i] = {
          orbitRadius: baseR * (1.15 + Math.random() * 0.45),
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: 0.0008 + Math.random() * 0.0017,
          orbitDirection: Math.random() < 0.7 ? 1 : -1,
          ellipticity: 0.85 + Math.random() * 0.15,
          verticalDrift: Math.random() * 8,
          driftPhase: Math.random() * Math.PI * 2,
          x: 0, y: 0,
          vx: 0, vy: 0,
          disturbed: 0,
          radius: 1.0 + Math.pow(Math.random(), 2) * 2.4,
          intensity: 0.6 + Math.random() * 0.25,
          hueShift: (Math.random() - 0.5) * 16,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleFreq: 0.4 + Math.random() * 0.8,
          group: 'halo',
        };
      }
    }

    _enableIdleBreath(host) {
      if (!host || this.isMobile || this.reducedMotion) return;
      try {
        host.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.012)' },
            { transform: 'scale(1)' },
          ],
          { duration: 6000, iterations: Infinity, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
        );
      } catch (e) { /* noop */ }
    }

    // -------------- MAIN LOOP --------------
    _loop() {
      if (!this.running) return;
      const now = performance.now();
      const elapsed = now - this.startedAt;

      if (this.mode === 'pre-spark') {
        if (elapsed > SPARK_DELAY) {
          this.mode = 'spark';
          if (this.spark) this.spark.classList.add('lit');
        }
      } else if (this.mode === 'spark') {
        if (elapsed > PARTICLE_SPAWN_AT) {
          this.mode = 'genesis';
          if (this.spark) this.spark.classList.add('out');
        }
      } else if (this.mode === 'genesis') {
        if (elapsed > PARTICLE_SPAWN_AT + LOCK_DEADLINE_MS) {
          this.mode = 'hold';
          this._holdStart = now;
        }
      } else if (this.mode === 'hold') {
        if (now - this._holdStart > HOLD_MS) {
          this.mode = 'exit';
          this._exitStart = now;
          this._beginExit();
        }
      } else if (this.mode === 'exit') {
        if (now - this._exitStart > EXIT_MS) {
          this.mode = 'idle';
          this._completeIntro();
        }
      }

      this._tick(now);
      this._draw();
      this._raf = requestAnimationFrame(() => this._loop());
    }

    _beginExit() {
      if (this.overlay) this.overlay.classList.add('exiting');
      if (this.host) {
        this._mountCanvas(this.host);
        requestAnimationFrame(() => this._sizeCanvas());
      }
    }

    _completeIntro() {
      if (this._completeFired) return;
      this._completeFired = true;
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      document.body.classList.remove('genesis-locked');
      this._enableIdleBreath(this.host);
      this.onIntroComplete();
      window.dispatchEvent(new CustomEvent('genesis:complete'));
    }

    _stiffness(localT) {
      // localT in ms relative to particle spawn
      // 0–1500 ms: 0.0008 → 0.005 (drift)
      // 1500–3000 ms: 0.005 → 0.04 (coalesce)
      // 3000–4200 ms: 0.04 → 0.08 (lock)
      if (localT < 1500) {
        const t = Math.max(0, localT) / 1500;
        return 0.0008 + (0.005 - 0.0008) * t;
      } else if (localT < 3000) {
        const t = (localT - 1500) / 1500;
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        return 0.005 + (0.04 - 0.005) * eased;
      } else if (localT < 4200) {
        const t = (localT - 3000) / 1200;
        return 0.04 + (0.08 - 0.04) * t;
      }
      return 0.08;
    }

    _tick(now) {
      const elapsed = now - this.startedAt;
      const localElapsed = elapsed - PARTICLE_SPAWN_AT;
      const damping = 0.85;

      // Fog target
      let fogTarget = 0;
      if (this.mode === 'genesis') fogTarget = 1;
      else if (this.mode === 'hold' || this.mode === 'exit') fogTarget = 0.4;
      else if (this.mode === 'idle') fogTarget = 0;
      else fogTarget = 0;
      this._fogOpacity += (fogTarget - this._fogOpacity) * 0.04;

      // Idle triggers
      if (this.mode === 'idle') {
        const escapeInterval = this.isMobile ? (10000 + Math.random() * 4000) : (6000 + Math.random() * 3000);
        if (now - this.lastEscape > escapeInterval) {
          this.lastEscape = now;
          this._spawnEscape();
        }
        if (now - this.lastRayPulse > (4000 + Math.random() * 2000)) {
          this.lastRayPulse = now;
          this._pulseRays();
        }
        // Eye pulse every 4 seconds
        if (now - this.lastEyePulse > 4000) {
          this.lastEyePulse = now;
          this._pulseEye(now);
        }
      }

      // ---- Logo particles ----
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const tgt = this._targetPos(p);

        // Cursor repulsion (fine pointer only)
        if (this.cursor.active && this.fineCursor) {
          const cdx = p.x - this.cursor.x;
          const cdy = p.y - this.cursor.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < 80 && cdist > 0) {
            const strength = (80 - cdist) / 80;
            p.vx += (cdx / cdist) * strength * 2;
            p.vy += (cdy / cdist) * strength * 2;
          }
        }

        if (p.state === 'escaped') {
          p.escapeTimer -= 16;
          p.vx *= 0.99; p.vy *= 0.99;
          p.x += p.vx; p.y += p.vy;
          if (p.escapeTimer <= 0) p.state = 'forming';
          continue;
        }

        if (this.mode === 'idle' && p.state === 'locked') {
          const tt = now / 1000;
          const offX = Math.sin(tt * p.jitterFreq + p.jitterPhase) * 1.5;
          const offY = Math.cos(tt * p.jitterFreq * 0.7 + p.jitterPhase) * 1.5;
          let rayBonus = 0;
          if (p.group === 'eye-rays' && p.rayPulseT > now) {
            const remaining = (p.rayPulseT - now) / 600;
            const eased = Math.sin(Math.min(1, remaining) * Math.PI);
            rayBonus = eased * 12;
          }
          const ox = p.group === 'eye-rays' ? Math.cos(p.rayAngle) * rayBonus : 0;
          const oy = p.group === 'eye-rays' ? Math.sin(p.rayAngle) * rayBonus : 0;
          p.x = tgt.x + offX + ox;
          p.y = tgt.y + offY + oy;
          continue;
        }

        // Drift before this particle's group is "awake"
        const groupOffsetMs = (p.startDelay - GROUP_DELAY['outer-ring']);
        const localT = localElapsed - groupOffsetMs;
        if (this.mode === 'genesis' && localT < 0) {
          // Soft drift inside the wide spawn rect. Wrap on overflow rather
          // than bounce, so dust feels like it's meandering, not agitated.
          p.x += p.vx;
          p.y += p.vy;
          const sr = this._spawnRect;
          if (sr) {
            if (p.x < sr.x)        p.x = sr.x + sr.w;
            if (p.x > sr.x + sr.w) p.x = sr.x;
            if (p.y < sr.y)        p.y = sr.y + sr.h;
            if (p.y > sr.y + sr.h) p.y = sr.y;
          }
          continue;
        }

        // Forming — apply spring
        p.state = 'forming';
        const k = this._stiffness(localT);
        const dx = tgt.x - p.x;
        const dy = tgt.y - p.y;
        p.vx = (p.vx + dx * k) * damping;
        p.vy = (p.vy + dy * k) * damping;
        p.x += p.vx;
        p.y += p.vy;

        // Lock test
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (dist < 0.7 && speed < 0.3) {
          p.state = 'locked';
          p.x = tgt.x; p.y = tgt.y;
          p.vx = 0; p.vy = 0;
          p.lockShimmerT = now;  // shimmer flash on this lock
        }
      }

      // ---- Halo particles ----
      if (this.mode !== 'pre-spark' && this.mode !== 'spark') {
        const tt = now / 1000;
        const lcx = this._logoOffX + (this._cw - 2 * this._logoOffX) / 2;
        const lcy = this._logoOffY + (this._ch - 2 * this._logoOffY) / 2;
        for (let i = 0; i < this.haloParticles.length; i++) {
          const h = this.haloParticles[i];
          h.orbitAngle += h.orbitSpeed * h.orbitDirection;
          const baseX = lcx + Math.cos(h.orbitAngle) * h.orbitRadius;
          const baseY = lcy + Math.sin(h.orbitAngle) * h.orbitRadius * h.ellipticity;
          const driftY = Math.sin(tt * 0.5 + h.driftPhase) * h.verticalDrift;

          if (this.cursor.active && this.fineCursor) {
            const cdx = h.x - this.cursor.x;
            const cdy = h.y - this.cursor.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < 80 && cdist > 0) {
              const strength = (80 - cdist) / 80;
              h.vx += (cdx / cdist) * strength * 1.4;
              h.vy += (cdy / cdist) * strength * 1.4;
              h.disturbed = 700;
            }
          }
          if (h.disturbed > 0) {
            h.disturbed -= 16;
            h.vx *= 0.92;
            h.vy *= 0.92;
            h.x = (h.x + h.vx) * 0.9 + (baseX) * 0.1;
            h.y = (h.y + h.vy + driftY) * 0.9 + (baseY) * 0.1;
          } else {
            h.x = baseX;
            h.y = baseY + driftY;
          }
        }
      }
    }

    _targetPos(p) {
      return {
        x: p.tx * this._logoScale + this._logoOffX,
        y: p.ty * this._logoScale + this._logoOffY,
      };
    }

    _spawnEscape() {
      const lockedIndices = [];
      for (let i = 0; i < this.particles.length; i++) {
        if (this.particles[i].state === 'locked') lockedIndices.push(i);
      }
      const count = Math.floor(lockedIndices.length * 0.05);
      const cx = this._cw / 2;
      const cy = this._ch / 2;
      for (let n = 0; n < count; n++) {
        const idx = lockedIndices[Math.floor(Math.random() * lockedIndices.length)];
        const p = this.particles[idx];
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const rx = dx / dist, ry = dy / dist;
        const tx = -ry, ty = rx;
        const speed = 1.5 + Math.random() * 1.5;
        const tangentMix = 0.6;
        p.vx = (rx + tx * tangentMix) * speed;
        p.vy = (ry + ty * tangentMix) * speed;
        p.state = 'escaped';
        p.escapeTimer = 3000 + Math.random() * 1000;
      }
    }

    _pulseRays() {
      const dur = 600;
      const now = performance.now();
      const byAngle = new Map();
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.group !== 'eye-rays') continue;
        const k = p.rayAngle.toFixed(3);
        if (!byAngle.has(k)) byAngle.set(k, []);
        byAngle.get(k).push(p);
      }
      let i = 0;
      byAngle.forEach(group => {
        const stagger = i * 30;
        group.forEach(p => { p.rayPulseT = now + dur + stagger; });
        i++;
      });
    }

    _pulseEye(now) {
      // Brief brightness boost on eye-pupil particles for 0.4s, sine eased
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.group !== 'eye-pupil') continue;
        p.eyePulseT = now + 400;
      }
    }

    // -------------- RENDER --------------
    _draw() {
      const ctx = this.ctx;
      const w = this._cw;
      const h = this._ch;
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() / 1000;
      const now = performance.now();

      // ----- Genesis fog (drawn first, behind particles) -----
      if (this._fogOpacity > 0.01) {
        const fog = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.55);
        fog.addColorStop(0, `rgba(80, 50, 10, ${0.04 * this._fogOpacity})`);
        fog.addColorStop(1, `rgba(80, 50, 10, 0)`);
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, w, h);
      }

      const drawGlow = (p) => {
        const r = p.radius;
        const tw = 0.7 + 0.3 * Math.sin(t * p.twinkleFreq + p.twinklePhase);

        // Lock-in shimmer wave: 80ms after a particle locks, intensity ×1.8
        let lockBoost = 1.0;
        if (p.lockShimmerT && now - p.lockShimmerT < 80) lockBoost = 1.8;

        // Eye pulse
        let eyeBoost = 1.0;
        if (p.group === 'eye-pupil' && p.eyePulseT && p.eyePulseT > now) {
          const remaining = (p.eyePulseT - now) / 400;
          const eased = Math.sin(Math.min(1, remaining) * Math.PI);
          eyeBoost = 1.0 + 0.4 * eased;
        }

        const intensity = (p.intensity || 1.0) * tw * lockBoost * eyeBoost;

        // Layer 1 — atmospheric glow (TIGHTER: r * 3.5, alpha 0.08)
        const r1 = r * 3.5;
        const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r1);
        g1.addColorStop(0,   atmoGoldRGBA(p.hueShift, 0.08 * intensity));
        g1.addColorStop(0.5, atmoGoldRGBA(p.hueShift, 0.04 * intensity));
        g1.addColorStop(1,   atmoGoldRGBA(p.hueShift, 0));
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r1, 0, Math.PI * 2);
        ctx.fill();

        // Layer 2 — mid glow (warmer base color, 245/195/95)
        const r2 = r * 2.5;
        const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2);
        g2.addColorStop(0,   midGoldRGBA(p.hueShift, 0.65 * intensity));
        g2.addColorStop(0.6, midGoldRGBA(p.hueShift, 0.30 * intensity));
        g2.addColorStop(1,   midGoldRGBA(p.hueShift, 0));
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
        ctx.fill();
      };

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.particles.length; i++) drawGlow(this.particles[i]);
      for (let i = 0; i < this.haloParticles.length; i++) drawGlow(this.haloParticles[i]);

      // ----- Layer 3 (hot core) -----
      ctx.globalCompositeOperation = 'source-over';
      const drawCore = (p) => {
        const r = p.radius;
        const tw = 0.7 + 0.3 * Math.sin(t * p.twinkleFreq + p.twinklePhase);
        let lockBoost = 1.0;
        if (p.lockShimmerT && now - p.lockShimmerT < 80) lockBoost = 1.8;
        let eyeBoost = 1.0;
        if (p.group === 'eye-pupil' && p.eyePulseT && p.eyePulseT > now) {
          const remaining = (p.eyePulseT - now) / 400;
          const eased = Math.sin(Math.min(1, remaining) * Math.PI);
          eyeBoost = 1.0 + 0.4 * eased;
        }
        const intensity = Math.min(1, (p.intensity || 1.0) * tw * lockBoost * eyeBoost);
        ctx.fillStyle = coreColor(p, intensity);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      };
      for (let i = 0; i < this.particles.length; i++) drawCore(this.particles[i]);
      for (let i = 0; i < this.haloParticles.length; i++) drawCore(this.haloParticles[i]);

      // ----- Vignette -----
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'rgba(15, 8, 0, 0)');
      vg.addColorStop(1, 'rgba(15, 8, 0, 0.08)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      // ----- Debug center dot (?debug=center) -----
      if (this._debugCenter) {
        ctx.fillStyle = '#ff003c';
        ctx.fillRect(Math.round(w / 2), Math.round(h / 2), 1, 1);
        ctx.fillStyle = 'rgba(255, 0, 60, 0.4)';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ParticleGenesis.run = function (opts) {
    const pg = new ParticleGenesis(opts);
    pg.run();
    window.__particleGenesis = pg;
    return pg;
  };

  window.ParticleGenesis = ParticleGenesis;
})();
