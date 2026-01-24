import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Length,
  Min
} from 'class-validator';

export class CreateDriverDto {
  @IsString({ message: 'Ten bat buoc la chuoi' })
  @IsNotEmpty({ message: 'Ten la bat buoc' })
  name!: string;

  @IsPhoneNumber('VN', { message: 'So dien thoai khong hop le' })
  phone!: string;

  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string;

  @IsString({ message: 'Bien so xe bat buoc la chuoi' })
  @Length(3, 20, { message: 'Bien so xe co do dai 3-20 ky tu' })
  plateNumber!: string;

  @IsString({ message: 'Loai xe bat buoc la chuoi' })
  vehicleType!: string;

  @IsString({ message: 'Mau xe bat buoc la chuoi' })
  color!: string;

  @IsInt({ message: 'Suc chua phai la so nguyen' })
  @Min(1, { message: 'Suc chua toi thieu la 1' })
  capacity!: number;
}
