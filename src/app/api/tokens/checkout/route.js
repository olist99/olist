import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { checkRateLimit } from '@/lib/security';

// ─── NOWPayments Crypto Checkout ─────────────────────────────────────────────
// 1. Sign up free at https://nowpayments.io
// 2. Store Settings → API Keys → Generate API key
// 3. Add to .env:
//      NOWPAYMENTS_API_KEY=your-api-key-here
//      NOWPAYMENTS_IPN_SECRET=your-ipn-secret-here  ← set in Store → IPN Settings
//
// Supports: BTC, ETH, LTC, USDT (TRC20/ERC20), BNB, SOL, XRP, DOGE + 300 more.
// Players pick their preferred coin on the NOWPayments hosted page.

const NP_BASE = 'https://api.nowpayments.io/v1';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // FIX #10: Rate limit checkout — 10 per minute prevents spam invoice creation
  const rl = await checkRateLimit(`checkout:${user.id}`, 10, 60000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Crypto payments are not configured. Add NOWPAYMENTS_API_KEY to your .env' },
      { status: 503 }
    );
  }

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const { package_id, gift_username } = body;
  if (!package_id) return NextResponse.json({ error: 'Missing package_id' }, { status: 400 });

  const pkg = await queryOne(
    'SELECT * FROM cms_token_packages WHERE id = ? AND active = 1', [package_id]
  ).catch(() => null);
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  // Validate gift recipient
  let giftUser = null;
  if (gift_username?.trim()) {
    giftUser = await queryOne(
      'SELECT id, username FROM users WHERE username = ?', [gift_username.trim()]
    ).catch(() => null);
    if (!giftUser) return NextResponse.json({ error: `User "${gift_username}" not found` }, { status: 404 });
    if (giftUser.id === user.id) return NextResponse.json({ error: 'You cannot gift tokens to yourself' }, { status: 400 });
  }

  const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const priceAmount   = (pkg.price_pence / 100).toFixed(2);
  const priceCurrency = pkg.currency; // gbp / usd / eur

  // Unique order ID so the webhook can find this record
  const orderId = `pkg${pkg.id}_u${user.id}_${Date.now()}`;

  try {
    const npRes = await fetch(`${NP_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount:        priceAmount,
        price_currency:      priceCurrency,
        order_id:            orderId,
        order_description:   `${pkg.tokens.toLocaleString()} Tokens — ${pkg.name}${giftUser ? ` (gift to ${giftUser.username})` : ''}`,
        ipn_callback_url:    `${siteUrl}/api/tokens/webhook`,
        success_url:         `${siteUrl}/token-shop?msg=Payment+confirmed!+Tokens+will+be+added+shortly.`,
        cancel_url:          `${siteUrl}/token-shop?error=Payment+cancelled.`,
        is_fixed_rate:       false,
        is_fee_paid_by_user: true,
      }),
    });

    const npData = await npRes.json();

    if (!npRes.ok || !npData.invoice_url) {
      console.error('NOWPayments invoice error:', npData);
      return NextResponse.json(
        { error: npData?.message || 'Failed to create crypto invoice. Check your NOWPayments API key.' },
        { status: 500 }
      );
    }

    // Save pending purchase record
    await query(
      `INSERT INTO cms_token_purchases
         (user_id, package_id, tokens_amount, amount_paid, currency, payment_id, gift_user_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [user.id, pkg.id, pkg.tokens, pkg.price_pence, pkg.currency,
       String(npData.id), giftUser?.id ?? null]
    ).catch(() => {});

    return NextResponse.json({ url: npData.invoice_url });

  } catch (err) {
    console.error('NOWPayments checkout error:', err);
    return NextResponse.json({ error: 'Failed to connect to payment provider' }, { status: 500 });
  }
}
