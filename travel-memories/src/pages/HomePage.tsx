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
        <div className="h-full w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              我的旅行
            </h2>
            <button
              onClick={() => navigate('/trips?new=true')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <Plus size={16} />
              新建
            </button>
          </div>

          {/* Trip list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <MapPin size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无旅行</p>
                <p className="text-xs mt-1">点击「新建」创建第一段旅行</p>
              </div>
            ) : (
              trips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  onMouseEnter={() => setHoveredTripId(trip.id ?? null)}
                  onMouseLeave={() => setHoveredTripId(null)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    hoveredTripId === trip.id
                      ? 'border-blue-300 dark:border-blue-600 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  } bg-white dark:bg-gray-800`}
                >
                  {/* Color bar + Name */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2 h-10 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: trip.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {trip.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            trip.status === 'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {trip.status === 'completed' ? '已完成' : '计划中'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {trip.startDate
                            ? format(new Date(trip.startDate), 'yyyy/MM/dd')
                            : '未设置'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {placeCountMap.get(trip.id!) || 0} 地点
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
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
          className="absolute top-4 left-4 z-20 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title={sidebarOpen ? '隐藏侧栏' : '显示侧栏'}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={20} className="text-gray-600 dark:text-gray-300" />
          ) : (
            <PanelLeftOpen size={20} className="text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Quick add button */}
        <button
          onClick={() => navigate('/trips?new=true')}
          className="absolute bottom-6 right-6 z-20 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-105"
          title="新建旅行"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  )
}
