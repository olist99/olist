'use server';
import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';
import { query as db, queryOne as dbOne } from '@/lib/db';
import { safeInt, safeCurrencyColumn, sanitizeText, checkRateLimit } from '@/lib/security';
import { sendNotification } from '@/lib/notifications';

export async function buyAction(formData) {
  const uid = await getSessionUserId();
  if (!uid) redirect('/login');

  const rl = await checkRateLimit(`market-buy:${uid}`, 20, 60000);
  if (!rl.ok) redirect('/marketplace?error=Too+many+actions.+Slow+down.');

  const listingId = safeInt(formData.get('listing_id'), 1);
  if (!listingId) redirect('/marketplace?error=Invalid+listing');

  const listing = await dbOne('SELECT * FROM cms_marketplace WHERE id = ? AND status = ?', [listingId, 'active']);
  if (!listing) redirect('/marketplace?error=Listing+not+found+or+already+sold');
  if (listing.seller_id === uid) redirect('/marketplace?error=You+cannot+buy+your+own+listing');

  const col = safeCurrencyColumn(listing.currency);
  if (!col) redirect('/marketplace?error=Invalid+currency');

  const deduct = await db(
    `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
    [listing.price, uid, listing.price]
  );
  if (deduct.affectedRows === 0) redirect(`/marketplace?error=Not+enough+${listing.currency === 'credits' ? 'credits' : 'diamonds'}`);

  const sold = await db(
    "UPDATE cms_marketplace SET status = 'sold', buyer_id = ?, sold_at = NOW() WHERE id = ? AND status = 'active'",
    [uid, listingId]
  );
  if (sold.affectedRows === 0) {
    await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [listing.price, uid]);
    redirect('/marketplace?error=Listing+was+already+sold');
  }

  await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [listing.price, listing.seller_id]);
  if (listing.item_id) await db('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [uid, listing.item_id]);
  await db("UPDATE cms_marketplace_offers SET status = 'rejected' WHERE listing_id = ? AND status = 'pending'", [listingId]);

  try {
    await db(
      'INSERT INTO cms_marketplace_price_history (item_base_id, item_name, price, currency, listing_id, sold_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [listing.item_base_id || 0, listing.item_name, listing.price, listing.currency, listingId]
    );
  } catch(e) {}

  sendNotification(listing.seller_id, {
    type: 'marketplace_sold',
    title: 'Your listing sold!',
    message: `"${listing.title || listing.item_name}" sold for ${listing.price.toLocaleString()} ${listing.currency}.`,
    link: '/marketplace?tab=my',
  });

  redirect('/marketplace?msg=Purchase+successful!+Item+added+to+your+inventory.');
}

export async function cancelAction(formData) {
  const uid = await getSessionUserId();
  if (!uid) redirect('/login');

  const listingId = safeInt(formData.get('listing_id'), 1);
  if (!listingId) redirect('/marketplace?error=Invalid+listing');

  const listing = await dbOne('SELECT * FROM cms_marketplace WHERE id = ? AND seller_id = ? AND status = ?', [listingId, uid, 'active']);
  if (!listing) redirect('/marketplace?tab=my&error=Listing+not+found');

  if (listing.item_id) await db('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [uid, listing.item_id]);
  await db('UPDATE cms_marketplace SET status = ? WHERE id = ?', ['cancelled', listingId]);
  await db("UPDATE cms_marketplace_offers SET status = 'cancelled' WHERE listing_id = ? AND status = 'pending'", [listingId]);

  redirect('/marketplace?tab=my&msg=Listing+cancelled.+Item+returned+to+your+inventory.');
}

export async function sendOffer(formData) {
  const uid = await getSessionUserId();
  if (!uid) redirect('/login');

  const rl = await checkRateLimit(`market-offer:${uid}`, 15, 60000);
  if (!rl.ok) redirect('/marketplace?error=Too+many+offers');

  const listingId = safeInt(formData.get('listing_id'), 1);
  const amount = parseInt(formData.get('offer_amount'));
  const message = (formData.get('offer_message') || '').trim();

  if (!listingId) redirect('/marketplace?error=Invalid+listing');

  const listing = await dbOne('SELECT * FROM cms_marketplace WHERE id = ? AND status = ?', [listingId, 'active']);
  if (!listing) redirect('/marketplace?error=Listing+not+found');
  if (listing.seller_id === uid) redirect('/marketplace?error=Cannot+offer+on+own+listing');
  if (!amount || amount < 1) redirect(`/marketplace/${listingId}?error=Invalid+offer+amount`);

  await db(
    'INSERT INTO cms_marketplace_offers (listing_id, buyer_id, amount, currency, message) VALUES (?,?,?,?,?)',
    [listingId, uid, amount, listing.currency, message]
  );
  redirect(`/marketplace/${listingId}?msg=Offer+sent!`);
}
