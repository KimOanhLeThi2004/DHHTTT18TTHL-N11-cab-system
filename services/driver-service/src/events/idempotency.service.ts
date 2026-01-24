import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class IdempotencyService {
  constructor(@InjectModel('EventInbox') private readonly inbox: Model<any>) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const found = await this.inbox.findOne({ eventId }).lean().exec();
    return !!found;
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.inbox.updateOne(
      { eventId },
      { $set: { eventId, processedAt: new Date() } },
      { upsert: true }
    );
  }
}
