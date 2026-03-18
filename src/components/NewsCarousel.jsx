'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function NewsCarousel({ news = [] }) {
  const slides = news.slice(0, 4);
  const [current, setCurrent] = useState(0);
  const count = slides.length;

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % count);
  }, [count]);

  // Auto-play every 5 seconds
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, count]);

  if (count === 0) {
    return (
      <div className="news-slide" style={{ background: 'linear-gradient(135deg, #2F2960, #4E429E)' }}>
        <div className="news-slide-tag">WELCOME</div>
        <div className="news-slide-title">Welcome!</div>
        <div className="news-slide-desc">Your hotel is ready. Create some news articles to get started.</div>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div className="carousel-wrapper">
      <Link href={`/news/${slide.id}`} style={{ textDecoration: 'none' }}>
        <div className="carousel-slide" style={{
          backgroundImage: slide.image ? `url(${slide.image})` : undefined,
          background: !slide.image ? `linear-gradient(135deg, #2F2960, #4E429E)` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
          <div className="carousel-slide-overlay" />
          <div className="carousel-slide-tag">{slide.tag || 'NEWS'}</div>
          <div className="carousel-slide-title">{slide.title}</div>
          <div className="carousel-slide-desc">{slide.short_desc || ''}</div>
        </div>
      </Link>

      {/* Dots */}
      {count > 1 && (
        <div className="carousel-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className={`carousel-dot ${i === current ? 'active' : ''}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
