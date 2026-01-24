import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { EventEnvelope, EventType } from './event.types';
import { RabbitMQPublisher } from './publishers/rabbitmq.publisher';
import { KafkaPublisher } from './publishers/kafka.publisher';

@Injectable()
export class EventPublisherService {
  constructor(
    private readonly config: ConfigService,
    private readonly rabbitPublisher: RabbitMQPublisher,
    private readonly kafkaPublisher: KafkaPublisher
  ) {}

  async publish<T>(type: EventType, payload: T, correlationId?: string): Promise<void> {
    const envelope: EventEnvelope<T> = {
      eventId: uuidv4(),
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      correlationId,
      payload
    };

    const brokerType = this.config.get<string>('broker.type');
    if (brokerType === 'kafka') {
      await this.kafkaPublisher.publish(envelope);
      return;
    }

    await this.rabbitPublisher.publish(envelope);
  }
}
