import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/appStore'
import MapView from '@/components/MapView'
import PlaceMarker from '@/components/PlaceMarker'
import L from 'leaflet'
import {
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  MapPin,
  Calendar,
  Loader2,
  Navigation,
  ChevronRight,
  Locate,
} from 'lucide-react'
import { format } from 'date-fns'

export default function HomePage() {
  const navigate = useNavigate()
  const { sidebarOpen, setSidebarOpen, mapCenter, mapZoom } = useAppStore()
  const [hoveredTripId, setHoveredTripId] = useState<number | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  const trips = useLiveQuery(() => db.trips.orderBy('updatedAt').reverse().toArray())
  const places = useLiveQuery(() => db.places.toArray())

  // Build maps
  const tripColorMap = useMemo(() => {
    const map = new Map<number, string>()
    if (trips) {
      for (const trip of trips) {
        if (trip.id !== undefined) {
          map.set(trip.id, trip.color)
        }
      }
    }
    return map
  }, [trips])

  const tripStatusMap = useMemo(() => {
    const map = new Map<number, string>()
    if (trips) {
      for (const trip of trips) {
        if (trip.id !== undefined) {
          map.set(trip.id, trip.status)
        }
      }
    }
    return map
  }, [trips])

  const placeCountMap = useMemo(() => {
    const map = new Map<number, number>()
    if (places) {
      for (const place of places) {
        map.set(place.tripId, (map.get(place.tripId) || 0) + 1)
      }
    }
    return map
  }, [places])

  // Handle map ready
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  // FitBounds when places load
  useEffect(() => {
    if (!mapRef.current || !places || places.length === 0) return
    const bounds = L.latLngBounds(
      places.map((p) => [p.latitude, p.longitude] as [number, number]),
    )
    mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
  }, [places])

  // Focus map on trip's places when hovered
  useEffect(() => {
    if (!mapRef.current || !places || hoveredTripId === null) return
    const tripPlaces = places.filter((p) => p.tripId === hoveredTripId)
    if (tripPlaces.length === 0) return
    if (tripPlaces.length === 1) {
      mapRef.current.flyTo([tripPlaces[0].latitude, tripPlaces[0].longitude], 10, { duration: 0.5 })
    } else {
      const bounds = L.latLngBounds(
        tripPlaces.map((p) => [p.latitude, p.longitude] as [number, number]),
      )
      mapRef.current.flyToBounds(bounds, { padding: [60, 60], maxZoom: 12, duration: 0.5 })
    }
  }, [hoveredTripId, places])

  const isLoading = trips === undefined || places === undefined

  return (
    <div className="relative h-full w-full flex">
      {/* Sidebar */}
      <div
        className={`absolute md:relative z-10 h-full transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden shrink-0`}
      >
        <div className="h-full w-80 glass border-r border-gray-200/60 dark:border-gray-700/60 flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200/60 dark:border-gray-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Navigation size={14} className="text-white" />
              </div>
              <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">
                我的旅行
              </h2>
            </div>
            <button
              onClick={() => navigate('/trips?new=true')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all shadow-sm shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.97]"
            >
              <Plus size={14} strokeWidth={2.5} />
              新建
            </button>
          </div>

          {/* Trip list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-4">
                  <MapPin size={28} className="opacity-40" />
                </div>
                <p className="text-sm font-medium">暂无旅行</p>
                <p className="text-xs mt-1.5 text-gray-400/80">点击「新建」创建第一段旅行</p>
              </div>
            ) : (
              trips.map((trip) => {
                const placeCount = placeCountMap.get(trip.id!) || 0
                return (
                  <div
                    key={trip.id}
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    onMouseEnter={() => setHoveredTripId(trip.id ?? null)}
                    onMouseLeave={() => setHoveredTripId(null)}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      hoveredTripId === trip.id
                        ? 'bg-white dark:bg-gray-700/60 shadow-md shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/10'
                        : 'hover:bg-white/80 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    {/* Top: color dot + name + status */}
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: trip.color }}
                      />
                      <h3 className="flex-1 font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {trip.name}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          trip.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                        }`}
                      >
                        {trip.status === 'completed' ? '已完成' : '计划中'}
                      </span>
                    </div>
                    {/* Bottom: date + place count + arrow */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 pl-5">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {trip.startDate
                          ? format(new Date(trip.startDate), 'yyyy/MM/dd')
                          : '未设置'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {placeCount} 地点
                      </span>
                      <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        <MapView center={mapCenter} zoom={mapZoom} onMapReady={handleMapReady}>
          {places &&
            places.map((place) => (
              <PlaceMarker
                key={place.id}
                place={place}
                color={tripColorMap.get(place.tripId) || '#3b82f6'}
                isPlanned={tripStatusMap.get(place.tripId) === 'planned'}
                onClick={() => navigate(`/trips/${place.tripId}`)}
              />
            ))}
        </MapView>

        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-20 p-2.5 glass rounded-xl shadow-lg border border-white/20 dark:border-gray-600/30 hover:bg-white dark:hover:bg-gray-700 transition-all"
          title={sidebarOpen ? '隐藏侧栏' : '显示侧栏'}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={18} className="text-gray-600 dark:text-gray-300" />
          ) : (
            <PanelLeftOpen size={18} className="text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Locate me button */}
        <button
          onClick={() => {
            if (!navigator.geolocation) return
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (mapRef.current) {
                  mapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 0.8 })
                }
              },
              () => {},
              { enableHighAccuracy: true, timeout: 10000 },
            )
          }}
          className="absolute bottom-6 right-24 z-20 p-3.5 glass rounded-xl shadow-lg border border-white/20 dark:border-gray-600/30 hover:bg-white dark:hover:bg-gray-700 transition-all hover:scale-105 active:scale-[0.97]"
          title="定位到当前位置"
        >
          <Locate size={20} className="text-emerald-600 dark:text-emerald-400" />
        </button>

        {/* Quick add button */}
        <button
          onClick={() => navigate('/trips?new=true')}
          className="absolute bottom-6 right-6 z-20 p-4 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-blue-500/40 active:scale-[0.97]"
          title="新建旅行"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
