import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {
    super();
  }

  async isHealthy(key = 'redis'): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.client.ping();
      const isHealthy = pong === 'PONG';
      return this.getStatus(key, isHealthy);
    } catch (error) {
      return this.getStatus(key, false, { message: 'Redis khong san sang' });
    }
  }
}
