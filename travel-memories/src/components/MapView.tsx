import { type ReactNode, useEffect, useState, useCallback } from 'react'
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

// 判断坐标是否在中国大致范围内（经度 73-135，纬度 3-54）
function isInChina(lat: number, lng: number): boolean {
  return lat >= 3 && lat <= 54 && lng >= 73 && lng <= 135
}

const TILE_AMAP = {
  url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
  attribution: '&copy; <a href="https://amap.com/">高德地图</a>',
  subdomains: '1234',
  maxZoom: 18,
}

const TILE_OSM = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abc',
  maxZoom: 19,
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

/** 监听地图移动，根据中心点坐标切换瓦片源 */
function TileSwitcher({ onRegionChange }: { onRegionChange: (china: boolean) => void }) {
  const map = useMap()

  const check = useCallback(() => {
    const c = map.getCenter()
    onRegionChange(isInChina(c.lat, c.lng))
  }, [map, onRegionChange])

  useEffect(() => {
    check()
  }, [check])

  useMapEvents({
    moveend: check,
  })

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
  const [useAmap, setUseAmap] = useState(() => isInChina(center[0], center[1]))
  const tile = useAmap ? TILE_AMAP : TILE_OSM

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`h-full w-full ${className}`}
      zoomControl={true}
      preferCanvas={true}
    >
      <TileLayer
        key={useAmap ? 'amap' : 'osm'}
        attribution={tile.attribution}
        url={tile.url}
        subdomains={tile.subdomains}
        maxZoom={tile.maxZoom}
        updateWhenZooming={false}
        updateWhenIdle={true}
        keepBuffer={4}
      />
      <TileSwitcher onRegionChange={setUseAmap} />
      {onMapReady && <MapRefHandler onMapReady={onMapReady} />}
      <MapClickHandler onClick={onClick} />
      {children}
    </MapContainer>
  )
}
