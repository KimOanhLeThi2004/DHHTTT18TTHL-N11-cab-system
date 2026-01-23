import { IsNumber, IsString } from 'class-validator';

export class CalculatePriceDto {
  @IsString()
  vehicleType: 'BIKE' | 'CAR';

  @IsNumber()
  distanceKm: number;

  @IsNumber()
  durationMin: number;

  @IsNumber()
  isPeakHour: number; // 0 hoặc 1
}
