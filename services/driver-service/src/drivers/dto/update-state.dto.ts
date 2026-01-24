import { IsEnum } from 'class-validator';
import { DriverState } from '../../common/utils/constants';

export class UpdateStateDto {
  @IsEnum(DriverState, { message: 'Trang thai khong hop le' })
  state!: DriverState;
}
