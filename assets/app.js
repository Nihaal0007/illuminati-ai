/* =============================================================
   ILLUMINATI AI — APP JS (interactions only)
   Text + section reveals are handled by assets/animations.js (GSAP).
   This file owns: cursor, nav, mobile menu, logo mounting,
   orbit field canvas, FAQ accordion, contact form, magnetic buttons.
============================================================= */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH   = window.matchMedia('(pointer: coarse)').matches;

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initLogos();
  initPageHeroSlideIn();
  initAboutLegacyReveal();
  initAboutFounderReveal();
  initAboutPhilosophyReveal();
  initAboutPrinciplesReveal();
  initAboutPathForwardReveal();
  initServicesCardSlide();
  initProductsCardSlide();
  initHowFaqCtaSlam();
  initHowChooseReveal();
  initHomeTiersReveal();
  initHomeTierRowsReveal();
  initFAQItemsReveal();
  initContactBoxesReveal();
  initOrbitField();
  initAmbientParticles();
  initFAQ();
  initForm();
  initMagneticButtons();
  initFooterYear();
  // Boot cinematic intro (home page only — markup gated)
  if (window.IlluminatiIntro) window.IlluminatiIntro.boot();
});

/* CURSOR — RAF suspends after 200ms of stillness */
function initCursor() {
  if (TOUCH || REDUCED) {
    document.body.style.cursor = 'auto';
    document.querySelectorAll('.cursor-ring, .cursor-dot').forEach(e => e.remove());
    return;
  }
  const ring = document.querySelector('.cursor-ring');
  const dot  = document.querySelector('.cursor-dot');
  if (!ring || !dot) return;
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my, dx = mx, dy = my;
  let running = false;
  let lastMove = 0;

  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    lastMove = performance.now();
    if (!running) { running = true; requestAnimationFrame(tick); }
  }, { passive: true });

  function tick(now) {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    dx += (mx - dx) * 0.30;
    dy += (my - dy) * 0.30;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
    // Stop the RAF if cursor has settled and hasn't moved recently
    const settled = Math.abs(mx - rx) < 0.2 && Math.abs(my - ry) < 0.2;
    if (settled && now - lastMove > 200) { running = false; return; }
    requestAnimationFrame(tick);
  }
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-link'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-link'));
  });
  document.querySelectorAll('.service-card, .step, .stat, .audience-card, .faq-item').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-card'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-card'));
  });
}

/* NAV scroll state + mobile menu + active link */
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => {
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const burger = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.classList.remove('active');
      menu.classList.remove('open');
    }));
  }
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav.toLowerCase() === path) link.classList.add('active');
  });
}

