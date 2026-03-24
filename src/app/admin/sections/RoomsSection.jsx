import { editRoomAction, deleteRoomAction, boostScoreAction, resetScoreAction } from './actions/rooms';
import Link from 'next/link';
import { query, queryOne, queryScalar } from '@/lib/db';

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 };

export default async function RoomsSection({ view, sp, user }) {

  // ── Edit Room ─────────────────────────────────────────────────────────────
  if (view === 'edit' && sp?.id) {
    const room = await queryOne('SELECT * FROM rooms WHERE id = ?', [parseInt(sp.id)]).catch(() => null);
    if (!room) return (
      <div className="panel no-hover" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Room not found.</p>
        <Link href="/admin?tab=rooms" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Back</Link>
      </div>
    );


    return (
      <div>
        <Link href="/admin?tab=rooms" className="btn btn-secondary btn-sm" style={{ marginBottom: 16, display: 'inline-block' }}>← Back to Rooms</Link>
        <div className="panel no-hover" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Room: {room.name}</h3>
          <form action={editRoomAction}>
            <input type="hidden" name="room_id" value={room.id} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={labelStyle}>Room Name *</label><input type="text" name="name" defaultValue={room.name} required /></div>
              <div><label style={labelStyle}>Max Users</label><input type="number" name="users_max" defaultValue={room.users_max || 25} min={1} max={250} /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label style={labelStyle}>Description</label><textarea name="description" defaultValue={room.description||''} rows={3} /></div>
            <div style={{ marginBottom: 20 }}><label style={labelStyle}>Tags</label><input type="text" name="tags" defaultValue={room.tags||''} placeholder="tag1,tag2,tag3" /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <Link href="/admin?tab=rooms" className="btn btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
        <div className="panel no-hover" style={{ padding: 20, marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span>ID: <strong style={{ color: 'var(--text-secondary)' }}>{room.id}</strong></span>
            <span>Owner ID: <Link href={`/admin?tab=users&view=profile&id=${room.owner_id}`} style={{ color: 'var(--green)' }}>{room.owner_id}</Link></span>
            <span>Current users: <strong style={{ color: 'var(--text-secondary)' }}>{room.users}</strong></span>
            <span>Score: <strong style={{ color: 'var(--text-secondary)' }}>{room.score}</strong></span>
            <span>State: <strong style={{ color: 'var(--text-secondary)' }}>{room.state}</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // ── Delete Rooms ──────────────────────────────────────────────────────────
  if (view === 'delete') {
    const search = sp?.search || '';
    const rooms = search ? await query(
      'SELECT r.id, r.name, r.owner_id, r.users, r.score, u.username AS owner_name FROM rooms r LEFT JOIN users u ON u.id = r.owner_id WHERE r.name LIKE ? ORDER BY r.id DESC LIMIT 30',
      [`%${search}%`]
    ).catch(() => []) : [];


    return (
      <div>
        <SectionHeader title="Delete Rooms" sub="Search and permanently delete rooms" back="rooms" />
        <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
          <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="tab" value="rooms" />
            <input type="hidden" name="view" value="delete" />
            <input type="text" name="search" placeholder="Search room name..." defaultValue={search} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
        </div>
        {rooms.length > 0 && (
          <div className="panel no-hover" style={{ padding: 20 }}>
            <table className="table-panel">
              <thead><tr><th>ID</th><th>Name</th><th>Owner</th><th>Users</th><th></th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.owner_name}</td>
                    <td>{r.users}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/admin?tab=rooms&view=edit&id=${r.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                      <form action={deleteRoomAction}>
                        <input type="hidden" name="room_id" value={r.id} />
                        <button type="submit" className="btn btn-sm btn-delete" onClick="return confirm('Delete this room permanently?')">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Room Logs ─────────────────────────────────────────────────────────────
  if (view === 'logs') {
    const roomSearch = sp?.room || '';
    const userSearch = sp?.username || '';
    const roomId     = sp?.id ? parseInt(sp.id) : null;

    const whereArr = [], params = [];
    if (roomId)     { whereArr.push('rel.room_id = ?');    params.push(roomId); }
    if (userSearch) { whereArr.push('u.username LIKE ?');  params.push(`%${userSearch}%`); }
    if (roomSearch && !roomId) { whereArr.push('r.name LIKE ?'); params.push(`%${roomSearch}%`); }
    const whereClause = whereArr.length ? 'WHERE ' + whereArr.join(' AND ') : '';

    const enterLogs = await query(`
      SELECT rel.user_id, rel.room_id, rel.timestamp,
             u.username, r.name AS room_name
      FROM room_enter_log rel
      LEFT JOIN users u ON u.id = rel.user_id
      LEFT JOIN rooms r ON r.id = rel.room_id
      ${whereClause}
      ORDER BY rel.timestamp DESC LIMIT 100
    `, params).catch(() => null);

    const chatByRoom = enterLogs === null ? await query(`
      SELECT cr.room_id, r.name AS room_name, COUNT(*) AS messages,
             COUNT(DISTINCT cr.user_id) AS unique_users,
             MAX(cr.timestamp) AS last_activity
      FROM chatlogs_room cr
      LEFT JOIN rooms r ON r.id = cr.room_id
      ${roomId ? 'WHERE cr.room_id = ?' : roomSearch ? 'WHERE r.name LIKE ?' : ''}
      GROUP BY cr.room_id, r.name
      ORDER BY last_activity DESC LIMIT 30
    `, roomId ? [roomId] : roomSearch ? [`%${roomSearch}%`] : []).catch(() => []) : null;

    return (
      <div>
        <SectionHeader title="Room Logs" sub={enterLogs !== null ? `${enterLogs.length} entries` : 'Chat activity (room_enter_log not found)'} back="rooms" />

        <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
          <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="tab" value="rooms" />
            <input type="hidden" name="view" value="logs" />
            <input type="text" name="room" placeholder="Room name..." defaultValue={roomSearch} style={{ flex: 1 }} />
            <input type="text" name="username" placeholder="Username..." defaultValue={userSearch} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
            {(roomSearch || userSearch || roomId) && <Link href="/admin?tab=rooms&view=logs" className="btn btn-secondary btn-sm">Clear</Link>}
          </form>
        </div>

        {enterLogs !== null ? (
          <div className="panel no-hover" style={{ padding: 20 }}>
            {enterLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No room entry logs found.</p>
            ) : (
              <table className="table-panel">
                <thead><tr><th>User</th><th>Room</th><th>Time</th></tr></thead>
                <tbody>
                  {enterLogs.map((l, i) => (
                    <tr key={i}>
                      <td><Link href={`/admin?tab=users&view=profile&id=${l.user_id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{l.username || `User ${l.user_id}`}</Link></td>
                      <td style={{ fontSize: 11 }}>{l.room_name || `Room ${l.room_id}`}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.timestamp ? new Date(l.timestamp * 1000).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div>
            <div className="panel no-hover" style={{ padding: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#f5a623' }}>The <code>room_enter_log</code> Arcturus table was not found. Showing chat activity per room as a proxy.</p>
            </div>
            <div className="panel no-hover" style={{ padding: 20 }}>
              {chatByRoom.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>No chat data found.</p>
              ) : (
                <table className="table-panel">
                  <thead><tr><th>Room</th><th>Messages</th><th>Unique Users</th><th>Last Activity</th><th></th></tr></thead>
                  <tbody>
                    {chatByRoom.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.room_name || `Room ${r.room_id}`}</td>
                        <td style={{ fontWeight: 700, color: 'var(--green)' }}>{parseInt(r.messages||0).toLocaleString()}</td>
                        <td>{r.unique_users}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.last_activity ? new Date(r.last_activity * 1000).toLocaleString() : '—'}</td>
                        <td><Link href={`/admin?tab=rooms&view=logs&id=${r.room_id}`} className="btn btn-secondary btn-sm">Filter</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Feature Rooms ─────────────────────────────────────────────────────────
  if (view === 'feature') {
    const search = sp?.search || '';
    const whereClause = search ? 'WHERE r.name LIKE ?' : '';
    const params = search ? [`%${search}%`] : [];
    const topRooms = await query(`
      SELECT r.id, r.name, r.owner_id, r.users, r.score, r.state, u.username AS owner_name
      FROM rooms r LEFT JOIN users u ON u.id = r.owner_id
      ${whereClause} ORDER BY r.score DESC, r.users DESC LIMIT 30
    `, params).catch(() => []);



    return (
      <div>
        <SectionHeader title="Feature Rooms" sub="Boost room scores to promote them in the navigator" back="rooms" />
        <div className="panel no-hover" style={{ padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Rooms with higher scores appear first in the navigator. Use the boost to promote specific rooms.
          </p>
        </div>
        <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
          <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="tab" value="rooms" />
            <input type="hidden" name="view" value="feature" />
            <input type="text" name="search" placeholder="Search room name..." defaultValue={search} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {search && <Link href="/admin?tab=rooms&view=feature" className="btn btn-secondary btn-sm">Clear</Link>}
          </form>
        </div>
        <div className="panel no-hover" style={{ padding: 20 }}>
          <table className="table-panel">
            <thead><tr><th>#</th><th>Room Name</th><th>Owner</th><th>Score</th><th>Players</th><th>Boost Score</th><th></th></tr></thead>
            <tbody>
              {topRooms.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: i < 3 ? '#f5c842' : 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td><Link href={`/admin?tab=users&view=profile&id=${r.owner_id}`} style={{ color: 'var(--green)', fontSize: 12 }}>{r.owner_name || r.owner_id}</Link></td>
                  <td style={{ fontWeight: 700, color: '#f5a623' }}>{r.score?.toLocaleString()}</td>
                  <td style={{ color: r.users > 0 ? 'var(--green)' : 'var(--text-muted)', fontWeight: r.users > 0 ? 700 : 400 }}>{r.users}</td>
                  <td>
                    <form action={boostScoreAction} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="hidden" name="room_id" value={r.id} />
                      <input type="number" name="amount" defaultValue={500} min={1} max={100000} style={{ width: 80 }} />
                      <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: 10 }}>+Boost</button>
                    </form>
                  </td>
                  <td>
                    <form action={resetScoreAction}>
                      <input type="hidden" name="room_id" value={r.id} />
                      <button type="submit" className="btn btn-sm" style={{ fontSize: 9, padding: '2px 8px', color: '#EF5856', background: 'rgba(239,88,86,0.1)' }}>Reset</button>
                    </form>
                  </td>
                </tr>
              ))}
              {topRooms.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No rooms found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Default: Search Rooms ─────────────────────────────────────────────────
  const search = sp?.search || '';
  const totalRooms = await queryScalar('SELECT COUNT(*) FROM rooms');
  const whereClause = search ? 'WHERE r.name LIKE ?' : '';
  const params = search ? [`%${search}%`] : [];
  const rooms = await query(`
    SELECT r.id, r.name, r.description, r.owner_id, r.users, r.users_max, r.score, r.state, u.username AS owner_name
    FROM rooms r LEFT JOIN users u ON u.id = r.owner_id
    ${whereClause} ORDER BY r.users DESC, r.score DESC LIMIT 50
  `, params).catch(() => []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Room Management ({parseInt(totalRooms||0).toLocaleString()} total)</h3>
      </div>
      <div className="panel no-hover" style={{ padding: 16, marginBottom: 16 }}>
        <form action="/admin" method="GET" style={{ display: 'flex', gap: 8 }}>
          <input type="hidden" name="tab" value="rooms" />
          <input type="text" name="search" placeholder="Search room name..." defaultValue={search} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
          {search && <Link href="/admin?tab=rooms" className="btn btn-secondary btn-sm">Clear</Link>}
        </form>
      </div>
      <div className="panel no-hover" style={{ padding: 20 }}>
        <table className="table-panel">
          <thead><tr><th>ID</th><th>Name</th><th>Owner</th><th>Players</th><th>Score</th><th>State</th><th></th></tr></thead>
          <tbody>
            {rooms.map(r => (
              <tr key={r.id}>
                <td style={{ color: 'var(--text-muted)' }}>{r.id}</td>
                <td style={{ fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td><Link href={`/admin?tab=users&view=profile&id=${r.owner_id}`} style={{ color: 'var(--green)' }}>{r.owner_name || r.owner_id}</Link></td>
                <td>
                  <span style={{ fontWeight: 700, color: r.users > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{r.users}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>/{r.users_max}</span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.score}</td>
                <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{r.state}</span></td>
                <td><Link href={`/admin?tab=rooms&view=edit&id=${r.id}`} className="btn btn-secondary btn-sm">Edit</Link></td>
              </tr>
            ))}
            {rooms.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No rooms found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, back }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      <Link href={`/admin?tab=${back}`} className="btn btn-secondary btn-sm">← Back</Link>
    </div>
  );
}

function ComingSoonPanel({ feature, description }) {
  return (
    <div className="panel no-hover" style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🚧</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{feature}</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>{description}</p>
    </div>
  );
}
