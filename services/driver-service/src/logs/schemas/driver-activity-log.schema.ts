import { Schema } from 'mongoose';

export const DriverActivityLogSchema = new Schema({
  driverId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  metadata: { type: Object, required: false },
  timestamp: { type: Date, default: Date.now }
});