/* LOGOS — static PNG raster, used across nav, footer, hero. */
function initLogos() {
  document.querySelectorAll('[data-logo="mark"]').forEach(el => {
    if (el.dataset.logoMounted) return;
    el.dataset.logoMounted = '1';
    el.classList.add('logo-mark');
    el.innerHTML = '<img src="assets/logo.png" alt="Illuminati AI" class="brand-logo">';
  });
  const homeLogoStage = document.getElementById('homeLogoStage');
  if (!homeLogoStage) return;
  if (!homeLogoStage.querySelector('.brand-logo')) {
    const img = document.createElement('img');
    img.className = 'brand-logo brand-logo--hero';
    img.src = 'assets/logo.png';
    img.alt = 'Illuminati AI';
    homeLogoStage.appendChild(img);
  }
  // Resting hero logo is fully stationary — strip any leftover overlays.
  const stale = homeLogoStage.querySelector('.hero-eye-blink');
  if (stale) stale.remove();
  // On the home page, hold the hero logo hidden until the cinematic intro
  // overlay finishes fading, then reveal it quickly. On every other page (no
  // intro overlay) it appears immediately.
  const isHome = document.body.classList.contains('home-page');
  if (isHome) {
    // Resting hero appears immediately on repeat visits (intro is skipped
    // once the session flag is set), and as soon as intro:complete fires
    // on the first visit. A short safety timeout covers any edge cases.
    const introAlreadyPlayed = (() => {
      try { return sessionStorage.getItem('illuminati_intro_played') === '1'; }
      catch (e) { return false; }
    })();
    if (introAlreadyPlayed) {
      homeLogoStage.classList.add('in');
    } else {
      window.addEventListener('intro:complete', () => homeLogoStage.classList.add('in'), { once: true });
      setTimeout(() => homeLogoStage.classList.add('in'), 8200);
    }

    // Hero text slide-ins are gated on BOTH:
    //   1. The cinematic intro having finished
    //   2. The user scrolling so the headline area is on-screen
    let introDone = false, scrolled = false, anim = false;
    const fireHeroAnim = () => {
      if (anim || !introDone || !scrolled) return;
      anim = true;
      document.body.classList.add('hero-anim-go');
    };
    const markIntroDone = () => { introDone = true; fireHeroAnim(); };
    const markScrolled  = () => { scrolled  = true; fireHeroAnim(); };

    const introPlayed = (() => {
      try { return sessionStorage.getItem('illuminati_intro_played') === '1'; }
      catch (e) { return false; }
    })();
    if (introPlayed) {
      introDone = true;
    } else {
      window.addEventListener('intro:complete', markIntroDone, { once: true });
      setTimeout(markIntroDone, 9000);
    }

    // Observe the .hero-block container — it has no transform applied so
    // its layout rect is reliable. IO fires once it enters the viewport.
    const heroBlock = document.querySelector('.hero-block');
    if (heroBlock && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { markScrolled(); io.disconnect(); break; }
        }
      }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
      io.observe(heroBlock);
    }
    // Plain scroll-position fallback (works even on iframed contexts).
    const onScroll = () => {
      if (window.scrollY > 80) {
        markScrolled();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Final safety: if the user never scrolls (short viewport, hero-block
    // already on-screen, etc.), reveal the text 2.4 s after the intro ends.
    setTimeout(() => { markScrolled(); }, 11500);

    // Hero buttons + trust line — separate gate. Only reveal after the
    // headline/subhead anim has fired AND the user has continued scrolling
    // so .hero-buttons enters the viewport.
    initHomeButtonsReveal();
  } else {
    homeLogoStage.classList.add('in');
  }
  // Magnetic tilt removed — resting hero stays stationary.
}

/* HOME — Get Started + See How It Works + trust line slide in only
   AFTER the headline + subhead animation has fired (body.hero-anim-go)
   AND the user has scrolled the .hero-buttons element into view. */
function initHomeButtonsReveal() {
  const heroButtons = document.querySelector('.hero-buttons');
  const trustLine   = document.querySelector('.trust-line');
  if (!heroButtons) return;

  let heroAnimFired = false;
  let buttonsInView = false;
  let revealed      = false;

  function reveal() {
    if (revealed || !heroAnimFired || !buttonsInView) return;
    revealed = true;
    heroButtons.classList.add('is-revealed');
    if (trustLine) trustLine.classList.add('is-revealed');
  }

  // Watch for body.hero-anim-go (added once intro is complete + first scroll).
  if (document.body.classList.contains('hero-anim-go')) {
    heroAnimFired = true;
  } else {
    const mo = new MutationObserver(() => {
      if (document.body.classList.contains('hero-anim-go')) {
        heroAnimFired = true;
        reveal();
        mo.disconnect();
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          buttonsInView = true;
          reveal();
          io.disconnect();
          break;
        }
      }
    }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
    io.observe(heroButtons);
  } else {
    buttonsInView = true;
  }
}

/* Slide-in trigger for non-home pages — fires immediately on page
   load so the headline glides in from the left and subhead from the
   right the moment the user lands on the page. */
function initPageHeroSlideIn() {
  if (document.body.classList.contains('home-page')) return;
  const title = document.querySelector('.title-page');
  if (!title) return;
  // Defer one frame so the browser registers the initial off-screen
  // state before the animation is triggered.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('page-anim-go');
    });
  });
}

/* HOME — Tier rows (01..05) crazy unfold reveal. Each row 3D-folds
   down from above with a gold light-sweep, the number spins into place,
   the arrow bounces in from the right — staggered down the list.
   Triggered only after the user has scrolled past the "What We Build"
   tiers-section heading + subhead (i.e. the next thing below). */
function initHomeTierRowsReveal() {
  if (!document.body.classList.contains('home-page')) return;
  const tierPreview = document.querySelector('.tier-preview');
  if (!tierPreview) return;

  // Capture the tier-preview's intended top BEFORE the rows are
  // transformed off-screen. The .tier-preview itself isn't transformed
  // so its rect is reliable.
  const previewTop = tierPreview.getBoundingClientRect().top + window.scrollY;

  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    if (tierPreview.classList.contains('tiers-reveal-go')) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (triggerLine > previewTop) tierPreview.classList.add('tiers-reveal-go');
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });
}

/* ABOUT PAGE — Split the legacy body paragraphs into per-word
   <span class="legacy-word"> elements with random scatter custom
   properties (--lx / --ly / --lrot) and a per-word animation-delay
   so they cascade in alongside the headline + sub-headline reveal. */
function initAboutLegacyReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'about.html' && path !== 'about') return;
  const paragraphs = document.querySelectorAll('.legacy-body p');
  if (!paragraphs.length) return;
  const rand = (min, max) => (Math.random() * (max - min) + min).toFixed(0);

  paragraphs.forEach((p, pIdx) => {
    if (p.dataset.splitLegacy) return;
    const text = (p.textContent || '').trim();
    p.textContent = '';
    p.dataset.splitLegacy = '1';
    p.setAttribute('aria-label', text);
    const tokens = text.split(/(\s+)/);
    let wIdx = 0;
    for (const tok of tokens) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) {
        p.appendChild(document.createTextNode(tok));
      } else {
        const span = document.createElement('span');
        span.className = 'legacy-word';
        span.textContent = tok;
        span.style.setProperty('--lx', rand(-70, 70) + 'px');
        span.style.setProperty('--ly', rand(20, 60) + 'px');
        span.style.setProperty('--lrot', rand(-12, 12) + 'deg');
        // Each paragraph offsets after the previous one + small per-word
        // stagger so words cascade left → right within each paragraph.
        span.style.animationDelay = (pIdx * 0.55 + wIdx * 0.025).toFixed(3) + 's';
        p.appendChild(span);
        wIdx++;
      }
    }
  });
}

/* ABOUT PAGE — "The Order / Led By" founder reveal.
   Trigger is gated on the ENTIRE Legacy section (title + subhead +
   hairline + both body paragraphs) clearing the viewport top, so the
   cinematic header animation only fires once "Built to last." has fully
   scrolled off the screen and the user is genuinely in founder territory.

   The header cascade: section-label letter-spacing collapses, "Led By"
   drops in with 3D rotateX + scale + blur, subtitle fades up. Founder
   card photo/name/role/bio/social stagger in afterwards. */
function initAboutFounderReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'about.html' && path !== 'about') return;
  const section = document.querySelector('.founder-section');
  if (!section) return;

  // Anchor trigger on the bottom of the FULL Legacy <section> (founder's
  // previous sibling). Fall back to .legacy-body if structure changes.
  const legacySection = section.previousElementSibling;
  const legacyEl = legacySection || document.querySelector('.legacy-body');
  const legacyBottom = legacyEl
    ? legacyEl.getBoundingClientRect().bottom + window.scrollY
    : section.getBoundingClientRect().top + window.scrollY;

  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    if (section.classList.contains('is-revealed')) return;
    // Fire only when the entire Legacy section has scrolled past the
    // viewport top (no buffer — strict). At this moment "Built to last."
    // is gone and the founder section's top edge is at/near viewport top.
    if (window.scrollY > legacyBottom) {
      section.classList.add('is-revealed');
    }
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 80) userScrolled = true;
    tick();
  }, { passive: true });
}

/* ABOUT PAGE — "Our Philosophy" reveal. Heading drops in with 3D
   rotateX + gold halo flash; each of the three paragraphs enters from
   a different direction (down-from-top, in-from-right, up-from-bottom).
   Triggered only after the user scrolls past the Legacy of Illuminati
   hero block. */
function initAboutPhilosophyReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'about.html' && path !== 'about') return;
  const section = document.querySelector('.philosophy-section');
  if (!section) return;

  // Capture the section's natural top BEFORE applying any transform
  // classes — the section element itself isn't transformed, so this
  // measurement is reliable.
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;

  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    if (section.classList.contains('is-revealed')) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (triggerLine > sectionTop) section.classList.add('is-revealed');
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });
}

/* ABOUT PAGE — Principles section reveal. Heading slides from the
   left, subhead from the right, then each of the 4 standard cards
   flies in from its own corner (TL, TR, BL, BR). Fires only after
   the user scrolls past Our Philosophy. */
function initAboutPrinciplesReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'about.html' && path !== 'about') return;
  const section = document.querySelector('.principles-section');
  if (!section) return;

  // Capture top BEFORE the cards' transform classes shift them off-screen.
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;

  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    if (section.classList.contains('is-revealed')) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (triggerLine > sectionTop) section.classList.add('is-revealed');
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });
}

/* ABOUT PAGE — Path Forward closing reveal: heading characters
   explode in from a random 3D scatter and snap into place with a gold
   flash, a vertical gold light beam descends from above and ignites
   the heading at peak, then the paragraph words burst in from their
   own scatter while a shimmer sweep crosses the heading.
   Triggered only after the user scrolls past the Principles grid. */
function initAboutPathForwardReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'about.html' && path !== 'about') return;
  const section = document.querySelector('.path-forward');
  if (!section) return;
  const titleEl = section.querySelector('.title-section');
  const paraEl = section.querySelector('p');

  const rand = (min, max) => (Math.random() * (max - min) + min).toFixed(0);

  // Split the heading into per-character spans — each animates with a
  // trampoline-bounce (vertical squash/stretch) staggered like piano
  // keys being struck left-to-right.
  if (titleEl && !titleEl.dataset.pfSplit) {
    const text = (titleEl.textContent || '').trim();
    titleEl.textContent = '';
    titleEl.dataset.pfSplit = '1';
    titleEl.setAttribute('aria-label', text);
    [...text].forEach((ch, i) => {
      const sp = document.createElement('span');
      if (ch === ' ') {
        sp.className = 'pf-char space';
        sp.innerHTML = '&nbsp;';
      } else {
        sp.className = 'pf-char';
        sp.textContent = ch;
      }
      sp.setAttribute('aria-hidden', 'true');
      // Slower stagger (90ms/char) so each "key strike" reads
      // individually before the next lands.
      sp.style.animationDelay = (i * 0.09).toFixed(3) + 's';
      titleEl.appendChild(sp);
    });
  }

  // Split the closing paragraph into per-word spans — each word reveals
  // via a clip-path peel from below with a gold underline streak,
  // cascading left-to-right like a typewriter. Starts after the heading
  // has finished landing.
  if (paraEl && !paraEl.dataset.pfSplit) {
    const text = (paraEl.textContent || '').trim();
    paraEl.textContent = '';
    paraEl.dataset.pfSplit = '1';
    paraEl.setAttribute('aria-label', text);
    const tokens = text.split(/(\s+)/);
    // Heading has ~16 chars × 0.09s + 1.05s anim ≈ 2.5s before fully
    // done — words begin near then but cascade rapidly so the whole
    // paragraph completes in roughly 1.5s rather than 4s.
    const baseDelay = 1.7;
    let wIdx = 0;
    for (const tok of tokens) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) {
        paraEl.appendChild(document.createTextNode(tok));
      } else {
        const span = document.createElement('span');
        span.className = 'pf-word';
        span.textContent = tok;
        // 28ms per-word cascade — visibly fast but still each word
        // can be tracked by the eye.
        const delay = (baseDelay + wIdx * 0.028).toFixed(3) + 's';
        span.style.animationDelay = delay;
        // The ::after underline trail uses the same delay via inline
        // style by setting it through a CSS variable.
        span.style.setProperty('--pf-word-delay', delay);
        paraEl.appendChild(span);
        wIdx++;
      }
    }
  }

  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    if (section.classList.contains('is-revealed')) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (triggerLine > sectionTop) section.classList.add('is-revealed');
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });
}

/* CONTACT PAGE — both content boxes fly in from opposite 3D
   diagonals, halo pulses light up around each, trust badges stamp
   themselves in like wax seals, and the form fields cascade up. The
   closing "Let's Automate Your Future" line then has its characters
   tumble in from a random 3D scatter while the aura blooms outward
   and a gold sword-divider slashes across beneath.
   Triggered only after the user scrolls past the page hero / boxes. */
function initContactBoxesReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'contact.html' && path !== 'contact') return;
  const grid = document.querySelector('.contact-grid');
  const closing = document.querySelector('.closing');
  const closingText = document.querySelector('.closing-text');

  // Split the closing text into per-char spans with random scatter
  // coordinates baked into CSS custom properties.
  if (closingText && !closingText.dataset.split) {
    const text = (closingText.textContent || '').trim();
    closingText.textContent = '';
    closingText.setAttribute('aria-label', text);
    closingText.dataset.split = '1';
    const rand = (min, max) => (Math.random() * (max - min) + min).toFixed(0);
    [...text].forEach((ch, i) => {
      if (ch === ' ') {
        const sp = document.createElement('span');
        sp.className = 'closing-char space';
        sp.setAttribute('aria-hidden', 'true');
        sp.innerHTML = '&nbsp;';
        sp.style.setProperty('--cx', rand(-260, 260) + 'px');
        sp.style.setProperty('--cy', rand(-180, 180) + 'px');
        sp.style.setProperty('--crot', rand(-90, 90) + 'deg');
        sp.style.animationDelay = (i * 0.035).toFixed(3) + 's';
        closingText.appendChild(sp);
      } else {
        const sp = document.createElement('span');
        sp.className = 'closing-char';
        sp.setAttribute('aria-hidden', 'true');
        sp.textContent = ch;
        sp.style.setProperty('--cx', rand(-260, 260) + 'px');
        sp.style.setProperty('--cy', rand(-180, 180) + 'px');
        sp.style.setProperty('--crot', rand(-90, 90) + 'deg');
        sp.style.animationDelay = (i * 0.035).toFixed(3) + 's';
        closingText.appendChild(sp);
      }
    });
  }

  let gridTop = grid ? grid.getBoundingClientRect().top + window.scrollY : null;
  let closingTop = closing ? closing.getBoundingClientRect().top + window.scrollY : null;

  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (gridTop !== null && !document.body.classList.contains('contact-anim-go') && triggerLine > gridTop) {
      document.body.classList.add('contact-anim-go');
    }
    if (closingTop !== null && !document.body.classList.contains('closing-anim-go') && triggerLine > closingTop - window.innerHeight * 0.15) {
      document.body.classList.add('closing-anim-go');
    }
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });

  // IntersectionObserver fallback — guarantees the closing reveal fires
  // even if the scroll math drifts (e.g. layout reflow after split, or
  // the section already partially in view on page load).
  if (closing && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          document.body.classList.add('closing-anim-go');
          io.disconnect();
          break;
        }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    io.observe(closing);
  }
  // Final safety: reveal the closing text 8 s after page load no matter
  // what, so it can never be permanently hidden.
  setTimeout(() => document.body.classList.add('closing-anim-go'), 8000);
}

