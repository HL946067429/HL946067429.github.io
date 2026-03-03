export type TripStatus = 'completed' | 'planned'
export type TransportMode = 'driving' | 'train' | 'flight'

export interface Trip {
  id?: number
  name: string
  description: string
  status: TripStatus
  startDate: string
  endDate: string
  coverPhotoId?: number
  tags: string[]
  color: string
  createdAt: string
  updatedAt: string
}

export interface Place {
  id?: number
  tripId: number
  name: string
  latitude: number
  longitude: number
  address: string
  visitDate: string
  sortOrder: number
  transportMode: TransportMode
  rating: number
}

export interface Photo {
  id?: number
  placeId: number
  tripId: number
  blob: Blob
  thumbnail: Blob
  fileName: string
  width: number
  height: number
  takenAt: string
  caption: string
}

export interface RouteCache {
  id?: number
  fromPlaceId: number
  toPlaceId: number
  transportMode: TransportMode
  coordinates: [number, number][]
  distanceMeters: number
}

export interface AnimationSegment {
  fromPlace: Place
  toPlace: Place
  transportMode: TransportMode
  coordinates: [number, number][]
  distanceMeters: number
  startProgress: number
  endProgress: number
}

export const TRANSPORT_CONFIG = {
  driving: {
    icon: 'car',
    color: '#3b82f6',
    lineStyle: 'solid' as const,
    speedMultiplier: 1,
    label: '自驾',
  },
  train: {
    icon: 'train',
    color: '#10b981',
    lineStyle: 'dashed' as const,
    speedMultiplier: 1.5,
    label: '高铁',
  },
  flight: {
    icon: 'plane',
    color: '#f59e0b',
    lineStyle: 'dotted' as const,
    speedMultiplier: 3,
    label: '飞机',
  },
} as const

export const TRIP_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
]
