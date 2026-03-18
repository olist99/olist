import Link from 'next/link';
import { query, queryScalar } from '@/lib/db';
import { timeAgo, formatNumber } from '@/lib/utils';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'News' };

export default async function NewsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.p || '1'));
  const perPage = 6;

  const total = await queryScalar('SELECT COUNT(*) FROM cms_news');
  const pages = Math.max(1, Math.ceil(total / perPage));
  const offset = (Math.min(page, pages) - 1) * perPage;

  const articles = await query(`
    SELECT n.*, u.username AS author_name, u.look AS author_look,
      (SELECT COUNT(*) FROM cms_news_comments WHERE news_id = n.id) AS comment_count,
      (SELECT COUNT(*) FROM cms_news_reactions WHERE news_id = n.id) AS reaction_count
    FROM cms_news n
    JOIN users u ON u.id = n.author_id
    ORDER BY n.pinned DESC, n.created_at DESC
    LIMIT ? OFFSET ?
  `, [perPage, offset]);

  return (
    <div className="animate-fade-up">
      <div className="title-header mb-5">
        <h2 className="text-xl font-bold">Community News</h2>
        <p className="text-xs text-text-secondary mt-0.5">Stay updated with the latest happenings</p>
      </div>

      {articles.map(article => (
        <div key={article.id} className="card mb-5 hover:border-border-hover">
          {article.image ? (
            <img src={article.image} alt={article.title} className="w-full h-52 object-cover" />
          ) : (
            <div className="w-full h-52 flex items-center justify-center text-7xl" style={{ background: 'linear-gradient(135deg, #1a2332, #162233)' }}><img src="/images/icon-news.png" alt="" style={{ width: 64, height: 64 }} /></div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-3 text-xs text-text-muted mb-2.5 flex-wrap">
              <span className="bg-accent text-bg-primary px-2 py-0.5 rounded font-bold text-[10px]">{article.tag}</span>
              <span>{timeAgo(article.created_at)} — {new Date(article.created_at.toString().trim().replace(' UTC','').replace(' ','T') + (article.created_at.toString().endsWith('Z') ? '' : 'Z')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>by <Link href={`/profile/${article.author_name}`} className="text-accent">{article.author_name}</Link></span>
              <span>👁 {formatNumber(article.views)}</span>
              <span><img src="/images/icon-comment.png" alt="" style={{ width: 12, height: 12, imageRendering: 'pixelated', verticalAlign: 'middle', marginRight: 3 }} />{article.comment_count}</span>
              <span>❤️ {article.reaction_count}</span>
              {article.pinned ? <span className="text-yellow-400">📌 Pinned</span> : null}
            </div>
            <h2 className="text-xl font-bold mb-2">
              <Link href={`/news/${article.id}`} className="text-text-primary hover:text-accent no-underline">{article.title}</Link>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              {article.short_desc || (article.content?.substring(0, 200) + '...')}
            </p>
            <Link href={`/news/${article.id}`} className="btn btn-secondary btn-sm mt-3 no-underline">Read More →</Link>
          </div>
        </div>
      ))}

      {articles.length === 0 && (
        <div className="card p-16 text-center text-text-muted">No news articles yet. Check back soon!</div>
      )}

      {pages > 1 && (
        <div className="flex gap-1.5 justify-center mt-6">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/news?p=${p}`}
              className={`px-3.5 py-2 rounded-md text-[13px] border no-underline transition-all
                ${p === page ? 'bg-accent text-bg-primary border-accent font-bold' : 'border-border text-text-secondary hover:border-accent hover:text-accent'}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
