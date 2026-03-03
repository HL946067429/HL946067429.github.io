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
        attribution='&copy; <a href="https://amap.com/">高德地图</a>'
        url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
        subdomains="1234"
        maxZoom={18}
      />
      {onMapReady && <MapRefHandler onMapReady={onMapReady} />}
      <MapClickHandler onClick={onClick} />
      {children}
    </MapContainer>
  )
}
