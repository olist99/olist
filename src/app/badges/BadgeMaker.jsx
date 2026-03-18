'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const SIZE = 40;
const PIXEL = 8;
const CANVAS_SIZE = SIZE * PIXEL;

const PALETTE = ['transparent','#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff',
  '#ff8800','#8800ff','#0088ff','#ff0088','#88ff00','#008800','#880000','#000088',
  '#ff4444','#44ff44','#4444ff','#ffaa00','#aa00ff','#00aaff','#aaaaaa','#555555'];

// Draw the checkerboard background (visual only — not part of badge data)
function drawCheckerboard(ctx) {
  const CHECK = PIXEL / 2;
  for (let y = 0; y < CANVAS_SIZE; y += CHECK) {
    for (let x = 0; x < CANVAS_SIZE; x += CHECK) {
      ctx.fillStyle = ((x + y) / CHECK) % 2 === 0 ? '#cccccc' : '#ffffff';
      ctx.fillRect(x, y, CHECK, CHECK);
    }
  }
}

function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * PIXEL, 0); ctx.lineTo(i * PIXEL, CANVAS_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * PIXEL); ctx.lineTo(CANVAS_SIZE, i * PIXEL); ctx.stroke();
  }
}

// The actual pixel data — separate from the display canvas
// null = transparent, string = color
function makePixelGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

