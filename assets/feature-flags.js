// Global feature flags for illuminatiai.tech
//
// Flip these to true to re-enable the cart / Razorpay checkout / email
// automation on the frontend. Everything else (backend Netlify functions,
// env vars, Razorpay dashboard webhook, files in /assets, cart drawer
// HTML/CSS) stays intact — only the UI surfaces and JS init are gated.
//
// See DISABLED_FEATURES.md at the repo root for the full restoration
// procedure and the exact one-prompt restore command.

window.ILLUMINATI_FLAGS = {
  CHECKOUT_ENABLED: false,  // Razorpay modal, customer details modal,
                            // "Add to Cart" buttons → /api/create-order
  CART_UI_ENABLED:  false   // Nav cart icon, cart drawer, cart badge
};

// Reflect the flag values onto <html> so CSS can hide marked elements
// (.cart-only, .checkout-only) before first paint — no flash.
document.documentElement.setAttribute(
  'data-checkout-enabled',
  window.ILLUMINATI_FLAGS.CHECKOUT_ENABLED ? 'true' : 'false'
);
document.documentElement.setAttribute(
  'data-cart-enabled',
  window.ILLUMINATI_FLAGS.CART_UI_ENABLED ? 'true' : 'false'
);
