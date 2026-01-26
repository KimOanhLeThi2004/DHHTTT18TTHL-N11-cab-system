export type EventType =
  | 'DriverCreated'
  | 'DriverUpdated'
  | 'DriverOnline'
  | 'DriverOffline'
  | 'DriverAvailabilityChanged'
  | 'DriverLocationUpdated'
  | 'DriverAcceptedOffer'
  | 'DriverRejectedOffer'
  | 'DriverAssigned'
  | 'RideOfferCreated'
  | 'RideStatusChanged'
  | 'TripStarted'
  | 'TripEnded'
  | 'DriverSuspended';

export interface EventEnvelope<T = any> {
  eventId: string;
  type: EventType;
  version: number;
  timestamp: string;
  correlationId?: string;
  payload: T;
}