/* FAQ PAGE — each .faq-item slides in from alternating sides
   (odd from the left, even from the right) with a subtle rotate +
   blur clear, only after the user has scrolled past the page hero
   block. The closing "Still have questions. Let's talk." line gets
   a subtle letter-spacing-condense reveal. */
function initFAQItemsReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'faq.html' && path !== 'faq') return;
  const items = Array.from(document.querySelectorAll('.faq-item'));
  const tailLine = document.querySelector('.faq-tail-line');
  if (!items.length && !tailLine) return;

  // Capture each item's intended docTop BEFORE the off-screen transform
  // shifts it sideways.
  const entries = items.map(el => ({
    el,
    docTop: el.getBoundingClientRect().top + window.scrollY
  }));
  const tailEntry = tailLine
    ? { el: tailLine, docTop: tailLine.getBoundingClientRect().top + window.scrollY }
    : null;

  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    entries.forEach(e => {
      if (e.el.classList.contains('is-revealed')) return;
      if (triggerLine > e.docTop) e.el.classList.add('is-revealed');
    });
    if (tailEntry && !tailEntry.el.classList.contains('is-revealed') && triggerLine > tailEntry.docTop) {
      tailEntry.el.classList.add('is-revealed');
    }
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });
}

/* HOME — "What We Build" tiers-section reveal. Kicker drops in from
   above, title slides in from the left, subhead slides in from the
   right. Triggered only after the user scrolls past the manifesto
   block. */
function initHomeTiersReveal() {
  if (!document.body.classList.contains('home-page')) return;
  const section = document.querySelector('.tiers-section');
  if (!section) return;

  const sectionTop = section.getBoundingClientRect().top + window.scrollY;

  let userScrolled = false;
  function tick() {
    if (!userScrolled) return;
    if (section.classList.contains('is-revealed')) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (triggerLine > sectionTop) section.classList.add('is-revealed');
  }
  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });
}

/* HOW IT WORKS — "Why Choose Illuminati AI" heading + subhead slide
   in (left + right) only after the user has scrolled past the "Start
   Your AI Journey" CTA. */
function initHowChooseReveal() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'how-it-works.html' && path !== 'how-it-works') return;
  const section = document.querySelector('.whychoose-section');
  if (!section) return;

  const cta = document.querySelector('.steps-cta .hero-buttons');
  // CTA's slam-in animation duration; whychoose can't fire until this
  // finishes (CTA is .products-cta-btn — animation is 1.7s).
  const CTA_ANIM_MS = 1750;

  // Capture intended top BEFORE the slide transforms shift the title /
  // subhead off-screen — the section element itself isn't transformed,
  // so getBoundingClientRect on it is reliable.
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;

  let userScrolled = false;
  let ctaAnimationDone = !cta;     // if no CTA exists, gate is open immediately

  // Watch for the CTA being revealed; once it has, wait the full anim
  // duration before opening this gate.
  if (cta) {
    const checkCta = setInterval(() => {
      if (cta.classList.contains('is-revealed')) {
        clearInterval(checkCta);
        setTimeout(() => { ctaAnimationDone = true; tryReveal(); }, CTA_ANIM_MS);
      }
    }, 80);

    // SAFETY FALLBACK: If the CTA never gets is-revealed (e.g., on Netlify
    // where some animation timings differ), force-open the gate after 2s
    // so the Why Choose section can still animate when scrolled into view.
    setTimeout(() => {
      if (!ctaAnimationDone) {
        clearInterval(checkCta);
        ctaAnimationDone = true;
        tryReveal();
      }
    }, 2000);
  }

  function tryReveal() {
    if (!userScrolled || !ctaAnimationDone) return;
    if (section.classList.contains('is-revealed')) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (triggerLine > sectionTop) section.classList.add('is-revealed');
  }

  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tryReveal();
  }, { passive: true });
}

/* HOW IT WORKS + FAQ pages — share the same crazy CTA slam-in as the
   services / products CTAs. Each fires only after the user has actually
   scrolled to bring the button's intended position into view. */
