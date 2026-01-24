import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogsModule } from '../logs/logs.module';
import { DriversModule } from '../drivers/drivers.module';
import { RedisModule } from '../redis/redis.module';
import { EventPublisherService } from './event-publisher.service';
import { RabbitMQPublisher } from './publishers/rabbitmq.publisher';
import { KafkaPublisher } from './publishers/kafka.publisher';
import { RabbitMQConsumer } from './consumers/rabbitmq.consumer';
import { KafkaConsumer } from './consumers/kafka.consumer';
import { IdempotencyService } from './idempotency.service';
import { RideEventsHandler } from './handlers/ride-events.handler';

@Module({
  imports: [ConfigModule, LogsModule, forwardRef(() => DriversModule), RedisModule],
  providers: [
    EventPublisherService,
    RabbitMQPublisher,
    KafkaPublisher,
    RabbitMQConsumer,
    KafkaConsumer,
    IdempotencyService,
    RideEventsHandler
  ],
  exports: [EventPublisherService]
})
export class EventsModule {}
