/* =============================================================
   ILLUMINATI AI — TEXT ANIMATION SYSTEM (no SplitText dependency)
   GSAP + ScrollTrigger + Lenis
   Sacred / mystical / ceremonial motion. No bouncy springs.
============================================================= */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
  const DEBUG = /[?&]debug=1/.test(location.search);
  const STAGGER_SCALE  = IS_MOBILE ? 0.55 : 0.8;
  const DURATION_SCALE = IS_MOBILE ? 0.6 : 0.75;
  const HERO_BLUR_PX   = IS_MOBILE ? 6 : 10;

  function safe(fn) { try { fn(); } catch (e) { console.warn('[anim]', e); } }
  function dlog(...args) { if (DEBUG) console.log('[anim]', ...args); }

  if (DEBUG) {
    const css = document.createElement('style');
    css.textContent = `
      [data-split="1"] { outline: 1px dashed rgba(255,0,0,0.4) !important; }
      [data-split="1"] .ch, [data-split="1"] .wd { outline: 1px solid rgba(255,0,0,0.5) !important; }
    `;
    document.head.appendChild(css);
  }

  // ===============================================================
  // BOOT — wait for fonts (with timeout) and GSAP
  // ===============================================================
  function whenReady(cb) {
    let fired = false;
    const go = () => { if (fired) return; fired = true; cb(); };
    const ready = () => {
      if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded; skipping animations');
        return;
      }
      if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
      go();
    };
    // Hard 1.5s safety timeout in case fonts.ready hangs
    setTimeout(ready, 1500);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(ready).catch(ready);
    } else {
      window.addEventListener('load', ready, { once: true });
    }
  }

  // === IntersectionObserver fallback for mobile / GSAP-failed scenarios ===
  (function initRevealObserver() {
    // Skip if IntersectionObserver not supported
    if (!('IntersectionObserver' in window)) {
      document.body.classList.add('no-gsap');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1
    });

    // Observe all .reveal elements
    const startObserving = () => {
      document.querySelectorAll('.reveal').forEach((el) => {
        observer.observe(el);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving);
    } else {
      startObserving();
    }
  })();

  // === GSAP failure detection — adds body.no-gsap if GSAP didn't load ===
  setTimeout(() => {
    if (typeof gsap === 'undefined') {
      document.body.classList.add('no-gsap');
      console.warn('[animations] GSAP failed to load — using CSS fallback');
    }
  }, 2000);

  // ===============================================================
  // LENIS — smooth scrolling
  // ===============================================================
  function initLenis() {
    if (REDUCED) return null;
    if (typeof Lenis === 'undefined') return null;
    // Touch devices feel sluggish under Lenis — leave native scroll alone there.
    const TOUCH = window.matchMedia('(pointer: coarse)').matches;
    if (TOUCH) return null;
    const lenis = new Lenis({
      smooth: true,
      duration: 0.9,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -8 * t)),
      wheelMultiplier: 1.1,
      lerp: 0.12
    });
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
    return lenis;
  }

  // ===============================================================
  // MANUAL SPLITTERS (no SplitText)
  // ===============================================================
  function setAria(el) {
    if (el && !el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', el.textContent.trim());
    }
  }

  // Detect parents that use background-clip:text so we can re-apply the gradient onto child spans
  function getInheritedClipStyles(el) {
    const cs = getComputedStyle(el);
    const clip = cs.webkitBackgroundClip || cs.backgroundClip;
    const fill = cs.webkitTextFillColor;
    if (clip === 'text' || fill === 'rgba(0, 0, 0, 0)') {
      return {
        backgroundImage: cs.backgroundImage,
        backgroundClip: 'text',
        webkitBackgroundClip: 'text',
        webkitTextFillColor: 'transparent',
        color: 'transparent'
      };
    }
    return null;
  }

  // Split into chars. Each WORD becomes its own inline-block + nowrap container
  // so chars cannot break across lines mid-word; whitespace stays as text nodes
  // so the browser can still break between words naturally.
  function splitChars(el) {
    if (!el || el.dataset.split === '1') {
      return Array.from(el.querySelectorAll('.ch'));
    }
    setAria(el);
    const clipStyles = getInheritedClipStyles(el);
    const text = el.textContent;
    el.textContent = '';
    const chars = [];
    const tokens = text.split(/(\s+)/);   // keep whitespace tokens
    tokens.forEach(token => {
      if (token === '') return;
      if (/^\s+$/.test(token)) {
        el.appendChild(document.createTextNode(token));
        return;
      }
      // Word container — line-break unit; chars inside cannot break.
      const wordSpan = document.createElement('span');
      wordSpan.className = 'split-word';
      wordSpan.setAttribute('aria-hidden', 'true');
      wordSpan.style.cssText = 'display:inline-block;white-space:nowrap;';
      Array.from(token).forEach(ch => {
        const mask = document.createElement('span');
        mask.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;line-height:1.05;';
        const c = document.createElement('span');
        c.className = 'ch';
        c.setAttribute('aria-hidden', 'true');
        c.textContent = ch;
        c.style.cssText = 'display:inline-block;will-change:transform,filter,opacity;';
        if (clipStyles) {
          c.style.backgroundImage      = clipStyles.backgroundImage;
          c.style.backgroundClip       = 'text';
          c.style.webkitBackgroundClip = 'text';
          c.style.webkitTextFillColor  = 'transparent';
        }
        mask.appendChild(c);
        wordSpan.appendChild(mask);
        chars.push(c);
      });
      el.appendChild(wordSpan);
    });
    el.dataset.split = '1';
    dlog('splitChars created', chars.length, 'chars on', el);
    return chars;
  }

  // Split into words, each wrapped in inline-block mask.
  function splitWords(el) {
    if (!el || el.dataset.split === '1') {
      return Array.from(el.querySelectorAll('.wd'));
    }
    setAria(el);
    const clipStyles = getInheritedClipStyles(el);
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const out = [];
    words.forEach((w, i) => {
      const mask = document.createElement('span');
      mask.setAttribute('aria-hidden', 'true');
      mask.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;white-space:nowrap;';
      const span = document.createElement('span');
      span.className = 'wd';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = w;
      span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
      if (clipStyles) {
        span.style.backgroundImage      = clipStyles.backgroundImage;
        span.style.backgroundClip       = 'text';
        span.style.webkitBackgroundClip = 'text';
        span.style.webkitTextFillColor  = 'transparent';
      }
      mask.appendChild(span);
      el.appendChild(mask);
      out.push(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.split = '1';
    dlog('splitWords created', out.length, 'words on', el);
    return out;
  }

  // ===============================================================
  // ANIMATION HELPERS
  // ===============================================================
  function letterSpacingReveal(el, opts = {}) {
    if (!el) return;
    safe(() => {
      const startSpacing = opts.startSpacing || '2em';
      const endSpacing = opts.endSpacing || '0.06em';
      gsap.set(el, { opacity: 0, letterSpacing: startSpacing });
      gsap.to(el, {
        opacity: 1,
        letterSpacing: endSpacing,
        duration: (opts.duration || 1.2) * DURATION_SCALE,
        ease: opts.ease || 'expo.out',
        delay: opts.delay || 0,
        scrollTrigger: opts.noScroll ? undefined : {
          trigger: opts.trigger || el, start: 'top 88%', once: true
        }
      });
    });
  }

  // Signature reveal: chars rise yPercent 110→0 inside masks, blur 20→0
  function signatureChars(el, opts = {}) {
    if (!el) return;
    safe(() => {
      const chars = splitChars(el);
      if (!chars.length) {
        gsap.from(el, { opacity: 0, y: 20, duration: 1, ease: 'power3.out' });
        return;
      }
      // Initial state lives on chars (not parent) — applied AFTER split, never via CSS.
      gsap.set(chars, {
        yPercent: 110,
        opacity: 0,
        filter: `blur(${HERO_BLUR_PX}px)`,
        force3D: true
      });
      // Make sure the parent itself is fully opaque so children control visibility.
      gsap.set(el, { opacity: 1, visibility: 'visible' });

      const label = el.textContent.slice(0, 24).trim();
      const tween = gsap.to(chars, {
        yPercent: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1.4 * DURATION_SCALE,
        ease: 'expo.out',
        stagger: (opts.stagger || 0.025) * STAGGER_SCALE,
        delay: opts.delay || 0,
        overwrite: 'auto',
        onStart: () => dlog('signature START:', label),
        onComplete: () => {
          dlog('signature COMPLETE:', label);
          // Drop will-change so paint cost releases
          chars.forEach(c => { c.style.willChange = 'auto'; });
        }
      });

      if (!opts.noScroll) {
        // Even without ScrollTrigger, hero headlines run on the master timeline.
        // For non-hero signature uses, attach a one-shot trigger to retrigger when scrolled.
        ScrollTrigger.create({
          trigger: opts.trigger || el,
          start: 'top 88%',
          once: true,
          onEnter: () => tween.play(0)
        });
        tween.pause();
      }

      if (opts.idle) {
        // Sacred breathing — applied to parent, doesn't fight chars
        gsap.to(el, {
          textShadow: '0 0 26px rgba(212,164,55,0.5)',
          duration: 4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.6
        });
      }
    });
  }

  function shatterChars(el) {
    if (!el) return;
    safe(() => {
      const chars = splitChars(el);
      if (!chars.length) {
        gsap.from(el, { opacity: 0, y: -30, duration: 1.3, ease: 'expo.out' });
        return;
      }
      gsap.set(el, { opacity: 1, visibility: 'visible' });
      chars.forEach(c => {
        gsap.set(c, {
          yPercent: -80,
          opacity: 0,
          rotation: gsap.utils.random(-8, 8),
          filter: `blur(${HERO_BLUR_PX}px)`,
          force3D: true
        });
      });
      const label = el.textContent.slice(0, 24).trim();
      gsap.to(chars, {
        yPercent: 0, opacity: 1, rotation: 0, filter: 'blur(0px)',
        duration: 1.3 * DURATION_SCALE,
        ease: 'expo.out',
        stagger: 0.03 * STAGGER_SCALE,
        overwrite: 'auto',
        onStart: () => dlog('shatter START:', label),
        onComplete: () => {
          dlog('shatter COMPLETE:', label);
          chars.forEach(c => { c.style.willChange = 'auto'; });
        }
      });
    });
  }

  function wordsRise(el, opts = {}) {
    if (!el) return;
    safe(() => {
      const words = splitWords(el);
      if (!words.length) return;
      gsap.set(words, { yPercent: 110, opacity: 0 });
      gsap.to(words, {
        yPercent: 0, opacity: 1,
        duration: (opts.duration || 1.1) * DURATION_SCALE,
        ease: opts.ease || 'power4.out',
        stagger: (opts.stagger || 0.04) * STAGGER_SCALE,
        delay: opts.delay || 0,
        scrollTrigger: opts.noScroll ? undefined : {
          trigger: opts.trigger || el, start: 'top 88%', once: true
        }
      });
    });
  }

  function charsRise(el, opts = {}) {
    if (!el) return;
    safe(() => {
      const chars = splitChars(el);
      if (!chars.length) return;
      gsap.set(chars, { yPercent: opts.yPercent || 60, opacity: 0 });
      gsap.to(chars, {
        yPercent: 0, opacity: 1,
        duration: (opts.duration || 0.7) * DURATION_SCALE,
        ease: opts.ease || 'power3.out',
        stagger: (opts.stagger || 0.025) * STAGGER_SCALE,
        delay: opts.delay || 0,
        scrollTrigger: opts.noScroll ? undefined : {
          trigger: opts.trigger || el, start: 'top 88%', once: true
        }
      });
    });
  }

  function fadeUp(el, opts = {}) {
    if (!el) return;
    safe(() => {
      gsap.set(el, { opacity: 0, y: opts.y || 16 });
      gsap.to(el, {
        opacity: 1, y: 0,
        duration: (opts.duration || 0.9) * DURATION_SCALE,
        ease: opts.ease || 'power3.out',
        delay: opts.delay || 0,
        scrollTrigger: opts.noScroll ? undefined : {
          trigger: opts.trigger || el, start: 'top 88%', once: true
        }
      });
    });
  }

  function hairlineReveal(el, opts = {}) {
    if (!el) return;
    safe(() => {
      gsap.set(el, { scaleX: 0, transformOrigin: 'center center', opacity: 1 });
      gsap.to(el, {
        scaleX: 1,
        duration: 1.4 * DURATION_SCALE,
        ease: 'power3.inOut',
        delay: opts.delay || 0,
        scrollTrigger: opts.noScroll ? undefined : {
          trigger: opts.trigger || el, start: 'top 92%', once: true
        }
      });
    });
  }

  // ===============================================================
  // NAV
  // ===============================================================
  function initNav(firstLoad) {
    safe(() => {
      const brand = document.querySelector('.nav-brand-name');
      if (brand && firstLoad) {
        const chars = splitChars(brand);
        gsap.set(chars, { opacity: 0, yPercent: 30, filter: 'blur(8px)' });
        gsap.to(chars, {
          opacity: 1, yPercent: 0, filter: 'blur(0px)',
          duration: 1, ease: 'expo.out', stagger: 0.04
        });
      } else if (brand) {
        gsap.from(brand, { opacity: 0, y: 8, duration: 0.6, ease: 'power3.out' });
      }
      const navLinks = document.querySelectorAll('.nav-links .nav-link');
      if (navLinks.length) {
        gsap.from(navLinks, {
          opacity: 0, y: 12, duration: 0.7, ease: 'power3.out',
          stagger: 0.06, delay: 0.2
        });
      }
      const cta = document.querySelector('.btn-nav');
      if (cta) gsap.from(cta, { opacity: 0, y: 10, duration: 0.7, ease: 'power3.out', delay: 0.6 });

      // CTA gold glow pulse on hover
      if (cta) {
        let pulse;
        cta.addEventListener('mouseenter', () => {
          pulse = gsap.to(cta, {
            boxShadow: '0 0 0 4px rgba(212,164,55,0.18), 0 0 30px rgba(212,164,55,0.5)',
            duration: 0.5, ease: 'sine.inOut', repeat: -1, yoyo: true
          });
        });
        cta.addEventListener('mouseleave', () => {
          if (pulse) pulse.kill();
          gsap.to(cta, { boxShadow: 'none', duration: 0.3 });
        });
      }
    });
  }

  // ===============================================================
  // PAGE INITS
  // ===============================================================
  function initHomepage() {
    // Hero slide-ins are CSS-driven (see body.hero-anim-go rules) so they
    // play deterministically the instant the cinematic intro completes.
    const hero = document.querySelector('.title-hero');
    if (hero) hero.classList.remove('split-words');

    // Manifesto: kicker + lede animate TOGETHER with a wild creative reveal.
    initManifestoCrazyReveal();
  }

  // CRAZY MANIFESTO REVEAL ─ kicker (A New Order / Of Work) does a 3D
  // drop-in from above with blur + over-brightness while the lede's
  // characters explode in from random scattered positions, snap into
  // place, and a gold shimmer wave sweeps through them before they
  // settle into white. Both fire on the same ScrollTrigger so they
  // animate together.
  function initManifestoCrazyReveal() {
    const kicker  = document.querySelector('.manifesto .kicker');
    const lede    = document.querySelector('.manifesto .lede');
    const trigger = document.querySelector('.manifesto');
    if (!kicker && !lede) return;
    if (typeof gsap === 'undefined') return;

    safe(() => {
      // KICKER: cinematic 3D drop-in (kept whole — the <br> would be lost
      // by splitChars).
      if (kicker) {
        gsap.set(kicker, {
          opacity: 0,
          yPercent: -50,
          scale: 0.76,
          rotateX: -60,
          filter: 'blur(20px) brightness(2.6)',
          transformPerspective: 1200,
          transformOrigin: '50% 100%'
        });
      }

      // LEDE: split into chars, scatter each one to a random position +
      // rotation + scale + blur + gold over-brightness so it looks like
      // glittering shrapnel waiting to assemble.
      let ledeChars = [];
      if (lede) {
        ledeChars = splitChars(lede);
        gsap.set(lede, { opacity: 1, visibility: 'visible' });
        ledeChars.forEach((c) => {
          // Free the per-char mask so descenders (p, y, g, j, q) aren't
          // clipped by the splitChars `overflow:hidden` rectangle.
          const mask = c.parentNode;
          if (mask && mask.style) {
            mask.style.overflow   = 'visible';
            mask.style.lineHeight = 'inherit';
          }
          gsap.set(c, {
            xPercent: gsap.utils.random(-320, 320),
            yPercent: gsap.utils.random(-220, 220),
            rotation: gsap.utils.random(-180, 180),
            scale:    gsap.utils.random(0.2, 1.8),
            opacity:  0,
            color:    '#ffffff',
            filter:   'blur(22px) brightness(1.9)',
            transformPerspective: 1000
          });
        });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trigger || lede || kicker,
          // Fire as soon as the kicker peeks into the viewport so the
          // cinematic drop-in starts before the 2s CSS safety net would
          // otherwise force the kicker visible.
          start: 'top 85%',
          once: true
        }
      });

      // Kicker drops in (snappy but cinematic via expo.out).
      if (kicker) {
        tl.to(kicker, {
          opacity: 1,
          yPercent: 0,
          scale: 1,
          rotateX: 0,
          filter: 'blur(0px) brightness(1)',
          duration: 0.7,
          ease: 'expo.out'
        }, 0);
      }

      // Lede chars converge from scatter — random stagger so it feels chaotic
      // but resolves into clean order. Total reveal ≈ 1.4s.
      if (ledeChars.length) {
        tl.to(ledeChars, {
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          filter: 'blur(0px) brightness(1)',
          duration: 0.55,
          ease: 'expo.out',
          stagger: { each: 0.010, from: 'random' }
        }, 0);
      }
    });
  }

  function initServicesPage() {
    document.querySelectorAll('.split-words').forEach(el => el.classList.remove('split-words'));
    // First .kicker, .title-page, and first .subhead all use CSS slide-ins
    // (see styles.css — body.page-anim-go rules).

    // All 5 service cards are now handled by initServicesCardSlide in
    // app.js (CSS-driven slides from specific directions, scroll-gated).

    document.querySelectorAll('.hero-buttons .btn').forEach((b, i) => {
      fadeUp(b, { y: 20, duration: 0.8, delay: i * 0.1 });
    });
  }

  function initHowPage() {
    document.querySelectorAll('.split-words').forEach(el => el.classList.remove('split-words'));
    const kickers = document.querySelectorAll('.kicker');
    const subs = document.querySelectorAll('.subhead');
    // First kicker, .title-page, and subs[0] use CSS slide-ins (see styles.css).

    document.querySelectorAll('.step').forEach((step, i) => {
      const ghost = step.querySelector('.ghost');
      if (ghost) {
        gsap.set(ghost, { scale: 0.7, opacity: 0 });
        gsap.to(ghost, {
          scale: 1, opacity: 0.15,
          duration: 1.4, ease: 'power3.out',
          delay: i * 0.2,
          scrollTrigger: { trigger: step, start: 'top 88%', once: true }
        });
      }
      const t = step.querySelector('h3');
      if (t) charsRise(t, { yPercent: 60, stagger: 0.025, duration: 0.8, trigger: step, delay: 0.25 + i * 0.05 });
      const p = step.querySelector('p');
      if (p) fadeUp(p, { y: 14, duration: 0.8, delay: 0.45 + i * 0.05, trigger: step });
    });

    document.querySelectorAll('.hero-buttons .btn').forEach((b, i) => {
      fadeUp(b, { y: 20, duration: 0.8, delay: i * 0.1 });
    });

    // The "Why Choose Illuminati AI" title-section + first stats subhead
    // use the CSS slide-in scoped under .whychoose-section (see styles.css)
    // and are triggered by app.js initHowChooseReveal.

    // The .stat cards in the "Why Choose Illuminati AI" section are
    // revealed by app.js → statCardsRevealOnScroll (IntersectionObserver
    // on .stats-grid → staggered .is-revealed). The old GSAP-based
    // buildStatAnimation system was removed because it gated on
    // .whychoose-section.is-revealed + a 1850ms delay that often never
    // fired on Netlify, and when it did fire it ran in parallel with the
    // app.js reveal, producing a visible double animation.
  }

  function initAboutPage() {
    document.querySelectorAll('.split-words').forEach(el => el.classList.remove('split-words'));
    const kickers = document.querySelectorAll('.kicker');
    const subs = document.querySelectorAll('.subhead');
    // First kicker, .title-page, and subs[0] use CSS slide-ins (see styles.css).

    const beforeHead = document.querySelector('.problem-col .col-head');
    const withHead = document.querySelector('.solution-col .col-head');
    if (beforeHead) letterSpacingReveal(beforeHead, { trigger: '.duality' });
    if (withHead) letterSpacingReveal(withHead, { trigger: '.duality' });

    document.querySelectorAll('.problem-col .row-item').forEach((it, i) => {
      const icon = it.querySelector('.row-icon');
      if (icon) {
        gsap.set(icon, { scale: 0, rotation: 90 });
        gsap.to(icon, {
          scale: 1, rotation: 0,
          duration: 0.5, ease: 'power4.out',
          delay: i * 0.1,
          scrollTrigger: { trigger: it, start: 'top 92%', once: true }
        });
      }
      gsap.set(it, { opacity: 0.4, y: 12, filter: 'grayscale(80%)' });
      gsap.to(it, {
        opacity: 1, y: 0, filter: 'grayscale(0%)',
        duration: 0.8, ease: 'power3.out',
        delay: i * 0.1 + 0.1,
        scrollTrigger: { trigger: it, start: 'top 92%', once: true }
      });
    });

    document.querySelectorAll('.solution-col .row-item').forEach((it, i) => {
      const icon = it.querySelector('.row-icon');
      if (icon) {
        gsap.set(icon, { scale: 0, rotation: 90 });
        gsap.to(icon, {
          scale: 1, rotation: 0,
          duration: 0.5, ease: 'power4.out',
          delay: 0.4 + i * 0.1,
          scrollTrigger: { trigger: it, start: 'top 92%', once: true }
        });
      }
      gsap.set(it, { opacity: 0, y: 12 });
      gsap.to(it, {
        opacity: 1, y: 0,
        duration: 0.8, ease: 'power3.out',
        delay: 0.4 + i * 0.1 + 0.1,
        scrollTrigger: { trigger: it, start: 'top 92%', once: true }
      });
    });

    if (kickers[1]) letterSpacingReveal(kickers[1], { trigger: kickers[1] });
    const ts = document.querySelector('.title-section');
    if (ts) signatureChars(ts, { trigger: ts });

    document.querySelectorAll('.audience-card').forEach(card => {
      const h = card.querySelector('h3');
      if (h) charsRise(h, { yPercent: 50, stagger: 0.02, trigger: card });
      const lead = card.querySelector('.lead');
      if (lead) wordsRise(lead, { trigger: card, stagger: 0.04, duration: 0.8, delay: 0.3 });
      card.querySelectorAll('li').forEach((b, i) => {
        gsap.set(b, { opacity: 0, y: 10 });
        gsap.to(b, {
          opacity: 1, y: 0,
          duration: 0.7, ease: 'power3.out',
          delay: 0.5 + i * 0.08,
          scrollTrigger: { trigger: card, start: 'top 88%', once: true }
        });
      });
      const btn = card.querySelector('.btn');
      if (btn) fadeUp(btn, { y: 16, duration: 0.8, delay: 1, trigger: card });
    });
  }

  function initFAQPage() {
    document.querySelectorAll('.split-words').forEach(el => el.classList.remove('split-words'));
    // FAQ items use the CSS slide-in scoped under body.faq-page (see
    // styles.css), triggered by app.js initFAQItemsReveal.
  }

  function initContactPage() {
    document.querySelectorAll('.split-words').forEach(el => el.classList.remove('split-words'));
    // First .kicker, .title-page, and first .subhead use CSS slide-ins (see styles.css).

    document.querySelectorAll('.trust-badge').forEach((row, i) => {
      const icon = row.querySelector('svg');
      if (icon) {
        gsap.set(icon, { scale: 0, rotation: -45 });
        gsap.to(icon, {
          scale: 1, rotation: 0,
          duration: 0.6, ease: 'power3.out',
          delay: i * 0.15,
          scrollTrigger: { trigger: row, start: 'top 92%', once: true }
        });
      }
      const label = row.querySelector('span');
      if (label) charsRise(label, {
        yPercent: 40, stagger: 0.015, duration: 0.6,
        trigger: row, delay: 0.15 + i * 0.15
      });
    });

    document.querySelectorAll('.form .field').forEach((f, i) => {
      gsap.set(f, { opacity: 0, y: 16 });
      gsap.to(f, {
        opacity: 1, y: 0,
        duration: 0.7, ease: 'power3.out',
        delay: i * 0.06,
        scrollTrigger: { trigger: '.form', start: 'top 88%', once: true }
      });
    });
    const submit = document.querySelector('.btn-submit');
    if (submit) {
      gsap.set(submit, { opacity: 0, y: 20 });
      gsap.to(submit, {
        opacity: 1, y: 0,
        duration: 0.8, ease: 'power3.out',
        delay: 0.5,
        scrollTrigger: { trigger: '.form', start: 'top 88%', once: true }
      });
    }

    // .closing-text + .closing-divider are handled by app.js
    // initContactBoxesReveal — char-scatter snap + aura bloom + sword
    // slash. No GSAP word-rise / hairline conflicts here.
  }

  // ===============================================================
  // FOOTER
  // ===============================================================
  function initFooter() {
    // Footer is intentionally static — no scroll-triggered reveals or
    // letter-spacing flourishes. Everything renders normally.
    return;
    const bottom = document.querySelector('.footer-bottom');
    if (bottom) fadeUp(bottom, { y: 8, duration: 0.7, delay: 0.4, trigger: '.footer' });
  }

  // ===============================================================
  // CEREMONIAL DIVIDERS
  // ===============================================================
  function initDividers() {
    document.querySelectorAll('.hairline').forEach(el => hairlineReveal(el));
  }

  // ===============================================================
  // PAGE TRANSITIONS — black sweep with gold pulse dot
  // ===============================================================
  function initPageTransitions() {
    if (REDUCED) return;
    safe(() => {
      const overlay = document.createElement('div');
      overlay.id = 'page-transition-overlay';
      overlay.style.cssText = `
        position:fixed;inset:0;z-index:9999;background:#0a0a0a;
        pointer-events:none;clip-path:inset(0 0 100% 0);
        display:flex;align-items:center;justify-content:center;
      `;
      const dot = document.createElement('div');
      dot.style.cssText = `
        width:14px;height:14px;border-radius:50%;
        background:#D4A437;
        box-shadow:0 0 24px rgba(212,164,55,0.7),0 0 60px rgba(212,164,55,0.4);
        transform:scale(0);
      `;
      overlay.appendChild(dot);
      document.body.appendChild(overlay);

      // Inbound sweep — start covered, sweep down out the bottom
      gsap.set(overlay, { clipPath: 'inset(0 0 0 0)' });
      gsap.set(dot, { scale: 1 });
      gsap.timeline()
        .to(dot, { scale: 0, duration: 0.35, ease: 'power3.in' }, 0)
        .to(overlay, { clipPath: 'inset(100% 0 0 0)', duration: 0.7, ease: 'power4.inOut' }, 0.1);

      // Outbound on link click
      document.querySelectorAll('a[data-page-link]').forEach(a => {
        a.addEventListener('click', e => {
          const href = a.getAttribute('href');
          if (!href || href.startsWith('#') || href.startsWith('http') ||
              href.startsWith('mailto') || href.startsWith('tel')) return;
          const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
          if (href.toLowerCase() === here) return;
          e.preventDefault();
          // Force any in-progress char reveals to their end state so leaving the page
          // doesn't freeze elements mid-blur.
          document.querySelectorAll('[data-split="1"] .ch, [data-split="1"] .wd').forEach(c => {
            gsap.set(c, { opacity: 1, yPercent: 0, filter: 'none', rotation: 0 });
            c.style.willChange = 'auto';
          });
          gsap.set(overlay, { clipPath: 'inset(0 0 100% 0)' });
          gsap.set(dot, { scale: 0 });
          gsap.timeline({ onComplete: () => { window.location.href = href; } })
            .to(overlay, { clipPath: 'inset(0 0 0 0)', duration: 0.7, ease: 'power4.inOut' }, 0)
            .to(dot, { scale: 1, duration: 0.35, ease: 'power3.out' }, 0.25);
        }, true);
      });
    });
  }

  // ===============================================================
  // REDUCED MOTION FALLBACK
  // ===============================================================
  function reducedMotionFallback() {
    safe(() => {
      const all = document.querySelectorAll(
        '.title-hero, .title-page, .title-section, .subhead, .kicker, .hairline, ' +
        '.service-card, .step, .stat, .audience-card, .faq-item, .row-item, ' +
        '.closing-text, .footer-grid > div'
      );
      gsap.set(all, { opacity: 0 });
      gsap.to(all, { opacity: 1, duration: 0.3, ease: 'none', stagger: 0.02 });
    });
  }

  // ===============================================================
  // ROUTING
  // ===============================================================
  function initPage() {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const firstLoad = !sessionStorage.getItem('illuminati_visited');
    sessionStorage.setItem('illuminati_visited', '1');

    safe(() => initNav(firstLoad));
    safe(initDividers);

    if (path === 'index.html' || path === '') safe(initHomepage);
    else if (path === 'services.html')        safe(initServicesPage);
    else if (path === 'how-it-works.html')    safe(initHowPage);
    else if (path === 'about.html')           safe(initAboutPage);
    else if (path === 'faq.html')             safe(initFAQPage);
    else if (path === 'contact.html')         safe(initContactPage);

    safe(initFooter);
  }

  // ===============================================================
  // BOOT
  // ===============================================================
  whenReady(() => {
    if (REDUCED) {
      reducedMotionFallback();
      return;
    }
    initLenis();
    if (typeof gsap !== 'undefined' && gsap.context) {
      gsap.context(() => safe(initPage));
    } else {
      safe(initPage);
    }
    initPageTransitions();
  });
})();
