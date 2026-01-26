import { Test } from '@nestjs/testing';
import { RideEventsHandler } from '../../events/handlers/ride-events.handler';
import { DriversService } from '../../drivers/drivers.service';
import { RedisService } from '../../redis/redis.service';
import { RedisGeoService } from '../../redis/redis-geo.service';
import { LogsService } from '../../logs/logs.service';
import { DriverState } from '../../common/utils/constants';

describe('Kiem thu tich hop RideEventsHandler', () => {
  it('xu ly RideStatusChanged va dong bo GEO', async () => {
    const driversService = { updateStatus: jest.fn() };
    const redisService = { setState: jest.fn(), setOnlineStatus: jest.fn() };
    const redisGeoService = { syncGeoByState: jest.fn() };
    const logsService = { logActivity: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RideEventsHandler,
        { provide: DriversService, useValue: driversService },
        { provide: RedisService, useValue: redisService },
        { provide: RedisGeoService, useValue: redisGeoService },
        { provide: LogsService, useValue: logsService }
      ]
    }).compile();

    const handler = moduleRef.get(RideEventsHandler);

    await handler.handle({
      eventId: 'e1',
      type: 'RideStatusChanged',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: { driverId: 'd1', status: 'ASSIGNED' }
    });

    expect(redisService.setState).toHaveBeenCalledWith('d1', DriverState.BUSY);
    expect(redisGeoService.syncGeoByState).toHaveBeenCalledWith('d1', DriverState.BUSY);
  });
});
