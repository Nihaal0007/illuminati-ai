/* Razorpay checkout flow for Illuminati AI
   1. User clicks Proceed to Checkout
   2. Customer-details modal collects name/email/phone (validated)
   3. /api/create-order is called with cart + customer details
   4. Razorpay modal opens (prefilled with the customer details)
   5. /api/verify-payment confirms signature on success

   GATED by window.ILLUMINATI_FLAGS.CHECKOUT_ENABLED (see feature-flags.js
   + DISABLED_FEATURES.md). When the flag is false the IIFE returns early
   after exporting a no-op IlluminatiCheckout.start so any button click
   that reaches start() is a silent no-op instead of an error. */

(function() {
  if (!(window.ILLUMINATI_FLAGS && window.ILLUMINATI_FLAGS.CHECKOUT_ENABLED)) {
    window.IlluminatiCheckout = { start: function () {} };
    return;
  }


  // ── Customer details modal ─────────────────────────────────────────────────
  // Returns a Promise that resolves with { name, email, phone } on submit,
  // or rejects with { cancelled: true } if dismissed.
  function showCustomerModal() {
    return new Promise((resolve, reject) => {
      // Remove any stale instance
      const stale = document.getElementById('customerModal');
      if (stale) stale.remove();

      const modal = document.createElement('div');
      modal.id = 'customerModal';
      modal.className = 'customer-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'customerModalTitle');
      modal.innerHTML = `
        <div class="customer-modal-overlay" data-close></div>
        <div class="customer-modal-card">
          <button type="button" class="customer-modal-close" aria-label="Cancel" data-close>&times;</button>
          <header class="customer-modal-header">
            <h2 id="customerModalTitle">Almost there!</h2>
            <p>Enter your details to continue.</p>
          </header>
          <form class="customer-modal-form" novalidate>
            <div class="customer-field">
              <label for="cm_name">Full Name</label>
              <input type="text" id="cm_name" name="name" autocomplete="name" required minlength="2" placeholder="Your full name">
              <span class="customer-field-error" data-error-for="name"></span>
            </div>
            <div class="customer-field">
              <label for="cm_email">Email</label>
              <input type="email" id="cm_email" name="email" autocomplete="email" required placeholder="you@example.com">
              <span class="customer-field-error" data-error-for="email"></span>
            </div>
            <div class="customer-field">
              <label for="cm_phone">Phone</label>
              <input type="tel" id="cm_phone" name="phone" autocomplete="tel" required placeholder="10-digit mobile (optional +91)">
              <span class="customer-field-error" data-error-for="phone"></span>
            </div>
            <div class="customer-modal-actions">
              <button type="button" class="customer-btn-secondary" data-close>Cancel</button>
              <button type="submit" class="customer-btn-primary">Continue Payment</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      document.body.classList.add('customer-modal-open');

      // Animate in
      requestAnimationFrame(() => modal.classList.add('open'));

      // Focus first field
      const nameInput = modal.querySelector('#cm_name');
      const emailInput = modal.querySelector('#cm_email');
      const phoneInput = modal.querySelector('#cm_phone');
      setTimeout(() => nameInput && nameInput.focus(), 220);

      // Validation helpers
      function setError(field, message) {
        const span = modal.querySelector(`[data-error-for="${field}"]`);
        const input = modal.querySelector(`[name="${field}"]`);
        if (span) span.textContent = message || '';
        if (input) input.classList.toggle('has-error', !!message);
      }

      function validate() {
        let valid = true;
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phoneRaw = phoneInput.value.trim();
        const phoneDigits = phoneRaw.replace(/^\+?91/, '').replace(/\D/g, '');

        if (name.length < 2) {
          setError('name', 'Please enter your full name (min 2 characters).');
          valid = false;
        } else { setError('name', ''); }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError('email', 'Please enter a valid email address.');
          valid = false;
        } else { setError('email', ''); }

        if (phoneDigits.length !== 10) {
          setError('phone', 'Phone must be 10 digits (optional +91 prefix).');
          valid = false;
        } else { setError('phone', ''); }

        return { valid, name, email, phone: phoneDigits };
      }

      // Re-validate live after first attempt
      let triedSubmit = false;
      [nameInput, emailInput, phoneInput].forEach(inp => {
        inp.addEventListener('input', () => {
          if (triedSubmit) validate();
        });
      });

      function closeModal(reasonCancelled) {
        document.removeEventListener('keydown', escListener);
        modal.classList.remove('open');
        document.body.classList.remove('customer-modal-open');
        setTimeout(() => modal.remove(), 250);
        if (reasonCancelled) reject({ cancelled: true });
      }

      function escListener(e) {
        if (e.key === 'Escape') closeModal(true);
      }
      document.addEventListener('keydown', escListener);

      // Close handlers (overlay click, X button, Cancel button)
      modal.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          closeModal(true);
        });
      });

      // Submit
      modal.querySelector('.customer-modal-form').addEventListener('submit', (e) => {
        e.preventDefault();
        triedSubmit = true;
        const { valid, name, email, phone } = validate();
        if (!valid) {
          // Focus first invalid field
          const firstError = modal.querySelector('input.has-error');
          if (firstError) firstError.focus();
          return;
        }
        // Lock the submit button while caller does the network call
        const submitBtn = modal.querySelector('.customer-btn-primary');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing Payment...';
        }
        // Resolve, but DON'T remove the modal — the caller closes it after Razorpay opens
        // so the user can't double-submit during the create-order roundtrip.
        resolve({
          name,
          email,
          phone,
          _close: () => {
            modal.classList.remove('open');
            document.body.classList.remove('customer-modal-open');
            document.removeEventListener('keydown', escListener);
            setTimeout(() => modal.remove(), 250);
          }
        });
      });
    });
  }

  // ── Checkout flow ──────────────────────────────────────────────────────────
  function resetCheckoutBtn() {
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Proceed to Checkout';
    }
  }

  async function startCheckout() {
    if (!window.IlluminatiCart) {
      console.error('Cart not loaded');
      return;
    }

    const cart = window.IlluminatiCart.getCart();
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    // Step 1: collect customer details (modal)
    let customer;
    try {
      customer = await showCustomerModal();
    } catch (e) {
      // user cancelled — silently abort
      return resetCheckoutBtn();
    }

    const totalRupees = window.IlluminatiCart.getTotal();
    const totalPaise = totalRupees * 100;
    const receipt = `cart_${Date.now()}`;
    const itemsList = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
    const productName = cart.length === 1
      ? `${cart[0].name}${cart[0].quantity > 1 ? ' x' + cart[0].quantity : ''}`
      : itemsList;

    try {
      const checkoutBtn = document.getElementById('cartCheckoutBtn');
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Creating order...';
      }

      // Step 2: create order on backend (now with customer details)
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPaise,
          currency: 'INR',
          receipt: receipt,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          product_name: productName
        })
      });

      if (!orderResponse.ok) {
        const errBody = await orderResponse.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Close the customer modal now that we have the order
      if (typeof customer._close === 'function') customer._close();

      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Checkout';
      }

      // Step 3: open Razorpay modal (prefilled with the details we just collected)
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Illuminati AI',
        description: itemsList,
        image: '/assets/logo.png',
        theme: {
          color: '#D4A437'
        },
        method: {
          card: true,
          netbanking: true,
          upi: true,
          wallet: true,
          emi: false,
          paylater: false
        },
        handler: async function(response) {
          // Step 4: verify payment on backend
          await verifyPayment(response);
        },
        modal: {
          ondismiss: function() {
            console.log('Checkout dismissed by user');
            resetCheckoutBtn();
          }
        },
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone
        },
        notes: {
          items: itemsList,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone
        }
      };

      const rzp = new Razorpay(options);

      rzp.on('payment.failed', function(response) {
        showResult(false, 'Payment failed: ' + (response.error && response.error.description ? response.error.description : 'Unknown error'));
      });

      rzp.open();

    } catch (error) {
      console.error('Checkout error:', error);
      // Close the customer modal if it's still open
      if (typeof customer._close === 'function') customer._close();
      resetCheckoutBtn();
      showResult(false, (error && error.message) || 'Failed to start checkout. Please try again.');
    }
  }

  async function verifyPayment(response) {
    try {
      const verifyResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
      });

      const data = await verifyResponse.json();

      if (data.verified) {
        window.IlluminatiCart.clearCart();
        window.IlluminatiCart.closeDrawer();
        showResult(true, 'Payment successful! Thank you for your order.');
      } else {
        showResult(false, 'Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      showResult(false, 'Could not verify payment. Please contact support with your payment ID: ' + response.razorpay_payment_id);
    }
  }

  function showResult(success, message) {
    const existing = document.querySelector('.payment-result-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'payment-result-modal ' + (success ? 'success' : 'error');
    modal.innerHTML = `
      <div class="payment-result-overlay"></div>
      <div class="payment-result-card">
        <div class="payment-result-icon">
          ${success
            ? '<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="9 12 12 15 16 9"></polyline></svg>'
            : '<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'}
        </div>
        <h3>${success ? 'Payment Successful!' : 'Payment Failed'}</h3>
        <p>${message}</p>
        <button class="payment-result-close">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => modal.classList.add('show'), 10);

    modal.querySelector('.payment-result-close').addEventListener('click', () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    });
    modal.querySelector('.payment-result-overlay').addEventListener('click', () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    });
  }

  // Expose API
  window.IlluminatiCheckout = {
    start: startCheckout
  };
})();
