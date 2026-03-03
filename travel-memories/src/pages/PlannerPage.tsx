import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Place, TransportMode } from '@/types'
import { TRANSPORT_CONFIG } from '@/types'
import { useAppStore } from '@/stores/appStore'
import MapView from '@/components/MapView'
import PlaceMarker from '@/components/PlaceMarker'
import RoutePolyline from '@/components/RoutePolyline'
import L from 'leaflet'
import {
  Search,
  Plus,
  ChevronRight,
  MapPin,
  Loader2,
  Star,
  X,
  Trash2,
  Compass,
  Locate,
} from 'lucide-react'

interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

export default function PlannerPage() {
  const { mapCenter, mapZoom } = useAppStore()
  const mapRef = useRef<L.Map | null>(null)

  const plannedTrips = useLiveQuery(() =>
    db.trips.where('status').equals('planned').toArray(),
  )
  const allPlaces = useLiveQuery(() => db.places.toArray())

  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Add place form
  const [pendingLat, setPendingLat] = useState<number | null>(null)
  const [pendingLng, setPendingLng] = useState<number | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [pendingTransport, setPendingTransport] = useState<TransportMode>('driving')
  const [pendingRating, setPendingRating] = useState(0)
  const [pendingDate, setPendingDate] = useState('')
  const [showPendingForm, setShowPendingForm] = useState(false)
  const [locating, setLocating] = useState(false)

  // Places for selected trip
  const selectedTripPlaces = useMemo(() => {
    if (!allPlaces || selectedTripId === null) return []
    return allPlaces
      .filter((p) => p.tripId === selectedTripId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [allPlaces, selectedTripId])

  // All planned places for rendering on map
  const plannedPlaces = useMemo(() => {
    if (!allPlaces || !plannedTrips) return []
    const tripIds = new Set(plannedTrips.map((t) => t.id!))
    return allPlaces.filter((p) => tripIds.has(p.tripId))
  }, [allPlaces, plannedTrips])

  // Route pairs for selected trip
  const routePairs = useMemo(() => {
    if (selectedTripPlaces.length < 2) return []
    const pairs: { from: Place; to: Place }[] = []
    for (let i = 0; i < selectedTripPlaces.length - 1; i++) {
      pairs.push({ from: selectedTripPlaces[i], to: selectedTripPlaces[i + 1] })
    }
    return pairs
  }, [selectedTripPlaces])

  // Trip color map
  const tripColorMap = useMemo(() => {
    const map = new Map<number, string>()
    if (plannedTrips) {
      for (const trip of plannedTrips) {
        if (trip.id !== undefined) map.set(trip.id, trip.color)
      }
    }
    return map
  }, [plannedTrips])

  const selectedTrip = useMemo(
    () => plannedTrips?.find((t) => t.id === selectedTripId) ?? null,
    [plannedTrips, selectedTripId],
  )

  // Handle map ready
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  // FitBounds when selected trip changes
  useEffect(() => {
    if (!mapRef.current || selectedTripPlaces.length === 0) return
    const bounds = L.latLngBounds(
      selectedTripPlaces.map((p) => [p.latitude, p.longitude] as [number, number]),
    )
    mapRef.current.flyToBounds(bounds, { padding: [60, 60], maxZoom: 12, duration: 0.5 })
  }, [selectedTripPlaces])

  // 获取当前定位
  const handleLocateMe = useCallback(() => {
    if (selectedTripId === null) {
      alert('请先选择一个计划中的旅行')
      return
    }
    if (!navigator.geolocation) {
      alert('您的浏览器不支持定位功能')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setPendingLat(latitude)
        setPendingLng(longitude)
        setPendingName('')
        setPendingTransport('driving')
        setPendingRating(0)
        setPendingDate('')
        setShowPendingForm(true)
        // 飞到当前位置
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 14, { duration: 0.8 })
        }
        // 反向地理编码
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14`,
        )
          .then((r) => r.json())
          .then((data) => {
            if (data.display_name) {
              setPendingName(data.display_name.split(',')[0])
            }
          })
          .catch(() => {})
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          alert('定位权限被拒绝，请在浏览器设置中允许定位')
        } else {
          alert('获取定位失败，请重试')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [selectedTripId])

  // Handle map click: set pending place
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (selectedTripId === null) return
      setPendingLat(lat)
      setPendingLng(lng)
      setPendingName('')
      setPendingTransport('driving')
      setPendingRating(0)
      setPendingDate('')
      setShowPendingForm(true)

      // Attempt reverse geocode
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.display_name) {
            setPendingName(data.display_name.split(',')[0])
          }
        })
        .catch(() => {})
    },
    [selectedTripId],
  )

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`,
      )
      const results: SearchResult[] = await response.json()
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handlePickSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    // Fly to search result location
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 12, { duration: 0.8 })
    }

    if (selectedTripId !== null) {
      setPendingLat(lat)
      setPendingLng(lng)
      setPendingName(result.display_name.split(',')[0])
      setShowPendingForm(true)
    }
    setSearchResults([])
    setSearchQuery('')
  }

  // Add place to selected trip
  const handleAddPlace = async () => {
    if (selectedTripId === null || pendingLat === null || pendingLng === null || !pendingName.trim())
      return

    const maxOrder = selectedTripPlaces.length > 0
      ? Math.max(...selectedTripPlaces.map((p) => p.sortOrder))
      : 0

    const place: Place = {
      tripId: selectedTripId,
      name: pendingName.trim(),
      latitude: pendingLat,
      longitude: pendingLng,
      address: '',
      visitDate: pendingDate,
      sortOrder: maxOrder + 1,
      transportMode: pendingTransport,
      rating: pendingRating,
    }
    await db.places.add(place)
    await db.trips.update(selectedTripId, { updatedAt: new Date().toISOString() })

    setPendingLat(null)
    setPendingLng(null)
    setPendingName('')
    setShowPendingForm(false)
  }

  // Delete a place
  const handleDeletePlace = async (placeId: number) => {
    await db.photos.where('placeId').equals(placeId).delete()
    await db.places.delete(placeId)
    if (selectedTripId !== null) {
      await db.trips.update(selectedTripId, { updatedAt: new Date().toISOString() })
    }
  }

  const cancelPending = () => {
    setPendingLat(null)
    setPendingLng(null)
    setPendingName('')
    setShowPendingForm(false)
  }

  const isLoading = plannedTrips === undefined || allPlaces === undefined

  return (
    <div className="h-full w-full flex relative">
      {/* Left panel */}
      <div className="w-80 shrink-0 h-full glass border-r border-gray-200/60 dark:border-gray-700/60 flex flex-col z-10">
        {/* Search box */}
        <div className="p-3 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索地点..."
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-blue-500/20"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : '搜索'}
            </button>
          </div>
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-xl animate-slide-down">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => handlePickSearchResult(result)}
                  className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-b-0 border-gray-100 dark:border-gray-700/60 text-gray-800 dark:text-gray-200 transition-colors"
                >
                  <span className="line-clamp-2">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trip selector */}
        <div className="p-3 border-b border-gray-200/60 dark:border-gray-700/60">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Compass size={12} />
            计划中的旅行
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : plannedTrips!.length === 0 ? (
            <div className="text-center py-4 text-gray-400 dark:text-gray-500">
              <MapPin size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">暂无计划中的旅行</p>
              <p className="text-xs mt-1">请先创建一个「计划中」状态的旅行</p>
            </div>
          ) : (
            <div className="space-y-1">
              {plannedTrips!.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedTripId(trip.id === selectedTripId ? null : trip.id!)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    selectedTripId === trip.id
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium shadow-sm ring-1 ring-blue-200/60 dark:ring-blue-500/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: trip.color }}
                  />
                  <span className="flex-1 text-left truncate">{trip.name}</span>
                  <ChevronRight
                    size={14}
                    className={`shrink-0 transition-transform text-gray-400 ${
                      selectedTripId === trip.id ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected trip places */}
        <div className="flex-1 overflow-y-auto p-3">
          {selectedTripId === null ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">选择一个计划中的旅行</p>
              <p className="text-xs mt-1">然后在地图上点击添加地点</p>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                「{selectedTrip?.name}」的地点
              </h3>
              {selectedTripPlaces.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                  在地图上点击添加地点
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedTripPlaces.map((place, index) => (
                    <div
                      key={place.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 text-sm group cursor-pointer hover:shadow-sm hover:border-gray-200 dark:hover:border-gray-600 transition-all"
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.flyTo([place.latitude, place.longitude], 13, { duration: 0.5 })
                        }
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: selectedTrip?.color || '#3b82f6' }}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 text-gray-800 dark:text-gray-200 truncate">
                        {place.name}
                      </span>
                      {place.rating > 0 && (
                        <span className="flex items-center gap-0.5 shrink-0">
                          <Star size={10} fill="#f59e0b" color="#f59e0b" />
                          <span className="text-xs text-gray-500">{place.rating}</span>
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlace(place.id!)
                        }}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pending add place form */}
        {showPendingForm && selectedTripId !== null && (
          <div className="p-3 border-t border-blue-200/60 dark:border-blue-800/40 bg-gradient-to-b from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Plus size={12} />
                新地点
              </span>
              <button onClick={cancelPending} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded">
                <X size={14} className="text-blue-500" />
              </button>
            </div>
            {pendingLat !== null && pendingLng !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                坐标: {pendingLat.toFixed(4)}, {pendingLng.toFixed(4)}
              </p>
            )}
            <input
              type="text"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              placeholder="地点名称"
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <input
              type="date"
              value={pendingDate}
              onChange={(e) => setPendingDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <select
              value={pendingTransport}
              onChange={(e) => setPendingTransport(e.target.value as TransportMode)}
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            >
              {(Object.keys(TRANSPORT_CONFIG) as TransportMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {TRANSPORT_CONFIG[mode].label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">评分:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setPendingRating(star === pendingRating ? 0 : star)}
                >
                  <Star
                    size={16}
                    fill={star <= pendingRating ? '#f59e0b' : 'none'}
                    color={star <= pendingRating ? '#f59e0b' : '#d1d5db'}
                  />
                </button>
              ))}
            </div>
            <button
              onClick={handleAddPlace}
              disabled={!pendingName.trim() || pendingLat === null}
              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Plus size={14} />
              添加到旅行
            </button>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView center={mapCenter} zoom={mapZoom} onClick={handleMapClick} onMapReady={handleMapReady}>
          {/* Route lines for selected trip */}
          {routePairs.map((pair, i) => (
            <RoutePolyline
              key={`route-${i}`}
              coordinates={[
                [pair.from.latitude, pair.from.longitude],
                [pair.to.latitude, pair.to.longitude],
              ]}
              transportMode={pair.to.transportMode}
              traveled={true}
            />
          ))}

          {/* All planned places */}
          {plannedPlaces.map((place) => (
            <PlaceMarker
              key={place.id}
              place={place}
              color={tripColorMap.get(place.tripId) || '#3b82f6'}
              isPlanned={true}
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.flyTo([place.latitude, place.longitude], 13, { duration: 0.5 })
                }
              }}
            />
          ))}

          {/* Pending marker */}
          {pendingLat !== null && pendingLng !== null && (
            <PlaceMarker
              place={{
                id: -1,
                tripId: selectedTripId ?? 0,
                name: pendingName || '新地点',
                latitude: pendingLat,
                longitude: pendingLng,
                address: '',
                visitDate: '',
                sortOrder: 0,
                transportMode: 'driving',
                rating: 0,
              }}
              color="#ef4444"
              isPlanned={true}
            />
          )}
        </MapView>

        {selectedTripId === null && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 glass rounded-xl shadow-xl border border-white/20 dark:border-gray-600/20 text-gray-600 dark:text-gray-300 text-sm font-medium pointer-events-none animate-slide-down flex items-center gap-2">
            <Compass size={14} className="text-amber-500" />
            先选择一个计划中的旅行
          </div>
        )}

        {selectedTripId !== null && !showPendingForm && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 animate-slide-down">
            <div className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-xl shadow-blue-500/30 pointer-events-none flex items-center gap-2">
              <MapPin size={14} />
              在地图上点击添加地点
            </div>
            <button
              onClick={handleLocateMe}
              disabled={locating}
              className="px-3 py-2.5 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {locating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Locate size={14} />
              )}
              定位
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
