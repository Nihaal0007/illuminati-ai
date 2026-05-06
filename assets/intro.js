/* =============================================================
   ILLUMINATI AI — REFINED LOGO BLOOM REVEAL
   Soft atmospheric bloom → cinematic logo materialisation →
   sacred breathing hold → page reveal → logo travels to nav.
   Timeline:
     0.0s   black void
     0.5s   gold radiance expands
     1.4s   orbital ring fades in
     1.8s   logo materialises (blur → sharp)
     4.4s   breathing + halo pulse begin (sacred hold, 2.4 s)
     6.8s   overlay begins fading (1.4 s) + clone flies to nav
     8.2s   overlay removed, page revealed, intro complete
============================================================= */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PLAYED_FLAG = 'illuminati_intro_played';
  const EASE_FLY = 'cubic-bezier(0.76, 0, 0.24, 1)';
  const FLY_MS = 800;

  function flagPlayed() { try { sessionStorage.setItem(PLAYED_FLAG, '1'); } catch (e) {} }
  function alreadyPlayed() { try { return sessionStorage.getItem(PLAYED_FLAG) === '1'; } catch (e) { return false; } }

  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'bloom-overlay';
    overlay.id = 'bloomOverlay';
    overlay.setAttribute('aria-hidden', 'true');

    // Outer atmospheric bloom (existing)
    const radiance = document.createElement('div');
    radiance.className = 'bloom-radiance';
    radiance.id = 'bloomRadiance';

    // NEW: inner dense core bloom for dimensionality
    const core = document.createElement('div');
    core.className = 'bloom-core';
    core.id = 'bloomCore';

    // NEW: outward radiating light rays
    const rays = document.createElement('div');
    rays.className = 'bloom-rays';
    rays.id = 'bloomRays';

    // Decorative orbital ring (existing)
    const ring = document.createElement('div');
    ring.className = 'bloom-orbital-ring';
    ring.id = 'bloomOrbitalRing';

    // NEW: shimmering particles around the logo
    const shimmer = document.createElement('div');
    shimmer.className = 'bloom-shimmer';
    shimmer.id = 'bloomShimmer';

    // Logo wrapper with halo and PNG (existing)
    const wrapper = document.createElement('div');
    wrapper.className = 'bloom-logo-wrapper';
    wrapper.id = 'bloomLogoWrapper';

    const halo = document.createElement('div');
    halo.className = 'bloom-halo';
    halo.id = 'bloomHalo';

    const logo = document.createElement('img');
    logo.className = 'bloom-logo';
    logo.id = 'bloomLogo';
    logo.src = 'assets/logo.png';
    logo.alt = 'Illuminati AI';

    wrapper.appendChild(halo);
    wrapper.appendChild(logo);
    overlay.appendChild(radiance);
    overlay.appendChild(core);
    overlay.appendChild(rays);
    overlay.appendChild(ring);
    overlay.appendChild(shimmer);
    overlay.appendChild(wrapper);

    return { overlay, wrapper, logo, halo, rays, shimmer };
  }

  // Build outward radiating light rays
  function buildRays(rays, count) {
    if (!rays) return;
    for (let i = 0; i < count; i++) {
      const ray = document.createElement('div');
      ray.className = 'bloom-ray bloom-ray-pulsing';
      const angle = (360 / count) * i;
      const length = 280 + Math.random() * 220;
      ray.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
      ray.style.height = `${length}px`;
      ray.style.animationDelay = `${Math.random() * 2}s`;
      rays.appendChild(ray);
    }
  }

  // Build shimmering gold particles around the logo
  function buildShimmerParticles(shimmer, count) {
    if (!shimmer) return;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'bloom-shimmer-particle';

      const angle = Math.random() * 360;
      const distance = 28 + Math.random() * 38;
      const x = 50 + Math.cos(angle * Math.PI / 180) * distance;
      const y = 50 + Math.sin(angle * Math.PI / 180) * distance;

      const size = 1.5 + Math.random() * 2.8;
      const duration = 2.4 + Math.random() * 3.6;
      const delay = 2.0 + Math.random() * 3.0;

      particle.style.left = `${x}%`;
      particle.style.top = `${y}%`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.animation = `bloomShimmerTwinkle ${duration}s ease-in-out ${delay}s infinite`;

      shimmer.appendChild(particle);
    }
  }

  function skipIntro() {
    document.body.classList.remove('bloom-locked');
    document.documentElement.classList.remove('bloom-locked');
    document.body.classList.add('bloom-revealed');
    document.dispatchEvent(new CustomEvent('bloomRevealComplete'));
    window.dispatchEvent(new CustomEvent('intro:complete'));
  }

  function init() {
    const refs = buildOverlay();
    document.body.appendChild(refs.overlay);
    document.documentElement.classList.add('bloom-locked');
    document.body.classList.add('bloom-locked');

    // Build dynamic atmospheric layers
    buildRays(refs.rays, 40);
    buildShimmerParticles(refs.shimmer, 50);

    // Mark the moment the cinematic visual starts. The soundscape
    // shifts its scheduling by this offset so audio + visual stay
    // synced even if browser autoplay delayed the unlock by a frame
    // or two.
    introStartTimestamp = performance.now();
    playIntroSoundscape();

    runSequence(refs);
  }

  /* CINEMATIC INTRO SOUNDSCAPE
     Layered sound design synced to every phase of the bloom intro:

       0.0s  Sub-bass drone fades in (atmospheric foundation)
       0.3s  Rising shimmer chord — five harmonics swell
       1.5s  Cymbal-like noise wash sweeps up (radiance expanding)
       1.8s  Major-7 chord swell + high overtone shimmer (logo materialises)
       4.4s  Triple bell hit + halo bloom (sacred hold begins)
       4.6s  Slow breathing pad sustain (the hold)
       6.0s  Whoosh + filter sweep (clone flies to nav)
       6.3s  Soft sub-impact (clone arrives, page reveals)
       6.4s  Final settle chime

     Most modern browsers block audio without user interaction. We try
     to start the AudioContext immediately — if suspended, listen for
     the next user gesture and resume. If it never resumes (e.g. user
     loaded the URL directly without clicking anything), the animation
     plays silently. */
  function playIntroSoundscape() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    let ctx = null;
    let scheduled = false;

    function scheduleAll() {
      if (scheduled || !ctx) return;
      scheduled = true;

      // Compute how many seconds have already passed since the visual
      // intro started — shift t0 backwards so phases align with what's
      // happening on screen. Phases that already finished are skipped.
      const elapsed = introStartTimestamp
        ? Math.max(0, (performance.now() - introStartTimestamp) / 1000)
        : 0;

      const t0 = ctx.currentTime + 0.05 - elapsed;
      const master = ctx.createGain();
      master.gain.value = 0.95;            // louder than before
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -8;           // softer compression so signal isn't squashed
      comp.knee.value = 20;
      comp.ratio.value = 2.5;
      comp.attack.value = 0.005;
      comp.release.value = 0.25;
      master.connect(comp).connect(ctx.destination);

      const NOW = () => ctx.currentTime;
      const tone = (type, freq, start, dur, peak, attack = 0.05, release = 0.4) => {
        // Skip phases that ended before the audio unlocked.
        if (start + dur <= NOW() + 0.01) return;
        const safeStart = Math.max(start, NOW() + 0.005);
        const safeDur = Math.max(0.05, (start + dur) - safeStart);
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, safeStart);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), safeStart + Math.min(attack, safeDur * 0.4));
        g.gain.setValueAtTime(Math.max(0.0002, peak), Math.max(safeStart + 0.01, safeStart + safeDur - release));
        g.gain.exponentialRampToValueAtTime(0.0001, safeStart + safeDur);
        o.connect(g).connect(master);
        o.start(safeStart);
        o.stop(safeStart + safeDur + 0.05);
      };

      const noiseBurst = (start, dur, peak, freqStart, freqEnd, q = 1.2) => {
        if (start + dur <= NOW() + 0.01) return;
        const safeStart = Math.max(start, NOW() + 0.005);
        const safeDur = Math.max(0.05, (start + dur) - safeStart);
        const len = Math.max(1, Math.ceil(ctx.sampleRate * safeDur));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          const env = Math.pow(1 - i / len, 1.4);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.Q.value = q;
        filt.frequency.setValueAtTime(freqStart, safeStart);
        filt.frequency.exponentialRampToValueAtTime(freqEnd, safeStart + safeDur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(peak, safeStart);
        g.gain.exponentialRampToValueAtTime(0.0001, safeStart + safeDur);
        src.connect(filt).connect(g).connect(master);
        src.start(safeStart);
      };

      // ─── Phase 0 (0.0–6.5s): sub-bass atmospheric drone ───
      tone('sine',     55,  t0,        6.5, 0.06, 0.6, 1.5);
      tone('triangle', 110, t0 + 0.05, 6.4, 0.04, 0.6, 1.2);

      // ─── Phase 1 (0.3–4.0s): rising shimmer chord ───
      [220, 277.18, 329.63, 415.30, 523.25].forEach((f, i) => {
        tone('sine', f, t0 + 0.3 + i * 0.08, 3.7, 0.045 / (1 + i * 0.3), 1.2 + i * 0.1, 0.8);
      });

      // ─── Phase 1.5: bandpass noise wash ───
      noiseBurst(t0 + 0.5, 1.5, 0.05, 800, 5000, 0.8);

      // ─── Phase 2 (1.8–5.5s): major-7 chord swell ───
      [261.63, 329.63, 392.00, 493.88].forEach((f, i) => {
        tone('triangle', f, t0 + 1.8 + i * 0.04, 3.6, 0.07, 0.7, 1.0);
      });
      [1046.50, 1318.51].forEach((f, i) => {
        tone('sine', f, t0 + 2.4, 2.8, 0.025 / (i + 1), 1.0, 0.8);
      });

      // ─── Phase 3 (4.4s): triple bell hit — halo activates ───
      [880, 1318.51, 1760].forEach((f, i) => {
        const peak = 0.18 / (i + 1);
        const g = ctx.createGain();
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + 4.4);
        g.gain.exponentialRampToValueAtTime(peak, t0 + 4.42);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.4 + 2.0);
        o.connect(g).connect(master);
        o.start(t0 + 4.4);
        o.stop(t0 + 6.5);
      });

      // ─── Phase 4 (4.6–6.0s): slow breathing pad ───
      [261.63, 392.00, 523.25].forEach((f) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + 4.6);
        g.gain.exponentialRampToValueAtTime(0.04, t0 + 5.2);
        g.gain.linearRampToValueAtTime(0.06, t0 + 5.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 6.5);
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.45;
        lfoGain.gain.value = 0.012;
        lfo.connect(lfoGain).connect(g.gain);
        o.connect(g).connect(master);
        o.start(t0 + 4.6);
        lfo.start(t0 + 4.6);
        o.stop(t0 + 6.6);
        lfo.stop(t0 + 6.6);
      });

      // ─── Phase 5 (6.0s): whoosh — clone flies to nav ───
      noiseBurst(t0 + 6.0, 0.7, 0.18, 1500, 9000, 1.4);
      {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 800;
        filt.Q.value = 0.7;
        o.frequency.setValueAtTime(440, t0 + 6.0);
        o.frequency.exponentialRampToValueAtTime(120, t0 + 6.55);
        g.gain.setValueAtTime(0.0001, t0 + 6.0);
        g.gain.exponentialRampToValueAtTime(0.06, t0 + 6.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 6.6);
        o.connect(filt).connect(g).connect(master);
        o.start(t0 + 6.0);
        o.stop(t0 + 6.7);
      }

      // ─── Phase 6 (6.3s): soft sub-impact ───
      {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(160, t0 + 6.3);
        o.frequency.exponentialRampToValueAtTime(55, t0 + 6.7);
        g.gain.setValueAtTime(0.0001, t0 + 6.3);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + 6.32);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 6.85);
        o.connect(g).connect(master);
        o.start(t0 + 6.3);
        o.stop(t0 + 6.95);
      }

      // ─── Phase 7 (6.5s): final settle chime ───
      [2093, 2637].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + 6.5);
        g.gain.exponentialRampToValueAtTime(0.05 / (i + 1), t0 + 6.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.5);
        o.connect(g).connect(master);
        o.start(t0 + 6.5);
        o.stop(t0 + 7.6);
      });

      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 9000);
    }

    function attemptStart() {
      if (scheduled) return;
      // Create the context lazily — on browsers like Safari, an
      // AudioContext created OUTSIDE a user gesture stays suspended
      // forever, even after resume(). Creating it inside the gesture
      // handler is the only reliable unlock path.
      if (!ctx) {
        try { ctx = new AC(); }
        catch (e) { return; }
      }
      if (ctx.state === 'running') {
        scheduleAll();
        return;
      }
      if (ctx.state === 'suspended') {
        const p = ctx.resume();
        if (p && typeof p.then === 'function') {
          p.then(() => { if (ctx.state === 'running') scheduleAll(); })
           .catch(() => {});
        }
      }
    }

    // Try once immediately — works on browsers where the page
    // navigation itself counts as a user gesture (the most common case
    // when the user clicked something to navigate here).
    attemptStart();

    // If still suspended, listen for the FIRST user gesture, but ONLY
    // during the intro window (~6 seconds). After that, listeners are
    // removed so a late scroll doesn't trigger out-of-sync audio.
    if (!scheduled) {
      const events = ['click', 'mousedown', 'keydown', 'touchstart', 'pointerdown', 'mousemove'];
      const cleanup = () => {
        events.forEach(ev => window.removeEventListener(ev, onGesture, true));
      };
      const onGesture = () => {
        attemptStart();
        if (scheduled) cleanup();
      };
      events.forEach(ev => window.addEventListener(ev, onGesture, { capture: true }));
      // Hard window: 6 seconds, then no more late audio triggers.
      setTimeout(cleanup, 6000);
    }
  }

  function runSequence(refs) {
    const { overlay, logo, halo, wrapper } = refs;
    const navTarget = document.querySelector('.nav-brand .logo-mark');

    // Phase 4: Activate breathing and halo at 4.4s
    setTimeout(() => {
      logo.classList.add('bloom-breathing');
      halo.classList.add('bloom-halo-active');
    }, 4400);

    // Phase 5: Begin page reveal at 6.0s — tight transition so the
    // resting logo reappears within ~0.5s of the bloom logo leaving.
    setTimeout(() => {
      // Existing logo travel animation — preserved exactly.
      // Triggered here so the clone is created from the bloom-logo's
      // current rect BEFORE the overlay fades to display:none.
      // The clone is body-level (z-index 100000) so it remains visible
      // through and after the overlay's fade.
      if (navTarget) flyDuplicateToNav(wrapper, navTarget);

      overlay.classList.add('bloom-finished');

      setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('bloom-locked');
        document.body.classList.add('bloom-revealed');
        document.documentElement.classList.remove('bloom-locked');
        flagPlayed();
        document.dispatchEvent(new CustomEvent('bloomRevealComplete'));
        window.dispatchEvent(new CustomEvent('intro:complete'));
      }, 300);
    }, 6000);
  }

  function flyDuplicateToNav(stage, navTarget) {
    const stageRect = stage.getBoundingClientRect();
    const navRect = navTarget.getBoundingClientRect();
    const clone = document.createElement('img');
    clone.src = 'assets/logo.png';
    clone.alt = '';
    clone.className = 'intro-fly-clone';
    clone.style.position = 'fixed';
    clone.style.left = stageRect.left + 'px';
    clone.style.top  = stageRect.top + 'px';
    clone.style.width  = stageRect.width + 'px';
    clone.style.height = stageRect.height + 'px';
    clone.style.zIndex = 100000;
    clone.style.pointerEvents = 'none';
    clone.style.transformOrigin = 'top left';
    clone.style.transition = `transform ${FLY_MS}ms ${EASE_FLY}, opacity ${FLY_MS}ms ease`;
    document.body.appendChild(clone);

    clone.getBoundingClientRect();

    const dx = navRect.left - stageRect.left;
    const dy = navRect.top  - stageRect.top;
    const sx = navRect.width  / stageRect.width;
    const sy = navRect.height / stageRect.height;
    const scale = Math.min(sx, sy);
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    setTimeout(() => {
      navTarget.classList.add('intro-arrived');
      clone.style.opacity = '0';
      setTimeout(() => clone.remove(), 250);
    }, FLY_MS - 40);
  }

  function revealNavLogoOnComplete() {
    const navMark = document.querySelector('.nav-brand .logo-mark');
    if (!navMark) return;
    if (alreadyPlayed() || REDUCED) navMark.classList.add('intro-arrived');
    window.addEventListener('intro:complete', () => {
      navMark.classList.add('intro-arrived');
    });
  }

  function boot() {
    revealNavLogoOnComplete();
    // Cinematic intro only runs on the home page. Every other page
    // skips it immediately so the nav logo + content render normally.
    const isHome = document.body.classList.contains('home-page');
    if (REDUCED || alreadyPlayed() || !isHome) {
      skipIntro();
      return;
    }
    init();
  }

  // Track when the cinematic intro starts so we can sync the sound to
  // the visual if audio unlock happens slightly later.
  let introStartTimestamp = 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
