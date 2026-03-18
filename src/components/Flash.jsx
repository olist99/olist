'use client';
import { useEffect, useState } from 'react';

export default function Flash({ type = 'success', message, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible || !message) return null;

  return (
    <div className={`flash flash-${type}`}>
      {message}
    </div>
  );
}