function initHowFaqCtaSlam() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  let cta = null;
  let sentinel = null;
  if (path === 'how-it-works.html' || path === 'how-it-works') {
    cta = document.querySelector('.steps-cta .hero-buttons')
       || document.querySelectorAll('.hero-buttons')[document.querySelectorAll('.hero-buttons').length - 1];
  } else if (path === 'faq.html' || path === 'faq') {
    // Last .hero-buttons sits below the FAQ accordion (not the nav CTA).
    const all = document.querySelectorAll('.hero-buttons');
    cta = all[all.length - 1];
  } else {
    return;
  }
  if (!cta) return;

  // Insert a non-transformed sentinel at the CTA's natural layout
  // position. The CTA itself uses translateY(220px) when off-screen,
  // which would confuse IntersectionObserver — but the sentinel sits
  // unmodified, so IO sees it the moment it scrolls into view.
  sentinel = document.createElement('div');
  sentinel.style.cssText = 'width:0;height:1px;pointer-events:none;';
  cta.parentNode.insertBefore(sentinel, cta);

  // Capture intended top BEFORE applying transform — used by the scroll
  // fallback if IO is unavailable.
  const ctaTop = cta.getBoundingClientRect().top + window.scrollY;
  // Restored: use the dramatic products-cta slam-in for how-it-works
  // + faq closing CTAs (rotation + halo + shockwave + idle pulses).
  cta.classList.add('products-cta-btn');

  function reveal() {
    if (!cta.classList.contains('is-revealed')) {
      cta.classList.add('is-revealed');
    }
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          reveal();
          io.disconnect();
          break;
        }
      }
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
    io.observe(sentinel);
  }

  // Scroll-position fallback: fires as soon as the trigger line crosses
  // the captured top, so it works even if IO ever misses (e.g. on
  // browsers where layout reflow shifts after DCL).
  function tick() {
    if (cta.classList.contains('is-revealed')) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (triggerLine > ctaTop) reveal();
  }
  window.addEventListener('scroll', tick, { passive: true });

  // Final safety: if neither IO nor scroll fires (CTA already in
  // viewport at page load on a tall screen), reveal after a short delay.
  setTimeout(() => {
    if (sentinel.getBoundingClientRect().top < window.innerHeight) reveal();
  }, 1200);
}

/* PRODUCTS PAGE — Creator OS slides in DIAGONALLY from the upper-left,
   Content Automation Suite from the upper-right. Trigger fires only
   after the headline + subhead anim has played AND the user has
   actually scrolled the cards' intended position into view. */
function initProductsCardSlide() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'products.html' && path !== 'products') return;
  const cards = Array.from(document.querySelectorAll('.products-grid .product-card'));
  if (cards.length < 2) return;

  const left   = cards[0]; // Creator OS
  const right  = cards[1]; // Content Automation Suite
  const bottom = cards[2]; // Future Products

  // CTA button below the grid — "Book a Free Session".
  const ctaBtn = document.querySelector('.products-grid ~ .hero-buttons')
              || document.querySelectorAll('.hero-buttons')[document.querySelectorAll('.hero-buttons').length - 1];

  // Capture document-relative tops BEFORE applying transforms — once the
  // direction class is on, getBoundingClientRect returns the off-screen
  // visual rect which is useless for scroll-trigger math.
  const leftTop   = left.getBoundingClientRect().top  + window.scrollY;
  const rightTop  = right.getBoundingClientRect().top + window.scrollY;
  const bottomTop = bottom ? bottom.getBoundingClientRect().top + window.scrollY : null;
  const ctaTop    = ctaBtn ? ctaBtn.getBoundingClientRect().top + window.scrollY : null;

  left.classList.add('diagonal-from-left');
  right.classList.add('diagonal-from-right');
  if (bottom) bottom.classList.add('slide-from-bottom');
  if (ctaBtn) ctaBtn.classList.add('products-cta-btn');

  let userScrolled = false;
  // Page hero anim total (kicker + headline + subhead) ≈ 1.85s.
  let heroDone = false;
  setTimeout(() => { heroDone = true; tick(); }, 2100);

  function tick() {
    if (!userScrolled || !heroDone) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    if (!left.classList.contains('is-revealed') && triggerLine > leftTop) {
      left.classList.add('is-revealed');
    }
    if (!right.classList.contains('is-revealed') && triggerLine > rightTop) {
      right.classList.add('is-revealed');
    }
    if (bottom && !bottom.classList.contains('is-revealed') && triggerLine > bottomTop) {
      bottom.classList.add('is-revealed');
    }
    // CTA only fires after Future Products has revealed AND the user has
    // scrolled past the CTA's intended position.
    if (
      ctaBtn &&
      !ctaBtn.classList.contains('is-revealed') &&
      bottom && bottom.classList.contains('is-revealed') &&
      triggerLine > ctaTop
    ) {
      ctaBtn.classList.add('is-revealed');
    }
  }

  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });
}

