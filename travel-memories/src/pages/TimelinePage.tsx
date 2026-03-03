import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { AnimationSegment } from '@/types'
import { TRANSPORT_CONFIG } from '@/types'
import { useAnimationStore } from '@/stores/animationStore'
import { useAppStore } from '@/stores/appStore'
import { buildAnimationSegments } from '@/services/routeService'
import { interpolatePosition } from '@/utils/geo'
import MapView from '@/components/MapView'
import PlaceMarker from '@/components/PlaceMarker'
import RoutePolyline from '@/components/RoutePolyline'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import {
  Play,
  Pause,
  RotateCcw,
  Car,
  Train,
  Plane,
  Loader2,
  ChevronDown,
} from 'lucide-react'

const SPEED_OPTIONS = [0.5, 1, 2, 4]

/**
 * Custom hook that drives the animation using requestAnimationFrame.
 * Reads isPlaying and speed from the animation store,
 * advances progress accordingly, and updates the store state.
 */
function useMapAnimation() {
  const {
    isPlaying,
    progress,
    speed,
    segments,
    setPlaying,
    setProgress,
    setCurrentSegmentIndex,
  } = useAnimationStore()

  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  const animate = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp
      }

      const deltaMs = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      // Base duration: 30 seconds for the entire route
      const baseDuration = 30000
      const deltaProgress = (deltaMs / baseDuration) * speed

      const newProgress = Math.min(1, progress + deltaProgress)

      // Find which segment we're in
      let segIndex = 0
      for (let i = 0; i < segments.length; i++) {
        if (newProgress >= segments[i].startProgress && newProgress <= segments[i].endProgress) {
          segIndex = i
          break
        }
        if (i === segments.length - 1) {
          segIndex = i
        }
      }

      setProgress(newProgress)
      setCurrentSegmentIndex(segIndex)

      if (newProgress >= 1) {
        setPlaying(false)
        lastTimeRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(animate)
    },
    [progress, speed, segments, setProgress, setCurrentSegmentIndex, setPlaying],
  )

  useEffect(() => {
    if (isPlaying && segments.length > 0) {
      lastTimeRef.current = null
      rafRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, animate, segments.length])
}

/**
 * Create a leaflet DivIcon for the transport mode marker.
 */
