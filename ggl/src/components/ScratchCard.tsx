import React, { useEffect, useRef, useState } from 'react';

interface ScratchCardProps {
  width?: number | string;
  height?: number | string;
  onComplete?: () => void;
  onZoneReveal?: (index: number) => void;
  rows?: number;
  cols?: number;
  children: React.ReactNode;
  brushSize?: number;
  threshold?: number; // percentage to auto-complete
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  width = '100%',
  height = '100%',
  onComplete,
  onZoneReveal,
  rows = 1,
  cols = 1,
  children,
  brushSize = 35,
  threshold = 60,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const revealedZones = useRef<Set<number>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      // Set dimensions even if 0, but the drawing effect will wait for > 0
      setDimensions({ w: rect.width, h: rect.height });
    };

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);
    
    updateDimensions();
    // Fallback for some environments
    const timer = setTimeout(updateDimensions, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.w === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas internal dimensions to match display size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.w;
    canvas.height = dimensions.h;

    // Initialize canvas with a solid base first to ensure opacity
    ctx.fillStyle = '#B8B8B8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Metallic silver coating — radial + linear combo for a rich feel
    const radial = ctx.createRadialGradient(
      dimensions.w / 2, dimensions.h / 2, 0,
      dimensions.w / 2, dimensions.h / 2, Math.max(dimensions.w, dimensions.h) / 1.2
    );
    radial.addColorStop(0, '#F5F5F5');
    radial.addColorStop(0.4, '#D8D8D8');
    radial.addColorStop(1, '#9E9E9E');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, dimensions.w, dimensions.h);

    const sheen = ctx.createLinearGradient(0, 0, dimensions.w, dimensions.h);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(0.6, 'rgba(0, 0, 0, 0.06)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, dimensions.w, dimensions.h);

    // Add metallic noise using a pattern for performance
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 64;
    noiseCanvas.height = 64;
    const noiseCtx = noiseCanvas.getContext('2d');
    if (noiseCtx) {
      const noiseData = noiseCtx.createImageData(64, 64);
      for (let i = 0; i < noiseData.data.length; i += 4) {
        const val = Math.random() * 255;
        noiseData.data[i] = val;
        noiseData.data[i+1] = val;
        noiseData.data[i+2] = val;
        noiseData.data[i+3] = 28;
      }
      noiseCtx.putImageData(noiseData, 0, 0);
      const pattern = ctx.createPattern(noiseCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, dimensions.w, dimensions.h);
      }
    }

    // Decorative inner border
    ctx.strokeStyle = 'rgba(170, 119, 28, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(10, 10, dimensions.w - 20, dimensions.h - 20);
    ctx.setLineDash([]);

    // Main prompt text with shadow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#5a5a5a';
    ctx.font = 'bold 32px "Noto Serif SC", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('刮 开 有 礼', dimensions.w / 2, dimensions.h / 2 - 8);
    ctx.restore();

    // Sub label
    ctx.fillStyle = 'rgba(90, 90, 90, 0.7)';
    ctx.font = '600 10px "Inter", sans-serif';
    const letterSpacing = 'SCRATCH  TO  REVEAL'.split('').join(' ');
    ctx.fillText(letterSpacing, dimensions.w / 2, dimensions.h / 2 + 22);

    // Coin emoji hint
    ctx.font = '20px sans-serif';
    ctx.fillText('🪙', dimensions.w / 2 - 90, dimensions.h / 2 - 4);
    ctx.fillText('🪙', dimensions.w / 2 + 90, dimensions.h / 2 - 4);

  }, [dimensions]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return { x: 0, y: 0 };
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isComplete) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();

    checkCompletion();
  };

  const checkCompletion = () => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.w === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, dimensions.w, dimensions.h);
    const pixels = imageData.data;
    
    // Check individual zones first (more responsive)
    if (onZoneReveal && rows > 0 && cols > 0) {
      const zoneWidth = dimensions.w / cols;
      const zoneHeight = dimensions.h / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = r * cols + c;
          if (revealedZones.current.has(index)) continue;

          const centerX = Math.floor(c * zoneWidth + zoneWidth / 2);
          const centerY = Math.floor(r * zoneHeight + zoneHeight / 2);
          
          // Sample a small area around the center
          let transparentCount = 0;
          const sampleSize = 2;
          for (let dx = -sampleSize; dx <= sampleSize; dx++) {
            for (let dy = -sampleSize; dy <= sampleSize; dy++) {
              const sx = centerX + dx;
              const sy = centerY + dy;
              if (sx >= 0 && sx < dimensions.w && sy >= 0 && sy < dimensions.h) {
                const pIdx = (sy * canvas.width + sx) * 4;
                if (pixels[pIdx + 3] < 150) transparentCount++;
              }
            }
          }
          
          if (transparentCount > 5) {
            revealedZones.current.add(index);
            onZoneReveal(index);
          }
        }
      }
    }

    // Check overall completion
    let transparentPixels = 0;
    const step = 32; // Sampling step
    for (let i = 0; i < pixels.length; i += step * 4) {
      if (pixels[i + 3] < 128) {
        transparentPixels++;
      }
    }

    const percentage = (transparentPixels / (pixels.length / (step * 4))) * 100;
    if (percentage > threshold && !isComplete) {
      setIsComplete(true);
      if (onComplete) onComplete();
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getPos(e);
    scratch(x, y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    scratch(x, y);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-xl shadow-inner bg-gray-100 w-full h-full min-h-[200px]"
    >
      {/* Prize Content */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {children}
      </div>

      {/* Scratch Layer */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 cursor-crosshair transition-opacity duration-700 ease-in-out ${isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{ touchAction: 'none', width: '100%', height: '100%' }}
      />
    </div>
  );
};
