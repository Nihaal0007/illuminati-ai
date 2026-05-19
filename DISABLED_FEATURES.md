# Disabled features

The cart UI, Razorpay checkout flow, and the email-automation surface area
they trigger are currently **disabled on the frontend** of
[illuminatiai.tech](https://illuminatiai.tech). All backend code, env
vars, and the Razorpay-dashboard webhook are **untouched** — the only
thing turned off is the UI surface that lets a visitor reach a payment.

## Why it was disabled

The product (Creator OS) isn't open for paid sign-ups yet. We didn't want
to take the cart / Razorpay code out of the repo (writing it took hours),
so we put it behind a single feature-flag file. Flipping two booleans
restores everything to exactly the state it was in before this change.

## What's disabled

| Surface | How it's disabled |
|---|---|
| Nav cart icon (`#navCartBtn`) on all 12 pages | `.cart-only` class hidden by CSS when `<html data-cart-enabled="false">` |
| "Add to Cart" button on `products.html` (Creator OS card) | `.checkout-only` class hidden by CSS when `<html data-checkout-enabled="false">` |
| Cart drawer (`#cartDrawer`) | Never created — `cart.js` returns early before its DOMContentLoaded wire-up runs |
| Customer-details modal | Never created — `razorpay-checkout.js` returns early so `IlluminatiCheckout.start` is a no-op |
| Razorpay payment modal | Cannot be opened (the `start()` call above is a no-op) |
| Customer + owner emails via Resend | Never sent — they only fire from the `razorpay-webhook` function on a `payment.captured` event, and there can be no `payment.captured` because no order is created |

## What stays intact

- `assets/cart.js` — code is intact, just returns early and exports a no-op API
- `assets/razorpay-checkout.js` — same pattern
- `assets/styles.css` — all cart-drawer / customer-modal / payment-result styles remain (harmless when their elements are never inserted)
- `netlify/functions/create-order.js` — unchanged
- `netlify/functions/verify-payment.js` — unchanged
- `netlify/functions/razorpay-webhook.js` — unchanged
- `https://checkout.razorpay.com/v1/checkout.js` script tag — left in `<head>` of all 12 pages (loads but is never used)
- Netlify env vars (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`, `OWNER_EMAIL`) — unchanged
- Razorpay-dashboard webhook (`https://illuminatiai.tech/api/razorpay-webhook`) — unchanged
- **Creator OS card** on `/products` still shows the name, tagline, description, and **₹10,000 / month** price — only the Add-to-Cart button is hidden

## How to re-enable (one flag flip)

Edit `assets/feature-flags.js` and set **both** flags to `true`:

```js
window.ILLUMINATI_FLAGS = {
  CHECKOUT_ENABLED: true,
  CART_UI_ENABLED:  true
};
```

That's it. The `<html>` data attributes flip, the CSS `display: none !important` rule stops matching, and `cart.js` + `razorpay-checkout.js` reach their normal init paths on next page load. Commit + push, Netlify auto-deploys, done.

## File map (what this disable touched)

```
assets/feature-flags.js        ← NEW. Sets ILLUMINATI_FLAGS + <html> attrs.
assets/cart.js                  ← Wrapped init in CART_UI_ENABLED check.
assets/razorpay-checkout.js     ← Wrapped init in CHECKOUT_ENABLED check.
assets/styles.css               ← Added .cart-only / .checkout-only display:none rule.
*.html (×12)                    ← <script src="assets/feature-flags.js"> in <head>,
                                  + cart-only class on the navCartBtn.
products.html                   ← Additionally added checkout-only class to the
                                  Add-to-Cart button on the Creator OS card.
DISABLED_FEATURES.md            ← This file.
```

---

## RESTORE PROMPT (paste this verbatim when you want it back)

> RESTORE PROMPT: Re-enable cart, Razorpay checkout, and email automation
> on illuminatiai.tech frontend.
>
> In assets/feature-flags.js, change both flags to true:
>   CHECKOUT_ENABLED: true
>   CART_UI_ENABLED: true
>
> Verify no other changes are needed (the backend code is already intact).
>
> Commit + push with message "Re-enable cart and Razorpay checkout".
>
> Tell me when deployed.
