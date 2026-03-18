import { redirect } from 'next/navigation';
import { isPluginEnabled } from '@/lib/plugins';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Forum' };

export default async function ForumPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('forum')) redirect('/');


  const categories = await query('SELECT * FROM cms_forum_categories ORDER BY sort_order ASC').catch(() => []);

  // Get latest thread + counts per category
  const stats = await query(`
    SELECT 
      t.category_id,
      COUNT(t.id) AS thread_count,
      SUM(t.reply_count) AS total_replies,
      MAX(t.last_reply_at) AS last_activity,
      (SELECT title FROM cms_forum_threads t2 WHERE t2.category_id = t.category_id ORDER BY t2.last_reply_at DESC LIMIT 1) AS latest_thread_title,
      (SELECT id FROM cms_forum_threads t2 WHERE t2.category_id = t.category_id ORDER BY t2.last_reply_at DESC LIMIT 1) AS latest_thread_id,
      (SELECT u.username FROM cms_forum_threads t2 JOIN users u ON u.id = t2.last_reply_user_id WHERE t2.category_id = t.category_id ORDER BY t2.last_reply_at DESC LIMIT 1) AS latest_username
    FROM cms_forum_threads t
    GROUP BY t.category_id
  `).catch(() => []);

  const statsMap = {};
  for (const s of stats) statsMap[s.category_id] = s;

  const visibleCategories = categories.filter(c => user.rank >= c.min_rank);

  return (
    <div className="animate-fade-up">
      <div className="title-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Forum</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Discuss, share, and connect with the community</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleCategories.map(cat => {
          const s = statsMap[cat.id];
          return (
            <Link key={cat.id} href={`/forum/${cat.id}`} style={{ textDecoration: 'none' }}>
              <div className="panel" style={{ padding: 20, display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 16, alignItems: 'center' }}>
                {/* Icon */}
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--panel-inner)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  <img src={cat.icon}></img>
                </div>

                {/* Info */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{cat.name}</span>
                    {cat.post_min_rank > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,166,35,0.15)', color: '#f5a623', textTransform: 'uppercase' }}>Staff Post</span>
                    )}
                  </div>
                  {cat.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{cat.description}</div>}
                  {s?.latest_thread_title && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Latest: <span style={{ color: 'var(--green)' }}>{s.latest_thread_title}</span>
                      {s.latest_username && <span> by {s.latest_username}</span>}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{(s?.thread_count || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>threads</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{(s?.total_replies || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>replies</div>
                </div>
              </div>
            </Link>
          );
        })}

        {visibleCategories.length === 0 && (
          <div className="panel no-hover" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No forum categories available.
          </div>
        )}
      </div>
    </div>
  );
}