/* SERVICES PAGE — per-card scroll-triggered slide-ins.
   Cards 1 + 2 drop straight down from above (extra gate: hero anim +
   first scroll). Card 3 slides in from the LEFT, card 4 from the RIGHT,
   card 5 slides UP from below — each one fires only once the user has
   actually scrolled the card's intended position into view.

   IMPORTANT: cards 3 + 4 use translateX(±100vw), which puts their visual
   rect entirely off-screen — IntersectionObserver would never fire. So
   we capture each card's document-relative top BEFORE applying the
   transform class, then run a scroll-listener that reveals each card
   once the viewport has scrolled past its intended layout position. */
function initServicesCardSlide() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'services.html' && path !== 'services') return;
  const allCards = Array.from(document.querySelectorAll('.services-grid .service-card'));
  if (!allCards.length) return;

  const config = [
    { idx: 0, dir: 'slide-up-card',          gateHero: true  },
    { idx: 1, dir: 'slide-up-card',          gateHero: true  },
    { idx: 2, dir: 'slide-direction--left',  gateHero: false }, // AI Infrastructure Engineering
    { idx: 3, dir: 'slide-direction--right', gateHero: false }, // OpenClaw Setup
    { idx: 4, dir: 'slide-direction--up',    gateHero: false }, // AI Strategy & Audit
    { idx: 5, dir: 'slide-direction--up',    gateHero: false }  // Website Engineering
  ];

  // Capture intended document-relative top BEFORE applying transforms.
  const entries = config
    .map(c => ({ card: allCards[c.idx], dir: c.dir, gateHero: c.gateHero }))
    .filter(e => e.card)
    .map(e => {
      const rect = e.card.getBoundingClientRect();
      return Object.assign(e, { docTop: rect.top + window.scrollY });
    });

  // Begin-Your-Engagement CTA — sits below the grid, gets the same scroll
  // -position reveal treatment with its own dramatic class.
  const ctaBtn = document.querySelector('.services-grid--tiers ~ .hero-buttons')
              || document.querySelectorAll('.hero-buttons')[document.querySelectorAll('.hero-buttons').length - 1];
  if (ctaBtn) {
    const rect = ctaBtn.getBoundingClientRect();
    entries.push({
      card: ctaBtn,
      dir: 'services-cta-btn',
      gateHero: false,
      docTop: rect.top + window.scrollY
    });
  }

  // Apply direction classes (elements now visually off-screen / shifted).
  entries.forEach(e => e.card.classList.add(e.dir));

  let heroDone = false;
  let userScrolled = false;
  setTimeout(() => { heroDone = true; tick(); }, 2100);

  function tick() {
    if (!userScrolled) return;
    const triggerLine = window.scrollY + window.innerHeight * 0.80;
    entries.forEach(e => {
      if (e.card.classList.contains('is-revealed')) return;
      if (e.gateHero && !heroDone) return;
      if (triggerLine > e.docTop) {
        e.card.classList.add('is-revealed');
      }
    });
  }

  window.addEventListener('scroll', () => {
    if (!userScrolled && window.scrollY > 60) userScrolled = true;
    tick();
  }, { passive: true });

  // Re-measure on resize so layout shifts don't strand the trigger line.
  window.addEventListener('resize', () => {
    entries.forEach(e => {
      if (e.card.classList.contains('is-revealed')) return;
      // We can't get the un-transformed rect now, but the layout position
      // (offsetTop walk) is unaffected by transforms.
      let top = 0, el = e.card;
      while (el) { top += el.offsetTop; el = el.offsetParent; }
      e.docTop = top;
    });
  }, { passive: true });
}