export default function BadgeMaker() {
  const canvasRef = useRef(null);
  const pixelsRef = useRef(makePixelGrid()); // source of truth for badge pixels
  const [color, setColor] = useState('#000000');
  const [tool, setTool] = useState('pen');
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [, forceUpdate] = useState(0); // for palette selection re-render

  // Redraw canvas from pixel data
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawCheckerboard(ctx);
    const pixels = pixelsRef.current;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (pixels[y][x]) {
          ctx.fillStyle = pixels[y][x];
          ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
        }
      }
    }
    drawGrid(ctx);
  }, []);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  const paint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX / PIXEL);
    const y = Math.floor((clientY - rect.top) * scaleY / PIXEL);
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;

    const newColor = tool === 'eraser' ? null : (color === 'transparent' ? null : color);
    pixelsRef.current[y][x] = newColor;
    redrawCanvas();
  }, [color, tool, redrawCanvas]);

  const handleDown = (e) => { setDrawing(true); paint(e); };
  const handleMove = (e) => { if (drawing) paint(e); };
  const handleUp = () => setDrawing(false);

  const clearCanvas = () => {
    pixelsRef.current = makePixelGrid();
    redrawCanvas();
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/image\/gif/)) { setMessage('Only GIF files allowed'); setMessageType('error'); return; }
    if (file.size > 200000) { setMessage('Max 200KB'); setMessageType('error'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        if (img.width > 40 || img.height > 40) { setMessage('Max 40x40 pixels'); setMessageType('error'); return; }
        // Draw onto a temp canvas to read pixel data
        const tmp = document.createElement('canvas');
        tmp.width = SIZE; tmp.height = SIZE;
        const tctx = tmp.getContext('2d');
        tctx.clearRect(0, 0, SIZE, SIZE);
        tctx.drawImage(img, 0, 0, SIZE, SIZE);
        const imgData = tctx.getImageData(0, 0, SIZE, SIZE).data;
        const pixels = makePixelGrid();
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            const i = (y * SIZE + x) * 4;
            const a = imgData[i + 3];
            if (a > 10) {
              const r = imgData[i].toString(16).padStart(2, '0');
              const g = imgData[i + 1].toString(16).padStart(2, '0');
              const b = imgData[i + 2].toString(16).padStart(2, '0');
              pixels[y][x] = `#${r}${g}${b}`;
            }
          }
        }
        pixelsRef.current = pixels;
        redrawCanvas();
        setMessage('GIF loaded! Edit or save.');
        setMessageType('success');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveBadge = async () => {
    setSaving(true); setMessage('');
    // Export as PNG with real transparency (server handles the rest)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = SIZE; exportCanvas.height = SIZE;
    const ectx = exportCanvas.getContext('2d');
    ectx.clearRect(0, 0, SIZE, SIZE);
    const pixels = pixelsRef.current;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (pixels[y][x]) {
          ectx.fillStyle = pixels[y][x];
          ectx.fillRect(x, y, 1, 1);
        }
        // null pixels stay transparent
      }
    }
    const imageData = exportCanvas.toDataURL('image/png');

    try {
      const res = await fetch('/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });
      const data = await res.json();
      if (data.ok) { setMessage(`Badge saved! Code: ${data.badgeCode}`); setMessageType('success'); }
      else { setMessage(data.error || 'Save failed'); setMessageType('error'); }
    } catch { setMessage('Error saving badge'); setMessageType('error'); }
    setSaving(false);
  };

  const isTransparentColor = color === 'transparent';

  return (
    <div>
      <div className="panel no-hover" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Badge Maker</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Draw a 40×40 pixel badge or upload a GIF. The checkerboard pattern = transparent — those pixels won't appear on your badge.
        </p>
      </div>

      {message && (
        <div className={`flash flash-${messageType === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{message}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
        <div>
          {/* Main canvas */}
          <div className="panel no-hover" style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ width: 320, height: 320, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 4, cursor: tool === 'eraser' ? 'cell' : 'crosshair', imageRendering: 'pixelated', touchAction: 'none' }}
              onMouseDown={handleDown}
              onMouseMove={handleMove}
              onMouseUp={handleUp}
              onMouseLeave={handleUp}
              onTouchStart={handleDown}
              onTouchMove={handleMove}
              onTouchEnd={handleUp}
            />
          </div>

          {/* Preview */}
          <div className="panel no-hover" style={{ padding: 16, marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Preview (actual 40×40):</div>
            {/* Checkerboard behind preview so transparency shows */}
            <div style={{ position: 'relative', width: 40, height: 40, imageRendering: 'pixelated',
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '6px 6px', backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px', backgroundColor: '#fff' }}>
              <canvas
                width={SIZE}
                height={SIZE}
                style={{ position: 'absolute', inset: 0, width: 40, height: 40, imageRendering: 'pixelated' }}
                ref={el => {
                  if (!el) return;
                  const ctx = el.getContext('2d');
                  ctx.clearRect(0, 0, SIZE, SIZE);
                  const pixels = pixelsRef.current;
                  for (let y = 0; y < SIZE; y++) {
                    for (let x = 0; x < SIZE; x++) {
                      if (pixels[y][x]) { ctx.fillStyle = pixels[y][x]; ctx.fillRect(x, y, 1, 1); }
                    }
                  }
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>Checkerboard = transparent pixels</div>
          </div>
        </div>

        {/* Toolbar */}
        <div>
          {/* Tools */}
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Tools</div>
            <div style={{ display: 'flex', gap: 6 }}>
                          {[['pen', 'Pen', '/images/badgemaker/pencil.png'], ['eraser', 'Eraser', '/images/badgemaker/eraser.png']].map(([t, label, icon]) => (
                              <button
                                  key={t}
                                  onClick={() => setTool(t)}
                                  className={tool === t ? 'btn-primary' : 'btn-secondary'}
                                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                  <img src={icon} alt={label} style={{ width: 17, height: 18, float: 'left' }} />
                                  <span>{label}</span>
                              </button>
                          ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Color</div>
            <input type="color" value={isTransparentColor ? '#ffffff' : color}
              onChange={e => { setColor(e.target.value); setTool('pen'); }}
              style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginTop: 8 }}>
              {/* Transparent swatch first */}
              <button
                onClick={() => { setColor('transparent'); setTool('pen'); }}
                title="Transparent (erase)"
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 4, cursor: 'pointer',
                  border: color === 'transparent' ? '2px solid #fff' : '2px solid transparent',
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '6px 6px', backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px', backgroundColor: '#fff',
                }}
              />
              {PALETTE.filter(c => c !== 'transparent').map(c => (
                <button key={c} onClick={() => { setColor(c); setTool('pen'); }}
                  style={{ width: '100%', aspectRatio: '1', borderRadius: 4, background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            {color !== 'transparent' && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: color, border: '1px solid rgba(255,255,255,0.2)' }} />
                {color.toUpperCase()}
              </div>
            )}
            {color === 'transparent' && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                🔲 Drawing transparent pixels
              </div>
            )}
          </div>

          {/* Upload */}
          <div className="panel no-hover" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Upload GIF (max 40×40)</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>Only .gif files accepted</div>
            <input type="file" accept=".gif,image/gif" onChange={handleUpload} style={{ fontSize: 11, width: '100%' }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={clearCanvas} className="btn-delete">Clear</button>
            <button onClick={saveBadge} disabled={saving} className="btn-enterhotel" style={{ flex: 2, fontSize: 13, opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Saving...' : 'Save Badge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
