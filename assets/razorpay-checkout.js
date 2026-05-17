/* Razorpay checkout flow for Illuminati AI
   Calls /api/create-order, opens Razorpay modal,
   then calls /api/verify-payment on success. */

(function() {
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

    const totalRupees = window.IlluminatiCart.getTotal();
    const totalPaise = totalRupees * 100;

    // Build receipt with cart contents
    const receipt = `cart_${Date.now()}`;
    const itemsList = cart.map(i => `${i.name} x${i.quantity}`).join(', ');

    try {
      // Show loading state on checkout button
      const checkoutBtn = document.getElementById('cartCheckoutBtn');
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Creating order...';
      }

      // Step 1: Create order via backend
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPaise,
          currency: 'INR',
          receipt: receipt
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();

      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Checkout';
      }

      // Step 2: Open Razorpay modal
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
          // Step 3: Verify payment on backend
          await verifyPayment(response);
        },
        modal: {
          ondismiss: function() {
            console.log('Checkout dismissed by user');
            if (checkoutBtn) {
              checkoutBtn.disabled = false;
              checkoutBtn.textContent = 'Proceed to Checkout';
            }
          }
        },
        prefill: {
          // Optional: pre-fill if you have user info
        },
        notes: {
          items: itemsList
        }
      };

      const rzp = new Razorpay(options);

      rzp.on('payment.failed', function(response) {
        showResult(false, 'Payment failed: ' + response.error.description);
      });

      rzp.open();

    } catch (error) {
      console.error('Checkout error:', error);
      const checkoutBtn = document.getElementById('cartCheckoutBtn');
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Checkout';
      }
      showResult(false, 'Failed to start checkout. Please try again.');
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
        // Success! Clear cart and show success
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
    // Remove existing
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
