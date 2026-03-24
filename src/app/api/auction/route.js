import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne, queryScalar } from '@/lib/db';
import { sanitizeText, safeInt, checkRateLimit } from '@/lib/security';
import { sendNotification } from '@/lib/notifications';

async function settleEndedAuctions() {
  const ended = await query(
    "SELECT * FROM cms_auctions WHERE status = 'active' AND end_time <= NOW()"
  ).catch(() => []);

  for (const auction of ended) {
    const topBid = await queryOne(
      'SELECT user_id, amount FROM cms_auction_bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1',
      [auction.id]
    ).catch(() => null);

    if (topBid) {
      if (!auction.is_official && auction.item_id) {
        // User auction: transfer the held item to the winner
        await query('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [topBid.user_id, auction.item_id]).catch(() => {});
        // Pay the seller
        await query(
          `UPDATE users SET \`${auction.currency}\` = \`${auction.currency}\` + ? WHERE id = ?`,
          [topBid.amount, auction.created_by]
        ).catch(() => {});
      } else if (auction.is_official && auction.item_name) {
        // Official auction: look up the base item and INSERT a new item for the winner
        const baseItem = await queryOne(
          'SELECT id FROM items_base WHERE item_name = ? LIMIT 1',
          [auction.item_name]
        ).catch(() => null);
        if (baseItem) {
          await query(
            'INSERT INTO items (user_id, room_id, item_id, x, y, z, rot, wall_pos, limited_data, extra_data) VALUES (?, 0, ?, 0, 0, 0, 0, \'\', \'0:0\', \'\')',
            [topBid.user_id, baseItem.id]
          ).catch(() => {});
        }
        // Official auctions are a currency sink — do NOT pay the admin account
      }

      await sendNotification(topBid.user_id, {
        type: 'auction_won',
        title: `You won the auction for "${auction.title}"!`,
        message: `Winning bid: ${topBid.amount.toLocaleString()} ${auction.currency}. Item added to your inventory!`,
        link: '/auction',
      });
      if (!auction.is_official && auction.created_by !== topBid.user_id) {
        await sendNotification(auction.created_by, {
          type: 'auction_sold',
          title: `Your auction "${auction.title}" ended!`,
          message: `Sold for ${topBid.amount.toLocaleString()} ${auction.currency}. Funds added to your account.`,
          link: '/auction',
        });
      }
    } else if (!auction.is_official && auction.item_id) {
      // No bids on user auction — return item to seller
      await query('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [auction.created_by, auction.item_id]).catch(() => {});
    }

    await query("UPDATE cms_auctions SET status = 'ended' WHERE id = ?", [auction.id]).catch(() => {});
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'list';

  if (type === 'list') {
    // Auto-settle ended auctions (non-blocking)
    settleEndedAuctions().catch(() => {});

    const auctions = await query(`
      SELECT a.*,
             u.username AS creator_name,
             b.user_id AS top_bidder_id, b.amount AS top_bid, bu.username AS top_bidder_name, bu.look AS top_bidder_look
      FROM cms_auctions a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN cms_auction_bids b ON b.id = (
        SELECT id FROM cms_auction_bids WHERE auction_id = a.id ORDER BY amount DESC LIMIT 1
      )
      LEFT JOIN users bu ON bu.id = b.user_id
      WHERE a.status = 'active' AND a.end_time > NOW()
      ORDER BY a.is_official DESC, a.end_time ASC
      LIMIT 50
    `).catch(() => []);
    return NextResponse.json({ auctions });
  }

  if (type === 'ended') {
    settleEndedAuctions().catch(() => {});
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const perPage = 20;
    const offset = (page - 1) * perPage;
    const auctions = await query(`
      SELECT a.*,
             u.username AS creator_name,
             b.user_id AS top_bidder_id, b.amount AS top_bid, bu.username AS top_bidder_name, bu.look AS top_bidder_look
      FROM cms_auctions a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN cms_auction_bids b ON b.id = (
        SELECT id FROM cms_auction_bids WHERE auction_id = a.id ORDER BY amount DESC LIMIT 1
      )
      LEFT JOIN users bu ON bu.id = b.user_id
      WHERE a.status = 'ended'
      ORDER BY a.end_time DESC
      LIMIT ? OFFSET ?
    `, [perPage, offset]).catch(() => []);
    return NextResponse.json({ auctions });
  }

  if (type === 'single') {
    const auctionId = safeInt(url.searchParams.get('id'), 1);
    if (!auctionId) return NextResponse.json({ auction: null });
    const auction = await query(`
      SELECT a.*,
             u.username AS creator_name,
             b.user_id AS top_bidder_id, b.amount AS top_bid, bu.username AS top_bidder_name, bu.look AS top_bidder_look
      FROM cms_auctions a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN cms_auction_bids b ON b.id = (
        SELECT id FROM cms_auction_bids WHERE auction_id = a.id ORDER BY amount DESC LIMIT 1
      )
      LEFT JOIN users bu ON bu.id = b.user_id
      WHERE a.id = ?
    `, [auctionId]).then(r => r[0] || null).catch(() => null);
    const timeline = await query(`
      SELECT b.amount, b.created_at, u.username, u.look
      FROM cms_auction_bids b
      JOIN users u ON u.id = b.user_id
      WHERE b.auction_id = ?
      ORDER BY b.created_at ASC
    `, [auctionId]).catch(() => []);
    return NextResponse.json({ auction, timeline });
  }

  if (type === 'bids') {
    const auctionId = safeInt(url.searchParams.get('id'), 1);
    if (!auctionId) return NextResponse.json({ bids: [] });
    const bids = await query(`
      SELECT b.amount, b.created_at, u.username, u.look
      FROM cms_auction_bids b
      JOIN users u ON u.id = b.user_id
      WHERE b.auction_id = ?
      ORDER BY b.amount DESC
      LIMIT 20
    `, [auctionId]).catch(() => []);
    return NextResponse.json({ bids });
  }

  if (type === 'search_items') {
    const q = (url.searchParams.get('q') || '').trim();
    if (q.length < 2) return NextResponse.json({ items: [] });
    const items = await query(
      'SELECT id, public_name, item_name FROM items_base WHERE public_name LIKE ? LIMIT 20',
      [`%${q}%`]
    ).catch(() => []);
    return NextResponse.json({ items });
  }

  if (type === 'inventory') {
    // Return current user's inventory for auction selection
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ items: [] });
    const items = await query(`
      SELECT i.id, ib.public_name, ib.item_name, ib.sprite_id
      FROM items i
      JOIN items_base ib ON ib.id = i.item_id
      WHERE i.user_id = ? AND i.room_id = 0
      ORDER BY ib.public_name ASC
    `, [user.id]).catch(() => []);
    return NextResponse.json({ items });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;

  // ── Create official auction (staff only) ──
  if (action === 'create_official') {
    if (user.rank < 4) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const title = sanitizeText(body.title || '', 200);
    const description = sanitizeText(body.description || '', 1000);
    const startBid = safeInt(body.start_bid, 1) || 1;
    const currency = ['credits', 'pixels', 'points'].includes(body.currency) ? body.currency : 'credits';
    const endTime = body.end_time;
    if (!title || !endTime) return NextResponse.json({ error: 'Title and end time required' }, { status: 400 });
    const itemName = body.item_name ? String(body.item_name).replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 150) : null;
    await query(
      'INSERT INTO cms_auctions (title, description, start_bid, currency, end_time, created_by, status, is_official, item_name) VALUES (?,?,?,?,?,?,?,1,?)',
      [title, description, startBid, currency, endTime, user.id, 'active', itemName]
    );

    // Notify all users via bulk INSERT (no per-row loop)
    try {
      const allUsers = await query('SELECT id FROM users WHERE `rank` >= 1 AND id != ?', [user.id]).catch(() => []);
      if (allUsers.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < allUsers.length; i += chunkSize) {
          const chunk = allUsers.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '(?,?,?,?,?)').join(',');
          const flat = chunk.flatMap(u => [
            u.id, 'auction_new',
            `New official auction: "${title}"`,
            `Starting bid: ${startBid.toLocaleString()} ${currency}. Don't miss out!`,
            '/auction'
          ]);
          await query(
            `INSERT INTO cms_notifications (user_id, type, title, message, link) VALUES ${placeholders}`,
            flat
          ).catch(() => {});
        }
      }
    } catch {}

    return NextResponse.json({ ok: true });
  }

  // ── Create user auction (pick item from inventory) ──
  if (action === 'create_user') {
    const rl = await checkRateLimit(`auction_create:${user.id}`, 3, 3600000);
    if (!rl.ok) return NextResponse.json({ error: 'You can only create 3 auctions per hour.' }, { status: 429 });

    const itemId = safeInt(body.item_id, 1);
    const startBid = safeInt(body.start_bid, 1) || 1;
    const currency = ['credits', 'pixels', 'points'].includes(body.currency) ? body.currency : 'credits';
    const endHours = Math.min(72, Math.max(1, parseInt(body.end_hours) || 24));
    const description = sanitizeText(body.description || '', 500);

    if (!itemId) return NextResponse.json({ error: 'Please select an item' }, { status: 400 });

    // Verify item belongs to user and is in inventory (not in a room)
    const item = await queryOne(
      'SELECT i.id, ib.public_name, ib.item_name FROM items i JOIN items_base ib ON ib.id = i.item_id WHERE i.id = ? AND i.user_id = ? AND i.room_id = 0',
      [itemId, user.id]
    );
    if (!item) return NextResponse.json({ error: 'Item not found in your inventory' }, { status: 404 });

    // Remove item from user inventory (hold it in auction)
    await query('UPDATE items SET user_id = 0, room_id = -99 WHERE id = ? AND user_id = ?', [itemId, user.id]);

    const endTime = new Date(Date.now() + endHours * 3600000).toISOString().slice(0, 19).replace('T', ' '); // stored as UTC
    await query(
      'INSERT INTO cms_auctions (title, description, start_bid, currency, end_time, created_by, status, is_official, item_id, item_name) VALUES (?,?,?,?,?,?,?,0,?,?)',
      [item.public_name.replace(/^\d+\s+/, ''), description, startBid, currency, endTime, user.id, 'active', itemId, item.item_name]
    );
    return NextResponse.json({ ok: true });
  }

  // ── Delete/cancel auction ──
  if (action === 'delete') {
    const id = safeInt(body.id, 1);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const auction = await queryOne('SELECT * FROM cms_auctions WHERE id = ?', [id]);
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.rank < 4 && auction.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // Refund all bidders
    const bids = await query('SELECT user_id, amount FROM cms_auction_bids WHERE auction_id = ? ORDER BY amount DESC', [id]).catch(() => []);
    const topBid = bids[0];
    for (const bid of bids) {
      await query(`UPDATE users SET \`${auction.currency}\` = \`${auction.currency}\` + ? WHERE id = ?`, [bid.amount, bid.user_id]).catch(() => {});
    }
    // Return item to seller if user auction
    if (!auction.is_official && auction.item_id) {
      await query('UPDATE items SET user_id = ?, room_id = 0 WHERE id = ?', [auction.created_by, auction.item_id]);
    }
    await query('DELETE FROM cms_auction_bids WHERE auction_id = ?', [id]);
    await query('DELETE FROM cms_auctions WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  }

  // ── Place bid ──
  if (action === 'bid') {
    const rl = await checkRateLimit(`auction_bid:${user.id}`, 5, 10000);
    if (!rl.ok) return NextResponse.json({ error: 'Too fast, slow down.' }, { status: 429 });

    const auctionId = safeInt(body.auction_id, 1);
    const amount = safeInt(body.amount, 1);
    if (!auctionId || !amount) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const auction = await queryOne(
      "SELECT * FROM cms_auctions WHERE id = ? AND status = 'active' AND end_time > NOW()",
      [auctionId]
    );
    if (!auction) return NextResponse.json({ error: 'Auction not found or already ended' }, { status: 404 });
    if (auction.created_by === user.id) return NextResponse.json({ error: 'You cannot bid on your own auction' }, { status: 400 });

    const currency = auction.currency;

    // Get current top bid
    const topBid = await queryOne(
      'SELECT id, user_id, amount FROM cms_auction_bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1',
      [auctionId]
    );

    const minBid = topBid ? topBid.amount + 1 : auction.start_bid;
    if (amount < minBid) {
      return NextResponse.json({ error: `Minimum bid is ${minBid.toLocaleString()} ${currency}` }, { status: 400 });
    }

    // Previous bid by this user on this auction
    const prevBid = await queryOne(
      'SELECT id, amount FROM cms_auction_bids WHERE auction_id = ? AND user_id = ? ORDER BY amount DESC LIMIT 1',
      [auctionId, user.id]
    );
    const prevAmount = prevBid?.amount || 0;
    const extraNeeded = amount - prevAmount;

    if (extraNeeded <= 0) return NextResponse.json({ error: 'Your bid is already higher or equal' }, { status: 400 });

    // Deduct extra from user atomically
    const deducted = await query(
      `UPDATE users SET \`${currency}\` = \`${currency}\` - ? WHERE id = ? AND \`${currency}\` >= ?`,
      [extraNeeded, user.id, extraNeeded]
    );
    if (!deducted || deducted.affectedRows === 0) {
      return NextResponse.json({ error: 'Not enough currency' }, { status: 400 });
    }

    // Refund previous top bidder (if different user)
    if (topBid && topBid.user_id !== user.id) {
      await query(`UPDATE users SET \`${currency}\` = \`${currency}\` + ? WHERE id = ?`, [topBid.amount, topBid.user_id]);
      await sendNotification(topBid.user_id, {
        type: 'auction_outbid',
        title: `You were outbid on "${auction.title}"`,
        message: `${user.username} outbid you. Your ${topBid.amount.toLocaleString()} ${currency} has been refunded.`,
        link: '/auction',
      });
    }

    // Upsert bid
    if (prevBid) {
      await query('UPDATE cms_auction_bids SET amount = ?, created_at = NOW() WHERE id = ?', [amount, prevBid.id]);
    } else {
      await query('INSERT INTO cms_auction_bids (auction_id, user_id, amount, currency) VALUES (?,?,?,?)', [auctionId, user.id, amount, currency]);
    }

    return NextResponse.json({ ok: true, amount });
  }

  // ── Settle ended auctions ──
  if (action === 'settle_ended') {
    await settleEndedAuctions();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}