import { IsLatitude, IsLongitude } from 'class-validator';

export class UpdateLocationDto {
  @IsLatitude({ message: 'Vi do khong hop le' })
  lat!: number;

  @IsLongitude({ message: 'Kinh do khong hop le' })
  lng!: number;
}
