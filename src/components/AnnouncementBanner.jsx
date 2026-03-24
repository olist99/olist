import { queryOne } from '@/lib/db';

const TYPE_STYLES = {
  info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', color: '#60a5fa', icon: 'ℹ️' },
  warning: { bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.3)', color: '#f5a623', icon: '⚠️' },
  success: { bg: 'rgba(52,189,89,0.12)',  border: 'rgba(52,189,89,0.3)',  color: '#34bd59', icon: '✅' },
  danger:  { bg: 'rgba(239,88,86,0.12)',  border: 'rgba(239,88,86,0.3)',  color: '#EF5856', icon: '🚨' },
};

export default async function AnnouncementBanner() {
  const row = await queryOne(
    "SELECT `value` FROM cms_settings WHERE `key` = 'announcement_text'"
  ).catch(() => null);

  const text = row?.value?.trim();
  if (!text) return null;

  const typeRow = await queryOne(
    "SELECT `value` FROM cms_settings WHERE `key` = 'announcement_type'"
  ).catch(() => null);

  const type = typeRow?.value || 'info';
  const style = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <div style={{
      background: style.bg,
      borderBottom: `1px solid ${style.border}`,
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      fontSize: 13,
      fontWeight: 600,
      color: style.color,
    }}>
      <span>{style.icon}</span>
      <span>{text}</span>
    </div>
  );
}
