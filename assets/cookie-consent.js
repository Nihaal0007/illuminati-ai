// ─── COOKIE CONSENT MANAGEMENT ─────────────────────────────
(function() {
  const CONSENT_KEY = 'illuminati_ai_cookie_consent';
  const CONSENT_VERSION = '1.0';

  function getConsent() {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  function setConsent(preferences) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        ...preferences
      }));
    } catch (e) {
      console.log('Could not save cookie preferences');
    }
  }

  function showBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.style.display = 'block';
  }

  function hideBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.style.display = 'none';
  }

  window.acceptAllCookies = function() {
    setConsent({
      necessary: true,
      analytics: true,
      marketing: true
    });
    hideBanner();
    loadOptionalScripts(true, true);
  };

  window.manageCookies = function() {
    const modal = document.getElementById('cookieModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeCookieModal = function() {
    const modal = document.getElementById('cookieModal');
    if (modal) modal.style.display = 'none';
  };

  window.closeCookieBanner = function() {
    // Dismiss without engaging: persist "necessary only" so the banner
    // doesn't reappear on every page load, but no analytics/marketing consent is granted.
    setConsent({
      necessary: true,
      analytics: false,
      marketing: false
    });
    hideBanner();
    closeCookieModal();
    loadOptionalScripts(false, false);
  };

  window.savePreferences = function() {
    const analytics = document.getElementById('analyticsToggle').checked;
    const marketing = document.getElementById('marketingToggle').checked;

    setConsent({
      necessary: true,
      analytics: analytics,
      marketing: marketing
    });

    closeCookieModal();
    hideBanner();
    loadOptionalScripts(analytics, marketing);
  };

  function loadOptionalScripts(analytics, marketing) {
    // Future: Load Google Analytics if analytics consent given
    // Future: Load marketing/ad pixels if marketing consent given
    console.log('Cookie consent saved. Analytics:', analytics, 'Marketing:', marketing);
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    const consent = getConsent();
    if (!consent || consent.version !== CONSENT_VERSION) {
      showBanner();
    } else {
      loadOptionalScripts(consent.analytics, consent.marketing);
    }
  });
})();
