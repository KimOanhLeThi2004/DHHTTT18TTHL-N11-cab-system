import { DriversService } from '../../drivers/drivers.service';
import { DriverStatus } from '../../common/utils/constants';

describe('Kiem thu DriversService', () => {
  const driverRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
  };
  const vehicleRepo = {
    create: jest.fn(),
    save: jest.fn()
  };
  const redisService = {
    setOnlineStatus: jest.fn(),
    setState: jest.fn(),
    setLocation: jest.fn()
  };
  const logsService = {
    logActivity: jest.fn(),
    logOfferAction: jest.fn(),
    logStatusChange: jest.fn()
  };
  const publisher = {
    publish: jest.fn()
  };

  const service = new DriversService(
    driverRepo as any,
    vehicleRepo as any,
    redisService as any,
    logsService as any,
    publisher as any
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tao tai xe va xe thanh cong', async () => {
    driverRepo.findOne.mockResolvedValue(null);
    driverRepo.create.mockReturnValue({ id: 'd1', status: DriverStatus.ACTIVE });
    driverRepo.save.mockResolvedValue({ id: 'd1' });
    vehicleRepo.create.mockReturnValue({ id: 'v1' });
    vehicleRepo.save.mockResolvedValue({ id: 'v1' });

    const result = await service.createDriver('d1', {
      name: 'A',
      phone: '0900000000',
      email: 'a@test.com',
      plateNumber: '51A-12345',
      vehicleType: 'Sedan',
      color: 'Den',
      capacity: 4
    });

    expect(result).toBeDefined();
    expect(publisher.publish).toHaveBeenCalledWith(
      'DriverCreated',
      expect.any(Object),
      undefined
    );
  });
});
