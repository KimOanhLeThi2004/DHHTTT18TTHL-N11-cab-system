import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
  ) {}

  async createPayment(body: any) {
    const { rideId, userId, amount, method } = body;

    const payment = this.paymentRepo.create({
      rideId,
      userId,
      amount,
      method,
      status: 'PENDING',
    });

    const savedPayment = await this.paymentRepo.save(payment);

    return {
      paymentId: savedPayment.id,
      rideId: savedPayment.rideId,
      userId: savedPayment.userId,
      amount: savedPayment.amount,
      method: savedPayment.method,
      status: savedPayment.status,
    };
  }
}
