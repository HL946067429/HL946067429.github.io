export type Transportation = 'flight' | 'train' | 'car' | 'walk' | 'bike';

export interface Photo {
  id: string;
  url: string;
  caption: string;
  location: [number, number];
  timestamp: string;
}

export interface CheckIn {
  id: string;
  locationName: string;
  coordinates: [number, number];
  timestamp: string;
  description: string;
  transportation?: Transportation; // Transportation used to GET to this location
  photos: Photo[];
}

export interface Trip {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  stops: CheckIn[];
}

