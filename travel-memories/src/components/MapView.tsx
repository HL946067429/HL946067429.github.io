import { type ReactNode, useEffect } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LeafletMouseEvent } from 'leaflet'
import L from 'leaflet'

interface MapViewProps {
  center?: [number, number]
  zoom?: number
  children?: ReactNode
  onClick?: (lat: number, lng: number) => void
  className?: string
  onMapReady?: (map: L.Map) => void
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onClick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapRefHandler({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()

  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])

  return null
}

const DEFAULT_CENTER: [number, number] = [35.86, 104.19]
const DEFAULT_ZOOM = 5

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  children,
  onClick,
  className = '',
  onMapReady,
}: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`h-full w-full ${className}`}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapReady && <MapRefHandler onMapReady={onMapReady} />}
      <MapClickHandler onClick={onClick} />
      {children}
    </MapContainer>
  )
}
