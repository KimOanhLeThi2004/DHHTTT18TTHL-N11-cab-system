import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { RedisGeoService } from './redis-geo.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port')
        });
      }
    },
    RedisService,
    RedisGeoService
  ],
  exports: [RedisService, RedisGeoService, 'REDIS_CLIENT']
})
export class RedisModule {}
