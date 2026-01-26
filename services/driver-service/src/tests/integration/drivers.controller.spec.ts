import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DriversController } from '../../drivers/drivers.controller';
import { DriversService } from '../../drivers/drivers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SelfOnlyGuard } from '../../common/guards/self-only.guard';

class AllowAllGuard {
  canActivate() {
    return true;
  }
}

describe('Kiem thu tich hop DriversController', () => {
  let app: INestApplication;
  const service = {
    getDriver: jest.fn().mockResolvedValue({ id: 'd1', name: 'A' }),
    updateLocation: jest.fn()
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [{ provide: DriversService, useValue: service }]
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAllGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowAllGuard)
      .overrideGuard(SelfOnlyGuard)
      .useClass(AllowAllGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /drivers/:driverId tra ve du lieu', async () => {
    await request(app.getHttpServer()).get('/drivers/d1').expect(200);
  });

  it('POST /drivers/:driverId/location cap nhat vi tri', async () => {
    await request(app.getHttpServer())
      .post('/drivers/d1/location')
      .send({ lat: 10.1234, lng: 106.1234 })
      .expect(201);

    expect(service.updateLocation).toHaveBeenCalledWith('d1', 10.1234, 106.1234, undefined);
  });
});
