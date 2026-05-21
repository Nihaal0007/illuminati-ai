const crypto = require('crypto');
const { Resend } = require('resend');

/* Razorpay webhook handler — fires on payment events.
   - Verifies x-razorpay-signature against RAZORPAY_WEBHOOK_SECRET
   - On payment.captured: sends customer confirmation + owner alert via Resend
   - Always returns 200 to a valid-signature request so Razorpay doesn't retry
   - Email failures are caught individually and never break the webhook flow */

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const rawBody = event.body || '';

  // ── Step 1: signature verification ──────────────────────────────────────────
  const signature = event.headers['x-razorpay-signature'] || event.headers['X-Razorpay-Signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping signature check (set this env var in production)');
  } else {
    if (!signature) {
      console.error('Missing x-razorpay-signature header');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing signature' }) };
    }
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (expected !== signature) {
      console.error('Webhook signature mismatch');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
    }
  }

  // ── Step 2: parse + filter event ────────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error('Webhook JSON parse error:', err && err.message);
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const eventType = payload && payload.event;
  if (eventType !== 'payment.captured') {
    // Acknowledge but skip
    return { statusCode: 200, headers, body: JSON.stringify({ received: true, skipped: eventType || 'unknown' }) };
  }

  const entity = (payload.payload && payload.payload.payment && payload.payload.payment.entity) || {};
  const notes = entity.notes || {};

  const paymentId = entity.id;
  const orderId = entity.order_id;
  const amountPaise = Number(entity.amount) || 0;
  const amountRupees = amountPaise / 100;
  const currency = entity.currency || 'INR';
  const method = entity.method || 'unknown';
  const customerName = (notes.customer_name || '').toString().trim() || 'Customer';
  const customerEmail = (notes.customer_email || '').toString().trim();
  const customerPhone = (notes.customer_phone || '').toString().trim();
  const productName = (notes.product_name || 'Illuminati AI Product').toString();

  const istDateTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // ── Step 3: send emails via Resend (Promise.allSettled so neither blocks the other) ──
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — cannot send emails');
    return { statusCode: 200, headers, body: JSON.stringify({ received: true, emails_sent: 0, failures: 0, note: 'RESEND_API_KEY missing' }) };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const ownerEmail = process.env.OWNER_EMAIL;

  const sendCustomerEmail = async () => {
    if (!customerEmail) {
      console.warn('Skipping customer email — no customer_email in notes');
      return { skipped: true };
    }
    return resend.emails.send({
      from: 'Illuminati AI <orders@illuminatiai.tech>',
      to: customerEmail,
      replyTo: 'illuminati.ai@illuminatiai.tech',
      subject: `Order Confirmation - ₹${amountRupees.toLocaleString('en-IN')} received`,
      html: customerEmailHtml({
        customerName, productName, amountRupees, currency, paymentId, orderId, istDateTime
      })
    });
  };

  const sendOwnerEmail = async () => {
    if (!ownerEmail) {
      console.warn('Skipping owner email — OWNER_EMAIL env var not set');
      return { skipped: true };
    }
    return resend.emails.send({
      from: 'Illuminati AI Alerts <alerts@illuminatiai.tech>',
      to: ownerEmail,
      replyTo: 'illuminati.ai@illuminatiai.tech',
      subject: `🎉 New Sale! ₹${amountRupees.toLocaleString('en-IN')} from ${customerName}`,
      html: ownerEmailHtml({
        customerName, customerEmail, customerPhone, productName,
        amountRupees, currency, paymentId, orderId, method, istDateTime
      })
    });
  };

  const results = await Promise.allSettled([sendCustomerEmail(), sendOwnerEmail()]);

  let emailsSent = 0;
  let failures = 0;
  results.forEach((r, i) => {
    const which = i === 0 ? 'customer' : 'owner';
    if (r.status === 'fulfilled') {
      if (r.value && r.value.skipped) {
        console.log(`Email[${which}]: skipped`);
      } else if (r.value && r.value.error) {
        failures++;
        console.error(`Email[${which}] failed:`, r.value.error);
      } else {
        emailsSent++;
        console.log(`Email[${which}]: sent (id=${r.value && r.value.data && r.value.data.id || 'n/a'})`);
      }
    } else {
      failures++;
      console.error(`Email[${which}] threw:`, r.reason && (r.reason.message || r.reason));
    }
  });

  // Mask middle of email for log
  const maskEmail = (e) => {
    if (!e) return '(none)';
    const at = e.indexOf('@');
    if (at < 2) return e;
    return e.slice(0, 2) + '***' + e.slice(at - 1);
  };
  console.log(`Webhook payment.captured processed: payment=${paymentId} amount=${amountRupees} ${currency} customer=${maskEmail(customerEmail)} sent=${emailsSent} failures=${failures}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ received: true, emails_sent: emailsSent, failures })
  };
};

// ── Email HTML templates ──────────────────────────────────────────────────────

function customerEmailHtml({ customerName, productName, amountRupees, currency, paymentId, orderId, istDateTime }) {
  const formattedAmount = `${currency === 'INR' ? '₹' : currency + ' '}${Number(amountRupees).toLocaleString('en-IN')}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#131313;border:1px solid rgba(212,164,55,0.25);border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:36px 32px 24px;border-bottom:1px solid rgba(212,164,55,0.15);">
              <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;letter-spacing:0.08em;color:#D4A437;">ILLUMINATI AI</div>
              <div style="margin-top:6px;font-size:11px;letter-spacing:0.24em;color:rgba(232,232,232,0.55);text-transform:uppercase;">Order Confirmation</div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:36px 32px 8px;">
              <h1 style="margin:0 0 8px;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:30px;color:#ffffff;line-height:1.2;">
                Thank you, ${escapeHtml(customerName)}!
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(232,232,232,0.78);">
                Your payment of <strong style="color:#D4A437;">${formattedAmount}</strong> has been received. We are already preparing your access.
              </p>
            </td>
          </tr>

          <!-- Order details -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(212,164,55,0.04);border:1px solid rgba(212,164,55,0.18);border-radius:8px;">
                <tr><td style="padding:18px 20px 8px;font-size:11px;letter-spacing:0.18em;color:rgba(212,164,55,0.85);text-transform:uppercase;">Order details</td></tr>
                ${detailRow('Product', escapeHtml(productName))}
                ${detailRow('Amount', formattedAmount)}
                ${detailRow('Payment ID', escapeHtml(paymentId || '—'))}
                ${detailRow('Order ID', escapeHtml(orderId || '—'))}
                ${detailRow('Date (IST)', escapeHtml(istDateTime), true)}
              </table>
            </td>
          </tr>

          <!-- Next steps -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:14px;line-height:1.65;color:rgba(232,232,232,0.78);">
                We'll be in touch shortly with your product access details. Keep an eye on your inbox — and please add <strong style="color:#D4A437;">orders@illuminatiai.tech</strong> to your contacts so nothing lands in spam.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:36px 32px;border-top:1px solid rgba(212,164,55,0.12);">
              <p style="margin:0 0 6px;font-size:12px;color:rgba(232,232,232,0.55);">
                Need help? Reply to this email or write to
                <a href="mailto:illuminati.ai@illuminatiai.tech" style="color:#D4A437;text-decoration:none;">illuminati.ai@illuminatiai.tech</a>
              </p>
              <p style="margin:0;font-size:11px;color:rgba(232,232,232,0.4);letter-spacing:0.08em;">
                Illuminati AI · Mumbai, India
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label, value, last) {
  const borderStyle = last ? '' : 'border-bottom:1px solid rgba(212,164,55,0.12);';
  return `
    <tr>
      <td style="padding:12px 20px;${borderStyle}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:12px;letter-spacing:0.05em;color:rgba(232,232,232,0.55);text-transform:uppercase;width:38%;">${label}</td>
            <td align="right" style="font-size:14px;color:#ffffff;font-family:'SFMono-Regular',Menlo,monospace;">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function ownerEmailHtml({ customerName, customerEmail, customerPhone, productName, amountRupees, currency, paymentId, orderId, method, istDateTime }) {
  const formattedAmount = `${currency === 'INR' ? '₹' : currency + ' '}${Number(amountRupees).toLocaleString('en-IN')}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Sale Alert</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(20,20,40,0.08);">
          <!-- Banner -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#D4A437 0%,#E0B958 100%);padding:32px 24px;color:#0a0a0a;">
              <div style="font-size:13px;letter-spacing:0.24em;text-transform:uppercase;font-weight:600;">💰 New Sale Alert</div>
              <div style="margin-top:10px;font-size:42px;font-weight:800;letter-spacing:-0.01em;">${formattedAmount}</div>
              <div style="margin-top:4px;font-size:14px;opacity:0.85;">from ${escapeHtml(customerName)}</div>
            </td>
          </tr>

          <!-- Customer -->
          <tr>
            <td style="padding:28px 32px 4px;">
              <div style="font-size:11px;letter-spacing:0.18em;color:#8a8a8a;text-transform:uppercase;margin-bottom:10px;">Customer</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#1a1a1a;">
                ${ownerRow('Name', escapeHtml(customerName))}
                ${ownerRow('Email', customerEmail ? `<a href="mailto:${escapeAttr(customerEmail)}" style="color:#0a66c2;text-decoration:none;">${escapeHtml(customerEmail)}</a>` : '—')}
                ${ownerRow('Phone', customerPhone ? `<a href="tel:+91${escapeAttr(customerPhone)}" style="color:#0a66c2;text-decoration:none;">+91 ${escapeHtml(customerPhone)}</a>` : '—', true)}
              </table>
            </td>
          </tr>

          <!-- Order -->
          <tr>
            <td style="padding:24px 32px 4px;">
              <div style="font-size:11px;letter-spacing:0.18em;color:#8a8a8a;text-transform:uppercase;margin-bottom:10px;">Order</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#1a1a1a;">
                ${ownerRow('Product', escapeHtml(productName))}
                ${ownerRow('Amount', `<strong>${formattedAmount}</strong>`)}
                ${ownerRow('Payment ID', `<code style="background:#f4f4f7;padding:2px 6px;border-radius:4px;font-size:12px;">${escapeHtml(paymentId || '—')}</code>`)}
                ${ownerRow('Order ID', `<code style="background:#f4f4f7;padding:2px 6px;border-radius:4px;font-size:12px;">${escapeHtml(orderId || '—')}</code>`)}
                ${ownerRow('Method', escapeHtml(method))}
                ${ownerRow('Time (IST)', escapeHtml(istDateTime), true)}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:24px 32px 36px;">
              <a href="https://dashboard.razorpay.com/app/payments/${encodeURIComponent(paymentId || '')}"
                 style="display:inline-block;padding:13px 28px;background:#1a1a1a;color:#D4A437;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:0.06em;">
                View on Razorpay &rarr;
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:#8a8a8a;letter-spacing:0.06em;">Illuminati AI · automated alert</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ownerRow(label, value, last) {
  const borderStyle = last ? '' : 'border-bottom:1px solid #ececf2;';
  return `
    <tr>
      <td style="padding:10px 0;${borderStyle}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="color:#8a8a8a;width:34%;">${label}</td>
            <td align="right" style="color:#1a1a1a;">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str == null ? '' : str).replace(/"/g, '%22');
}
