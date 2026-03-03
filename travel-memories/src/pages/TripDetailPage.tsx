import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Place, Photo, TripStatus, TransportMode } from '@/types'
import { TRANSPORT_CONFIG, TRIP_COLORS } from '@/types'
import { useAppStore } from '@/stores/appStore'
import MapView from '@/components/MapView'
import PlaceMarker from '@/components/PlaceMarker'
import RoutePolyline from '@/components/RoutePolyline'
import { compressImage, generateThumbnail, extractExifDate } from '@/utils/photo'
import L from 'leaflet'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Star,
  Camera,
  Pencil,
  X,
  Check,
  Car,
  Train,
  Plane,
  MapPin,
  Calendar,
  Loader2,
  Upload,
  ImageIcon,
  Locate,
} from 'lucide-react'
import { format } from 'date-fns'

const TRANSPORT_ICONS: Record<TransportMode, typeof Car> = {
  driving: Car,
  train: Train,
  flight: Plane,
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { darkMode } = useAppStore()
  const tripId = Number(id)

  // Map ref for fitBounds
  const mapRef = useRef<L.Map | null>(null)

  // Data queries
  const trip = useLiveQuery(() => db.trips.get(tripId), [tripId])
  const places = useLiveQuery(
    () => db.places.where('tripId').equals(tripId).sortBy('sortOrder'),
    [tripId],
  )
  const photos = useLiveQuery(
    () => db.photos.where('tripId').equals(tripId).toArray(),
    [tripId],
  )

  // UI state
  const [editingTrip, setEditingTrip] = useState(false)
  const [expandedPlaceId, setExpandedPlaceId] = useState<number | null>(null)
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [deletePlaceConfirm, setDeletePlaceConfirm] = useState<number | null>(null)

  // Trip edit form
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<TripStatus>('completed')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editTagInput, setEditTagInput] = useState('')

  // Add place form
  const [newPlaceName, setNewPlaceName] = useState('')
  const [newPlaceLat, setNewPlaceLat] = useState<number | null>(null)
  const [newPlaceLng, setNewPlaceLng] = useState<number | null>(null)
  const [newPlaceDate, setNewPlaceDate] = useState('')
  const [newPlaceTransport, setNewPlaceTransport] = useState<TransportMode>('driving')
  const [newPlaceRating, setNewPlaceRating] = useState(0)

  const [locating, setLocating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPlaceId, setUploadingPlaceId] = useState<number | null>(null)

  // Photo URLs cache
  const [photoUrls, setPhotoUrls] = useState<Map<number, string>>(new Map())

  // Build photo URLs when photos change
  useEffect(() => {
    if (!photos) return
    const newMap = new Map<number, string>()
    for (const photo of photos) {
      if (photo.id !== undefined) {
        const url = URL.createObjectURL(photo.thumbnail)
        newMap.set(photo.id, url)
      }
    }
    setPhotoUrls(newMap)

    return () => {
      newMap.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photos])

  // FitBounds when places change
  useEffect(() => {
    if (!mapRef.current || !places || places.length === 0) return
    const bounds = L.latLngBounds(places.map((p) => [p.latitude, p.longitude] as [number, number]))
    mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 })
  }, [places])

  // Handle map ready
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  // Photos by place
  const photosByPlace = useMemo(() => {
    const map = new Map<number, Photo[]>()
    if (photos) {
      for (const photo of photos) {
        const existing = map.get(photo.placeId) || []
        existing.push(photo)
        map.set(photo.placeId, existing)
      }
    }
    return map
  }, [photos])

  // Build route pairs for lines between consecutive places
  const routePairs = useMemo(() => {
    if (!places || places.length < 2) return []
    const pairs: { from: Place; to: Place }[] = []
    for (let i = 0; i < places.length - 1; i++) {
      pairs.push({ from: places[i], to: places[i + 1] })
    }
    return pairs
  }, [places])

  // Start editing trip
  const startEditTrip = useCallback(() => {
    if (!trip) return
    setEditName(trip.name)
    setEditDescription(trip.description)
    setEditStatus(trip.status)
    setEditStartDate(trip.startDate)
    setEditEndDate(trip.endDate)
    setEditColor(trip.color)
    setEditTags([...trip.tags])
    setEditTagInput('')
    setEditingTrip(true)
  }, [trip])

  const saveTrip = async () => {
    if (!trip?.id || !editName.trim()) return
    await db.trips.update(trip.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      status: editStatus,
      startDate: editStartDate,
      endDate: editEndDate,
      color: editColor,
      tags: editTags,
      updatedAt: new Date().toISOString(),
    })
    setEditingTrip(false)
  }

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('您的浏览器不支持定位功能')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setNewPlaceLat(latitude)
        setNewPlaceLng(longitude)
        setShowAddPlace(true)
        // 飞到当前位置
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 14, { duration: 0.8 })
        }
        // 反向地理编码获取地名
        reverseGeocode(latitude, longitude).then((name) => {
          if (name) setNewPlaceName(name)
        })
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
  }, [])

  const handleMapClickForPlace = (lat: number, lng: number) => {
    if (showAddPlace) {
      setNewPlaceLat(lat)
      setNewPlaceLng(lng)
      // Try reverse geocoding
      reverseGeocode(lat, lng).then((name) => {
        if (name && !newPlaceName) {
          setNewPlaceName(name)
        }
      })
    }
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      )
      const data = await response.json()
      return data.display_name?.split(',')[0] || ''
    } catch {
      return ''
    }
  }

  const handleAddPlace = async () => {
    if (!newPlaceName.trim() || newPlaceLat === null || newPlaceLng === null) return
    const maxOrder = places ? Math.max(0, ...places.map((p) => p.sortOrder)) : 0
    const place: Place = {
      tripId,
      name: newPlaceName.trim(),
      latitude: newPlaceLat,
      longitude: newPlaceLng,
      address: '',
      visitDate: newPlaceDate,
      sortOrder: maxOrder + 1,
      transportMode: newPlaceTransport,
      rating: newPlaceRating,
    }
    await db.places.add(place)
    await db.trips.update(tripId, { updatedAt: new Date().toISOString() })
    setNewPlaceName('')
    setNewPlaceLat(null)
    setNewPlaceLng(null)
    setNewPlaceDate('')
    setNewPlaceTransport('driving')
    setNewPlaceRating(0)
    setShowAddPlace(false)
  }

  const handleMovePlace = async (placeId: number, direction: 'up' | 'down') => {
    if (!places) return
    const idx = places.findIndex((p) => p.id === placeId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= places.length) return

    const currentPlace = places[idx]
    const swapPlace = places[swapIdx]

    await db.places.update(currentPlace.id!, { sortOrder: swapPlace.sortOrder })
    await db.places.update(swapPlace.id!, { sortOrder: currentPlace.sortOrder })
  }

  const handleDeletePlace = async (placeId: number) => {
    await db.photos.where('placeId').equals(placeId).delete()
    await db.places.delete(placeId)
    await db.trips.update(tripId, { updatedAt: new Date().toISOString() })
    setDeletePlaceConfirm(null)
    if (expandedPlaceId === placeId) setExpandedPlaceId(null)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || uploadingPlaceId === null) return
    const files = Array.from(e.target.files)

    for (const file of files) {
      const compressed = await compressImage(file)
      const thumbnail = await generateThumbnail(compressed)
      const takenAt = (await extractExifDate(file)) || new Date().toISOString()

      // Get image dimensions
      const bitmap = await createImageBitmap(compressed)
      const width = bitmap.width
      const height = bitmap.height
      bitmap.close()

      const photo: Photo = {
        placeId: uploadingPlaceId,
        tripId,
        blob: compressed,
        thumbnail,
        fileName: file.name,
        width,
        height,
        takenAt,
        caption: '',
      }
      await db.photos.add(photo)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openLightbox = (photo: Photo) => {
    setLightboxPhoto(photo)
  }

  // Focus map on a specific place
  const focusMapOnPlace = useCallback((place: Place) => {
    if (mapRef.current) {
      mapRef.current.flyTo([place.latitude, place.longitude], 13, { duration: 0.8 })
    }
  }, [])

  // Loading state
  if (trip === undefined || places === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (trip === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 mb-4">旅行未找到</p>
        <button
          onClick={() => navigate('/trips')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          返回旅行列表
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className={`shrink-0 border-b px-4 py-3 ${darkMode ? 'bg-gray-800/95 border-gray-700/80 backdrop-blur-sm' : 'bg-white/95 border-gray-200/80 backdrop-blur-sm'}`}>
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/trips')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </button>

          {editingTrip ? (
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                />
                <button onClick={saveTrip} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg">
                  <Check size={20} className="text-green-600" />
                </button>
                <button onClick={() => setEditingTrip(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={1}
                  placeholder="描述"
                  className="flex-1 min-w-48 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TripStatus)}
                  className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                >
                  <option value="planned">计划中</option>
                  <option value="completed">已完成</option>
                </select>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                />
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                />
                <div className="flex gap-1">
                  {TRIP_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`w-6 h-6 rounded-full ${editColor === c ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-800' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const t = editTagInput.trim()
                      if (t && !editTags.includes(t)) {
                        setEditTags([...editTags, t])
                        setEditTagInput('')
                      }
                    }
                  }}
                  placeholder="添加标签..."
                  className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none w-32"
                />
                {editTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {tag}
                    <button onClick={() => setEditTags(editTags.filter((t) => t !== tag))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: trip.color }} />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {trip.name}
                </h1>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    trip.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {trip.status === 'completed' ? '已完成' : '计划中'}
                </span>
                <button
                  onClick={startEditTrip}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shrink-0"
                >
                  <Pencil size={16} className="text-gray-500" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {trip.description && (
                  <span className="truncate max-w-xs">{trip.description}</span>
                )}
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar size={12} />
                  {trip.startDate ? format(new Date(trip.startDate), 'yyyy/MM/dd') : '?'}
                  {trip.endDate ? ` - ${format(new Date(trip.endDate), 'MM/dd')}` : ''}
                </span>
                {trip.tags.length > 0 && (
                  <div className="flex gap-1 shrink-0">
                    {trip.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content: split view */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: place list */}
        <div className="h-[45vh] md:h-auto md:w-96 shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin size={12} />
                地点 ({places.length})
              </h2>
              <div className="flex items-center gap-1.5">
                {!showAddPlace && (
                  <button
                    onClick={handleLocateMe}
                    disabled={locating}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50"
                  >
                    {locating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Locate size={14} />
                    )}
                    定位
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAddPlace(!showAddPlace)
                    setNewPlaceName('')
                    setNewPlaceLat(null)
                    setNewPlaceLng(null)
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    showAddPlace
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}
                >
                  {showAddPlace ? (
                    <>
                      <X size={14} />
                      取消
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      添加地点
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Add place form */}
            {showAddPlace && (
              <div className="mb-3 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    在地图上点击选择位置
                  </p>
                  <button
                    onClick={handleLocateMe}
                    disabled={locating}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {locating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Locate size={12} />
                    )}
                    当前定位
                  </button>
                </div>
                {newPlaceLat !== null && newPlaceLng !== null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    坐标: {newPlaceLat.toFixed(4)}, {newPlaceLng.toFixed(4)}
                  </p>
                )}
                <input
                  type="text"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  placeholder="地点名称"
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <input
                  type="date"
                  value={newPlaceDate}
                  onChange={(e) => setNewPlaceDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <select
                  value={newPlaceTransport}
                  onChange={(e) => setNewPlaceTransport(e.target.value as TransportMode)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  {(Object.keys(TRANSPORT_CONFIG) as TransportMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {TRANSPORT_CONFIG[mode].label}
                    </option>
                  ))}
                </select>
                {/* Rating selector */}
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">评分:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewPlaceRating(star === newPlaceRating ? 0 : star)}
                      className="p-1.5"
                    >
                      <Star
                        size={18}
                        fill={star <= newPlaceRating ? '#f59e0b' : 'none'}
                        color={star <= newPlaceRating ? '#f59e0b' : '#d1d5db'}
                      />
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddPlace}
                  disabled={!newPlaceName.trim() || newPlaceLat === null}
                  className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  添加地点
                </button>
              </div>
            )}

            {/* Place list */}
            {places.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无地点</p>
                <p className="text-xs mt-1">点击「添加地点」并在地图上选择位置</p>
              </div>
            ) : (
              <div className="space-y-1">
                {places.map((place, index) => {
                  const TransportIcon = TRANSPORT_ICONS[place.transportMode]
                  const isExpanded = expandedPlaceId === place.id
                  const placePhotos = photosByPlace.get(place.id!) || []

                  return (
                    <div key={place.id} className="rounded-xl border border-gray-100 dark:border-gray-700/80 overflow-hidden bg-white dark:bg-gray-800 transition-colors">
                      {/* Place header */}
                      <div
                        className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        onClick={() => {
                          setExpandedPlaceId(isExpanded ? null : place.id!)
                          focusMapOnPlace(place)
                        }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: trip.color }}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {place.name}
                            </span>
                            <TransportIcon size={14} className="text-gray-400 shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {place.visitDate && (
                              <span>{format(new Date(place.visitDate), 'yyyy/MM/dd')}</span>
                            )}
                            {place.rating > 0 && (
                              <span className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    size={10}
                                    fill={i < place.rating ? '#f59e0b' : 'none'}
                                    color={i < place.rating ? '#f59e0b' : '#d1d5db'}
                                  />
                                ))}
                              </span>
                            )}
                            {placePhotos.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Camera size={10} />
                                {placePhotos.length}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Reorder & delete */}
                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleMovePlace(place.id!, 'up')}
                            disabled={index === 0}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                          >
                            <ChevronUp size={14} className="text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleMovePlace(place.id!, 'down')}
                            disabled={index === places.length - 1}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                          >
                            <ChevronDown size={14} className="text-gray-500" />
                          </button>
                          {deletePlaceConfirm === place.id ? (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={() => handleDeletePlace(place.id!)}
                                className="px-1.5 py-0.5 text-xs text-white bg-red-500 rounded"
                              >
                                删除
                              </button>
                              <button
                                onClick={() => setDeletePlaceConfirm(null)}
                                className="px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletePlaceConfirm(place.id!)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded content: photos */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-750/50">
                          {/* Photo grid */}
                          {placePhotos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
                              {placePhotos.map((photo) => (
                                <button
                                  key={photo.id}
                                  onClick={() => openLightbox(photo)}
                                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-80 transition-opacity"
                                >
                                  {photoUrls.get(photo.id!) ? (
                                    <img
                                      src={photoUrls.get(photo.id!)}
                                      alt={photo.fileName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageIcon size={20} className="text-gray-400" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                              暂无照片
                            </p>
                          )}
                          {/* Upload button */}
                          <button
                            onClick={() => {
                              setUploadingPlaceId(place.id!)
                              fileInputRef.current?.click()
                            }}
                            className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                          >
                            <Upload size={14} />
                            上传照片
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: map */}
        <div className="flex-1 relative">
          <MapView
            center={[35.86, 104.19]}
            zoom={5}
            onClick={handleMapClickForPlace}
            onMapReady={handleMapReady}
          >
            {/* Route lines between consecutive places */}
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

            {/* Place markers */}
            {places.map((place, index) => (
              <PlaceMarker
                key={place.id}
                place={place}
                color={trip.color}
                isPlanned={trip.status === 'planned'}
                index={index}
                onClick={() => {
                  setExpandedPlaceId(place.id!)
                  focusMapOnPlace(place)
                }}
              />
            ))}

            {/* Show pending place marker */}
            {showAddPlace && newPlaceLat !== null && newPlaceLng !== null && (
              <PlaceMarker
                place={{
                  id: -1,
                  tripId,
                  name: newPlaceName || '新地点',
                  latitude: newPlaceLat,
                  longitude: newPlaceLng,
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

          {showAddPlace && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 bg-apple-blue text-white text-sm font-medium rounded-xl shadow-sm pointer-events-none animate-slide-down flex items-center gap-2">
              <MapPin size={14} />
              在地图上点击选择位置
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Lightbox */}
      {lightboxPhoto && (
        <LightboxOverlay
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </div>
  )
}

function LightboxOverlay({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo])

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/30 rounded-full z-10"
      >
        <X size={24} />
      </button>
      {url && (
        <img
          src={url}
          alt={photo.fileName}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {photo.caption && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white text-sm rounded-lg">
          {photo.caption}
        </div>
      )}
    </div>
  )
}
