import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Map as MapIcon, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  ChevronRight, 
  Calendar,
  Navigation,
  Camera,
  Share2,
  Settings,
  Search,
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { TravelMap } from './components/TravelMap';
import { PhotoMosaic } from './components/PhotoMosaic';
import { Modal } from './components/Modal';
import { MOCK_TRIPS } from './constants';
import { CheckIn, Photo, Trip } from './types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getRoute } from './services/routingService';

export default function App() {
  const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [activeTripId, setActiveTripId] = useState<string>(MOCK_TRIPS[0].id);
  const [activeCheckInId, setActiveCheckInId] = useState<string | null>(MOCK_TRIPS[0].stops[0].id);
  const [view, setView] = useState<'map' | 'gallery'>('map');
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tripRoutePath, setTripRoutePath] = useState<[number, number][][]>([]);
  const [isRouting, setIsRouting] = useState(false);

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'terrain' | 'dark'>('standard');
  const [autoPlay, setAutoPlay] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [newCheckInData, setNewCheckInData] = useState({
    locationName: '',
    description: '',
    transportation: 'walk' as any,
    coordinates: [39.9, 116.4] as [number, number]
  });
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [isQuickCheckingIn, setIsQuickCheckingIn] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const quickFileInputRef = React.useRef<HTMLInputElement>(null);

  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId) || trips[0], [trips, activeTripId]);
  const checkIns = activeTrip.stops;

  // Fetch routes between stops when active trip changes
  useEffect(() => {
    const fetchTripRoutes = async () => {
      if (checkIns.length < 2) {
        setTripRoutePath([]);
        return;
      }
      
      setIsRouting(true);
      const paths: [number, number][][] = [];
      
      for (let i = 0; i < checkIns.length - 1; i++) {
        const start = checkIns[i].coordinates;
        const end = checkIns[i + 1].coordinates;
        const profile = checkIns[i + 1].transportation || 'car';
        
        if (profile === 'flight') {
          paths.push([start, end]);
        } else {
          const route = await getRoute(start, end, profile);
          paths.push(route);
        }
      }
      
      setTripRoutePath(paths);
      setIsRouting(false);
    };

    fetchTripRoutes();
  }, [activeTripId, checkIns]);

  // Auto-play logic when switching trips
  useEffect(() => {
    if (autoPlay && tripRoutePath.length > 0 && !isPlaybackActive) {
      // Small delay to ensure map is ready
      const timer = setTimeout(() => {
        setIsPlaybackActive(true);
        setIsPlaybackPaused(false);
        setPlaybackIndex(0);
        setPlaybackProgress(0);
        setActiveCheckInId(checkIns[0].id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTripId, tripRoutePath, autoPlay]);

  const filteredCheckIns = useMemo(() => {
    return checkIns.filter(c => 
      c.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [checkIns, searchQuery]);

  const searchLocation = (query: string) => {
    if (!query || query.length < 2) {
      setLocationSearchResults([]);
      setShowNoResults(false);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    setShowNoResults(false);
    searchTimeout.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        setLocationSearchResults(data);
        setShowNoResults(data.length === 0);
      } catch (error) {
        console.error('Location search error:', error);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);
  };

  const handleQuickCheckIn = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsQuickCheckingIn(true);
    try {
      // 1. Read image first (always succeeds)
      const reader = new FileReader();
      const imageData = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // 2. Try to get location (with fallback)
      let latitude = 39.9;
      let longitude = 116.4;
      let locationName = '未知地点';

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 60000
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        // 3. Reverse geocode with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          const geoData = await geoResponse.json();
          locationName = geoData.display_name?.split(',')[0] || geoData.name || '当前位置';
        } catch {
          clearTimeout(timeoutId);
          locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
      } catch {
        // Geolocation failed, use defaults
      }

      // 4. Create check-in
      const newId = `s${Date.now()}`;
      const newCheckIn: CheckIn = {
        id: newId,
        locationName,
        coordinates: [latitude, longitude],
        timestamp: new Date().toISOString(),
        description: '快速打卡：记录这一刻！',
        transportation: 'walk',
        photos: [
          {
            id: `p${Date.now()}`,
            url: imageData,
            caption: locationName,
            location: [latitude, longitude],
            timestamp: new Date().toISOString()
          }
        ]
      };

      const updatedTrips = trips.map(t => {
        if (t.id === activeTripId) {
          return { ...t, stops: [...t.stops, newCheckIn] };
        }
        return t;
      });

      setTrips(updatedTrips);
      setActiveCheckInId(newId);
    } catch (error) {
      console.error('Quick check-in error:', error);
      alert('打卡失败，请重试。');
    } finally {
      setIsQuickCheckingIn(false);
      if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const addNewCheckIn = () => {
    if (!newCheckInData.locationName) return;
    
    const newId = `s${Date.now()}`;
    const [lat, lng] = newCheckInData.coordinates;
    
    const newCheckIn: CheckIn = {
      id: newId,
      locationName: newCheckInData.locationName,
      coordinates: [lat, lng],
      timestamp: new Date().toISOString(),
      description: newCheckInData.description || '开启一段新的旅程...',
      transportation: newCheckInData.transportation,
      photos: selectedImages.length > 0 
        ? selectedImages.map((url, i) => ({
            id: `p${Date.now()}-${i}`,
            url,
            caption: newCheckInData.locationName,
            location: [lat, lng],
            timestamp: new Date().toISOString()
          }))
        : [
            {
              id: `p${Date.now()}`,
              url: `https://picsum.photos/seed/${newId}/800/600`,
              caption: newCheckInData.locationName,
              location: [lat, lng],
              timestamp: new Date().toISOString()
            }
          ]
    };
    
    const updatedTrips = trips.map(t => {
      if (t.id === activeTripId) {
        return { ...t, stops: [...t.stops, newCheckIn] };
      }
      return t;
    });
    
    setTrips(updatedTrips);
    setActiveCheckInId(newId);
    setIsAddOpen(false);
    setNewCheckInData({ locationName: '', description: '', transportation: 'walk', coordinates: [39.9, 116.4] });
    setSelectedImages([]);
    setLocationSearchResults([]);
    setShowNoResults(false);
  };

  const deleteCheckIn = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这段旅程记录吗？')) {
      const updatedTrips = trips.map(t => {
        if (t.id === activeTripId) {
          const newStops = t.stops.filter(s => s.id !== id);
          return { ...t, stops: newStops };
        }
        return t;
      });
      setTrips(updatedTrips);
      if (activeCheckInId === id) {
        const currentTrip = updatedTrips.find(t => t.id === activeTripId);
        setActiveCheckInId(currentTrip?.stops[0]?.id || null);
      }
    }
  };

  // Playback logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaybackActive && !isPlaybackPaused) {
      if (playbackIndex === null) {
        setPlaybackIndex(0);
        setPlaybackProgress(0);
      }
      
      interval = setInterval(() => {
        setPlaybackProgress(prev => {
          const increment = 0.005 * playbackSpeed;
          if (prev >= 1) {
            // We reached a stop, pause for a moment
            setIsPlaybackPaused(true);
            setTimeout(() => {
              setPlaybackIndex(idx => {
                if (idx !== null && idx < checkIns.length - 2) {
                  setActiveCheckInId(checkIns[idx + 1].id);
                  setPlaybackProgress(0); // Reset progress for next segment
                  setIsPlaybackPaused(false);
                  return idx + 1;
                } else {
                  setIsPlaybackActive(false);
                  setIsPlaybackPaused(false);
                  setPlaybackIndex(null);
                  setPlaybackProgress(0);
                  return null;
                }
              });
            }, 1500); // Pause for 1.5s at each stop
            return 1;
          }
          return Math.min(prev + increment, 1);
        });
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isPlaybackActive, isPlaybackPaused, playbackIndex, checkIns, playbackSpeed]);

  const startPlayback = () => {
    if (isPlaybackActive) {
      setIsPlaybackPaused(!isPlaybackPaused);
    } else {
      setIsPlaybackActive(true);
      setIsPlaybackPaused(false);
      setPlaybackIndex(0);
      setPlaybackProgress(0);
      setActiveCheckInId(checkIns[0].id);
    }
  };

  const stopPlayback = () => {
    setIsPlaybackActive(false);
    setIsPlaybackPaused(false);
    setPlaybackIndex(null);
    setPlaybackProgress(0);
  };

  const activeCheckIn = useMemo(() => 
    checkIns.find(c => c.id === activeCheckInId) || checkIns[0], 
  [activeCheckInId, checkIns]);

  const allPhotos = useMemo(() => 
    checkIns.flatMap(c => c.photos), 
  [checkIns]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f2ed] flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white/90 backdrop-blur-xl border-b border-black/5 z-30 safe-top">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-1 active:bg-black/5 rounded-xl transition-colors"
          >
            <Navigation className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">WanderLog</h1>
            <p className="text-[10px] text-gray-400 font-medium truncate max-w-[140px]">{activeTrip.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('map')}
            className={`p-2 rounded-xl transition-colors ${view === 'map' ? 'bg-black text-white' : 'text-gray-400 active:bg-black/5'}`}
          >
            <MapIcon className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setView('gallery')}
            className={`p-2 rounded-xl transition-colors ${view === 'gallery' ? 'bg-black text-white' : 'text-gray-400 active:bg-black/5'}`}
          >
            <ImageIcon className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Sidebar - Timeline (Drawer on mobile) */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside 
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 left-0 z-50 w-80 md:w-96 flex flex-col border-r border-black/5 bg-white/95 backdrop-blur-xl md:relative md:translate-x-0 ${isSidebarOpen ? 'shadow-2xl' : 'hidden md:flex'}`}
          >
            <header className="p-6 md:p-8 border-bottom border-black/5">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h1 className="text-2xl font-serif italic tracking-tight">WanderLog</h1>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <Settings className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </div>

              {/* Trip Selector */}
              <div className="mb-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">当前旅行</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {trips.map(trip => (
                    <button
                      key={trip.id}
                      onClick={() => {
                        setActiveTripId(trip.id);
                        setActiveCheckInId(trip.stops[0]?.id || null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeTripId === trip.id ? 'bg-black text-white' : 'bg-black/5 text-gray-500 hover:bg-black/10'
                      }`}
                    >
                      {trip.title}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索旅程..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/5 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#F27D26]/20 transition-all"
                />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-gray-400">旅程时间轴</h2>
                <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full">{filteredCheckIns.length} 站</span>
              </div>

              <div className="relative space-y-4">
                {/* Timeline Line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-black/10" />
                
                {filteredCheckIns.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      setActiveCheckInId(item.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`relative pl-12 pr-4 py-4 rounded-2xl cursor-pointer transition-all group ${
                      activeCheckInId === item.id ? 'bg-white shadow-xl scale-[1.02]' : 'hover:bg-white/40'
                    }`}
                  >
                    {/* Timeline Dot */}
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all ${
                      activeCheckInId === item.id ? 'bg-[#F27D26] border-[#F27D26] scale-125' : 'bg-white border-black/20 group-hover:border-black/40'
                    }`} />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-400">
                          {format(new Date(item.timestamp), 'MMM dd, yyyy', { locale: zhCN })}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.transportation && (
                            <div className="p-1 bg-black/5 rounded-md">
                               <Navigation className="w-3 h-3 text-gray-400" />
                            </div>
                          )}
                          <button 
                            onClick={(e) => deleteCheckIn(item.id, e)}
                            className="p-1 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-sm group-hover:text-[#F27D26] transition-colors">{item.locationName}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
                {filteredCheckIns.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-400">未找到相关旅程</p>
                  </div>
                )}
              </div>
            </div>

            <footer className="p-4 md:p-6 border-t border-black/5 bg-white/90 backdrop-blur-xl space-y-2.5 safe-bottom">
              <input
                type="file"
                ref={quickFileInputRef}
                onChange={handleQuickCheckIn}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <button
                onClick={() => quickFileInputRef.current?.click()}
                disabled={isQuickCheckingIn}
                className="w-full bg-[#F27D26] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-[#F27D26]/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isQuickCheckingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {isQuickCheckingIn ? '定位上传中...' : '快速拍照打卡'}
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-black/10"
              >
                <Plus className="w-4 h-4" />
                开启新旅程
              </button>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Navigation (Desktop Only) */}
        <nav className="hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-md px-2 py-2 rounded-2xl shadow-2xl border border-black/5 items-center gap-1">
          <button 
            onClick={() => setView('map')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              view === 'map' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-black/5'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            地图视图
          </button>
          <button 
            onClick={() => setView('gallery')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              view === 'gallery' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-black/5'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            照片墙
          </button>
        </nav>

        {/* View Container */}
        <div className="flex-1 p-0 md:p-8 md:pt-24 h-full overflow-hidden relative">
          {isRouting && (
            <div className="absolute top-14 md:top-28 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F27D26] rounded-full animate-ping" />
              正在规划路线...
            </div>
          )}
          <AnimatePresence mode="wait">
            {view === 'map' ? (
              <motion.div 
                key="map"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full"
              >
                <TravelMap 
                  checkIns={checkIns} 
                  activeCheckInId={activeCheckInId}
                  onMarkerClick={setActiveCheckInId}
                  playbackIndex={playbackIndex}
                  playbackProgress={playbackProgress}
                  isPlaybackPaused={isPlaybackPaused}
                  tripRoutePath={tripRoutePath}
                  mapStyle={mapStyle}
                />
              </motion.div>
            ) : (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full h-full overflow-y-auto px-3 pt-3 pb-6 md:px-0 md:pt-0 md:pb-0"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-5">
                  {allPhotos.map((photo, i) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedPhoto(photo)}
                      className="group relative aspect-[3/4] rounded-xl md:rounded-2xl overflow-hidden shadow-md cursor-pointer active:scale-[0.97] transition-transform"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      {/* Always visible on mobile, hover on desktop */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2.5 md:p-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <p className="text-white font-semibold text-[11px] md:text-sm truncate">{photo.caption}</p>
                        <span className="text-[9px] md:text-[10px] text-white/60 font-medium">
                          {format(new Date(photo.timestamp), 'MM.dd')}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Playback Controls */}
        <div className="absolute top-3 right-3 md:bottom-12 md:right-12 md:top-auto z-20 flex flex-col items-end gap-2 md:gap-3">
          {isPlaybackActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/95 backdrop-blur-xl p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-xl border border-black/5 flex items-center gap-3"
            >
              <div className="flex gap-1">
                {[0.5, 1, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      playbackSpeed === speed ? 'bg-black text-white' : 'bg-black/5 text-gray-500'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              <div className="h-5 w-px bg-black/10" />
              <button
                onClick={stopPlayback}
                className="p-1.5 active:bg-red-50 rounded-lg transition-colors text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={startPlayback}
              className={`flex items-center gap-1.5 md:gap-3 px-3 md:px-6 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl shadow-xl font-bold text-[11px] md:text-sm transition-all ${
                isPlaybackActive
                  ? 'bg-white text-black border border-black/5'
                  : 'bg-[#F27D26] text-white shadow-[#F27D26]/25'
              }`}
            >
              {isPlaybackActive ? (
                isPlaybackPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
                  <span>回放</span>
                </>
              )}
            </motion.button>

            <button
              onClick={() => setIsShareOpen(true)}
              className="p-2.5 md:p-3 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-black/5 active:bg-black/5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Active Info Panel (Bottom Left) */}
        {view === 'map' && activeCheckIn && (
          <motion.div
            key={activeCheckIn.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-20 left-3 right-3 md:bottom-12 md:left-12 md:right-auto z-20 md:w-80 bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-black/5 overflow-hidden"
          >
            {/* Mobile: compact horizontal layout */}
            <div className="flex md:hidden items-center gap-3 p-3" onClick={() => setIsDetailsOpen(true)}>
              {activeCheckIn.photos[0] && (
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <img
                    src={activeCheckIn.photos[0].url}
                    alt={activeCheckIn.locationName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold truncate">{activeCheckIn.locationName}</h2>
                <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{activeCheckIn.description}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(activeCheckIn.timestamp), 'MM/dd', { locale: zhCN })}
                  </span>
                  <span className="text-[10px] text-[#F27D26] font-bold">{activeCheckIn.photos.length} 张照片</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </div>

            {/* Desktop: full layout */}
            <div className="hidden md:block">
              {activeCheckIn.photos[0] && (
                <div className="w-full h-40 relative">
                  <img
                    src={activeCheckIn.photos[0].url}
                    alt={activeCheckIn.locationName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-bold uppercase tracking-wider">
                    {activeCheckIn.photos.length} 张照片
                  </div>
                </div>
              )}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold line-clamp-1">{activeCheckIn.locationName}</h2>
                  <div className="flex items-center gap-2 mt-1 text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs">{format(new Date(activeCheckIn.timestamp), 'yyyy年MM月dd日', { locale: zhCN })}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {activeCheckIn.description}
                </p>
                <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {activeCheckIn.photos.slice(0, 3).map((p) => (
                      <div key={p.id} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm">
                        <img src={p.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsDetailsOpen(true)}
                    className="px-4 py-2 bg-[#F27D26] text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#d96a1d] transition-all shadow-lg shadow-[#F27D26]/20"
                  >
                    查看照片墙 <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Modals */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="应用设置">
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">地图样式</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'standard', name: '标准' },
                { id: 'satellite', name: '卫星' },
                { id: 'terrain', name: '地形' },
                { id: 'dark', name: '暗色' }
              ].map(style => (
                <button 
                  key={style.id} 
                  onClick={() => setMapStyle(style.id as any)}
                  className={`p-4 rounded-2xl border transition-all text-sm font-bold ${
                    mapStyle === style.id 
                      ? 'border-[#F27D26] bg-[#F27D26]/5 text-[#F27D26]' 
                      : 'border-black/5 hover:border-black/20'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">偏好设置</h4>
            <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
              <span className="text-sm font-bold">自动播放路线</span>
              <button 
                onClick={() => setAutoPlay(!autoPlay)}
                className={`w-10 h-5 rounded-full relative transition-colors ${autoPlay ? 'bg-[#F27D26]' : 'bg-gray-300'}`}
              >
                <motion.div 
                  animate={{ x: autoPlay ? 22 : 2 }}
                  className="absolute top-1 w-3 h-3 bg-white rounded-full" 
                />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="分享你的旅程">
        <div className="text-center space-y-6">
          <div className="w-48 h-48 bg-black/5 rounded-3xl mx-auto flex items-center justify-center">
            <div className="w-32 h-32 border-4 border-black rounded-xl flex items-center justify-center font-serif italic text-2xl">WL</div>
          </div>
          <p className="text-sm text-gray-500">扫描二维码或复制链接分享给好友</p>
          <button className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm">
            复制分享链接
          </button>
        </div>
      </Modal>

      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title={activeCheckIn?.locationName || '详情'}>
        <div className="space-y-8">
          <div className="p-6 bg-black/5 rounded-3xl border border-black/5">
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">{activeCheckIn?.description}</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">旅程记忆</h4>
              <span className="text-[10px] font-bold text-[#F27D26] bg-[#F27D26]/10 px-2 py-1 rounded-full">
                {activeCheckIn?.photos.length} 张照片
              </span>
            </div>
            
            <div className="h-[500px] w-full">
              {activeCheckIn && (
                <PhotoMosaic 
                  key={activeCheckIn.id} 
                  photos={activeCheckIn.photos} 
                />
              )}
            </div>
          </div>

          <div className="p-6 bg-[#F27D26]/5 rounded-3xl border border-[#F27D26]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F27D26] flex items-center justify-center text-white">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#F27D26] uppercase tracking-widest">交通方式</p>
                <p className="text-sm font-bold capitalize">{activeCheckIn?.transportation || '未知'}</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="开启新旅程">
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 no-scrollbar">
          <div className="space-y-2 relative">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">搜索地点</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="搜索地图上的位置..."
                value={newCheckInData.locationName}
                onChange={e => {
                  setNewCheckInData({...newCheckInData, locationName: e.target.value});
                  searchLocation(e.target.value);
                }}
                className="w-full bg-black/5 border-none rounded-xl py-3 px-4 text-sm"
              />
              {isSearchingLocation && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            {locationSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-2xl border border-black/5 overflow-hidden">
                {locationSearchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setNewCheckInData({
                        ...newCheckInData,
                        locationName: result.display_name.split(',')[0],
                        coordinates: [parseFloat(result.lat), parseFloat(result.lon)]
                      });
                      setLocationSearchResults([]);
                      setShowNoResults(false);
                    }}
                    className="w-full text-left px-4 py-3 text-xs hover:bg-black/5 border-b border-black/5 last:border-none transition-colors"
                  >
                    <p className="font-bold truncate">{result.display_name.split(',')[0]}</p>
                    <p className="text-gray-400 truncate text-[10px]">{result.display_name}</p>
                  </button>
                ))}
              </div>
            )}
            {showNoResults && !isSearchingLocation && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-lg border border-black/5 p-4 text-center">
                <p className="text-xs text-gray-400">未找到相关地点，请尝试更精确的关键词</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">上传图片</label>
            <div className="grid grid-cols-3 gap-2">
              {selectedImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setSelectedImages(prev => prev.filter((_, index) => index !== i))}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-xl border-2 border-dashed border-black/10 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 transition-colors">
                <Plus className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">添加照片</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">旅途感悟</label>
            <textarea 
              placeholder="记录这一刻的心情..."
              value={newCheckInData.description}
              onChange={e => setNewCheckInData({...newCheckInData, description: e.target.value})}
              className="w-full bg-black/5 border-none rounded-xl py-3 px-4 text-sm h-24 resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">交通工具</label>
            <div className="flex gap-2">
              {['walk', 'bike', 'car', 'train', 'flight'].map(t => (
                <button 
                  key={t}
                  onClick={() => setNewCheckInData({...newCheckInData, transportation: t})}
                  className={`flex-1 py-2 rounded-xl border transition-all capitalize text-[10px] font-bold ${
                    newCheckInData.transportation === t ? 'bg-black text-white border-black' : 'border-black/5 hover:bg-black/5'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={addNewCheckIn}
            className="w-full bg-[#F27D26] text-white py-4 rounded-2xl font-bold text-sm mt-4 shadow-xl shadow-[#F27D26]/20"
          >
            发布打卡
          </button>
        </div>
      </Modal>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-3 md:p-12 safe-top safe-bottom"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 md:top-8 md:right-8 p-2 text-white/60 hover:text-white bg-white/10 rounded-full z-10 transition-colors"
            >
              <X className="w-5 h-5 md:w-7 md:h-7" />
            </button>
            <div className="max-w-5xl w-full flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={selectedPhoto.url}
                className="w-full h-auto max-h-[75vh] object-contain rounded-xl md:rounded-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="text-center space-y-1">
                <h3 className="text-white text-lg md:text-2xl font-bold">{selectedPhoto.caption}</h3>
                <p className="text-white/40 text-[11px] md:text-xs">
                  {format(new Date(selectedPhoto.timestamp), 'yyyy.MM.dd HH:mm')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
