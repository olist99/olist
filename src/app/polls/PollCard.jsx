'use client';
import { useState } from 'react';

export default function PollCard({ poll, userId }) {
  const [options, setOptions] = useState(poll.options);
  const [totalVotes, setTotalVotes] = useState(Number(poll.total_votes));
  const [userVoted, setUserVoted] = useState(!!poll.user_voted);
  const [selectedOption, setSelectedOption] = useState(
    poll.options.find(o => o.user_picked)?.id || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canVote = !!userId && !userVoted && poll.is_open;

  const vote = async (optionId) => {
    if (!canVote || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', poll_id: poll.id, option_id: optionId }),
      });
      const data = await res.json();
      if (data.ok) {
        setOptions(data.options);
        setTotalVotes(data.total_votes);
        setUserVoted(true);
        setSelectedOption(optionId);
      } else {
        setError(data.error || 'Failed to vote');
      }
    } catch {
      setError('Connection error');
    }
    setLoading(false);
  };

  const showResults = userVoted || !poll.is_open || !userId;
  const maxVotes = Math.max(...options.map(o => Number(o.vote_count)), 1);

  const expiresAt = poll.expires_at ? new Date(poll.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{poll.question}</h3>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>👤 {poll.created_by_name}</span>
            <span>🗳 {totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            {expiresAt && !isExpired && (
              <span style={{ color: '#f5a623' }}>
                ⏱ Closes {expiresAt.toLocaleDateString()}
              </span>
            )}
            {isExpired && <span style={{ color: '#EF5856' }}>Closed</span>}
          </div>
        </div>
        {userVoted && (
          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(52,189,89,0.12)', color: '#34bd59', flexShrink: 0 }}>
            Voted
          </span>
        )}
      </div>

      {poll.description && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{poll.description}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => {
          const votes = Number(opt.vote_count);
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMyVote = selectedOption === opt.id;
          const isWinner = showResults && votes === maxVotes && totalVotes > 0;

          return (
            <div key={opt.id}>
              {showResults ? (
                // Results bar
                <div style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                    <span style={{ fontWeight: isMyVote ? 700 : 400, color: isMyVote ? 'var(--green)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isMyVote && <span style={{ fontSize: 10 }}>✓</span>}
                      {opt.option_text}
                    </span>
                    <span style={{ fontWeight: 700, color: isWinner ? '#f5a623' : 'var(--text-muted)', fontSize: 12 }}>
                      {pct}% ({votes})
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--panel-inner)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${pct}%`,
                      background: isMyVote ? 'var(--green)' : isWinner ? '#f5a623' : 'rgba(255,255,255,0.2)',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                  </div>
                </div>
              ) : (
                // Vote button
                <button
                  onClick={() => vote(opt.id)}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '10px 16px', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: loading ? 'var(--panel-inner)' : 'var(--panel-inner)',
                    color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--green)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {opt.option_text}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#EF5856' }}>{error}</div>}

      {!userId && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--green)' }}>Log in</a> to vote
        </div>
      )}
    </div>
  );
}
