/* Cart state management for Illuminati AI
   Uses localStorage to persist across page loads.
   Exposes window.IlluminatiCart for other scripts.

   GATED by window.ILLUMINATI_FLAGS.CART_UI_ENABLED (see feature-flags.js +
   DISABLED_FEATURES.md). When the flag is false the IIFE returns early
   after exporting a no-op IlluminatiCart so any external caller doesn't
   crash. */

(function() {
  if (!(window.ILLUMINATI_FLAGS && window.ILLUMINATI_FLAGS.CART_UI_ENABLED)) {
    window.IlluminatiCart = {
      getCart:       function () { return []; },
      addItem:       function () {},
      removeItem:    function () {},
      updateQuantity:function () {},
      clearCart:     function () {},
      getTotal:      function () { return 0; },
      getItemCount:  function () { return 0; },
      openDrawer:    function () {},
      closeDrawer:   function () {}
    };
    return;
  }

  const CART_KEY = 'illuminati_cart_v3';

  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateBadge();
  }

  function addItem(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);

    // If product has maxQuantity of 1, prevent adding more
    if (existing && product.maxQuantity === 1) {
      showToast(`${product.name} is already in your cart`);
      return;
    }

    if (existing) {
      // Check maxQuantity if defined
      if (product.maxQuantity && existing.quantity >= product.maxQuantity) {
        showToast(`Maximum quantity reached for ${product.name}`);
        return;
      }
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, maxQuantity: product.maxQuantity || null });
    }
    saveCart(cart);
    showToast(`${product.name} added to cart`);
  }

  function removeItem(productId) {
    const cart = getCart().filter(item => item.id !== productId);
    saveCart(cart);
    renderDrawer();
  }

  function updateQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
      if (quantity <= 0) {
        return removeItem(productId);
      }
      // Cap at maxQuantity if defined
      if (item.maxQuantity && quantity > item.maxQuantity) {
        showToast(`Maximum quantity reached for ${item.name}`);
        return;
      }
      item.quantity = quantity;
      saveCart(cart);
      renderDrawer();
    }
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateBadge();
    renderDrawer();
  }

  function getTotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function getItemCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  function updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getItemCount();
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.cart-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function renderDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer) return;

    const cart = getCart();
    const total = getTotal();

    if (cart.length === 0) {
      drawer.querySelector('.cart-drawer-body').innerHTML = `
        <div class="cart-empty">
          <p>Your cart is empty</p>
        </div>
      `;
      drawer.querySelector('.cart-drawer-footer').style.display = 'none';
      return;
    }

    drawer.querySelector('.cart-drawer-footer').style.display = 'block';

    const itemsHtml = cart.map(item => {
      const atMaxQuantity = item.maxQuantity && item.quantity >= item.maxQuantity;
      return `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p class="cart-item-price">₹${item.price.toLocaleString('en-IN')} / month</p>
          </div>
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}"
                    ${atMaxQuantity ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>+</button>
            <button class="remove-btn" data-id="${item.id}" aria-label="Remove">×</button>
          </div>
        </div>
      `;
    }).join('');

    drawer.querySelector('.cart-drawer-body').innerHTML = itemsHtml;
    drawer.querySelector('.cart-total-amount').textContent = `₹${total.toLocaleString('en-IN')}`;
  }

  function openDrawer() {
    let drawer = document.getElementById('cartDrawer');
    if (!drawer) {
      drawer = createDrawer();
    }
    drawer.classList.add('open');
    document.body.classList.add('cart-open');
    renderDrawer();
  }

  function closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) {
      drawer.classList.remove('open');
      document.body.classList.remove('cart-open');
    }
  }

  function createDrawer() {
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-drawer-overlay"></div>
      <aside class="cart-drawer-panel" role="dialog" aria-label="Shopping cart">
        <header class="cart-drawer-header">
          <h3>Your Cart</h3>
          <button class="cart-close-btn" aria-label="Close cart">×</button>
        </header>
        <div class="cart-drawer-body"></div>
        <footer class="cart-drawer-footer">
          <div class="cart-total">
            <span>Total:</span>
            <span class="cart-total-amount">₹0</span>
          </div>
          <button class="cart-checkout-btn" id="cartCheckoutBtn">
            Proceed to Checkout
          </button>
        </footer>
      </aside>
    `;
    document.body.appendChild(drawer);

    // Event listeners for drawer
    drawer.querySelector('.cart-close-btn').addEventListener('click', closeDrawer);
    drawer.querySelector('.cart-drawer-overlay').addEventListener('click', closeDrawer);

    // Delegate clicks for quantity buttons and remove
    drawer.querySelector('.cart-drawer-body').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains('remove-btn')) {
        removeItem(id);
      } else if (btn.dataset.action === 'increase') {
        const cart = getCart();
        const item = cart.find(i => i.id === id);
        if (item) updateQuantity(id, item.quantity + 1);
      } else if (btn.dataset.action === 'decrease') {
        const cart = getCart();
        const item = cart.find(i => i.id === id);
        if (item) updateQuantity(id, item.quantity - 1);
      }
    });

    // Checkout button
    drawer.querySelector('#cartCheckoutBtn').addEventListener('click', () => {
      if (window.IlluminatiCheckout) {
        window.IlluminatiCheckout.start();
      }
    });

    return drawer;
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    updateBadge();

    // Wire up Add to Cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = {
          id: btn.dataset.productId,
          name: btn.dataset.productName,
          price: parseInt(btn.dataset.productPrice, 10),
          maxQuantity: btn.dataset.maxQuantity ? parseInt(btn.dataset.maxQuantity, 10) : null
        };
        addItem(product);
      });
    });

    // Wire up nav cart button
    const navCartBtn = document.getElementById('navCartBtn');
    if (navCartBtn) {
      navCartBtn.addEventListener('click', openDrawer);
    }
  });

  // Expose public API
  window.IlluminatiCart = {
    getCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    openDrawer,
    closeDrawer
  };
})();
