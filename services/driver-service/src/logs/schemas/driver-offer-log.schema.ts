import { Schema } from 'mongoose';

export const DriverOfferLogSchema = new Schema({
  driverId: { type: String, required: true, index: true },
  rideId: { type: String, required: true },
  offerId: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
