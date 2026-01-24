import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './driver.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { LogsModule } from '../logs/logs.module';
import { RedisModule } from '../redis/redis.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Vehicle]),
    LogsModule,
    RedisModule,
    forwardRef(() => EventsModule)
  ],
  providers: [DriversService],
  controllers: [DriversController],
  exports: [DriversService]
})
export class DriversModule {}
