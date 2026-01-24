import { Schema } from 'mongoose';

export const EventInboxSchema = new Schema({
  eventId: { type: String, required: true, unique: true },
  processedAt: { type: Date, default: Date.now }
});

EventInboxSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
