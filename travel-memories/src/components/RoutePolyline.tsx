import { Polyline } from 'react-leaflet'
import { TRANSPORT_CONFIG } from '@/types'
import type { TransportMode } from '@/types'

interface RoutePolylineProps {
  coordinates: [number, number][]
  transportMode: TransportMode
  traveled?: boolean
}

const DASH_PATTERNS: Record<TransportMode, string | undefined> = {
  driving: undefined,
  train: '12 8',
  flight: '4 8',
}

const LINE_WEIGHTS: Record<TransportMode, number> = {
  driving: 4,
  train: 4,
  flight: 3,
}

export default function RoutePolyline({
  coordinates,
  transportMode,
  traveled = false,
}: RoutePolylineProps) {
  const color = TRANSPORT_CONFIG[transportMode].color
  const dashArray = DASH_PATTERNS[transportMode]
  const weight = LINE_WEIGHTS[transportMode]
  const opacity = traveled ? 1 : 0.3

  return (
    <Polyline
      positions={coordinates}
      pathOptions={{
        color,
        weight,
        opacity,
        dashArray,
      }}
    />
  )
}
