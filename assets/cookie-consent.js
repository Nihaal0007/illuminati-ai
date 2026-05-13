// ─── COOKIE CONSENT BANNER ───

const COOKIE_CONSENT_KEY = 'illuminati_cookie_consent';
const COOKIE_CONSENT_EXPIRY_DAYS = 365;

// Check if user has already made a choice
function hasUserConsented() {
  const consent = getStoredConsent();
  return consent !== null;
}

// Get stored consent from localStorage
function getStoredConsent() {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);

    // Check if expired
    if (data.expiry && new Date().getTime() > data.expiry) {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      return null;
    }

    return data;
  } catch (e) {
    return null;
  }
}

// Store consent in localStorage
function storeConsent(necessary, analytics, marketing) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + COOKIE_CONSENT_EXPIRY_DAYS);

  const consent = {
    necessary: necessary,
    analytics: analytics,
    marketing: marketing,
    timestamp: new Date().toISOString(),
    expiry: expiryDate.getTime()
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

  // Trigger analytics/marketing scripts if accepted
  if (analytics) {
    enableAnalyticsCookies();
  }
  if (marketing) {
    enableMarketingCookies();
  }
}

// Accept all cookies
function acceptAllCookies() {
  storeConsent(true, true, true);
  hideCookieBanner();
}

// Reject all non-essential cookies
function rejectAllCookies() {
  storeConsent(true, false, false);
  denyAnalyticsCookies();   // explicit deny signal to gtag (Consent Mode v2)
  hideCookieBanner();
}

// Hide the banner
function hideCookieBanner() {
  const banner = document.getElementById('cookie-consent-banner');
  if (banner) {
    banner.style.opacity = '0';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 300);
  }
}

// Show the banner
function showCookieBanner() {
  const banner = document.getElementById('cookie-consent-banner');
  if (banner) {
    banner.style.display = 'block';
    setTimeout(() => {
      banner.style.opacity = '1';
    }, 100);
  }
}

// GA4 was loaded in <head> with analytics_storage:'denied' (Consent Mode v2).
// Flipping it to 'granted' here lets gtag start dropping the _ga cookie and
// sending hits. Safe to call multiple times (idempotent).
function enableAnalyticsCookies() {
  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      'analytics_storage': 'granted'
    });
  }
}

// Explicit deny signal — called from rejectAllCookies(). Ensures any prior
// 'granted' state (e.g. from a previous accepted visit) is flipped back to
// denied, so gtag stops setting cookies / sending hits.
function denyAnalyticsCookies() {
  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      'analytics_storage': 'denied'
    });
  }
}

function enableMarketingCookies() {
  // When ready to add marketing pixels (Meta, LinkedIn, etc.), initialize them here
  // Example: fbq('consent', 'grant');
  console.log('Marketing cookies enabled');
}

// Initialize banner on page load
document.addEventListener('DOMContentLoaded', function() {
  if (!hasUserConsented()) {
    showCookieBanner();
  } else {
    // User already consented - apply their previous choices
    const consent = getStoredConsent();
    if (consent && consent.analytics) {
      enableAnalyticsCookies();
    }
    if (consent && consent.marketing) {
      enableMarketingCookies();
    }
  }
});
