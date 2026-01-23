import { Injectable, BadRequestException } from '@nestjs/common';
import { PRICING_RULES } from './pricing.config';
import { CalculatePriceDto } from './dto/calculate-price.dto';

@Injectable()
export class PricingService {
  calculatePrice(dto: CalculatePriceDto) {
    const rule = PRICING_RULES[dto.vehicleType];

    if (!rule) {
      throw new BadRequestException('Unsupported vehicle type');
    }

    const distanceCost = dto.distanceKm * rule.pricePerKm;
    const timeCost = dto.durationMin * rule.pricePerMin;

    let total =
      rule.baseFare +
      distanceCost +
      timeCost;

    if (dto.isPeakHour === 1) {
      total *= rule.peakMultiplier;
    }

    return {
      vehicleType: dto.vehicleType,
      totalFare: Math.round(total),
      breakdown: {
        baseFare: rule.baseFare,
        distanceCost,
        timeCost,
        peakApplied: dto.isPeakHour === 1,
      },
    };
  }
}
