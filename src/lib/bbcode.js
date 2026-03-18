export function renderBBCode(text) {
  if (!text) return '';
  return text
    .replace(/\[b\](.*?)\[\/b\]/gs, '<strong>$1</strong>')
    .replace(/\[i\](.*?)\[\/i\]/gs, '<em>$1</em>')
    .replace(/\[u\](.*?)\[\/u\]/gs, '<span style="text-decoration:underline">$1</span>')
    .replace(/\[hl\](.*?)\[\/hl\]/gs, '<mark style="background:rgba(245,166,35,0.3);color:inherit;padding:1px 3px;border-radius:3px">$1</mark>')
    .replace(/\[quote\](.*?)\[\/quote\]/gs, '<blockquote style="border-left:3px solid var(--green);padding:8px 12px;margin:8px 0;background:rgba(255,255,255,0.04);border-radius:0 6px 6px 0;font-style:italic;color:var(--text-muted)">$1</blockquote>')
    .replace(/\[url=(.*?)\](.*?)\[\/url\]/gs, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--green)">$2</a>')
    .replace(/\n/g, '<br/>');
}
