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
  if (!rl.ok) redirect('/marketplace?error=Too+many+actions');

  const lid = safeInt(formData.get('listing_id'), 1);
  if (!lid) redirect('/marketplace?error=Invalid+listing');

  const item = await dbOne('SELECT * FROM cms_marketplace WHERE id = ? AND status = ?', [lid, 'active']);
  if (!item) redirect(`/marketplace/${lid}?error=Listing+unavailable`);
  if (item.seller_id === uid) redirect(`/marketplace/${lid}?error=Cannot+buy+own+listing`);

  const col = safeCurrencyColumn(item.currency);
  if (!col) redirect(`/marketplace/${lid}?error=Invalid+currency`);

  const deduct = await db(
    `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
    [item.price, uid, item.price]
  );
  if (deduct.affectedRows === 0) redirect(`/marketplace/${lid}?error=Not+enough+diamonds`);

  const sold = await db(
    "UPDATE cms_marketplace SET status = 'sold', buyer_id = ?, sold_at = NOW() WHERE id = ? AND status = 'active'",
    [uid, lid]
  );
  if (sold.affectedRows === 0) {
    await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [item.price, uid]);
    redirect(`/marketplace/${lid}?error=Already+sold`);
  }

  await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [item.price, item.seller_id]);
  if (item.item_id) await db('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [uid, item.item_id]);
  await db("UPDATE cms_marketplace_offers SET status = 'rejected' WHERE listing_id = ? AND status = 'pending'", [lid]);

  try {
    await db('INSERT INTO cms_marketplace_price_history (item_base_id, item_name, price, currency, listing_id, sold_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [item.item_base_id || 0, item.item_name, item.price, item.currency, lid]);
  } catch(e) {}

  sendNotification(item.seller_id, {
    type: 'marketplace_sold',
    title: 'Your listing sold!',
    message: `"${item.item_name || item.title}" sold for ${item.price.toLocaleString()} ${item.currency}.`,
    link: '/marketplace?tab=my',
  });

  redirect(`/marketplace/${lid}?msg=Purchase+successful!`);
}

export async function sendOffer(formData) {
  const uid = await getSessionUserId();
  if (!uid) redirect('/login');

  const rl = await checkRateLimit(`market-offer:${uid}`, 15, 60000);
  if (!rl.ok) redirect('/marketplace?error=Too+many+offers');

  const lid = safeInt(formData.get('listing_id'), 1);
  const amount = safeInt(formData.get('offer_amount'), 1, 100000000);
  const message = sanitizeText(formData.get('offer_message') || '', 500);

  if (!lid || !amount) redirect(`/marketplace?error=Invalid+offer`);

  const item = await dbOne('SELECT * FROM cms_marketplace WHERE id = ? AND status = ?', [lid, 'active']);
  if (!item) redirect(`/marketplace/${lid}?error=Listing+unavailable`);
  if (item.seller_id === uid) redirect(`/marketplace/${lid}?error=Cannot+offer+on+own`);

  await db('INSERT INTO cms_marketplace_offers (listing_id, buyer_id, amount, currency, message) VALUES (?,?,?,?,?)',
    [lid, uid, amount, item.currency, message]);

  const buyer = await dbOne('SELECT username FROM users WHERE id = ?', [uid]);
  sendNotification(item.seller_id, {
    type: 'marketplace_offer',
    title: 'New offer on your listing!',
    message: `${buyer?.username || 'Someone'} offered ${amount.toLocaleString()} ${item.currency} for "${item.item_name || item.title}".`,
    link: `/marketplace/${lid}`,
  });

  redirect(`/marketplace/${lid}?msg=Offer+sent!`);
}

export async function acceptOffer(formData) {
  const uid = await getSessionUserId();
  if (!uid) redirect('/login');

  const offerId = safeInt(formData.get('offer_id'), 1);
  if (!offerId) redirect('/marketplace?error=Invalid+offer');

  const offer = await dbOne(`
    SELECT o.*, ml.seller_id, ml.currency, ml.item_id, ml.item_base_id, ml.item_name, ml.price AS listing_price, ml.id AS listing_id_val
    FROM cms_marketplace_offers o
    JOIN cms_marketplace ml ON ml.id = o.listing_id
    WHERE o.id = ? AND o.status = 'pending'
  `, [offerId]);
  if (!offer || offer.seller_id !== uid) redirect('/marketplace?error=Invalid+offer');

  const col = safeCurrencyColumn(offer.currency);
  if (!col) redirect('/marketplace?error=Invalid+currency');

  const deduct = await db(
    `UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`,
    [offer.amount, offer.buyer_id, offer.amount]
  );
  if (deduct.affectedRows === 0) redirect('/marketplace?error=Buyer+insufficient+funds');

  await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [offer.amount, uid]);
  if (offer.item_id) await db('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [offer.buyer_id, offer.item_id]);

  // FIX #8: Use AND status='active' so a cancelled or already-sold listing can't
  // be double-sold. If this UPDATE hits 0 rows, refund the buyer immediately.
  const sold = await db(
    "UPDATE cms_marketplace SET status = 'sold', buyer_id = ?, sold_at = NOW() WHERE id = ? AND status = 'active'",
    [offer.buyer_id, offer.listing_id]
  );
  if (sold.affectedRows === 0) {
    // Listing was cancelled or already sold — reverse the buyer deduction
    await db(`UPDATE users SET \`${col}\` = \`${col}\` + ? WHERE id = ?`, [offer.amount, offer.buyer_id]);
    // Reverse the seller credit
    await db(`UPDATE users SET \`${col}\` = \`${col}\` - ? WHERE id = ? AND \`${col}\` >= ?`, [offer.amount, uid, offer.amount]);
    redirect('/marketplace?error=Listing+no+longer+available');
  }
  await db("UPDATE cms_marketplace_offers SET status = 'accepted' WHERE id = ?", [offerId]);
  await db("UPDATE cms_marketplace_offers SET status = 'rejected' WHERE listing_id = ? AND id != ? AND status = 'pending'", [offer.listing_id, offerId]);

  try {
    await db('INSERT INTO cms_marketplace_price_history (item_base_id, item_name, price, currency, listing_id, sold_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [offer.item_base_id || 0, offer.item_name, offer.amount, offer.currency, offer.listing_id]);
  } catch(e) {}

  // Notify buyer their offer was accepted
  const { sendNotification } = await import('@/lib/notifications');
  const seller = await dbOne('SELECT username FROM users WHERE id = ?', [uid]);
  sendNotification(offer.buyer_id, {
    type: 'marketplace_sold',
    title: 'Your offer was accepted!',
    message: `${seller?.username || 'The seller'} accepted your offer of ${offer.amount.toLocaleString()} ${offer.currency} for "${offer.item_name}". Item added to your inventory.`,
    link: `/marketplace/${offer.listing_id}`,
  });

  redirect(`/marketplace/${offer.listing_id}?msg=Offer+accepted!+Item+sold.`);
}
