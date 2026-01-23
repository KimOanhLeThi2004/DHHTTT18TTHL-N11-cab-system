import * as dotenv from 'dotenv';
dotenv.config();
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD, // 👈 phải là string
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),
    PaymentModule,
  ],
})
export class AppModule {}
