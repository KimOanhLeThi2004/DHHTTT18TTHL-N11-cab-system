import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';
import { ReadyController } from './ready.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController, ReadyController],
  providers: [RedisHealthIndicator]
})
export class HealthModule {}
