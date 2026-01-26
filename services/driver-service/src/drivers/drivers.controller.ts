import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { UpdateLocationDto } from './dto/location.dto';
import { OfferActionDto } from './dto/offer-action.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SelfOnlyGuard } from '../common/guards/self-only.guard';
import { Roles } from '../common/guards/roles.decorator';
import { Role } from '../common/utils/constants';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateDriverDto) {
    const user = req.user as { sub: string };
    return this.driversService.createDriver(user.sub, dto, (req as any).id);
  }

  @Get(':driverId')
  @UseGuards(SelfOnlyGuard)
  async get(@Param('driverId') driverId: string) {
    return this.driversService.getDriver(driverId);
  }

  @Patch(':driverId')
  @UseGuards(SelfOnlyGuard)
  async update(
    @Req() req: Request,
    @Param('driverId') driverId: string,
    @Body() dto: UpdateDriverDto
  ) {
    return this.driversService.updateDriver(driverId, dto, (req as any).id);
  }

  @Post(':driverId/go-online')
  @UseGuards(SelfOnlyGuard)
  async goOnline(@Req() req: Request, @Param('driverId') driverId: string) {
    await this.driversService.goOnline(driverId, (req as any).id);
    return { message: 'Tai xe da online' };
  }

  @Post(':driverId/go-offline')
  @UseGuards(SelfOnlyGuard)
  async goOffline(@Req() req: Request, @Param('driverId') driverId: string) {
    await this.driversService.goOffline(driverId, (req as any).id);
    return { message: 'Tai xe da offline' };
  }

  @Patch(':driverId/state')
  @UseGuards(SelfOnlyGuard)
  async updateState(
    @Req() req: Request,
    @Param('driverId') driverId: string,
    @Body() dto: UpdateStateDto
  ) {
    await this.driversService.updateState(driverId, dto, (req as any).id);
    return { message: 'Cap nhat trang thai thanh cong' };
  }

  @Post(':driverId/location')
  @UseGuards(SelfOnlyGuard)
  @Throttle({
    limit: Number(process.env.LOCATION_RATE_LIMIT_LIMIT) || 1,
    ttl: Number(process.env.LOCATION_RATE_LIMIT_TTL) || 3
  })
  async updateLocation(
    @Req() req: Request,
    @Param('driverId') driverId: string,
    @Body() dto: UpdateLocationDto
  ) {
    await this.driversService.updateLocation(driverId, dto.lat, dto.lng, (req as any).id);
    return { message: 'Cap nhat vi tri thanh cong' };
  }

  @Post(':driverId/offers/:offerId/accept')
  @UseGuards(SelfOnlyGuard)
  async acceptOffer(
    @Req() req: Request,
    @Param('driverId') driverId: string,
    @Param('offerId') offerId: string,
    @Body() dto: OfferActionDto
  ) {
    await this.driversService.acceptOffer(driverId, offerId, dto.rideId, (req as any).id);
    return { message: 'Da chap nhan cuoc xe' };
  }

  @Post(':driverId/offers/:offerId/reject')
  @UseGuards(SelfOnlyGuard)
  async rejectOffer(
    @Req() req: Request,
    @Param('driverId') driverId: string,
    @Param('offerId') offerId: string,
    @Body() dto: OfferActionDto
  ) {
    await this.driversService.rejectOffer(driverId, offerId, dto.rideId, (req as any).id);
    return { message: 'Da tu choi cuoc xe' };
  }
}
