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
    const { amount, currency = 'INR', receipt } = JSON.parse(event.body || '{}');

    // Validate amount
    if (!amount || amount < 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be at least 100 paise (₹1)' })
      };
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
        source: 'illuminati-ai-website'
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
