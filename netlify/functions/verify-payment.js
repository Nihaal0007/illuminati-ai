const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          verified: false,
          error: 'Missing required fields'
        })
      };
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('Missing RAZORPAY_KEY_SECRET');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isVerified = expectedSignature === razorpay_signature;

    console.log(`Payment verification: ${isVerified ? 'SUCCESS' : 'FAILED'} for order ${razorpay_order_id}`);

    if (isVerified) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: true,
          message: 'Payment verified successfully',
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id
        })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          verified: false,
          message: 'Payment signature verification failed'
        })
      };
    }
  } catch (error) {
    const rzpDesc = error && error.error && error.error.description;
    const rzpCode = error && error.error && error.error.code;
    const detailsMsg = (error && error.message) || rzpDesc || 'Unknown error';

    console.error('Verify payment error:', {
      message: error && error.message,
      code: rzpCode,
      description: rzpDesc
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        verified: false,
        error: 'Verification failed',
        details: detailsMsg,
        code: rzpCode || null
      })
    };
  }
};
