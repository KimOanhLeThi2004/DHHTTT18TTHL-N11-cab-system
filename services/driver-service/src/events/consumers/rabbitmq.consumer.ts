import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { Channel, Connection, ConsumeMessage } from 'amqplib';
import { EventEnvelope } from '../event.types';
import { IdempotencyService } from '../idempotency.service';
import { RideEventsHandler } from '../handlers/ride-events.handler';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit, OnModuleDestroy {
  private connection?: Connection;
  private channel?: Channel;
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private readonly maxRetries = 3;

  constructor(
    private readonly config: ConfigService,
    private readonly idempotency: IdempotencyService,
    private readonly handler: RideEventsHandler
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('broker.type') !== 'rabbitmq') {
      this.logger.log('Bo qua RabbitMQ consumer vi broker dang dung Kafka');
      return;
    }
    const url = this.config.get<string>('broker.rabbit.url');
    const exchange = this.config.get<string>('broker.rabbit.exchange');
    const queue = this.config.get<string>('broker.rabbit.queue');
    const dlq = this.config.get<string>('broker.rabbit.dlq');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: exchange,
      deadLetterRoutingKey: dlq
    });

    await this.channel.assertQueue(dlq, { durable: true });

    const keys = [
      'RideOfferCreated',
      'RideStatusChanged',
      'TripStarted',
      'TripEnded',
      'DriverSuspended',
      'DriverAssigned'
    ];

    for (const key of keys) {
      await this.channel.bindQueue(queue, exchange, key);
    }

    await this.channel.consume(queue, (msg) => this.onMessage(msg), { noAck: false });
  }

  private async onMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    try {
      const raw = msg.content.toString();
      const event = JSON.parse(raw) as EventEnvelope;

      if (await this.idempotency.isProcessed(event.eventId)) {
        this.channel.ack(msg);
        return;
      }

      await this.handler.handle(event);
      await this.idempotency.markProcessed(event.eventId);
      this.channel.ack(msg);
    } catch (error) {
      const retries = (msg.properties.headers?.['x-retry-count'] as number) || 0;
      if (retries < this.maxRetries) {
        const exchange = this.config.get<string>('broker.rabbit.exchange');
        this.channel.publish(exchange, msg.fields.routingKey, msg.content, {
          headers: { 'x-retry-count': retries + 1 }
        });
        this.channel.ack(msg);
      } else {
        this.logger.error('Su kien that bai, day vao DLQ', error as Error);
        const dlq = this.config.get<string>('broker.rabbit.dlq');
        const exchange = this.config.get<string>('broker.rabbit.exchange');
        this.channel.publish(exchange, dlq, msg.content, { persistent: true });
        this.channel.ack(msg);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
