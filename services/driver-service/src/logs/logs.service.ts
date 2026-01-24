import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel('DriverStatusHistory') private readonly statusHistory: Model<any>,
    @InjectModel('DriverOfferLog') private readonly offerLog: Model<any>,
    @InjectModel('DriverActivityLog') private readonly activityLog: Model<any>
  ) {}

  async logStatusChange(driverId: string, oldStatus: string, newStatus: string): Promise<void> {
    await this.statusHistory.create({ driverId, oldStatus, newStatus, changedAt: new Date() });
  }

  async logOfferAction(
    driverId: string,
    rideId: string,
    offerId: string,
    action: string
  ): Promise<void> {
    await this.offerLog.create({ driverId, rideId, offerId, action, timestamp: new Date() });
  }

  async logActivity(driverId: string, action: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.activityLog.create({ driverId, action, metadata, timestamp: new Date() });
  }
}
