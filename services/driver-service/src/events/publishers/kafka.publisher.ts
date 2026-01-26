import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { EventEnvelope } from '../event.types';

@Injectable()
export class KafkaPublisher implements OnModuleInit, OnModuleDestroy {
  private producer?: Producer;
  private readonly logger = new Logger(KafkaPublisher.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const kafka = new Kafka({
      clientId: this.config.getOrThrow<string>('broker.kafka.clientId'),
      brokers: this.config.getOrThrow<string[]>('broker.kafka.brokers')
    });
    this.producer = kafka.producer();
    await this.producer.connect();
  }

  async publish(event: EventEnvelope): Promise<void> {
    if (!this.producer) {
      throw new Error('Ket noi Kafka chua san sang');
    }
    const topic = this.config.getOrThrow<string>('broker.kafka.topic');
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.eventId,
          value: JSON.stringify(event)
        }
      ]
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer?.disconnect();
    this.logger.log('Da dong ket noi Kafka');
  }
}
