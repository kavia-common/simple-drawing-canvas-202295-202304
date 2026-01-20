import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const DEFAULT_CANVAS_SIZE = { width: 900, height: 520 };

/**
 * Convert pointer event coordinates into canvas coordinates, accounting for CSS scaling.
 */
function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

// PUBLIC_INTERFACE
function App() {
  /** Drawing state */
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const lastPointRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const pointerIdRef = useRef(null);

  const [brushColor, setBrushColor] = useState('#111827'); // near slate-900
  const [brushSize, setBrushSize] = useState(8);

  const [statusMessage, setStatusMessage] = useState('Ready to draw.');

  const brushSizes = useMemo(() => [2, 4, 6, 8, 12, 16, 24, 32], []);

  const colorPresets = useMemo(
    () => [
      { name: 'Black', value: '#111827' },
      { name: 'Blue', value: '#3b82f6' },
      { name: 'Cyan', value: '#06b6d4' },
      { name: 'Green', value: '#22c55e' },
      { name: 'Orange', value: '#f97316' },
      { name: 'Red', value: '#ef4444' },
      { name: 'Purple', value: '#a855f7' },
    ],
    []
  );

  const configureContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    // High quality lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // White background so saved PNG isn't transparent (unless user wants it).
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    configureContext();
  }, [configureContext]);

  // Keep drawing settings updated as state changes.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  }, [brushColor, brushSize]);

  const startStroke = useCallback((event) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Capture pointer so we keep receiving move/up even if leaving the canvas.
    try {
      canvas.setPointerCapture(event.pointerId);
      pointerIdRef.current = event.pointerId;
    } catch {
      // If setPointerCapture isn't supported, we still draw normally.
      pointerIdRef.current = null;
    }

    const point = getCanvasPoint(canvas, event);
    isDrawingRef.current = true;
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);

    setStatusMessage('Drawing…');
  }, []);

  const continueStroke = useCallback((event) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const { x, y } = getCanvasPoint(canvas, event);
    const { x: lx, y: ly } = lastPointRef.current;

    // Draw incremental segment
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPointRef.current = { x, y };
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    pointerIdRef.current = null;
    setStatusMessage('Stroke complete.');
  }, []);

  // Ensure we stop drawing if pointer gets cancelled.
  const handlePointerCancel = useCallback(() => {
    endStroke();
  }, [endStroke]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Clear then re-apply a white background.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    setStatusMessage('Canvas cleared.');
  }, []);

  const saveAsImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    // Create a download link (no backend required)
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `drawing-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatusMessage('Image downloaded.');
  }, []);

  return (
    <div className="App">
      <main className="page" aria-labelledby="app-title">
        <header className="header">
          <div className="headerText">
            <h1 id="app-title" className="title">
              Simple Drawing Canvas
            </h1>
            <p className="subtitle">
              Draw with your mouse, trackpad, or touch. Choose a color and brush size, then save your creation.
            </p>
          </div>

          <div className="actions" role="toolbar" aria-label="Drawing actions">
            <button type="button" className="btn btnSecondary" onClick={clearCanvas}>
              Clear
            </button>
            <button type="button" className="btn btnPrimary" onClick={saveAsImage}>
              Save as PNG
            </button>
          </div>
        </header>

        <section className="card" aria-label="Drawing controls and canvas">
          <div className="controls" role="group" aria-label="Drawing controls">
            <div className="controlGroup">
              <label className="label" htmlFor="colorPicker">
                Brush color
              </label>

              <div className="colorRow">
                <input
                  id="colorPicker"
                  className="colorInput"
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  aria-label="Select brush color"
                />

                <div className="presetRow" role="list" aria-label="Color presets">
                  {colorPresets.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`swatch ${brushColor.toLowerCase() === c.value.toLowerCase() ? 'swatchActive' : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setBrushColor(c.value)}
                      aria-label={`Set brush color to ${c.name}`}
                      role="listitem"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="controlGroup">
              <label className="label" htmlFor="brushSize">
                Brush size <span className="meta">({brushSize}px)</span>
              </label>

              <div className="sizeRow">
                <input
                  id="brushSize"
                  className="range"
                  type="range"
                  min={1}
                  max={40}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  aria-label="Brush size"
                />
                <select
                  className="select"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  aria-label="Brush size preset"
                >
                  {brushSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}px
                    </option>
                  ))}
                </select>

                <div className="brushPreview" aria-hidden="true">
                  <span
                    className="brushDot"
                    style={{
                      width: Math.max(6, Math.min(brushSize, 28)),
                      height: Math.max(6, Math.min(brushSize, 28)),
                      backgroundColor: brushColor,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="canvasWrap">
            <div className="canvasHeader">
              <div className="hint">
                Tip: Use one finger to draw on touch devices. Pointer leaves canvas? We keep drawing until you lift.
              </div>
              <div className="srStatus" aria-live="polite">
                {statusMessage}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              className="canvas"
              width={DEFAULT_CANVAS_SIZE.width}
              height={DEFAULT_CANVAS_SIZE.height}
              onPointerDown={startStroke}
              onPointerMove={continueStroke}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              onPointerCancel={handlePointerCancel}
              // Prevent touch scrolling while drawing
              style={{ touchAction: 'none' }}
              role="img"
              aria-label="Drawing canvas"
              tabIndex={0}
            />

            <p className="footerNote">
              Saved images are downloaded as PNG. Clearing cannot be undone.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
