import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { Channel, Connection } from 'amqplib';
import { EventEnvelope } from '../event.types';

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private connection?: Connection;
  private channel?: Channel;
  private readonly logger = new Logger(RabbitMQPublisher.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('broker.rabbit.url');
    const exchange = this.config.get<string>('broker.rabbit.exchange');
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
  }

  async publish(event: EventEnvelope): Promise<void> {
    if (!this.channel) {
      throw new Error('Ket noi RabbitMQ chua san sang');
    }
    const exchange = this.config.get<string>('broker.rabbit.exchange');
    const payload = Buffer.from(JSON.stringify(event));
    this.channel.publish(exchange, event.type, payload, { persistent: true });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log('Da dong ket noi RabbitMQ');
  }
}
