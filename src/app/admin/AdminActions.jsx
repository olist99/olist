'use client';
import { useState } from 'react';

export default function AdminActions({ userId, username, currentRank, adminRank }) {
  const [showMenu, setShowMenu] = useState(false);

  const action = async (actionType, data = {}) => {
    const res = await fetch('/admin/api/user-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: actionType, ...data }),
    });
    const result = await res.json();
    if (result.ok) {
      window.location.reload();
    } else {
      alert(result.error || 'Action failed');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn btn-sm btn-secondary"
        style={{ padding: '4px 10px', fontSize: 10 }}>
        ⋮
      </button>
      {showMenu && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 10,
          background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--radius)', padding: 8, minWidth: 160,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <button onClick={() => action('give_credits', { amount: prompt('Credits amount:', '1000') })}
            style={menuStyle}>Give Credits</button>
          <button onClick={() => action('give_pixels', { amount: prompt('Duckets amount:', '500') })}
            style={menuStyle}>Give Duckets</button>
          <button onClick={() => action('give_points', { amount: prompt('Diamonds amount:', '100') })}
            style={menuStyle}>Give Diamonds</button>
          {adminRank >= 6 && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <button onClick={() => action('set_rank', { rank: prompt('New rank (1-7):', currentRank) })}
                style={menuStyle}> Set Rank</button>
              <button onClick={() => action('set_motto', { motto: prompt('New motto:', '') })}
                style={menuStyle}> Set Motto</button>
            </>
          )}
          {adminRank >= 5 && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <button onClick={() => { if (confirm(`Ban ${username}?`)) action('ban'); }}
                style={{ ...menuStyle, color: 'var(--red)' }}>🔨 Ban User</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const menuStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'none', border: 'none', color: 'var(--text-secondary)',
  padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  borderRadius: 4, fontFamily: 'inherit',
};
