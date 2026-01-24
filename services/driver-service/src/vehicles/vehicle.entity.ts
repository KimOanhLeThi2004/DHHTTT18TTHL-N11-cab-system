import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Driver } from '../drivers/driver.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Driver, (driver) => driver.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column({ name: 'plate_number' })
  plateNumber!: string;

  @Column({ name: 'vehicle_type' })
  vehicleType!: string;

  @Column()
  color!: string;

  @Column()
  capacity!: number;
}
