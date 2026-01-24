import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { DriverStatus } from '../common/utils/constants';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  phone!: string;

  @Column()
  email!: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 5.0 })
  rating!: number;

  @Column({ default: DriverStatus.ACTIVE })
  status!: DriverStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles?: Vehicle[];
}
