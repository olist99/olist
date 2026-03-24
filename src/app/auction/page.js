import { redirect } from 'next/navigation';
import { isPluginEnabled } from '@/lib/plugins';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import AuctionClient from './AuctionClient';

export const metadata = { title: 'Auction House' };

export default async function AuctionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!await isPluginEnabled('auction')) redirect('/');

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
    WHERE a.end_time > NOW() OR (a.status = 'ended' AND a.end_time > DATE_SUB(NOW(), INTERVAL 24 HOUR))
    ORDER BY a.is_official DESC, a.id DESC
    LIMIT 50
  `).catch(() => []);

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-4 title-header">
        <div>
          <h2 className="text-xl font-bold">Auction House</h2>
          <p className="text-xs text-text-secondary mt-0.5">Bid on official and player auctions. Highest bid wins!</p>
        </div>
      </div>

      <AuctionClient
        userId={user.id}
        userRank={user.rank}
        initialAuctions={JSON.parse(JSON.stringify(auctions))}
      />
    </div>
  );
}
