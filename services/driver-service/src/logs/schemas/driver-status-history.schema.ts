import { Schema } from 'mongoose';

export const DriverStatusHistorySchema = new Schema({
  driverId: { type: String, required: true, index: true },
  oldStatus: { type: String, required: true },
  newStatus: { type: String, required: true },
  changedAt: { type: Date, default: Date.now }
});
