import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Driver } from '../drivers/driver.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'driver',
  password: process.env.DB_PASSWORD || 'driver',
  database: process.env.DB_NAME || 'driver_service',
  entities: [Driver, Vehicle],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false
});
