import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { DriverState, OnlineStatus } from '../common/utils/constants';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async setOnlineStatus(driverId: string, status: OnlineStatus): Promise<void> {
    await this.client.set(`driver:status:${driverId}`, status);
  }

  async setState(driverId: string, state: DriverState): Promise<void> {
    await this.client.set(`driver:state:${driverId}`, state);
  }

  async setLocation(driverId: string, lat: number, lng: number): Promise<void> {
    const payload = JSON.stringify({ lat, lng, updatedAt: new Date().toISOString() });
    await this.client.set(`driver:location:${driverId}`, payload);
    await this.client.set(`driver:last_seen:${driverId}`, new Date().toISOString());
  }

  async getState(driverId: string): Promise<DriverState | null> {
    return (await this.client.get(`driver:state:${driverId}`)) as DriverState | null;
  }

  async getOnlineStatus(driverId: string): Promise<OnlineStatus | null> {
    return (await this.client.get(`driver:status:${driverId}`)) as OnlineStatus | null;
  }
}
