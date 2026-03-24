import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { createHmac } from 'crypto';

// ─── NOWPayments IPN Webhook ──────────────────────────────────────────────────
// NOWPayments calls this URL when a payment status changes.
//
// Setup in NOWPayments Dashboard → Store Settings → IPN Settings:
//   IPN Callback URL: https://YOURHOTEL.COM/api/tokens/webhook
//   IPN Secret Key:   (generate a random string, paste same in .env as NOWPAYMENTS_IPN_SECRET)
//
// NOWPayments signs each IPN with HMAC-SHA512 in the x-nowpayments-sig header.

export async function POST(request) {
  const rawBody  = await request.text();
  const sigHeader = request.headers.get('x-nowpayments-sig');
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

  // Verify signature if secret is configured
  if (ipnSecret && sigHeader) {
    const expected = createHmac('sha512', ipnSecret)
      .update(rawBody)
      .digest('hex');
    if (expected !== sigHeader) {
      console.error('NOWPayments IPN: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { payment_status, order_id, payment_id } = payload;

  // We only care about the final "finished" status (fully confirmed)
  // "confirmed" = enough confirmations but not yet settled — you can also accept this
  if (!['finished', 'confirmed'].includes(payment_status)) {
    return NextResponse.json({ received: true, action: 'ignored', status: payment_status });
  }

  if (!order_id) {
    console.error('NOWPayments IPN: missing order_id', payload);
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
  }

  // Find the pending purchase by order_id prefix (pkg{id}_u{userId}_{ts})
  // We also match on payment_id if available
  const purchase = await queryOne(
    `SELECT * FROM cms_token_purchases
     WHERE (payment_id = ? OR payment_id = ?)
       AND status = 'pending'
     LIMIT 1`,
    [order_id, String(payment_id ?? '')]
  ).catch(() => null);

  if (!purchase) {
    // Try matching by order_id stored in payment_id field
    const purchase2 = await queryOne(
      `SELECT * FROM cms_token_purchases WHERE payment_id = ? AND status = 'pending' LIMIT 1`,
      [order_id]
    ).catch(() => null);

    if (!purchase2) {
      // Already processed or not found — return 200 so NOWPayments doesn't retry
      console.log('NOWPayments IPN: purchase not found or already processed', order_id);
      return NextResponse.json({ received: true });
    }

    return await fulfil(purchase2, payment_status);
  }

  return await fulfil(purchase, payment_status);
}

async function fulfil(purchase, status) {
  // FIX #4: Atomically flip status to 'completed' only if it's still 'pending'.
  // If two webhook callbacks arrive simultaneously (NOWPayments retries on timeout),
  // only one will find affectedRows === 1 and proceed. The other returns early,
  // preventing a double token credit.
  const lock = await query(
    `UPDATE cms_token_purchases SET status = 'completed', completed_at = NOW() WHERE id = ? AND status = 'pending'`,
    [purchase.id]
  ).catch(() => null);

  if (!lock || lock.affectedRows === 0) {
    console.log(`NOWPayments IPN: purchase #${purchase.id} already processed — skipping.`);
    return NextResponse.json({ received: true, action: 'already_processed' });
  }

  const recipientId = purchase.gift_user_id || purchase.user_id;

  // Add tokens to the recipient (safe — we own the lock above)
  await query(
    'UPDATE users SET shop_tokens = shop_tokens + ? WHERE id = ?',
    [purchase.tokens_amount, recipientId]
  );
  if (purchase.gift_user_id) {
    const sender = await queryOne(
      'SELECT username FROM users WHERE id = ?', [purchase.user_id]
    ).catch(() => null);
    await query(
      `INSERT INTO cms_notifications (user_id, type, title, message, created_at)
       VALUES (?, 'token_gift', 'Tokens Received!', ?, NOW())`,
      [purchase.gift_user_id,
       `${sender?.username || 'Someone'} gifted you ${Number(purchase.tokens_amount).toLocaleString()} tokens!`]
    ).catch(() => {});
  }

  console.log(`✅ Crypto payment fulfilled: ${purchase.tokens_amount} tokens → user #${recipientId} (order ${purchase.payment_id})`);
  return NextResponse.json({ received: true, fulfilled: true });
}
