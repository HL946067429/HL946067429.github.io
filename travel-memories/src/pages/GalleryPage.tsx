import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '@/db'
import type { Photo, Trip, Place } from '@/types'
import { useAppStore } from '@/stores/appStore'
import { X, ImageIcon, MapPin, Calendar, Filter } from 'lucide-react'
import { format } from 'date-fns'

export default function GalleryPage() {
  const { darkMode } = useAppStore()
  const navigate = useNavigate()

  const trips = useLiveQuery(() => db.trips.toArray())
  const places = useLiveQuery(() => db.places.toArray())
  const photos = useLiveQuery(() => db.photos.toArray())

  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [thumbUrls, setThumbUrls] = useState<Map<number, string>>(new Map())

  // Build thumbnail URLs
  useEffect(() => {
    if (!photos) return
    const map = new Map<number, string>()
    for (const photo of photos) {
      if (photo.id !== undefined) {
        map.set(photo.id, URL.createObjectURL(photo.thumbnail))
      }
    }
    setThumbUrls(map)
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photos])

  // Lookup maps
  const tripMap = useMemo(() => {
    const m = new Map<number, Trip>()
    if (trips) trips.forEach((t) => t.id !== undefined && m.set(t.id, t))
    return m
  }, [trips])

  const placeMap = useMemo(() => {
    const m = new Map<number, Place>()
    if (places) places.forEach((p) => p.id !== undefined && m.set(p.id, p))
    return m
  }, [places])

  // Filter photos by selected trip
  const filteredPhotos = useMemo(() => {
    if (!photos) return []
    if (selectedTripId === null) return photos
    return photos.filter((p) => p.tripId === selectedTripId)
  }, [photos, selectedTripId])

  // Group by trip
  const groupedPhotos = useMemo(() => {
    const groups = new Map<number, Photo[]>()
    for (const photo of filteredPhotos) {
      const existing = groups.get(photo.tripId) || []
      existing.push(photo)
      groups.set(photo.tripId, existing)
    }
    return groups
  }, [filteredPhotos])

  if (photos === undefined || trips === undefined || places === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mb-4">
          <ImageIcon size={36} className="opacity-40" />
        </div>
        <p className="text-base font-medium">暂无照片</p>
        <p className="text-sm mt-2 text-gray-400/80">在旅行详情中上传照片后，这里会展示照片墙</p>
        <button
          onClick={() => navigate('/trips')}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-apple-blue rounded-lg hover:bg-apple-blue/85 transition-colors"
        >
          去上传照片
        </button>
      </div>
    )
  }

  return (
    <div className={`h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'page-bg'}`}>
      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              照片墙
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              共 {filteredPhotos.length} 张照片
            </p>
          </div>

          {/* Trip filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedTripId ?? ''}
              onChange={(e) => setSelectedTripId(e.target.value ? Number(e.target.value) : null)}
              className={`px-3 py-1.5 text-sm rounded-lg border outline-none ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="">全部旅行</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Photo groups by trip */}
        {Array.from(groupedPhotos.entries()).map(([tripId, tripPhotos]) => {
          const trip = tripMap.get(tripId)
          return (
            <div key={tripId} className="mb-8">
              {/* Trip header */}
              {(selectedTripId === null || groupedPhotos.size > 1) && trip && (
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: trip.color }}
                  />
                  <button
                    onClick={() => navigate(`/trips/${tripId}`)}
                    className="text-sm font-semibold text-gray-900 dark:text-white hover:text-apple-blue dark:hover:text-blue-400 transition-colors"
                  >
                    {trip.name}
                  </button>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {tripPhotos.length} 张
                  </span>
                </div>
              )}

              {/* Photo grid - masonry-like with varied sizes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {tripPhotos.map((photo) => {
                  const place = placeMap.get(photo.placeId)
                  const thumbUrl = thumbUrls.get(photo.id!)

                  return (
                    <button
                      key={photo.id}
                      onClick={() => setLightboxPhoto(photo)}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={photo.caption || photo.fileName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={24} className="text-gray-400" />
                        </div>
                      )}
                      {/* Hover overlay with info */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        {place && (
                          <span className="text-white text-xs font-medium flex items-center gap-1 truncate">
                            <MapPin size={10} />
                            {place.name}
                          </span>
                        )}
                        {photo.takenAt && (
                          <span className="text-white/70 text-[10px] flex items-center gap-1 mt-0.5">
                            <Calendar size={9} />
                            {format(new Date(photo.takenAt), 'yyyy/MM/dd')}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <GalleryLightbox
          photo={lightboxPhoto}
          photos={filteredPhotos}
          place={placeMap.get(lightboxPhoto.placeId)}
          trip={tripMap.get(lightboxPhoto.tripId)}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
        />
      )}
    </div>
  )
}

function GalleryLightbox({
  photo,
  photos,
  place,
  trip,
  onClose,
  onNavigate,
}: {
  photo: Photo
  photos: Photo[]
  place?: Place
  trip?: Trip
  onClose: () => void
  onNavigate: (p: Photo) => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo])

  // Keyboard navigation
  useEffect(() => {
    const currentIdx = photos.findIndex((p) => p.id === photo.id)
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIdx > 0) onNavigate(photos[currentIdx - 1])
      if (e.key === 'ArrowRight' && currentIdx < photos.length - 1) onNavigate(photos[currentIdx + 1])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [photo, photos, onClose, onNavigate])

  const currentIdx = photos.findIndex((p) => p.id === photo.id)

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/30 rounded-full z-10"
      >
        <X size={24} />
      </button>

      {/* Prev / Next arrows */}
      {currentIdx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(photos[currentIdx - 1]) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full z-10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      )}
      {currentIdx < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(photos[currentIdx + 1]) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full z-10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}

      {url && (
        <img
          src={url}
          alt={photo.fileName}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Bottom info bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {place && (
            <div className="text-white text-sm font-medium flex items-center gap-1.5">
              <MapPin size={13} />
              {place.name}
            </div>
          )}
          {trip && (
            <div className="text-white/60 text-xs mt-0.5">{trip.name}</div>
          )}
        </div>
        <div className="text-white/50 text-xs">
          {currentIdx + 1} / {photos.length}
          {photo.takenAt && (
            <span className="ml-3">
              {format(new Date(photo.takenAt), 'yyyy/MM/dd HH:mm')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
