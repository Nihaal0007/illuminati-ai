/* =============================================================
   ILLUMINATI AI — STEP STACK + SPREAD (How It Works only)
   Four-phase scroll-pinned animation:
     0%–25%   : Card 1 rises from below to centre
     25%–50%  : Card 2 rises to centre, Card 1 sinks back
     50%–75%  : Card 3 rises to centre, Cards 1 & 2 sink back
     75%–100% : All three cards spread outward into a clean
                horizontal row of compact boxes
   Text inside each card cascades in (label → heading char-mask
   → divider grow → description per-word fade) once the card
   has reached 85% of its slide-up.
============================================================= */
(function () {
  'use strict';

  const section = document.querySelector('.how-it-works-pinned');
  if (!section) return;
  const cards = Array.from(section.querySelectorAll('.step-card'));
  if (!cards.length) return;
  const container = section.querySelector('.card-stack-container');

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  /* ---------- Heading: split into char wrappers ---------- */
  function splitHeading(el) {
    if (!el || el.dataset.maskSplit) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    el.setAttribute('aria-label', text);
    el.dataset.maskSplit = '1';
    el.textContent = '';
    const inner = document.createElement('span');
    inner.setAttribute('aria-hidden', 'true');

    let charIdx = 0;
    const tokens = text.split(/(\s+)/);
    for (const tok of tokens) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) {
        const w = document.createElement('span');
        w.className = 'char-wrapper';
        const c = document.createElement('span');
        c.className = 'char';
        // Use &nbsp; — a pure space inside an inline-block .char span
        // collapses to zero width, which is why "Discovery&Cognitive"
        // looked smashed together. NBSP forces the space to render.
        c.innerHTML = '&nbsp;';
        c.style.transitionDelay = (0.15 + charIdx * 0.025).toFixed(3) + 's';
        w.appendChild(c);
        inner.appendChild(w);
        charIdx++;
      } else {
        const word = document.createElement('span');
        word.className = 'word-wrapper';
        for (const ch of tok) {
          const w = document.createElement('span');
          w.className = 'char-wrapper';
          const c = document.createElement('span');
          c.className = 'char';
          c.textContent = ch;
          c.style.transitionDelay = (0.15 + charIdx * 0.025).toFixed(3) + 's';
          w.appendChild(c);
          word.appendChild(w);
          charIdx++;
        }
        inner.appendChild(word);
      }
    }
    el.appendChild(inner);
  }

  /* ---------- Description: split into words for fade-up ---------- */
  function splitDescription(el) {
    if (!el || el.dataset.wordSplit) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    el.setAttribute('aria-label', text);
    el.dataset.wordSplit = '1';
    el.textContent = '';
    const inner = document.createElement('span');
    inner.setAttribute('aria-hidden', 'true');

    const words = text.split(/(\s+)/);
    let wordIdx = 0;
    for (const w of words) {
      if (!w) continue;
      if (/^\s+$/.test(w)) {
        inner.appendChild(document.createTextNode(w));
      } else {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = w;
        span.style.transitionDelay = (0.45 + wordIdx * 0.04).toFixed(3) + 's';
        inner.appendChild(span);
        wordIdx++;
      }
    }
    el.appendChild(inner);
  }

  cards.forEach(card => {
    splitHeading(card.querySelector('.step-heading.reveal-mask'));
    splitDescription(card.querySelector('.step-description'));
  });

  function revealCardText(card) {
    if (card.dataset.textRevealed) return;
    card.dataset.textRevealed = '1';
    card.classList.add('is-text-revealed');
    const heading = card.querySelector('.reveal-mask');
    if (heading) heading.classList.add('is-revealed');
  }

  /* ---------- Reduced motion ---------- */
  if (REDUCED) {
    cards.forEach(c => c.classList.add('is-text-revealed'));
    return;
  }

  /* ---------- Mobile fallback: simple intersection-triggered reveal ---------- */
  if (isMobile()) {
    section.classList.add('mobile-stacked');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealCardText(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    cards.forEach(c => obs.observe(c));
    return;
  }

  /* ---------- Desktop / tablet: scroll-pinned 4-phase ---------- */
  const STACK_END = 0.75;        // 0..0.75 = stack phase, 0.75..1 = spread

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  let rafId = 0;

  function update() {
    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight;
    const vh = window.innerHeight;
    const scrollableDistance = Math.max(1, sectionHeight - vh);
    const scrolled = Math.max(0, -rect.top);
    const progress = clamp01(scrolled / scrollableDistance);

    // Card 0 entrance progress — based on the section's pre-pin scroll.
    // 0 when the section is fully below the viewport, 1 when its top edge
    // hits the top of the viewport (about to pin). This gives card 0 a
    // visible rise + fade animation triggered the moment the user scrolls
    // past the subheadline, with no dead space afterwards.
    const card0Entrance = clamp01((vh - rect.top) / vh);

    // Final-row geometry (depends on actual rendered card width — handles tablet 320 / desktop 380)
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = 40;
    const totalRowWidth = cardWidth * 3 + gap * 2;
    const startX = -totalRowWidth / 2 + cardWidth / 2;

    const spread = clamp01((progress - STACK_END) / (1 - STACK_END));

    cards.forEach((card, index) => {
      const cardStart = (index / 3) * STACK_END;
      const cardEnd   = ((index + 1) / 3) * STACK_END;

      let stackProgress;
      if (progress < cardStart) stackProgress = 0;
      else if (progress > cardEnd) stackProgress = 1;
      else stackProgress = (progress - cardStart) / (cardEnd - cardStart);

      // How many "phases" past this card's landing within the stack window (0..2)
      const phasesPast = Math.max(0, Math.min(
        cards.length - 1 - index,
        (progress - cardEnd) / (STACK_END / 3)
      ));

      // Card 0 rises during pre-pin (as user scrolls past the subhead) so
      // it has fully landed by the time the section pins — no empty band
      // afterwards. Cards 1 and 2 keep the original in-pinned rise.
      const slideY = index === 0
        ? (1 - card0Entrance) * (vh * 0.55)
        : (1 - stackProgress) * vh;

      // Stack-state sink (vertical offset, scale, opacity) while older cards are behind
      const stackSinkY      = -12 * phasesPast;
      const stackSinkScale  = 1 - 0.03 * phasesPast;
      const stackSinkOpAdj  = Math.max(0.4, 1 - 0.2 * phasesPast);

      // Spread phase: lerp sink offset → 0, scale → 1, opacity → 1, X → final row position
      const finalX = startX + index * (cardWidth + gap);
      const x = finalX * spread;
      const sinkY_now = stackSinkY * (1 - spread);
      const scale_now = stackSinkScale + (1 - stackSinkScale) * spread;
      const opacity_now = index === 0
        ? card0Entrance * (stackSinkOpAdj + (1 - stackSinkOpAdj) * spread)
        : (stackProgress > 0
            ? Math.min(1, stackProgress) * (stackSinkOpAdj + (1 - stackSinkOpAdj) * spread)
            : 0);

      const y = slideY + sinkY_now;
      // Cards are positioned at top:50%, left:50%; baseline transform = translate(-50%, -50%).
      // We add per-card x/y on top of that baseline.
      card.style.transform =
        `translate(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px)) scale(${scale_now.toFixed(3)})`;
      card.style.opacity = opacity_now.toFixed(3);
      card.style.zIndex = String(index + 1);

      if (stackProgress >= 0.85) revealCardText(card);
    });
  }

  function onScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = 0; update(); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
