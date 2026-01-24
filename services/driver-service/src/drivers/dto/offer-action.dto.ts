import { IsNotEmpty, IsString } from 'class-validator';

export class OfferActionDto {
  @IsString({ message: 'RideId la bat buoc' })
  @IsNotEmpty({ message: 'RideId la bat buoc' })
  rideId!: string;
}