/* Sparkle motes that twinkle around the hero logo */
/* Magnetic 3D tilt on the hero logo */
function bindHeroLogoTilt(stage) {
  if (TOUCH || REDUCED) return;
  const MAX = 12; // deg
  let raf = 0, tx = 0, ty = 0, ts = 1;
  let cx = 0, cy = 0;
  stage.addEventListener('mouseenter', () => {
    stage.classList.add('tilting');
  });
  stage.addEventListener('mousemove', e => {
    const r = stage.getBoundingClientRect();
    cx = (e.clientX - r.left) / r.width  - 0.5; // -0.5..0.5
    cy = (e.clientY - r.top)  / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  stage.addEventListener('mouseleave', () => {
    stage.classList.remove('tilting');
    stage.style.removeProperty('--tilt-x');
    stage.style.removeProperty('--tilt-y');
    stage.style.removeProperty('--tilt-s');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  function apply() {
    raf = 0;
    tx = (-cy * MAX).toFixed(2);
    ty = ( cx * MAX).toFixed(2);
    ts = 1.04;
    stage.style.setProperty('--tilt-x', tx + 'deg');
    stage.style.setProperty('--tilt-y', ty + 'deg');
    stage.style.setProperty('--tilt-s', ts);
  }
}

/* ORBITING FIELD — disabled (golden particles around the hero logo removed). */
function initOrbitField() {
  return;
}

/* AMBIENT FLOATING PARTICLES — drift upward on every page EXCEPT the
   home page (the home hero owns its own visual field). Sit BEHIND content. */
function initAmbientParticles() {
  if (REDUCED) return;
  if (document.body.classList.contains('home-page')) return;
  if (document.querySelector('.ambient-particles')) return;
  const layer = document.createElement('div');
  layer.className = 'ambient-particles';
  layer.setAttribute('aria-hidden', 'true');
  const COUNT = 72;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('span');
    p.className = 'ambient-particle';
    const size = 1.6 + Math.random() * 2.0;      // 1.6–3.6px (smaller, finer)
    const dur  = 32 + Math.random() * 28;        // 32–60s (slower drift)
    const del  = -Math.random() * 55;
    const sway = (Math.random() - 0.5) * 80;
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.opacity = (0.28 + Math.random() * 0.22).toFixed(2);
    p.style.animationDuration = dur + 's';
    p.style.animationDelay = del + 's';
    p.style.setProperty('--sway', sway + 'px');
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
}

/* FAQ accordion */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(o => o.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* Contact form */
function initForm() {
  const f = document.getElementById('contactForm');
  if (!f) return;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const ok = document.getElementById('formSuccess');
    if (ok) ok.classList.add('visible');
    f.querySelectorAll('input, textarea').forEach(el => el.value = '');
    setTimeout(() => ok && ok.classList.remove('visible'), 7000);
  });
}

/* Magnetic buttons */
function initMagneticButtons() {
  if (TOUCH || REDUCED) return;
  document.querySelectorAll('.btn, .btn-nav, .btn-submit').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top  - r.height / 2;
      btn.style.transform = `translate(${x * 0.12}px, ${y * 0.18}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

/* Footer year */
function initFooterYear() {
  const y = document.getElementById('footYear');
  if (y) y.textContent = new Date().getFullYear();
}

/* SCROLL-REVEAL: Why Choose Illuminati AI stat cards on /how-it-works
   When .whychoose-section is ~30% into the viewport, stagger .is-revealed
   onto each .stat 80ms apart (left-to-right). The CSS .stat.is-revealed
   rule handles the fade/slide transition + cascades the inner h4 and p.
   Plays exactly once (unobserve on first intersect).

   Also clears any inline styles left by the previous GSAP gsap.set() so
   the CSS reveal wins cleanly, and counts up the [data-count] numbers
   from 0 to their target value via requestAnimationFrame. */
(function statCardsRevealOnScroll() {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'how-it-works.html' && path !== 'how-it-works') return;

  function clearGsapInline(el) {
    if (!el) return;
    el.style.opacity = '';
    el.style.transform = '';
    el.style.filter = '';
  }

  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    if (!isFinite(target)) return;
    const suffix = el.getAttribute('data-suffix') || '';
    const current = (el.textContent || '').trim();
    if (current === target + suffix) return; // already counted up, skip

    const duration = 850;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }

  function revealStat(stat) {
    clearGsapInline(stat);
    clearGsapInline(stat.querySelector('.stat-emoji'));
    clearGsapInline(stat.querySelector('.stat-num'));
    clearGsapInline(stat.querySelector('h4'));
    clearGsapInline(stat.querySelector('p'));
    stat.classList.add('is-revealed');
    // The .stat-num fades in at 0.20s via CSS transition-delay. Wait for
    // that visual reveal before kicking off the count-up so the digits
    // don't tick away invisibly behind opacity:0.
    const num = stat.querySelector('.stat-num[data-count]');
    if (num) setTimeout(() => animateCount(num), 200);
  }

  function revealAllStaggered() {
    document.querySelectorAll('.stat').forEach((stat, i) => {
      setTimeout(() => revealStat(stat), i * 80);
    });
  }

  if ('IntersectionObserver' in window) {
    // Observe the .stats-grid (NOT the whole .whychoose-section) so the
    // reveal only fires after the user has scrolled past the headline +
    // subheadline and the grid itself is entering the viewport.
    // rootMargin -10% on the bottom means we wait until the grid is
    // clearly in view, not just at the very edge.
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          obs.unobserve(entry.target);
          revealAllStaggered();
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    const checkGrid = setInterval(() => {
      const grid = document.querySelector('.stats-grid');
      if (grid) {
        clearInterval(checkGrid);
        observer.observe(grid);
      }
    }, 100);
  } else {
    // Browsers without IntersectionObserver: reveal after a short delay.
    setTimeout(revealAllStaggered, 1500);
  }
})();

