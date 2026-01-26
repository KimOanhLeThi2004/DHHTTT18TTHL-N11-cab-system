import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { typeOrmConfig } from './database/typeorm.config';
import { DriversModule } from './drivers/drivers.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { LogsModule } from './logs/logs.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'info',
        genReqId: (req) =>
          ((req as any).headers?.['x-correlation-id'] as string | undefined) ||
          (req as any).id ||
          uuidv4(),
        customProps: (req) => ({ correlationId: (req as any).id })
      }
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => typeOrmConfig(config)
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('mongo.uri')
      })
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100
    }),
    AuthModule,
    RedisModule,
    LogsModule,
    EventsModule,
    DriversModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
