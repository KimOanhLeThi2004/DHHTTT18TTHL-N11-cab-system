import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Driver } from '../drivers/driver.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

export const typeOrmConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('db.host'),
  port: config.get<number>('db.port'),
  username: config.get<string>('db.user'),
  password: config.get<string>('db.password'),
  database: config.get<string>('db.name'),
  entities: [Driver, Vehicle],
  synchronize: false,
  migrationsRun: false
});
