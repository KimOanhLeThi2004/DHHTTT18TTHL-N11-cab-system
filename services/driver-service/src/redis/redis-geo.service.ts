import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { DriverState, OnlineStatus } from '../common/utils/constants';
import { RedisService } from './redis.service';

@Injectable()
export class RedisGeoService {
  private readonly geoKey = 'geo:drivers:available';

  constructor(
    @Inject('REDIS_CLIENT') private readonly client: Redis,
    private readonly redisService: RedisService
  ) {}

  async upsertDriverLocation(
    driverId: string,
    lat: number,
    lng: number
  ): Promise<{ state: DriverState | null; onlineStatus: OnlineStatus | null; updatedAt: string }> {
    const updatedAt = await this.redisService.setLocation(driverId, lat, lng);
    const [state, onlineStatus] = await Promise.all([
      this.redisService.getState(driverId),
      this.redisService.getOnlineStatus(driverId)
    ]);

    if (onlineStatus === OnlineStatus.ONLINE && state === DriverState.AVAILABLE) {
      await this.addAvailableDriverToGeo(driverId, lat, lng);
    } else {
      await this.removeDriverFromGeo(driverId);
    }

    return { state, onlineStatus, updatedAt };
  }

  async addAvailableDriverToGeo(driverId: string, lat: number, lng: number): Promise<void> {
    await this.client.geoadd(this.geoKey, lng, lat, driverId);
  }

  async removeDriverFromGeo(driverId: string): Promise<void> {
    await this.client.zrem(this.geoKey, driverId);
  }

  async syncGeoByState(
    driverId: string,
    state: DriverState,
    onlineStatus?: OnlineStatus | null
  ): Promise<void> {
    const effectiveOnline =
      onlineStatus !== undefined ? onlineStatus : await this.redisService.getOnlineStatus(driverId);

    if (effectiveOnline !== OnlineStatus.ONLINE || state !== DriverState.AVAILABLE) {
      await this.removeDriverFromGeo(driverId);
      return;
    }

    const location = await this.redisService.getLocation(driverId);
    if (!location) {
      await this.removeDriverFromGeo(driverId);
      return;
    }

    await this.addAvailableDriverToGeo(driverId, location.lat, location.lng);
  }
}
