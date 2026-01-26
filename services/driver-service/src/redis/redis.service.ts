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

  async setLocation(driverId: string, lat: number, lng: number): Promise<string> {
    const updatedAt = new Date().toISOString();
    const payload = JSON.stringify({ lat, lng, updatedAt });
    await this.client.set(`driver:location:${driverId}`, payload);
    await this.client.set(`driver:last_seen:${driverId}`, updatedAt);
    return updatedAt;
  }

  async getState(driverId: string): Promise<DriverState | null> {
    return (await this.client.get(`driver:state:${driverId}`)) as DriverState | null;
  }

  async getOnlineStatus(driverId: string): Promise<OnlineStatus | null> {
    return (await this.client.get(`driver:status:${driverId}`)) as OnlineStatus | null;
  }

  async getLocation(
    driverId: string
  ): Promise<{ lat: number; lng: number; updatedAt: string } | null> {
    const raw = await this.client.get(`driver:location:${driverId}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as { lat: number; lng: number; updatedAt: string };
  }

  async tryAcquireLocationPublishLock(driverId: string, ttlSeconds: number): Promise<boolean> {
    const key = `driver:location:publish:${driverId}`;
    const result = await this.client.set(key, '1', 'NX', 'EX', ttlSeconds);
    return result === 'OK';
  }

  async tryMarkOfferAction(offerId: string, action: string): Promise<boolean> {
    const key = `driver:offer:${offerId}`;
    const result = await this.client.set(key, action, 'NX', 'EX', 86400);
    return result === 'OK';
  }
}
