import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { Channel, ChannelModel } from 'amqplib';
import { EventEnvelope } from '../event.types';

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly logger = new Logger(RabbitMQPublisher.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('broker.rabbit.url');
    const exchange = this.config.getOrThrow<string>('broker.rabbit.exchange');
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    this.connection = connection;
    this.channel = channel;
    await channel.assertExchange(exchange, 'topic', { durable: true });
  }

  async publish(event: EventEnvelope): Promise<void> {
    if (!this.channel) {
      throw new Error('Ket noi RabbitMQ chua san sang');
    }
    const exchange = this.config.getOrThrow<string>('broker.rabbit.exchange');
    const payload = Buffer.from(JSON.stringify(event));
    this.channel.publish(exchange, event.type, payload, { persistent: true });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log('Da dong ket noi RabbitMQ');
  }
}
