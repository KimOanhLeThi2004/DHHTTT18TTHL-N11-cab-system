import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateDriverDto {
  @IsOptional()
  @IsString({ message: 'Ten bat buoc la chuoi' })
  name?: string;

  @IsOptional()
  @IsPhoneNumber('VN', { message: 'So dien thoai khong hop le' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email khong hop le' })
  email?: string;
}
