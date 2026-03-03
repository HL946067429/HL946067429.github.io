import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Place } from '@/types'
import { Star } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'

interface PlaceMarkerProps {
  place: Place
  color?: string
  isPlanned?: boolean
  onClick?: () => void
  showLabel?: boolean
  index?: number
}

function createMarkerIcon(color: string, isPlanned: boolean, index?: number) {
  const cssClass = `custom-marker${isPlanned ? ' custom-marker-planned' : ''}`
  const label = index !== undefined ? String(index + 1) : ''

  return L.divIcon({
    className: '',
    html: `<div class="${cssClass}" style="
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 13px;
      font-weight: 600;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      cursor: pointer;
    ">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  })
}

function renderStars(rating: number) {
  return renderToStaticMarkup(
    <span style={{ display: 'flex', gap: '1px' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < rating ? '#f59e0b' : 'none'}
          color={i < rating ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </span>
  )
}

export default function PlaceMarker({
  place,
  color = '#3b82f6',
  isPlanned = false,
  onClick,
  showLabel = false,
  index,
}: PlaceMarkerProps) {
  const icon = createMarkerIcon(color, isPlanned, index)

  return (
    <Marker
      position={[place.latitude, place.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
      }}
    >
      <Popup>
        <div style={{ minWidth: '160px' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            {place.name}
          </div>
          {place.address && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {place.address}
            </div>
          )}
          {place.rating > 0 && (
            <div
              style={{ marginBottom: '4px' }}
              dangerouslySetInnerHTML={{ __html: renderStars(place.rating) }}
            />
          )}
          {place.visitDate && (
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {place.visitDate}
            </div>
          )}
          {showLabel && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              #{index !== undefined ? index + 1 : ''}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
