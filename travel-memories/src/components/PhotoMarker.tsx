import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import type { Photo, Place } from '@/types'

interface PhotoMarkerProps {
  place: Place
  photos: Photo[]
  onClick?: () => void
}

function createPhotoIcon(thumbnailUrl: string, count: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      cursor: pointer;
      transition: transform 0.2s ease;
    ">
      <img src="${thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;" />
      ${count > 1 ? `<div style="
        position: absolute;
        top: 2px;
        right: 2px;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        background: rgba(0,0,0,0.6);
        color: white;
        font-size: 10px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        backdrop-filter: blur(4px);
      ">${count}</div>` : ''}
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  })
}

export default function PhotoMarker({ place, photos, onClick }: PhotoMarkerProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  useEffect(() => {
    if (photos.length === 0) return
    const url = URL.createObjectURL(photos[0].thumbnail)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photos])

  if (!thumbUrl || photos.length === 0) return null

  const icon = createPhotoIcon(thumbUrl, photos.length)

  return (
    <Marker
      position={[place.latitude, place.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onClick?.() }}
    >
      <Popup>
        <div style={{ minWidth: '140px' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
            {place.name}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {photos.length} 张照片
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
