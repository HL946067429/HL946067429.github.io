import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CheckIn, Photo } from '../types';
import { Plane, Train, Car, Footprints, Bike, Camera, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TravelMapProps {
  checkIns: CheckIn[];
  activeCheckInId: string | null;
  onMarkerClick: (id: string) => void;
  playbackIndex: number | null;
  playbackProgress: number;
  isPlaybackPaused: boolean;
  tripRoutePath: [number, number][][];
  mapStyle?: 'standard' | 'satellite' | 'terrain' | 'dark';
}

const renderTransportationIconString = (type?: string) => {
  switch (type) {
    case 'flight': return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';
    case 'train': return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 2"/><path d="m18 21-2-2"/></svg>';
    case 'car': return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 10V9a2 2 0 0 1 2-2h2"/></svg>';
    case 'walk': return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.5 1.89-4 4.5-4 2.26 0 3.5 1.5 3.5 4 0 2.5-1.1 3.5-1.1 5.62V16"/><path d="M18 16v-2.38c0-2.12-1.03-3.12-1-5.62.03-2.5 1.89-4 4.5-4 2.26 0 3.5 1.5 3.5 4 0 2.5-1.1 3.5-1.1 5.62V16"/><path d="M12 20V10"/><circle cx="12" cy="7" r="1"/></svg>';
    case 'bike': return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>';
    default: return '';
  }
};

const MovingMarker = ({ route, progress, type, isPaused }: { route: [number, number][], progress: number, type?: string, isPaused: boolean }) => {
  // Memoize icon to avoid recreating on every frame
  const icon = React.useMemo(() => L.divIcon({
    className: 'moving-icon',
    html: `
      <div class="relative">
        <div class="absolute inset-0 bg-[#F27D26]/20 rounded-full animate-ping"></div>
        <div class="w-12 h-12 bg-[#F27D26] rounded-full shadow-2xl flex items-center justify-center border-4 border-white text-white">
          ${renderTransportationIconString(type)}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  }), [type]);

  if (!route || route.length === 0) return null;

  // Find current position along the route array
  const totalPoints = route.length;
  const currentIndex = Math.min(Math.floor(progress * (totalPoints - 1)), totalPoints - 2);
  const nextIndex = currentIndex + 1;

  const segmentProgress = (progress * (totalPoints - 1)) % 1;

  const start = route[currentIndex];
  const end = route[nextIndex];

  const lat = start[0] + (end[0] - start[0]) * segmentProgress;
  const lng = start[1] + (end[1] - start[1]) * segmentProgress;

  return (
    <>
      <Marker
        position={[lat, lng]}
        zIndexOffset={1000}
        icon={icon}
      />
      <MapFollower center={[lat, lng]} isPlayback={true} isPaused={isPaused} />
    </>
  );
};

const MapFollower = ({ center, isPlayback, isPaused }: { center: [number, number], isPlayback: boolean, isPaused: boolean }) => {
  const map = useMap();
  const lastPanRef = useRef(0);

  useEffect(() => {
    if (!isPlayback) return;

    if (isPaused) {
      map.flyTo(center, 16, { duration: 1 });
      return;
    }

    // Throttle map panning to every 200ms to avoid jank
    const now = Date.now();
    if (now - lastPanRef.current < 200) return;
    lastPanRef.current = now;

    // Use panTo without animation - let the marker movement be the visual cue
    map.panTo(center, { animate: false });
  }, [center, map, isPlayback, isPaused]);
  return null;
};

const TransportationIcon = ({ type }: { type?: string }) => {
  switch (type) {
    case 'flight': return <Plane className="w-4 h-4" />;
    case 'train': return <Train className="w-4 h-4" />;
    case 'car': return <Car className="w-4 h-4" />;
    case 'walk': return <Footprints className="w-4 h-4" />;
    case 'bike': return <Bike className="w-4 h-4" />;
    default: return null;
  }
};

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 1.5 });
  }, [center, map]);
  return null;
};

// Check if coordinates are roughly in China
const isInChina = (lat: number, lng: number): boolean => {
  return lat >= 3.86 && lat <= 53.55 && lng >= 73.66 && lng <= 135.05;
};

export const TravelMap: React.FC<TravelMapProps> = ({
  checkIns,
  activeCheckInId,
  onMarkerClick,
  playbackIndex,
  playbackProgress,
  isPlaybackPaused,
  tripRoutePath,
  mapStyle = 'standard'
}) => {
  const activeCheckIn = checkIns.find(c => c.id === activeCheckInId);

  // Determine if we should use China tiles based on the first check-in's coordinates
  const useChina = checkIns.length > 0 && isInChina(checkIns[0].coordinates[0], checkIns[0].coordinates[1]);

  const getTileLayer = () => {
    if (useChina) {
      switch (mapStyle) {
        case 'satellite':
          return {
            url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
            attribution: '&copy; 高德地图',
            subdomains: ['1', '2', '3', '4'],
          };
        case 'terrain':
          return {
            url: 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=8&ltype=11',
            attribution: '&copy; 高德地图',
            subdomains: ['1', '2', '3', '4'],
          };
        case 'dark':
          return {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; CARTO',
            subdomains: ['a', 'b', 'c', 'd'],
          };
        default:
          return {
            url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            attribution: '&copy; 高德地图',
            subdomains: ['1', '2', '3', '4'],
          };
      }
    } else {
      switch (mapStyle) {
        case 'satellite':
          return {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '&copy; Esri',
            subdomains: [] as string[],
          };
        case 'terrain':
          return {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '&copy; OpenTopoMap',
            subdomains: ['a', 'b', 'c'],
          };
        case 'dark':
          return {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; CARTO',
            subdomains: ['a', 'b', 'c', 'd'],
          };
        default:
          return {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; OpenStreetMap',
            subdomains: ['a', 'b', 'c'],
          };
      }
    }
  };

  const tileLayer = getTileLayer();

  // Flatten tripRoutePath for the full polyline
  const fullPath = tripRoutePath.flat();
  
  // Calculate animated path based on playback
  let animatedPath: [number, number][] = [];
  if (playbackIndex !== null && tripRoutePath[playbackIndex]) {
    // All previous segments
    const previousSegments = tripRoutePath.slice(0, playbackIndex).flat();
    // Current segment progress
    const currentSegment = tripRoutePath[playbackIndex];
    const pointsInCurrent = Math.floor(playbackProgress * currentSegment.length);
    const currentProgressSegment = currentSegment.slice(0, pointsInCurrent + 1);
    
    animatedPath = [...previousSegments, ...currentProgressSegment];
  } else if (playbackIndex === null) {
    animatedPath = fullPath;
  }

  return (
    <div className="w-full h-full relative rounded-none md:rounded-2xl overflow-hidden md:shadow-2xl md:border md:border-black/5">
      <MapContainer 
        center={checkIns[0]?.coordinates || [39.9163, 116.3972]} 
        zoom={activeCheckInId ? 14 : 11} 
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution={tileLayer.attribution}
          url={tileLayer.url}
          {...(tileLayer.subdomains.length > 0 ? { subdomains: tileLayer.subdomains } : {})}
        />
        
        {/* Route Line */}
        <Polyline 
          positions={fullPath.length > 0 ? fullPath : checkIns.map(c => c.coordinates)} 
          color={mapStyle === 'dark' ? '#fff' : '#000'} 
          weight={2} 
          dashArray="5, 10" 
          opacity={0.3} 
        />
        
        {/* Animated Path */}
        <Polyline 
          positions={animatedPath} 
          color="#F27D26" 
          weight={4} 
          opacity={0.8} 
        />

        {/* Moving Marker during playback */}
        {playbackIndex !== null && tripRoutePath[playbackIndex] && (
          <MovingMarker 
            route={tripRoutePath[playbackIndex]}
            progress={playbackProgress}
            type={checkIns[playbackIndex + 1].transportation}
            isPaused={isPlaybackPaused}
          />
        )}

        {checkIns.map((checkIn, index) => (
          <Marker 
            key={checkIn.id} 
            position={checkIn.coordinates}
            eventHandlers={{
              click: () => onMarkerClick(checkIn.id),
            }}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 ${activeCheckInId === checkIn.id ? 'border-[#F27D26]' : 'border-black/10'}">
                    <span class="text-xs font-bold">${index + 1}</span>
                  </div>
                  ${checkIn.photos.length > 0 ? `
                    <div class="absolute -top-2 -right-2 w-4 h-4 bg-[#F27D26] rounded-full flex items-center justify-center shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    </div>
                  ` : ''}
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Popup>
              <div className="w-48 overflow-hidden">
                {checkIn.photos[0] && (
                  <img 
                    src={checkIn.photos[0].url} 
                    alt={checkIn.locationName} 
                    className="w-full h-24 object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="p-3">
                  <h3 className="font-bold text-sm">{checkIn.locationName}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{checkIn.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-[#F27D26]">
                    <TransportationIcon type={checkIn.transportation} />
                    <span className="text-[10px] uppercase tracking-wider font-bold">
                      {checkIn.transportation || '探索中'}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {activeCheckIn && playbackIndex === null && <MapUpdater center={activeCheckIn.coordinates} />}
      </MapContainer>

      {/* Map Overlay Controls */}
      <div className="absolute bottom-24 md:bottom-6 left-3 right-3 md:left-6 md:right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
        {playbackIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white/95 backdrop-blur-xl p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl border border-black/5 pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[#F27D26] tracking-wider">路线回放中</span>
              <span className="text-[10px] font-bold text-gray-400">
                {playbackIndex + 1} / {checkIns.length - 1}
              </span>
            </div>
            <div className="w-full h-1 md:h-1.5 bg-black/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#F27D26]"
                initial={{ width: 0 }}
                animate={{ width: `${((playbackIndex + playbackProgress) / (checkIns.length - 1)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] font-bold truncate max-w-[40%]">{checkIns[playbackIndex].locationName}</span>
              <span className="text-[10px] font-bold truncate max-w-[40%] text-right">{checkIns[playbackIndex + 1].locationName}</span>
            </div>
          </motion.div>
        )}

        {/* Current location indicator - desktop only */}
        <div className="hidden md:block bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-black/5 pointer-events-auto w-fit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold truncate">当前位置</p>
              <p className="text-sm font-bold truncate">{activeCheckIn?.locationName || '选择一个足迹'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
