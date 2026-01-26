import { RedisGeoService } from '../../redis/redis-geo.service';
import { DriverState, OnlineStatus } from '../../common/utils/constants';

describe('Kiem thu RedisGeoService', () => {
  const redisClient = {
    geoadd: jest.fn(),
    zrem: jest.fn()
  };
  const redisService = {
    getOnlineStatus: jest.fn(),
    getLocation: jest.fn(),
    setLocation: jest.fn(),
    getState: jest.fn()
  };

  const service = new RedisGeoService(redisClient as any, redisService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dong bo GEO khi tai xe AVAILABLE va ONLINE', async () => {
    redisService.getOnlineStatus.mockResolvedValue(OnlineStatus.ONLINE);
    redisService.getLocation.mockResolvedValue({ lat: 10, lng: 20, updatedAt: 'now' });

    await service.syncGeoByState('d1', DriverState.AVAILABLE);

    expect(redisClient.geoadd).toHaveBeenCalledWith('geo:drivers:available', 20, 10, 'd1');
  });

  it('loai bo tai xe khoi GEO khi BUSY', async () => {
    redisService.getOnlineStatus.mockResolvedValue(OnlineStatus.ONLINE);

    await service.syncGeoByState('d1', DriverState.BUSY);

    expect(redisClient.zrem).toHaveBeenCalledWith('geo:drivers:available', 'd1');
  });
});
