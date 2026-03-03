import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { TransportMode } from '@/types'

interface TransportIconProps {
  position: [number, number]
  bearing: number
  transportMode: TransportMode
}

const TRANSPORT_SVGS: Record<TransportMode, string> = {
  driving: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <g fill="#3b82f6">
      <rect x="6" y="10" width="20" height="12" rx="3" />
      <rect x="3" y="16" width="26" height="6" rx="2" />
      <rect x="8" y="11" width="6" height="5" rx="1" fill="#bfdbfe" />
      <rect x="18" y="11" width="6" height="5" rx="1" fill="#bfdbfe" />
      <circle cx="9" cy="24" r="2.5" fill="#1e3a5f" />
      <circle cx="23" cy="24" r="2.5" fill="#1e3a5f" />
    </g>
  </svg>`,

  train: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <g fill="#10b981">
      <rect x="8" y="4" width="16" height="22" rx="4" />
      <rect x="10" y="7" width="12" height="6" rx="1" fill="#a7f3d0" />
      <circle cx="12" cy="20" r="2" fill="#064e3b" />
      <circle cx="20" cy="20" r="2" fill="#064e3b" />
      <line x1="10" y1="28" x2="14" y2="26" stroke="#10b981" stroke-width="2" />
      <line x1="22" y1="28" x2="18" y2="26" stroke="#10b981" stroke-width="2" />
    </g>
  </svg>`,

  flight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <g fill="#f59e0b">
      <path d="M16 3 L18 13 L28 16 L18 19 L16 29 L14 19 L4 16 L14 13 Z" />
      <circle cx="16" cy="16" r="3" fill="#fef3c7" />
    </g>
  </svg>`,
}

function createTransportIcon(transportMode: TransportMode, bearing: number) {
  const svg = TRANSPORT_SVGS[transportMode]

  return L.divIcon({
    className: 'transport-icon',
    html: `<div style="
      width: 32px;
      height: 32px;
      transform: rotate(${bearing}deg);
      transform-origin: center center;
    ">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function TransportIcon({
  position,
  bearing,
  transportMode,
}: TransportIconProps) {
  const icon = createTransportIcon(transportMode, bearing)

  return (
    <Marker
      position={position}
      icon={icon}
      interactive={false}
    />
  )
}
