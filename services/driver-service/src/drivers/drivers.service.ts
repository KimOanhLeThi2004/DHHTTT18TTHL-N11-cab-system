import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './driver.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { RedisService } from '../redis/redis.service';
import { LogsService } from '../logs/logs.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { DriverState, DriverStatus, OnlineStatus } from '../common/utils/constants';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    private readonly redisService: RedisService,
    private readonly logsService: LogsService,
    private readonly eventPublisher: EventPublisherService
  ) {}

  async createDriver(
    driverId: string,
    dto: CreateDriverDto,
    correlationId?: string
  ): Promise<Driver> {
    const existing = await this.driverRepo.findOne({ where: { id: driverId } });
    if (existing) {
      throw new BadRequestException('Tai khoan tai xe da ton tai');
    }

    const driver = this.driverRepo.create({
      id: driverId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      status: DriverStatus.ACTIVE
    });

    await this.driverRepo.save(driver);

    const vehicle = this.vehicleRepo.create({
      driver,
      plateNumber: dto.plateNumber,
      vehicleType: dto.vehicleType,
      color: dto.color,
      capacity: dto.capacity
    });

    await this.vehicleRepo.save(vehicle);

    await this.eventPublisher.publish(
      'DriverCreated',
      {
        driverId: driver.id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        vehicle: {
          id: vehicle.id,
          plateNumber: vehicle.plateNumber,
          vehicleType: vehicle.vehicleType,
          color: vehicle.color,
          capacity: vehicle.capacity
        }
      },
      correlationId
    );

    return driver;
  }

  async getDriver(driverId: string): Promise<Driver> {
    const driver = await this.driverRepo.findOne({
      where: { id: driverId },
      relations: ['vehicles']
    });

    if (!driver) {
      throw new NotFoundException('Khong tim thay tai xe');
    }

    return driver;
  }

  async updateDriver(
    driverId: string,
    dto: UpdateDriverDto,
    correlationId?: string
  ): Promise<Driver> {
    const driver = await this.getDriver(driverId);

    Object.assign(driver, dto);
    await this.driverRepo.save(driver);

    await this.eventPublisher.publish(
      'DriverUpdated',
      {
        driverId: driver.id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email
      },
      correlationId
    );

    return driver;
  }

  async goOnline(driverId: string, correlationId?: string): Promise<void> {
    await this.ensureActive(driverId);
    await this.redisService.setOnlineStatus(driverId, OnlineStatus.ONLINE);
    await this.redisService.setState(driverId, DriverState.AVAILABLE);
    await this.logsService.logActivity(driverId, 'ONLINE');
    await this.eventPublisher.publish('DriverOnline', { driverId }, correlationId);
  }

  async goOffline(driverId: string, correlationId?: string): Promise<void> {
    await this.ensureActive(driverId);
    await this.redisService.setOnlineStatus(driverId, OnlineStatus.OFFLINE);
    await this.redisService.setState(driverId, DriverState.AVAILABLE);
    await this.logsService.logActivity(driverId, 'OFFLINE');
    await this.eventPublisher.publish('DriverOffline', { driverId }, correlationId);
  }

  async updateState(
    driverId: string,
    dto: UpdateStateDto,
    correlationId?: string
  ): Promise<void> {
    await this.ensureActive(driverId);
    await this.redisService.setState(driverId, dto.state);
    await this.eventPublisher.publish(
      'DriverAvailabilityChanged',
      { driverId, state: dto.state },
      correlationId
    );
  }

  async updateLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await this.ensureActive(driverId);
    await this.redisService.setLocation(driverId, lat, lng);
  }

  async acceptOffer(
    driverId: string,
    offerId: string,
    rideId: string,
    correlationId?: string
  ): Promise<void> {
    await this.ensureActive(driverId);
    await this.redisService.setState(driverId, DriverState.BUSY);
    await this.logsService.logOfferAction(driverId, rideId, offerId, 'ACCEPTED');
    await this.eventPublisher.publish(
      'DriverAcceptedOffer',
      { driverId, rideId, offerId },
      correlationId
    );
  }

  async rejectOffer(
    driverId: string,
    offerId: string,
    rideId: string,
    correlationId?: string
  ): Promise<void> {
    await this.ensureActive(driverId);
    await this.logsService.logOfferAction(driverId, rideId, offerId, 'REJECTED');
    await this.eventPublisher.publish(
      'DriverRejectedOffer',
      { driverId, rideId, offerId },
      correlationId
    );
  }

  async updateStatus(driverId: string, status: DriverStatus): Promise<void> {
    const driver = await this.getDriver(driverId);
    const oldStatus = driver.status;
    driver.status = status;
    await this.driverRepo.save(driver);
    await this.logsService.logStatusChange(driverId, oldStatus, status);
  }

  private async ensureActive(driverId: string): Promise<void> {
    const driver = await this.getDriver(driverId);
    if (driver.status === DriverStatus.SUSPENDED) {
      throw new BadRequestException('Tai xe dang bi tam khoa');
    }
  }
}
