import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { safeBet, oneOf, checkRateLimit } from '@/lib/security';
import crypto from 'crypto';

// Cryptographically secure random int [0, max)
function secureRandom(max) {
  return crypto.randomInt(0, max);
}

const VALID_ROULETTE_CHOICES = ['red','black','green','even','odd','1-12','13-24','25-36',
  ...Array.from({length:37},(_,i)=>String(i))];
const VALID_BJ_ACTIONS = ['deal', 'hit', 'stand'];

export async function POST(request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Rate limit: 30 bets per minute per user
  const rl = checkRateLimit(`gambling:${userId}`, 30, 60000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfter}s`, retryAfter: rl.retryAfter },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { game, choice } = body;

  // Validate game type
  const validGame = oneOf(game, ['roulette', 'coinflip', 'blackjack']);
  if (!validGame) return NextResponse.json({ error: 'Invalid game' }, { status: 400 });

  // Validate bet amount (not used by roulette which has per-choice bets)
  // For blackjack hit/stand, bet was already deducted on deal, so skip validation
  const bjAction = validGame === 'blackjack' ? oneOf(body.action, VALID_BJ_ACTIONS) : null;
  const skipBetCheck = validGame === 'roulette' || (validGame === 'blackjack' && (bjAction === 'hit' || bjAction === 'stand'));
  const bet = !skipBetCheck ? safeBet(body.bet, 1000000) : (parseInt(body.bet) || 0);
  if (!skipBetCheck && bet === null) return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });

  // Diamonds only — hardcoded
  const currencyColumn = 'points';

  const user = await queryOne('SELECT points FROM users WHERE id = ?', [userId]);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });
  if (!skipBetCheck && user.points < bet) {
    return NextResponse.json({ error: 'NOT_ENOUGH', type: 'insufficient_funds' }, { status: 400 });
  }

  let result;

  try {
    // ── ROULETTE (multi-bet) ──
    if (validGame === 'roulette') {
      const betsObj = body.bets;
      if (!betsObj || typeof betsObj !== 'object' || Object.keys(betsObj).length === 0) {
        return NextResponse.json({ error: 'No bets placed' }, { status: 400 });
      }

      // Validate and sum all bets
      let totalBet = 0;
      const validBets = {};
      for (const [choice, amount] of Object.entries(betsObj)) {
        if (!VALID_ROULETTE_CHOICES.includes(choice)) {
          return NextResponse.json({ error: `Invalid choice: ${choice}` }, { status: 400 });
        }
        const amt = parseInt(amount);
        if (!amt || amt < 1 || amt > 10000000) {
          return NextResponse.json({ error: `Invalid bet amount on ${choice}` }, { status: 400 });
        }
        validBets[choice] = amt;
        totalBet += amt;
      }

      if (totalBet > 10000000) return NextResponse.json({ error: 'Total bet too large' }, { status: 400 });
      if (totalBet > user.points) return NextResponse.json({ error: 'Not enough diamonds' }, { status: 400 });

      const number = secureRandom(37);
      const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
      const isBlack = number > 0 && !isRed;
      const isGreen = number === 0;

      function getMultiplier(c) {
        if (c === 'red' && isRed) return 2;
        if (c === 'black' && isBlack) return 2;
        if (c === 'green' && isGreen) return 14;
        if (c === 'even' && number > 0 && number % 2 === 0) return 2;
        if (c === 'odd' && number % 2 === 1) return 2;
        if (c === '1-12' && number >= 1 && number <= 12) return 3;
        if (c === '13-24' && number >= 13 && number <= 24) return 3;
        if (c === '25-36' && number >= 25 && number <= 36) return 3;
        if (c === String(number)) return 36;
        return 0;
      }

      let totalWin = 0;
      const winningBets = [];
      for (const [choice, amt] of Object.entries(validBets)) {
        const mult = getMultiplier(choice);
        if (mult > 0) {
          const payout = amt * mult;
          totalWin += payout;
          winningBets.push({ choice, bet: amt, multiplier: mult, payout });
        }
      }

      const profit = totalWin - totalBet;

      const upd = await query(
        'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
        [profit, userId, profit]
      );
      if (upd.affectedRows === 0) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      result = {
        game: 'roulette', number,
        color: isGreen ? 'green' : isRed ? 'red' : 'black',
        totalBet, totalWin, profit,
        winningBets,
        balance: user.points + profit,
      };
    }

    // ── COIN TOSS ──
    else if (validGame === 'coinflip') {
      if (!oneOf(choice, ['heads', 'tails'])) {
        return NextResponse.json({ error: 'Invalid choice: pick heads or tails' }, { status: 400 });
      }

      const flip = secureRandom(2) === 0 ? 'heads' : 'tails';
      const win = flip === choice;
      const profit = win ? bet : -bet;

      const upd = await query(
        'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
        [profit, userId, profit]
      );
      if (upd.affectedRows === 0) {
        return NextResponse.json({ error: 'NOT_ENOUGH', type: 'insufficient_funds' }, { status: 400 });
      }

      result = {
        game: 'coinflip', flip, win, profit,
        winnings: win ? bet * 2 : 0,
        balance: user.points + profit,
      };
    }

    // ── BLACKJACK ──
    else if (validGame === 'blackjack') {
      const action = bjAction;
      if (!action) return NextResponse.json({ error: 'Invalid blackjack action' }, { status: 400 });

      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

      function cardValue(rank) {
        if (['J','Q','K'].includes(rank)) return 10;
        if (rank === 'A') return 11;
        return parseInt(rank);
      }
      function handTotal(cards) {
        let total = cards.reduce((s, c) => s + cardValue(c.rank), 0);
        let aces = cards.filter(c => c.rank === 'A').length;
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return total;
      }
      function drawCard(usedCards) {
        let card, attempts = 0;
        do {
          card = {
            suit: suits[secureRandom(4)],
            rank: ranks[secureRandom(13)],
          };
          attempts++;
          if (attempts > 200) break; // safety valve
        } while (usedCards.some(c => c.suit === card.suit && c.rank === card.rank));
        return card;
      }

      // Validate handState if present (prevent tampering)
      function validateHandState(hs) {
        if (!hs || typeof hs !== 'object') return false;
        if (!Array.isArray(hs.playerCards) || !Array.isArray(hs.dealerHidden)) return false;
        if (hs.playerCards.length < 2 || hs.playerCards.length > 10) return false;
        if (hs.dealerHidden.length < 2 || hs.dealerHidden.length > 10) return false;
        // Validate each card
        for (const cards of [hs.playerCards, hs.dealerHidden]) {
          for (const c of cards) {
            if (!suits.includes(c.suit) || !ranks.includes(c.rank)) return false;
          }
        }
        // Check no duplicate cards
        const all = [...hs.playerCards, ...hs.dealerHidden];
        const keys = all.map(c => `${c.suit}:${c.rank}`);
        if (new Set(keys).size !== keys.length) return false;
        return true;
      }

      if (action === 'deal') {
        const playerCards = [drawCard([])];
        playerCards.push(drawCard(playerCards));
        const dealerCards = [drawCard(playerCards)];
        dealerCards.push(drawCard([...playerCards, ...dealerCards]));

        const playerTotal = handTotal(playerCards);
        const dealerTotal = handTotal(dealerCards);

        if (playerTotal === 21) {
          const profit = dealerTotal === 21 ? 0 : Math.floor(bet * 1.5);
          await query(
            'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
            [profit, userId, profit]
          );
          result = {
            game: 'blackjack', action: 'result',
            playerCards, dealerCards, playerTotal, dealerTotal,
            win: profit > 0, push: profit === 0, blackjack: true,
            profit, balance: user.points + profit,
          };
        } else {
          // Deduct bet atomically
          const upd = await query(
            'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?',
            [bet, userId, bet]
          );
          if (upd.affectedRows === 0) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
          }
          result = {
            game: 'blackjack', action: 'playing',
            playerCards,
            dealerCards: [dealerCards[0], { suit: 'hidden', rank: 'hidden' }],
            dealerHidden: dealerCards,
            playerTotal,
            dealerShowing: cardValue(dealerCards[0].rank),
            balance: user.points - bet,
          };
        }
      }

      else if (action === 'hit') {
        const { handState } = body;
        if (!validateHandState(handState)) {
          return NextResponse.json({ error: 'Invalid hand state' }, { status: 400 });
        }

        const allCards = [...handState.playerCards, ...handState.dealerHidden];
        const newCard = drawCard(allCards);
        const playerCards = [...handState.playerCards, newCard];
        const playerTotal = handTotal(playerCards);

        if (playerTotal > 21) {
          result = {
            game: 'blackjack', action: 'result',
            playerCards, dealerCards: handState.dealerHidden,
            playerTotal, dealerTotal: handTotal(handState.dealerHidden),
            win: false, bust: true, profit: -bet,
            balance: user.points,
          };
        } else {
          result = {
            game: 'blackjack', action: 'playing',
            playerCards,
            dealerCards: [handState.dealerHidden[0], { suit: 'hidden', rank: 'hidden' }],
            dealerHidden: handState.dealerHidden,
            playerTotal,
            dealerShowing: cardValue(handState.dealerHidden[0].rank),
            balance: user.points,
          };
        }
      }

      else if (action === 'stand') {
        const { handState } = body;
        if (!validateHandState(handState)) {
          return NextResponse.json({ error: 'Invalid hand state' }, { status: 400 });
        }

        const playerCards = handState.playerCards;
        let dealerCards = [...handState.dealerHidden];
        const allUsed = [...playerCards, ...dealerCards];

        while (handTotal(dealerCards) < 17) {
          dealerCards.push(drawCard([...allUsed, ...dealerCards]));
        }

        const playerTotal = handTotal(playerCards);
        const dealerTotal = handTotal(dealerCards);

        let win = false, push = false;
        if (dealerTotal > 21 || playerTotal > dealerTotal) win = true;
        else if (playerTotal === dealerTotal) push = true;

        const adjustment = win ? bet * 2 : push ? bet : 0;
        if (adjustment > 0) {
          await query('UPDATE users SET points = points + ? WHERE id = ?', [adjustment, userId]);
        }

        result = {
          game: 'blackjack', action: 'result',
          playerCards, dealerCards, playerTotal, dealerTotal,
          win, push, profit: win ? bet : push ? 0 : -bet,
          balance: user.points + adjustment,
        };
      }
    }

    // Log the result for livefeed
    try {
      let logBet = 0, logProfit = 0, logDetail = '';
      if (result.game === 'roulette') {
        logBet = result.totalBet || 0;
        logProfit = result.profit || 0;
        logDetail = `#${result.number} ${result.color}`;
      } else if (result.game === 'coinflip') {
        logBet = bet;
        logProfit = result.profit || 0;
        logDetail = result.flip || '';
      } else if (result.game === 'blackjack' && (result.action === 'result' || result.bust)) {
        logBet = bet;
        logProfit = result.profit || 0;
        logDetail = result.blackjack ? 'Blackjack' : result.bust ? 'Bust' : result.push ? 'Push' : (result.win ? 'Win' : 'Lose');
      }
      if (logBet > 0 || logProfit !== 0) {
        await query('INSERT INTO cms_gambling_log (user_id, game, bet, profit, detail) VALUES (?,?,?,?,?)',
          [userId, result.game, logBet, logProfit, logDetail]);
      }
    } catch {}

    return NextResponse.json({ ok: true, ...result });

  } catch (err) {
    console.error('Gambling error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
