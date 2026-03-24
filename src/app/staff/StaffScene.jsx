'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

const RANK_COLORS = {
  1: '#8b949e', 2: '#f5a623', 3: '#5bc0de',
  4: '#3b82f6', 5: '#8b5cf6', 6: '#ef4444', 7: '#4ade80',
};

const HABBO = process.env.NEXT_PUBLIC_HABBO_IMG || 'https://www.habbo.com/habbo-imaging/avatarimage';

function figureUrl(look, dir, hd, sitting) {
  const action = sitting ? 'sit' : 'std';
  const gesture = sitting ? 'sml' : 'sml';
  return `${HABBO}?figure=${encodeURIComponent(look || '')}&direction=${dir}&head_direction=${hd}&gesture=${gesture}&action=${action}&size=l`;
}

// Direction label map
const DIR_LABELS = { 0:'↗', 1:'→', 2:'↘', 3:'↓', 4:'↙', 5:'←', 6:'↖', 7:'↑' };

// Default spread positions
function defaultPos(staff) {
  const base = {};
  staff.forEach((s, i) => {
    const cols = Math.min(5, staff.length);
    const col = i % cols;
    const row = Math.floor(i / cols);
    base[s.id] = { x: 10 + (col / Math.max(cols - 1, 1)) * 78, y: 28 + row * 28, direction: 2, head_direction: 2, sitting: 0 };
  });
  return base;
}

