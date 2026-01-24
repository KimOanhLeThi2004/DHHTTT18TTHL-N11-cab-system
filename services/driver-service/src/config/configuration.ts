export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3003', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'driver_service',
    user: process.env.DB_USER || 'driver',
    password: process.env.DB_PASSWORD || 'driver'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  },
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/driver_service'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'driver_service_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  broker: {
    type: process.env.BROKER_TYPE || 'rabbitmq',
    rabbit: {
      url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE || 'driver.events',
      queue: process.env.RABBITMQ_QUEUE || 'driver-service',
      dlq: process.env.RABBITMQ_DLQ || 'driver-service.dlq'
    },
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      clientId: process.env.KAFKA_CLIENT_ID || 'driver-service',
      groupId: process.env.KAFKA_GROUP_ID || 'driver-service-group',
      topic: process.env.KAFKA_TOPIC || 'driver.events'
    }
  },
  rateLimit: {
    locationTtl: parseInt(process.env.LOCATION_RATE_LIMIT_TTL || '3', 10),
    locationLimit: parseInt(process.env.LOCATION_RATE_LIMIT_LIMIT || '1', 10)
  }
});
