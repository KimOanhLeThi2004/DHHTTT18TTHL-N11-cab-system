import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MongooseHealthIndicator
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrm: TypeOrmHealthIndicator,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly redis: RedisHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.typeOrm.pingCheck('postgres'),
      () => this.mongoose.pingCheck('mongo'),
      () => this.redis.isHealthy('redis')
    ]);
  }
}
