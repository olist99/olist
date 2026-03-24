import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import PollCard from './PollCard';

export const metadata = { title: 'Polls & Surveys' };

export default async function PollsPage() {
  const user = await getCurrentUser();

  const polls = await query(`
    SELECT p.*,
      u.username AS created_by_name,
      (SELECT COUNT(*) FROM cms_poll_votes v WHERE v.poll_id = p.id) AS total_votes,
      (SELECT COUNT(*) FROM cms_poll_votes v WHERE v.poll_id = p.id AND v.user_id = ?) AS user_voted
    FROM cms_polls p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.active = 1
    ORDER BY p.created_at DESC
    LIMIT 20
  `, [user?.id || 0]).catch(() => []);

  // For each poll, get options with vote counts
  const pollsWithOptions = await Promise.all(polls.map(async (poll) => {
    const options = await query(`
      SELECT o.*, COUNT(v.id) AS vote_count,
        MAX(CASE WHEN v.user_id = ? THEN 1 ELSE 0 END) AS user_picked
      FROM cms_poll_options o
      LEFT JOIN cms_poll_votes v ON v.option_id = o.id
      WHERE o.poll_id = ?
      GROUP BY o.id
      ORDER BY o.sort_order ASC, o.id ASC
    `, [user?.id || 0, poll.id]).catch(() => []);
    return { ...poll, options };
  }));

  return (
    <div className="animate-fade-up">
      <div className="title-header mb-6">
        <h2 className="text-xl font-bold">Polls & Surveys</h2>
        <p className="text-xs text-text-secondary mt-0.5">Have your say — vote on community polls</p>
      </div>

      {pollsWithOptions.length === 0 ? (
        <div className="card p-16 text-center text-text-muted">No active polls right now. Check back soon!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pollsWithOptions.map(poll => (
            <PollCard key={poll.id} poll={poll} userId={user?.id || null} />
          ))}
        </div>
      )}
    </div>
  );
}
