import { Injectable, Logger } from '@nestjs/common';
import { DriversService } from '../../drivers/drivers.service';
import { RedisService } from '../../redis/redis.service';
import { RedisGeoService } from '../../redis/redis-geo.service';
import { LogsService } from '../../logs/logs.service';
import { DriverState, DriverStatus, OnlineStatus } from '../../common/utils/constants';
import { EventEnvelope } from '../event.types';

@Injectable()
export class RideEventsHandler {
  private readonly logger = new Logger(RideEventsHandler.name);

  constructor(
    private readonly driversService: DriversService,
    private readonly redisService: RedisService,
    private readonly redisGeoService: RedisGeoService,
    private readonly logsService: LogsService
  ) {}

  async handle(event: EventEnvelope): Promise<void> {
    switch (event.type) {
      case 'RideOfferCreated':
        await this.logsService.logActivity(event.payload.driverId, 'RIDE_OFFER_CREATED', event.payload);
        break;
      case 'RideStatusChanged':
        await this.handleRideStatusChanged(event);
        break;
      case 'TripStarted':
        await this.redisService.setState(event.payload.driverId, DriverState.ON_TRIP);
        await this.redisGeoService.syncGeoByState(event.payload.driverId, DriverState.ON_TRIP);
        await this.logsService.logActivity(event.payload.driverId, 'TRIP_STARTED', event.payload);
        break;
      case 'TripEnded':
        await this.redisService.setState(event.payload.driverId, DriverState.AVAILABLE);
        await this.redisGeoService.syncGeoByState(event.payload.driverId, DriverState.AVAILABLE);
        await this.logsService.logActivity(event.payload.driverId, 'TRIP_ENDED', event.payload);
        break;
      case 'DriverSuspended':
        await this.driversService.updateStatus(event.payload.driverId, DriverStatus.SUSPENDED);
        await this.redisService.setOnlineStatus(event.payload.driverId, OnlineStatus.OFFLINE);
        await this.redisService.setState(event.payload.driverId, DriverState.AVAILABLE);
        await this.redisGeoService.syncGeoByState(
          event.payload.driverId,
          DriverState.AVAILABLE,
          OnlineStatus.OFFLINE
        );
        await this.logsService.logActivity(event.payload.driverId, 'DRIVER_SUSPENDED', event.payload);
        break;
      case 'DriverAssigned':
        await this.redisService.setState(event.payload.driverId, DriverState.BUSY);
        await this.redisGeoService.syncGeoByState(event.payload.driverId, DriverState.BUSY);
        await this.logsService.logActivity(event.payload.driverId, 'DRIVER_ASSIGNED', event.payload);
        break;
      default:
        break;
    }
  }

  private async handleRideStatusChanged(event: EventEnvelope): Promise<void> {
    const status = event.payload.status as string | undefined;
    const driverId = event.payload.driverId as string | undefined;

    if (!status || !driverId) {
      return;
    }

    if (status === 'ASSIGNED') {
      await this.redisService.setState(driverId, DriverState.BUSY);
      await this.redisGeoService.syncGeoByState(driverId, DriverState.BUSY);
      await this.logsService.logActivity(driverId, 'RIDE_ASSIGNED', event.payload);
    } else if (status === 'STARTED') {
      await this.redisService.setState(driverId, DriverState.ON_TRIP);
      await this.redisGeoService.syncGeoByState(driverId, DriverState.ON_TRIP);
      await this.logsService.logActivity(driverId, 'RIDE_STARTED', event.payload);
    } else if (status === 'COMPLETED') {
      await this.redisService.setState(driverId, DriverState.AVAILABLE);
      await this.redisGeoService.syncGeoByState(driverId, DriverState.AVAILABLE);
      await this.logsService.logActivity(driverId, 'RIDE_COMPLETED', event.payload);
    }

    this.logger.log(
      'Da xu ly RideStatusChanged',
      JSON.stringify({
        correlationId: event.correlationId,
        driverId,
        status
      })
    );
  }
}
