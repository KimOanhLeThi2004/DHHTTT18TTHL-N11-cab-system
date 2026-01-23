import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rideId: string;

  @Column()
  userId: string;

  @Column('decimal')
  amount: number;

  @Column()
  method: string;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
