import Dexie, { type Table } from 'dexie'
import type { Trip, Place, Photo, RouteCache } from '@/types'

class TravelDB extends Dexie {
  trips!: Table<Trip, number>
  places!: Table<Place, number>
  photos!: Table<Photo, number>
  routeCache!: Table<RouteCache, number>

  constructor() {
    super('TravelMemoriesDB')
    this.version(1).stores({
      trips: '++id, status, startDate, updatedAt',
      places: '++id, tripId, sortOrder',
      photos: '++id, placeId, tripId',
      routeCache: '++id, [fromPlaceId+toPlaceId+transportMode]',
    })
  }
}

export const db = new TravelDB()