function createTransportIcon(mode: string, bearing: number): L.DivIcon {
  const iconMap: Record<string, string> = {
    driving: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    train: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/><path d="M4 11h16"/><path d="M4 15h16"/><path d="m9 21 3 3 3-3"/><circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/></svg>`,
    flight: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  }

  return L.divIcon({
    className: 'transport-icon',
    html: `<div style="
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${TRANSPORT_CONFIG[mode as keyof typeof TRANSPORT_CONFIG]?.color || '#3b82f6'};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      border: 3px solid white;
      transform: rotate(${bearing}deg);
    ">${iconMap[mode] || iconMap.driving}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

export default function TimelinePage() {
  const { mapCenter, mapZoom } = useAppStore()
  const {
    isPlaying,
    progress,
    speed,
    segments,
    currentSegmentIndex,
    tripId: animTripId,
    setPlaying,
    setProgress,
    setSpeed,
    setSegments,
    setCurrentSegmentIndex,
    setTripId,
    reset,
  } = useAnimationStore()

  const trips = useLiveQuery(() => db.trips.toArray())
  const [isLoadingSegments, setIsLoadingSegments] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState<number | null>(animTripId)
  const mapRef = useRef<L.Map | null>(null)

  // Handle map ready
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  // Drive the animation loop
  useMapAnimation()

  // Load segments when trip selection changes
  useEffect(() => {
    if (selectedTripId === null) {
      reset()
      return
    }

    let cancelled = false

    const loadSegments = async () => {
      setIsLoadingSegments(true)
      setPlaying(false)

      const places = await db.places
        .where('tripId')
        .equals(selectedTripId)
        .sortBy('sortOrder')

      if (cancelled) return

      if (places.length < 2) {
        setSegments([])
        setTripId(selectedTripId)
        setIsLoadingSegments(false)
        return
      }

      const segs = await buildAnimationSegments(places)

      if (cancelled) return

      setSegments(segs)
      setProgress(0)
      setCurrentSegmentIndex(0)
      setTripId(selectedTripId)
      setIsLoadingSegments(false)
    }

    loadSegments()

    return () => {
      cancelled = true
    }
  }, [selectedTripId, reset, setPlaying, setSegments, setProgress, setCurrentSegmentIndex, setTripId])

  // Get the current trip
  const selectedTrip = useMemo(
    () => trips?.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  )

  // Get all places for current trip
  const tripPlaces = useLiveQuery(
    async () =>
      selectedTripId !== null
        ? await db.places.where('tripId').equals(selectedTripId).sortBy('sortOrder')
        : [],
    [selectedTripId],
  )

  // Calculate current animated position
  const currentPosition = useMemo<{ position: [number, number]; bearing: number } | null>(() => {
    if (segments.length === 0) return null

    const seg = segments[currentSegmentIndex]
    if (!seg || seg.coordinates.length === 0) return null

    // Calculate progress within the current segment
    const segRange = seg.endProgress - seg.startProgress
    const segProgress = segRange > 0 ? (progress - seg.startProgress) / segRange : 0
    const clampedSegProgress = Math.max(0, Math.min(1, segProgress))

    return interpolatePosition(seg.coordinates, clampedSegProgress)
  }, [segments, currentSegmentIndex, progress])

  // Current segment info
  const currentSegment: AnimationSegment | null = segments[currentSegmentIndex] ?? null

  // FitBounds when trip places load (before playing)
  useEffect(() => {
    if (!mapRef.current || !tripPlaces || tripPlaces.length === 0) return
    if (isPlaying) return // Don't fitBounds while playing
    const bounds = L.latLngBounds(
      tripPlaces.map((p) => [p.latitude, p.longitude] as [number, number]),
    )
    mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
  }, [tripPlaces, isPlaying])

  // Gently pan map to follow the icon
  useEffect(() => {
    if (isPlaying && currentPosition && mapRef.current) {
      mapRef.current.panTo(currentPosition.position, { animate: true, duration: 0.5 })
    }
  }, [isPlaying, currentPosition])

  const handlePlayPause = () => {
    if (segments.length === 0) return
    if (progress >= 1) {
      // Reset and play from start
      setProgress(0)
      setCurrentSegmentIndex(0)
      setPlaying(true)
    } else {
      setPlaying(!isPlaying)
    }
  }

  const handleReset = () => {
    setPlaying(false)
    setProgress(0)
    setCurrentSegmentIndex(0)
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value)
    setPlaying(false)
    setProgress(newProgress)

    // Find the segment for this progress
    for (let i = 0; i < segments.length; i++) {
      if (newProgress >= segments[i].startProgress && newProgress <= segments[i].endProgress) {
        setCurrentSegmentIndex(i)
        break
      }
    }
  }

  const handleTripSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedTripId(val ? Number(val) : null)
  }

  const isLoading = trips === undefined

  return (
    <div className="h-full w-full flex flex-col">
      {/* Map area */}
      <div className="flex-1 relative">
        <MapView
          center={mapCenter}
          zoom={mapZoom}
          onMapReady={handleMapReady}
        >

          {/* Route polylines */}
          {segments.map((seg, i) => (
            <RoutePolyline
              key={`seg-${i}`}
              coordinates={seg.coordinates}
              transportMode={seg.transportMode}
              traveled={i < currentSegmentIndex || (i === currentSegmentIndex && progress > seg.startProgress)}
            />
          ))}

          {/* Place markers */}
          {tripPlaces &&
            tripPlaces.map((place, index) => (
              <PlaceMarker
                key={place.id}
                place={place}
                color={selectedTrip?.color || '#3b82f6'}
                index={index}
              />
            ))}

          {/* Animated transport icon */}
          {currentPosition && currentSegment && (
            <Marker
              position={currentPosition.position}
              icon={createTransportIcon(currentSegment.transportMode, currentPosition.bearing)}
              zIndexOffset={1000}
            />
          )}
        </MapView>

        {/* No trip selected overlay */}
        {selectedTripId === null && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="glass px-8 py-6 rounded-2xl shadow-xl border border-white/20 dark:border-gray-600/20 text-center pointer-events-auto animate-in">
              <div className="w-14 h-14 rounded-2xl bg-apple-blue flex items-center justify-center mx-auto mb-4">
                <Play size={24} className="text-white ml-0.5" />
              </div>
              <p className="text-gray-800 dark:text-gray-200 font-semibold text-lg mb-1.5">
                旅行时间线
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                在下方选择一个旅行开始播放路线动画
              </p>
            </div>
          </div>
        )}

        {/* Loading segments overlay */}
        {isLoadingSegments && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
            <div className="glass px-6 py-4 rounded-2xl shadow-xl border border-white/20 dark:border-gray-600/20 flex items-center gap-3 animate-in">
              <Loader2 size={20} className="animate-spin text-blue-500" />
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                正在构建路线...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <div className="shrink-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200/80 dark:border-gray-700/80 px-4 sm:px-5 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
          {/* Progress slider */}
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={handleSliderChange}
              className="flex-1 cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-12 text-right shrink-0 tabular-nums">
              {Math.round(progress * 100)}%
            </span>
          </div>

          {/* Controls row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            {/* Top row: trip selector + play/reset */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedTripId ?? ''}
                  onChange={handleTripSelect}
                  className="appearance-none w-full pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                >
                  <option value="">-- 选择旅行 --</option>
                  {trips &&
                    trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.name}
                      </option>
                    ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                disabled={segments.length === 0}
                className="p-2.5 rounded-xl bg-apple-blue hover:bg-apple-blue/85 active:opacity-70 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors shrink-0"
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                disabled={segments.length === 0}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                title="重置"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Bottom row: speed + segment info */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Speed selector */}
              <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 shrink-0">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      speed === s
                        ? 'bg-white dark:bg-gray-600 text-apple-blue dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Current segment info */}
              {currentSegment && (
                <div className="flex items-center gap-2 sm:gap-2.5 ml-auto px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-sm min-w-0 overflow-hidden">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: TRANSPORT_CONFIG[currentSegment.transportMode].color }}
                  >
                    {currentSegment.transportMode === 'driving' && <Car size={14} />}
                    {currentSegment.transportMode === 'train' && <Train size={14} />}
                    {currentSegment.transportMode === 'flight' && <Plane size={14} />}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium truncate">
                    {currentSegment.fromPlace.name}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600 shrink-0">→</span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium truncate">
                    {currentSegment.toPlace.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

