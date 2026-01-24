import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        phone varchar(20) NOT NULL,
        email varchar(255) NOT NULL,
        rating numeric(3,2) DEFAULT 5.0,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        plate_number varchar(50) NOT NULL,
        vehicle_type varchar(50) NOT NULL,
        color varchar(50) NOT NULL,
        capacity int NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS vehicles');
    await queryRunner.query('DROP TABLE IF EXISTS drivers');
  }
}
