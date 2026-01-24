import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverStatusHistorySchema } from './schemas/driver-status-history.schema';
import { DriverOfferLogSchema } from './schemas/driver-offer-log.schema';
import { DriverActivityLogSchema } from './schemas/driver-activity-log.schema';
import { EventInboxSchema } from './schemas/event-inbox.schema';
import { LogsService } from './logs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DriverStatusHistory', schema: DriverStatusHistorySchema },
      { name: 'DriverOfferLog', schema: DriverOfferLogSchema },
      { name: 'DriverActivityLog', schema: DriverActivityLogSchema },
      { name: 'EventInbox', schema: EventInboxSchema }
    ])
  ],
  providers: [LogsService],
  exports: [LogsService, MongooseModule]
})
export class LogsModule {}