export default function StaffScene({ staff, initialPositions, canEdit, backgroundUrl, foregroundUrl }) {
  const [poses, setPoses] = useState(() => {
    const base = defaultPos(staff);
    staff.forEach(s => {
      if (initialPositions[s.id]) base[s.id] = { ...base[s.id], ...initialPositions[s.id] };
    });
    return base;
  });

  const [dragging, setDragging] = useState(null);
  const [hovered, setHovered] = useState(null);   // userId — triggers glow + bottom tooltip
  const [selected, setSelected] = useState(null); // userId — shows pose controls panel
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const containerRef = useRef(null);



  // ── Drag ──────────────────────────────────────────────────────────────────
  const startDrag = useCallback((e, uid) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const pos = poses[uid] || { x: 50, y: 50 };
    const ox = e.clientX - rect.left - (pos.x / 100) * rect.width;
    const oy = e.clientY - rect.top  - (pos.y / 100) * rect.height;
    setDragging({ id: uid, ox, oy });
    setHovered(null);
  }, [canEdit, poses]);

  const onMouseMove = useCallback((e) => {
    // Figure drag
    if (dragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(2, Math.min(94, ((e.clientX - rect.left - dragging.ox) / rect.width) * 100));
      const y = Math.max(2, Math.min(88, ((e.clientY - rect.top  - dragging.oy) / rect.height) * 100));
      setPoses(p => ({ ...p, [dragging.id]: { ...p[dragging.id], x, y } }));
      setDirty(true);
    }

  }, [dragging]);

  const onMouseUp = useCallback(() => {
    setDragging(null);

  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  // ── Pose helpers ──────────────────────────────────────────────────────────
  const setPose = (uid, key, val) => {
    setPoses(p => ({ ...p, [uid]: { ...p[uid], [key]: val } }));
    setDirty(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    await Promise.all([
      fetch('/api/staff-positions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: poses }),
      }),

    ]).catch(() => {});
    setSaving(false); setSaved(true); setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const sortedStaff = [...staff].sort((a, b) => a.rank - b.rank);
  const hoveredMember = hovered ? staff.find(s => s.id === hovered) : null;
  const selectedMember = selected ? staff.find(s => s.id === selected) : null;

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* ── Scene ── */}
      <div
        ref={containerRef}
        style={{
          position: 'relative', width: '100%', height: 500,
          borderRadius: 'var(--radius)', overflow: 'hidden',
          background: backgroundUrl
            ? `url(${backgroundUrl}) right bottom / auto no-repeat`
            : 'linear-gradient(180deg,#0d1117 0%,#161b22 40%,#1a2030 70%,#1f2937 100%)',
          cursor: dragging ? 'grabbing' : 'default',
          border: '1px solid var(--border)',
        }}
        onClick={() => setSelected(null)}
      >
        {/* Floor line */}
        <div style={{ position:'absolute', bottom:'12%', left:0, right:0, height:1, background:'rgba(255,255,255,0.04)', boxShadow:'0 0 40px rgba(255,255,255,0.04)' }} />

        {/* Edit badge */}
        {canEdit && (
          <div style={{ position:'absolute', top:10, left:10, background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:8, padding:'4px 10px', fontSize:10, fontWeight:700, color:'#4ade80', zIndex:50, pointerEvents:'none' }}>
            Edit - drag to move · click to set pose
          </div>
        )}

        {/* ── Figures ── */}
        {sortedStaff.map(s => {
          const p = poses[s.id] || { x:50, y:50, direction:2, head_direction:2, sitting:0 };
          const rankColor = RANK_COLORS[s.rank] || '#8b949e';
          const isGlowing = hovered === s.id || dragging?.id === s.id;
          const isSelected = selected === s.id;

          return (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`, top: `${p.y}%`,
                transform: 'translate(-50%,-100%)',
                zIndex: dragging?.id === s.id ? 300 : isGlowing ? 200 : 10 + s.rank,
                cursor: canEdit ? (dragging?.id === s.id ? 'grabbing' : 'grab') : 'pointer',
                transition: dragging?.id === s.id ? 'none' : 'filter 0.2s',
                filter: isGlowing
                  ? `drop-shadow(0 0 14px ${rankColor}) drop-shadow(0 0 28px ${rankColor}66)`
                  : 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))',
              }}
              onMouseDown={e => startDrag(e, s.id)}
              onMouseEnter={() => { if (!dragging) setHovered(s.id); }}
              onMouseLeave={() => setHovered(null)}
              onClick={e => { e.stopPropagation(); if (canEdit) setSelected(isSelected ? null : s.id); }}
            >
              {/* Selection ring */}
              {isSelected && (
                <div style={{ position:'absolute', inset:-4, borderRadius:8, border:`2px solid ${rankColor}`, pointerEvents:'none', boxShadow:`0 0 12px ${rankColor}66` }} />
              )}

              <img
                src={figureUrl(s.look, p.direction, p.head_direction, p.sitting)}
                alt={s.username}
                draggable={false}
                style={{ imageRendering:'pixelated', display:'block', height: 110, width:'auto' }}
                onError={e => { e.target.style.opacity = '0.3'; }}
              />

            </div>
          );
        })}

        {/* ── Foreground overlay (positionable, in front of figures) ── */}
        {foregroundUrl && (
          <div style={{
            position: 'absolute', right: 0, bottom: 0, width: 1500, height: 500,
            pointerEvents: 'none', zIndex: 400,
          }}>
            <img src={foregroundUrl} alt="" draggable={false}
              style={{ display: 'block', imageRendering: 'pixelated' }} />
          </div>
        )}

        {/* ── Bottom-left tooltip box ── */}
        {hoveredMember && !dragging && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14, zIndex: 500,
            background: 'rgba(8,8,16,0.92)',
            border: `1px solid ${RANK_COLORS[hoveredMember.rank] || '#8b949e'}44`,
            borderRadius: 10, padding: '12px 16px', minWidth: 180,
            boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${RANK_COLORS[hoveredMember.rank] || '#8b949e'}22`,
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            animation: 'tooltipIn 0.15s ease-out',
          }}>
            <style>{`@keyframes tooltipIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div style={{ fontWeight:800, fontSize:15, color:'#fff', marginBottom:3 }}>{hoveredMember.username}</div>
            <div style={{ fontWeight:700, fontSize:11, color: RANK_COLORS[hoveredMember.rank] || '#8b949e', marginBottom:6 }}>
              {hoveredMember.rank_name || `Rank ${hoveredMember.rank}`}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
              <span style={{
                width:8, height:8, borderRadius:'50%', display:'inline-block', flexShrink:0,
                background: hoveredMember.online ? '#4ade80' : '#6b7280',
                boxShadow: hoveredMember.online ? '0 0 8px #4ade80' : 'none',
              }} />
              <span style={{ color: hoveredMember.online ? '#4ade80' : '#6b7280', fontWeight:600 }}>
                {hoveredMember.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        )}

        {/* ── Pose control panel (appears when a figure is selected in edit mode) ── */}
        {canEdit && selectedMember && (() => {
          const p = poses[selectedMember.id];
          const rankColor = RANK_COLORS[selectedMember.rank] || '#8b949e';
          return (
            <div
              style={{
                position: 'absolute', bottom: 14, right: 14, zIndex: 500,
                background: 'rgba(8,8,16,0.95)',
                border: `1px solid ${rankColor}44`,
                borderRadius: 10, padding: '14px 16px', minWidth: 200,
                boxShadow: `0 4px 24px rgba(0,0,0,0.6)`,
                backdropFilter: 'blur(8px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontWeight:800, fontSize:13, color:'#fff', marginBottom:12 }}>
                {selectedMember.username}
              </div>

              {/* Body direction */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:1 }}>Body Direction</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:3 }}>
                  {[7,0,1,6,2,5,4,3].map(d => (
                    <button key={d} onClick={() => setPose(selectedMember.id, 'direction', d)}
                      style={{
                        padding:'5px 0', borderRadius:5, fontSize:13, fontFamily:'inherit',
                        border: p.direction === d ? `1px solid ${rankColor}` : '1px solid rgba(255,255,255,0.1)',
                        background: p.direction === d ? `${rankColor}22` : 'rgba(255,255,255,0.04)',
                        color: p.direction === d ? rankColor : 'var(--text-muted)',
                        cursor:'pointer',
                      }}>
                      {DIR_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Head direction */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:1 }}>Head Direction</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:3 }}>
                  {[7,0,1,6,2,5,4,3].map(d => (
                    <button key={d} onClick={() => setPose(selectedMember.id, 'head_direction', d)}
                      style={{
                        padding:'5px 0', borderRadius:5, fontSize:13, fontFamily:'inherit',
                        border: p.head_direction === d ? `1px solid ${rankColor}` : '1px solid rgba(255,255,255,0.1)',
                        background: p.head_direction === d ? `${rankColor}22` : 'rgba(255,255,255,0.04)',
                        color: p.head_direction === d ? rankColor : 'var(--text-muted)',
                        cursor:'pointer',
                      }}>
                      {DIR_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sitting toggle */}
              <div style={{ marginBottom:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:1 }}>Pose</div>
                <div style={{ display:'flex', gap:6 }}>
                  {[{ label:'🧍 Standing', val:0 }, { label:'🪑 Sitting', val:1 }].map(({ label, val }) => (
                    <button key={val} onClick={() => setPose(selectedMember.id, 'sitting', val)}
                      style={{
                        flex:1, padding:'6px 0', borderRadius:5, fontSize:11, fontWeight:700, fontFamily:'inherit',
                        border: p.sitting === val ? `1px solid ${rankColor}` : '1px solid rgba(255,255,255,0.1)',
                        background: p.sitting === val ? `${rankColor}22` : 'rgba(255,255,255,0.04)',
                        color: p.sitting === val ? rankColor : 'var(--text-muted)',
                        cursor:'pointer',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Save button ── */}
      {canEdit && dirty && (
        <div style={{ position:'absolute', bottom:16, right: selectedMember ? 230 : 16, display:'flex', gap:8, zIndex:600, transition:'right 0.2s' }}>
          <button onClick={save} disabled={saving} style={{
            padding:'8px 20px', borderRadius:20, fontSize:12, fontWeight:700,
            background: saved ? 'rgba(74,222,128,0.2)' : 'rgba(74,222,128,0.15)',
            color:'#4ade80', border:'1px solid rgba(74,222,128,0.4)',
            cursor: saving ? 'wait' : 'pointer', fontFamily:'inherit',
            boxShadow:'0 2px 12px rgba(0,0,0,0.4)',
          }}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Layout'}
          </button>
        </div>
      )}
    </div>
  );
}
