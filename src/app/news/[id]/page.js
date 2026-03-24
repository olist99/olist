import { notFound, redirect } from 'next/navigation';
import { reactAction, commentAction } from './actions';
import Link from 'next/link';
import { getCurrentUser, getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { timeAgo, RANK_COLORS } from '@/lib/utils';
import Avatar from '@/components/Avatar';

export async function generateMetadata({ params }) {
  const p = await params;
  const article = await queryOne('SELECT title FROM cms_news WHERE id = ?', [p.id]);
  return { title: article?.title || 'Article' };
}

const REACTION_EMOJIS = { like: '👍', love: '❤️', laugh: '😂', wow: '😮', sad: '😢' };

export default async function NewsDetailPage({ params }) {
  const p = await params;
  const articleId = parseInt(p.id);

  const article = await queryOne(
    'SELECT n.*, u.username AS author_name, u.look AS author_look FROM cms_news n JOIN users u ON u.id = n.author_id WHERE n.id = ?',
    [articleId]
  );
  if (!article) notFound();

  await query('UPDATE cms_news SET views = views + 1 WHERE id = ?', [articleId]);

  const user = await getCurrentUser();

  const reactionsRaw = await query('SELECT reaction, COUNT(*) AS cnt FROM cms_news_reactions WHERE news_id = ? GROUP BY reaction', [articleId]);
  const reactions = {};
  reactionsRaw.forEach(r => { reactions[r.reaction] = r.cnt; });

  let userReaction = null;
  if (user) {
    const ur = await queryOne('SELECT reaction FROM cms_news_reactions WHERE news_id = ? AND user_id = ?', [articleId, user.id]);
    if (ur) userReaction = ur.reaction;
  }

  const comments = await query(`
    SELECT c.*, u.username, u.look, u.rank, p.rank_name
    FROM cms_news_comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN permissions p ON p.id = u.\`rank\`
    WHERE c.news_id = ? ORDER BY c.created_at ASC
  `, [articleId]);



  return (
    <div className="animate-fade-up">
      <div className="card mb-5">
        {article.image ? (
          <img src={article.image} alt={article.title} className="w-full max-h-[350px] object-cover" />
        ) : (
          <div className="h-52 flex items-center justify-center text-8xl" style={{ background: 'linear-gradient(135deg, #1a2332, #162233)' }}><img src="/images/icon-news.png" alt="" style={{ width: 64, height: 64 }} /></div>
        )}
        <div className="p-6">
          <div className="flex items-center gap-3 text-xs text-text-muted mb-4 flex-wrap">
            <span className="bg-accent text-bg-primary px-2 py-0.5 rounded font-bold text-[10px]">{article.tag}</span>
            <span>📅 {new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span className="flex items-center gap-1">
              by <Link href={'/profile/' + article.author_name} className="text-accent flex items-center gap-1">
                <Avatar look={article.author_look} size="s" style={{ width: 20, height: 28 }} /> {article.author_name}
              </Link>
            </span>
            <span>👁 {article.views} views</span>
            <span><img src="/images/icon-comment.png" alt="" style={{ width: 12, height: 12, imageRendering: 'pixelated', verticalAlign: 'middle', marginRight: 3 }} />{comments.length} comments</span>
          </div>

          <h1 className="text-[26px] font-bold mb-4">{article.title}</h1>
          <div className="text-[15px] leading-relaxed text-text-secondary whitespace-pre-line">{article.content}</div>

          {/* Reactions */}
          <div className="flex gap-2 py-4 border-y border-border my-4 flex-wrap">
            {user ? (
              Object.entries(REACTION_EMOJIS).map(([key, emoji]) => (
                <form key={key} action={reactAction} className="inline">
                  <input type="hidden" name="article_id" value={articleId} />
                  <input type="hidden" name="reaction" value={key} />
                  <button type="submit"
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[13px] cursor-pointer transition-all
                      ${userReaction === key
                        ? 'border-accent text-accent bg-accent/5'
                        : 'border-border text-text-secondary bg-bg-primary hover:border-accent hover:text-accent'}`}>
                    <span className="text-base">{emoji}</span> {reactions[key] || 0}
                  </button>
                </form>
              ))
            ) : (
              <>
                {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => (
                  <span key={key} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-text-secondary bg-bg-primary text-[13px]">
                    <span className="text-base">{emoji}</span> {reactions[key] || 0}
                  </span>
                ))}
                <span className="text-xs text-text-muted ml-auto self-center"><Link href="/login" className="text-accent">Log in</Link> to react</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card">
        <div className="px-6 py-4 border-b border-border"><h3 className="font-bold"><img src="/images/icon-comment.png" alt="" style={{ width: 12, height: 12, imageRendering: 'pixelated', verticalAlign: 'middle', marginRight: 3 }} />Comments ({comments.length})</h3></div>
        <div className="p-6">
          {user ? (
            <form action={commentAction} className="mb-6">
              <input type="hidden" name="article_id" value={articleId} />
              <textarea name="comment_text" className="input min-h-[80px] resize-y mb-2.5" placeholder="Write a comment..." maxLength={1000} required />
              <button type="submit" className="btn btn-primary btn-sm">Post Comment</button>
            </form>
          ) : (
            <div className="p-4 bg-bg-primary rounded-md text-center mb-5 border border-border text-sm">
              <Link href="/login" className="text-accent">Log in</Link> to leave a comment.
            </div>
          )}

          {comments.map(c => {
            const rankColor = RANK_COLORS[c.rank] || '#8b949e';
            return (
              <div key={c.id} className="flex gap-3.5 py-4 border-b border-border last:border-0">
                <div className="flex-shrink-0">
                  <Link href={'/profile/' + c.username}>
                    <Avatar look={c.look} size="s" />
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Link href={'/profile/' + c.username} className="font-bold text-sm no-underline" style={{ color: rankColor }}>
                      {c.username}
                    </Link>
                    <span className="text-[11px]" style={{ color: rankColor }}>{c.rank_name || 'Member'}</span>
                    <span className="text-[11px] text-text-muted">{timeAgo(c.created_at)}</span>
                  </div>
                  <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{c.content}</div>
                </div>
              </div>
            );
          })}

          {comments.length === 0 && (
            <p className="text-center text-text-muted py-5">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Link href="/news" className="btn btn-secondary btn-sm no-underline">← Back to News</Link>
      </div>
    </div>
  );
}