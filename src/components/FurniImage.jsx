'use client';
import { useState } from 'react';

/**
 * Tries to load the rendered furniture image first,
 * falls back to the icon version if it fails.
 * 
 * Common Nitro/Habbo furni paths:
 * - Rendered: /swf/dcr/hof_furni/{name}/{name}_64.png
 * - Icon: /swf/dcr/hof_furni/icons/{name}_icon.png
 * 
 * Set NEXT_PUBLIC_FURNI_RENDER_URL in .env to customize.
 * Example: /swf/dcr/hof_furni/
 */
export default function FurniImage({ baseName, alt = '', style = {}, className = '' }) {
  const [useFallback, setUseFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  const renderBase = process.env.NEXT_PUBLIC_FURNI_RENDER_URL || '/swf/dcr/hof_furni/';
  const iconBase = process.env.NEXT_PUBLIC_FURNI_URL || '/swf/dcr/hof_furni/icons/';

  // Try icon first: /swf/dcr/hof_furni/icons/{name}_icon.png
  const iconSrc = `${iconBase}${baseName}_icon.png`;
  // Fallback to rendered: /swf/dcr/hof_furni/{name}/{name}_64.png
  const renderSrc = `${renderBase}${baseName}/${baseName}_64.png`;

  if (failed) {
    return <span style={{ fontSize: 32, ...style }}></span>;
  }

  return (
    <img
      src={useFallback ? renderSrc : iconSrc}
      alt={alt || baseName}
      className={className}
      style={{ imageRendering: 'pixelated', objectFit: 'contain', ...style }}
      onError={() => {
        if (!useFallback) {
          setUseFallback(true);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
