import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyRegistrationService } from './company-registration.service.js';
import { CompanyRegistrationMode } from './entities/company.entity.js';

describe('CompanyRegistrationService', () => {
  const companyRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const optionRepo = {
    find: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const branchRepo = { find: jest.fn() };
  const departmentRepo = { find: jest.fn() };
  const roleRepo = { find: jest.fn() };
  const redis = { get: jest.fn(), set: jest.fn() };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-registration-secret'),
  };

  const service = new CompanyRegistrationService(
    companyRepo as never,
    optionRepo as never,
    branchRepo as never,
    departmentRepo as never,
    roleRepo as never,
    config as unknown as ConfigService,
    redis as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rotates a code without persisting the clear value', async () => {
    const company = {
      id: 'company-1',
      registrationCodeHash: null,
      registrationCodeRotatedAt: null,
    };
    companyRepo.findOne.mockResolvedValue(company);
    companyRepo.save.mockResolvedValue(company);

    const result = await service.rotateCode('company-1');

    expect(result.code).toMatch(/^TRHB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(company.registrationCodeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(company.registrationCodeHash).not.toContain(result.code);
    expect(company.registrationCodeRotatedAt).toBeInstanceOf(Date);
  });

  it('creates a short-lived opaque challenge for a valid code', async () => {
    companyRepo.findOne.mockResolvedValue({
      id: 'company-1',
      nameAr: 'شركة الاختبار',
      nameEn: 'Test company',
      active: true,
      registrationMode: CompanyRegistrationMode.AUTO_APPROVED,
      registrationCodeExpiresAt: null,
    });

    const result = await service.resolve('TRHB-ABCD-EFGH-JKMP');

    expect(result.challenge).toHaveLength(43);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^company_registration_challenge:/),
      'company-1',
      600,
    );
    expect(result.company.nameAr).toBe('شركة الاختبار');
  });

  it('does not disclose whether an invalid code belongs to a closed company', async () => {
    companyRepo.findOne.mockResolvedValue({
      active: true,
      registrationMode: CompanyRegistrationMode.CLOSED,
      registrationCodeExpiresAt: null,
    });

    await expect(service.resolve('TRHB-ABCD-EFGH-JKMP')).rejects.toThrow(
      BadRequestException,
    );
    expect(redis.set).not.toHaveBeenCalled();
  });
});
