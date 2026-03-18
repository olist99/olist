import { query } from './db';

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS cms_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'general',
    title VARCHAR(200) NOT NULL DEFAULT '',
    message TEXT,
    link VARCHAR(500) DEFAULT '',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    INDEX idx_user_read (user_id, is_read)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

const CREATE_HISTORY_SQL = `
  CREATE TABLE IF NOT EXISTS cms_login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ip VARCHAR(45),
    user_agent VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT NOW(),
    INDEX idx_user_id (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    await query(CREATE_SQL);
    await query(CREATE_HISTORY_SQL);
    tablesEnsured = true;
  } catch {}
}

/**
 * Send a notification to a user.
 * Non-blocking — errors are silently swallowed.
 */
export async function sendNotification(userId, { type, title, message = '', link = '' }) {
  try {
    await ensureTables();
    await query(
      'INSERT INTO cms_notifications (user_id, type, title, message, link) VALUES (?,?,?,?,?)',
      [userId, type, title, message, link]
    );
  } catch {}
}

/**
 * Log a login attempt to cms_login_history.
 */
export async function logLogin(userId, ip, userAgent) {
  try {
    await ensureTables();
    await query(
      'INSERT INTO cms_login_history (user_id, ip, user_agent) VALUES (?,?,?)',
      [userId, ip || '', (userAgent || '').slice(0, 500)]
    );
  } catch {}
}
