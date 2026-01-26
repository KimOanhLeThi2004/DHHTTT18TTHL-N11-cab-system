import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { EventEnvelope } from '../event.types';
import { IdempotencyService } from '../idempotency.service';
import { RideEventsHandler } from '../handlers/ride-events.handler';

@Injectable()
export class KafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private dlqProducer?: Producer;
  private readonly logger = new Logger(KafkaConsumer.name);

  constructor(
    private readonly config: ConfigService,
    private readonly idempotency: IdempotencyService,
    private readonly handler: RideEventsHandler
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('broker.type') !== 'kafka') {
      this.logger.log('Bo qua Kafka consumer vi broker dang dung RabbitMQ');
      return;
    }
    const kafka = new Kafka({
      clientId: this.config.get<string>('broker.kafka.clientId'),
      brokers: this.config.get<string[]>('broker.kafka.brokers')
    });

    this.consumer = kafka.consumer({ groupId: this.config.get<string>('broker.kafka.groupId') });
    this.dlqProducer = kafka.producer();

    await this.consumer.connect();
    await this.dlqProducer.connect();

    const topic = this.config.get<string>('broker.kafka.topic');
    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic: incomingTopic, partition, message }) => {
        if (!message.value) {
          return;
        }

        try {
          const event = JSON.parse(message.value.toString()) as EventEnvelope;
          if (await this.idempotency.isProcessed(event.eventId)) {
            await this.consumer?.commitOffsets([
              { topic: incomingTopic, partition, offset: (Number(message.offset) + 1).toString() }
            ]);
            return;
          }

          const acceptedTypes = [
            'RideOfferCreated',
            'RideStatusChanged',
            'TripStarted',
            'TripEnded',
            'DriverSuspended',
            'DriverAssigned'
          ];

          if (acceptedTypes.includes(event.type)) {
            await this.handler.handle(event);
            await this.idempotency.markProcessed(event.eventId);
          }

          await this.consumer?.commitOffsets([
            { topic: incomingTopic, partition, offset: (Number(message.offset) + 1).toString() }
          ]);
        } catch (error) {
          this.logger.error('Xu ly su kien Kafka that bai', error as Error);
          const dlqTopic = `${this.config.get<string>('broker.kafka.topic')}.dlq`;
          await this.dlqProducer?.send({
            topic: dlqTopic,
            messages: [
              {
                key: message.key?.toString(),
                value: message.value?.toString()
              }
            ]
          });
        }
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
    await this.dlqProducer?.disconnect();
  }
}
