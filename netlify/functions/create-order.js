const Razorpay = require('razorpay');

exports.handler = async (event) => {
  // CORS headers for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      amount,
      currency = 'INR',
      receipt,
      customer_name,
      customer_email,
      customer_phone,
      product_name
    } = JSON.parse(event.body || '{}');

    // Validate amount
    if (!amount || amount < 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be at least 100 paise (₹1)' })
      };
    }

    // Validate customer details
    const trimmedName = (customer_name || '').trim();
    const trimmedEmail = (customer_email || '').trim();
    const rawPhone = (customer_phone || '').trim();
    const phoneDigits = rawPhone.replace(/^\+?91/, '').replace(/\D/g, '');

    if (trimmedName.length < 2) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Full name must be at least 2 characters', field: 'customer_name' }) };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email is required', field: 'customer_email' }) };
    }
    if (phoneDigits.length !== 10) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Phone must be 10 digits (optional +91 prefix)', field: 'customer_phone' }) };
    }

    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Create order
    const order = await razorpay.orders.create({
      amount: Math.round(amount), // Ensure integer paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        source: 'illuminati-ai-website',
        customer_name: trimmedName,
        customer_email: trimmedEmail,
        customer_phone: phoneDigits,
        product_name: (product_name || 'Illuminati AI Product').toString().slice(0, 256)
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID // Public key, safe to return
      })
    };
  } catch (error) {
    // Razorpay SDK errors are not standard Error objects:
    //   { statusCode: 401, error: { description: 'Authentication failed', code: 'BAD_REQUEST_ERROR' } }
    // error.message is undefined for those, so extract from the SDK shape too.
    const rzpDesc = error && error.error && error.error.description;
    const rzpCode = error && error.error && error.error.code;
    const rzpStatus = error && error.statusCode;
    const detailsMsg = (error && error.message) || rzpDesc || 'Unknown error';

    console.error('Create order error:', {
      message: error && error.message,
      statusCode: rzpStatus,
      code: rzpCode,
      description: rzpDesc
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create order',
        details: detailsMsg,
        code: rzpCode || null,
        razorpay_status: rzpStatus || null
      })
    };
  }
};
