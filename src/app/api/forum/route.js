import { NextResponse } from 'next/server';
import { getSessionUserId, getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeInt, sanitizeText, checkRateLimit } from '@/lib/security';
import { sendNotification } from '@/lib/notifications';

export async function POST(request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    const { action } = body;

    // ── Create thread ──
    if (action === 'create_thread') {
      const rl = await checkRateLimit(`forum-thread:${userId}`, 3, 60000);
      if (!rl.ok) return NextResponse.json({ error: 'Slow down! Wait a moment before posting again.' }, { status: 429 });

      const categoryId = safeInt(body.category_id, 1);
      const title = sanitizeText(body.title || '', 200);
      const bodyText = sanitizeText(body.body || '', 10000);

      if (!categoryId) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      if (!title || title.length < 3) return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 });
      if (!bodyText || bodyText.length < 10) return NextResponse.json({ error: 'Post must be at least 10 characters' }, { status: 400 });

      const category = await queryOne('SELECT * FROM cms_forum_categories WHERE id = ?', [categoryId]);
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      if (user.rank < category.min_rank) return NextResponse.json({ error: 'No access to this category' }, { status: 403 });
      if (user.rank < category.post_min_rank) return NextResponse.json({ error: 'You do not have permission to post in this category' }, { status: 403 });

      const res = await query(
        'INSERT INTO cms_forum_threads (category_id, user_id, title, body, last_reply_at) VALUES (?, ?, ?, ?, NOW())',
        [categoryId, userId, title, bodyText]
      );
      return NextResponse.json({ ok: true, threadId: res.insertId });
    }

    // ── Create reply ──
    if (action === 'create_reply') {
      const rl = await checkRateLimit(`forum-reply:${userId}`, 5, 60000);
      if (!rl.ok) return NextResponse.json({ error: 'Slow down! Wait a moment before posting again.' }, { status: 429 });

      const threadId = safeInt(body.thread_id, 1);
      const bodyText = sanitizeText(body.body || '', 10000);

      if (!threadId) return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
      if (!bodyText || bodyText.length < 2) return NextResponse.json({ error: 'Reply cannot be empty' }, { status: 400 });

      const thread = await queryOne('SELECT * FROM cms_forum_threads WHERE id = ?', [threadId]);
      if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      if (thread.locked && user.rank < 4) return NextResponse.json({ error: 'This thread is locked' }, { status: 403 });

      const category = await queryOne('SELECT * FROM cms_forum_categories WHERE id = ?', [thread.category_id]);
      if (user.rank < (category?.min_rank || 0)) return NextResponse.json({ error: 'No access' }, { status: 403 });

      await query('INSERT INTO cms_forum_replies (thread_id, user_id, body) VALUES (?, ?, ?)', [threadId, userId, bodyText]);
      await query('UPDATE cms_forum_threads SET reply_count = reply_count + 1, last_reply_at = NOW(), last_reply_user_id = ? WHERE id = ?', [userId, threadId]);

      // Notify thread author if different from replier
      if (thread.user_id !== userId) {
        await sendNotification(thread.user_id, {
          type: 'forum_reply',
          title: `${user.username} replied to your thread`,
          message: thread.title ? `"${thread.title.slice(0, 80)}"` : '',
          link: `/forum/thread/${threadId}`,
        });
      }

      return NextResponse.json({ ok: true });
    }

    // ── Toggle like ──
    if (action === 'toggle_like') {
      const targetType = body.target_type === 'reply' ? 'reply' : 'thread';
      const targetId = safeInt(body.target_id, 1);
      if (!targetId) return NextResponse.json({ error: 'Invalid target' }, { status: 400 });

      const existing = await queryOne(
        'SELECT id FROM cms_forum_likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
        [userId, targetType, targetId]
      );

      if (existing) {
        await query('DELETE FROM cms_forum_likes WHERE user_id = ? AND target_type = ? AND target_id = ?', [userId, targetType, targetId]);
        return NextResponse.json({ ok: true, liked: false });
      } else {
        await query('INSERT INTO cms_forum_likes (user_id, target_type, target_id) VALUES (?, ?, ?)', [userId, targetType, targetId]);
        return NextResponse.json({ ok: true, liked: true });
      }
    }

    // ── Admin: pin/unpin thread ──
    if (action === 'pin_thread') {
      if (user.rank < 4) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const threadId = safeInt(body.thread_id, 1);
      const thread = await queryOne('SELECT pinned FROM cms_forum_threads WHERE id = ?', [threadId]);
      if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await query('UPDATE cms_forum_threads SET pinned = ? WHERE id = ?', [thread.pinned ? 0 : 1, threadId]);
      return NextResponse.json({ ok: true, pinned: !thread.pinned });
    }

    // ── Admin: lock/unlock thread ──
    if (action === 'lock_thread') {
      if (user.rank < 4) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const threadId = safeInt(body.thread_id, 1);
      const thread = await queryOne('SELECT locked FROM cms_forum_threads WHERE id = ?', [threadId]);
      if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await query('UPDATE cms_forum_threads SET locked = ? WHERE id = ?', [thread.locked ? 0 : 1, threadId]);
      return NextResponse.json({ ok: true, locked: !thread.locked });
    }

    // ── Admin: delete thread ──
    if (action === 'delete_thread') {
      if (user.rank < 4) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const threadId = safeInt(body.thread_id, 1);
      await query('DELETE FROM cms_forum_likes WHERE target_type = "reply" AND target_id IN (SELECT id FROM cms_forum_replies WHERE thread_id = ?)', [threadId]);
      await query('DELETE FROM cms_forum_likes WHERE target_type = "thread" AND target_id = ?', [threadId]);
      await query('DELETE FROM cms_forum_replies WHERE thread_id = ?', [threadId]);
      await query('DELETE FROM cms_forum_threads WHERE id = ?', [threadId]);
      return NextResponse.json({ ok: true });
    }

    // ── Admin: delete reply ──
    if (action === 'delete_reply') {
      if (user.rank < 4) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const replyId = safeInt(body.reply_id, 1);
      const reply = await queryOne('SELECT thread_id FROM cms_forum_replies WHERE id = ?', [replyId]);
      if (!reply) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await query('DELETE FROM cms_forum_likes WHERE target_type = "reply" AND target_id = ?', [replyId]);
      await query('DELETE FROM cms_forum_replies WHERE id = ?', [replyId]);
      await query('UPDATE cms_forum_threads SET reply_count = GREATEST(0, reply_count - 1) WHERE id = ?', [reply.thread_id]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[/api/forum POST]', err);
    return NextResponse.json({ error: 'Server error: ' + (err?.message || 'Unknown') }, { status: 500 });
  }
}
