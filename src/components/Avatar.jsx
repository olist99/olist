'use client';
import { avatarUrl } from '@/lib/utils';

export default function Avatar({ look, size = 'l', direction = 2, className = '', style = {} }) {
  const sizes = { s: { w: 36, h: 50 }, m: { w: 52, h: 80 }, l: { w: 64, h: 110 }, xl: { w: 80, h: 130 } };
  const s = sizes[size] || sizes.l;

  return (
    <img
      src={avatarUrl(look, direction, size)}
      alt="Avatar"
      width={s.w}
      height={s.h}
      className={`pixel-render ${className}`}
      style={style}
      loading="lazy"
    />
  );
}
