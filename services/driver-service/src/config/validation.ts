import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3003),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  MONGO_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  BROKER_TYPE: Joi.string().valid('rabbitmq', 'kafka').default('rabbitmq'),
  RABBITMQ_URL: Joi.string().when('BROKER_TYPE', { is: 'rabbitmq', then: Joi.required() }),
  RABBITMQ_EXCHANGE: Joi.string().default('driver.events'),
  RABBITMQ_QUEUE: Joi.string().default('driver-service'),
  RABBITMQ_DLQ: Joi.string().default('driver-service.dlq'),
  KAFKA_BROKERS: Joi.string().when('BROKER_TYPE', { is: 'kafka', then: Joi.required() }),
  KAFKA_CLIENT_ID: Joi.string().default('driver-service'),
  KAFKA_GROUP_ID: Joi.string().default('driver-service-group'),
  KAFKA_TOPIC: Joi.string().default('driver.events'),
  LOCATION_RATE_LIMIT_TTL: Joi.number().default(3),
  LOCATION_RATE_LIMIT_LIMIT: Joi.number().default(1)
});
