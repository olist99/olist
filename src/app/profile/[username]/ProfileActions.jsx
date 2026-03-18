'use client';
import Link from 'next/link';

export default function ProfileActions() {
  return (
    <div className="absolute top-5 right-5 flex gap-2">
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => document.dispatchEvent(new CustomEvent('sticker-edit'))}
      >
        ✨ Stickers
      </button>
      <Link href="/settings" className="btn btn-secondary btn-sm">
        Edit Profile
      </Link>
    </div>
  );
}
