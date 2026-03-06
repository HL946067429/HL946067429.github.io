import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid, Heart, Circle, Layout, Star, Wind, X, Maximize2, Camera } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  caption?: string;
}

interface PhotoMosaicProps {
  photos: Photo[];
}

type LayoutType = 'grid' | 'heart' | 'circle' | 'scatter' | 'spiral' | 'star';

export const PhotoMosaic: React.FC<PhotoMosaicProps> = ({ photos }) => {
  const [layout, setLayout] = useState<LayoutType>('grid');
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scatterSeeds, setScatterSeeds] = useState<number[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    
    // Initial check
    setContainerSize({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    setScatterSeeds(photos.map(() => Math.random()));
  }, [photos]);

  const shuffleScatter = () => {
    setScatterSeeds(photos.map(() => Math.random()));
    if (layout !== 'scatter') setLayout('scatter');
  };

  const getPosition = (index: number, total: number) => {
    const { width, height } = containerSize;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    switch (layout) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(total));
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cellW = width / cols;
        const cellH = height / Math.ceil(total / cols);
        return {
          x: col * cellW + cellW / 2 - centerX,
          y: row * cellH + cellH / 2 - centerY,
          scale: 0.9,
          rotate: 0,
        };
      }
      case 'circle': {
        const angle = (index / total) * Math.PI * 2;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          scale: 0.8,
          rotate: (angle * 180) / Math.PI,
        };
      }
      case 'heart': {
        const t = (index / total) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const factor = radius / 15;
        return {
          x: x * factor,
          y: y * factor,
          scale: 0.8,
          rotate: 0,
        };
      }
      case 'spiral': {
        const angle = 0.5 * index;
        const r = (radius / total) * index;
        return {
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          scale: 0.85 - (index / total) * 0.3,
          rotate: (angle * 180) / Math.PI,
        };
      }
      case 'star': {
        const t = (index / total) * Math.PI * 2;
        const r = radius * (0.7 + 0.3 * Math.cos(5 * t));
        return {
          x: Math.cos(t) * r,
          y: Math.sin(t) * r,
          scale: 0.8,
          rotate: (t * 180) / Math.PI,
        };
      }
      case 'scatter': {
        const seed = scatterSeeds[index] || index / total;
        const randX = (seed * 0.8 + 0.1) * width - centerX;
        const randY = (Math.sin(seed * 10) * 0.4 + 0.5) * height - centerY;
        const randRot = Math.sin(seed * 20) * 30;
        return {
          x: randX,
          y: randY,
          scale: 0.75,
          rotate: randRot,
        };
      }
      default:
        return { x: 0, y: 0, scale: 1, rotate: 0 };
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-[400px]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-black/5 rounded-3xl border border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">
            <Layout className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold">照片墙布局</h4>
            <p className="text-[10px] text-gray-400">选择你喜欢的展示方式</p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: 'grid', icon: Grid, label: '网格' },
            { id: 'heart', icon: Heart, label: '心形' },
            { id: 'circle', icon: Circle, label: '圆形' },
            { id: 'spiral', icon: Wind, label: '螺旋' },
            { id: 'star', icon: Star, label: '星形' },
            { id: 'scatter', icon: Layout, label: '自由' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setLayout(item.id as LayoutType)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                layout === item.id 
                  ? 'bg-black text-white shadow-lg scale-105' 
                  : 'bg-white hover:bg-black/5 text-gray-500 border border-black/5'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          ))}
          {layout === 'scatter' && (
            <button
              onClick={shuffleScatter}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-[#F27D26]/10 text-[#F27D26] hover:bg-[#F27D26]/20 border border-[#F27D26]/20"
            >
              打乱
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 w-full overflow-hidden bg-white/50 rounded-3xl border border-black/5 min-h-[300px]">
        {photos.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Camera className="w-8 h-8 opacity-20" />
            <p className="text-xs font-bold">暂无照片记录</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {containerSize.width === 0 ? (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                <span className="text-xs">正在准备照片墙...</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {photos.map((photo, index) => {
                  const pos = getPosition(index, photos.length);
                  return (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        x: pos.x,
                        y: pos.y,
                        scale: pos.scale,
                        rotate: pos.rotate,
                        zIndex: layout === 'scatter' ? index : 1,
                        translateY: [0, -5, 0],
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      onClick={() => setSelectedPhoto(photo)}
                      whileHover={{ 
                        scale: pos.scale * 1.15, 
                        zIndex: 100,
                        rotateY: 15,
                        rotateX: -10,
                        transition: { duration: 0.3, type: 'spring' } 
                      }}
                      transition={{
                        x: { type: 'spring', stiffness: 80, damping: 15 },
                        y: { type: 'spring', stiffness: 80, damping: 15 },
                        scale: { type: 'spring', stiffness: 100, damping: 20 },
                        rotate: { type: 'spring', stiffness: 100, damping: 20 },
                        translateY: {
                          duration: 3 + (index % 3),
                          repeat: Infinity,
                          ease: "easeInOut"
                        }
                      }}
                      style={{ perspective: 1000 }}
                      className="absolute w-28 h-32 md:w-36 md:h-44 cursor-pointer"
                    >
                      <motion.div 
                        className="w-full h-full p-1.5 pb-6 md:p-2 md:pb-8 bg-white shadow-2xl rounded-sm border border-black/5 transform-gpu ring-1 ring-black/5 group"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          className="w-full h-full object-cover rounded-sm grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Maximize2 className="text-white w-6 h-6" />
                        </div>
                        <div className="absolute bottom-1 left-0 right-0 text-center">
                          <span className="text-[8px] md:text-[10px] font-serif italic text-gray-400 truncate px-2 block">
                            {photo.caption || 'Memory'}
                          </span>
                        </div>
                        {layout === 'scatter' && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#F27D26] rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold shadow-lg">
                            {index + 1}
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full bg-white p-2 md:p-4 rounded-lg shadow-2xl"
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 text-white hover:text-[#F27D26] transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption}
                className="w-full h-auto max-h-[70vh] object-contain rounded-sm"
                referrerPolicy="no-referrer"
              />
              <div className="mt-4 text-center">
                <h3 className="text-lg font-serif italic text-gray-800">{selectedPhoto.caption || 'Memory'}</h3>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
