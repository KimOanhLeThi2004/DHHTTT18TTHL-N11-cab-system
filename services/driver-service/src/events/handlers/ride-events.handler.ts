import { Injectable } from '@nestjs/common';
import { DriversService } from '../../drivers/drivers.service';
import { RedisService } from '../../redis/redis.service';
import { LogsService } from '../../logs/logs.service';
import { DriverState, DriverStatus, OnlineStatus } from '../../common/utils/constants';
import { EventEnvelope } from '../event.types';

@Injectable()
export class RideEventsHandler {
  constructor(
    private readonly driversService: DriversService,
    private readonly redisService: RedisService,
    private readonly logsService: LogsService
  ) {}

  async handle(event: EventEnvelope): Promise<void> {
    switch (event.type) {
      case 'RideOfferCreated':
        await this.logsService.logActivity(event.payload.driverId, 'RIDE_OFFER_CREATED', event.payload);
        break;
      case 'RideStatusChanged':
        if (event.payload.status === 'COMPLETED') {
          await this.redisService.setState(event.payload.driverId, DriverState.AVAILABLE);
          await this.logsService.logActivity(event.payload.driverId, 'RIDE_COMPLETED', event.payload);
        }
        break;
      case 'TripStarted':
        await this.redisService.setState(event.payload.driverId, DriverState.ON_TRIP);
        await this.logsService.logActivity(event.payload.driverId, 'TRIP_STARTED', event.payload);
        break;
      case 'TripEnded':
        await this.redisService.setState(event.payload.driverId, DriverState.AVAILABLE);
        await this.logsService.logActivity(event.payload.driverId, 'TRIP_ENDED', event.payload);
        break;
      case 'DriverSuspended':
        await this.driversService.updateStatus(event.payload.driverId, DriverStatus.SUSPENDED);
        await this.redisService.setOnlineStatus(event.payload.driverId, OnlineStatus.OFFLINE);
        await this.redisService.setState(event.payload.driverId, DriverState.AVAILABLE);
        await this.logsService.logActivity(event.payload.driverId, 'DRIVER_SUSPENDED', event.payload);
        break;
      default:
        break;
    }
  }
}
