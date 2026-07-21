import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayslipService } from './payslip.service.js';
import { PayrollTaxConfig } from './entities/payroll-tax-config.entity.js';
import { Payslip } from './entities/payslip.entity.js';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
});

const REFERENCE_CONFIG: PayrollTaxConfig = {
  id: 'config-1',
  incomeTaxBracket1Rate: 5,
  incomeTaxBracket1Ceiling: 1000,
  incomeTaxBracket2Rate: 10,
  personalExemptionThreshold: 0,
  jihadTaxIndividualRate: 3,
  solidarityFundRate: 1,
  payrollStampDutyRate: 0.5,
  cnssEmployeeRate: 5.125,
  cnssEmployerRate: 14.35,
  updatedAt: new Date(),
};

describe('PayslipService', () => {
  let service: PayslipService;
  let configRepo: ReturnType<typeof mockRepo>;
  let payslipRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayslipService,
        { provide: getRepositoryToken(PayrollTaxConfig), useFactory: mockRepo },
        { provide: getRepositoryToken(Payslip), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(PayslipService);
    configRepo = module.get(getRepositoryToken(PayrollTaxConfig));
    payslipRepo = module.get(getRepositoryToken(Payslip));
  });

  describe('compute', () => {
    it('matches the worked example from the business spec (2000 LYD gross)', () => {
      const result = service.compute(2000, REFERENCE_CONFIG);

      expect(result.cnssEmployeeContribution).toBe(102.5);
      expect(result.solidarityFundAmount).toBe(20);
      expect(result.jihadTaxAmount).toBe(60);
      expect(result.incomeTaxAmount).toBe(150); // 1000*5% + 1000*10%
      // 332.50 de retenues avant timbre (102.5+20+60+150)
      const netBeforeStamp = 2000 - (102.5 + 20 + 60 + 150);
      expect(netBeforeStamp).toBe(1667.5);
      expect(result.stampDutyAmount).toBe(8.34); // round(1667.5 * 0.5%)
      expect(result.netPay).toBe(1659.16);
      expect(result.cnssEmployerContribution).toBe(287); // 2000 * 14.35%
    });

    it('still charges Jihad tax and solidarity fund below the exemption threshold (no exemption on those)', () => {
      const config = { ...REFERENCE_CONFIG, personalExemptionThreshold: 5000 };
      const result = service.compute(2000, config);

      expect(result.incomeTaxAmount).toBe(0);
      expect(result.jihadTaxAmount).toBe(60);
      expect(result.solidarityFundAmount).toBe(20);
    });

    it('applies only bracket 1 when gross salary is below the bracket 1 ceiling', () => {
      const result = service.compute(800, REFERENCE_CONFIG);
      expect(result.incomeTaxAmount).toBe(40); // 800 * 5%
    });
  });

  describe('getConfig', () => {
    it('throws NotFoundException when no config row exists', async () => {
      configRepo.find.mockResolvedValue([]);
      await expect(service.getConfig()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the single seeded row', async () => {
      configRepo.find.mockResolvedValue([REFERENCE_CONFIG]);
      const config = await service.getConfig();
      expect(config).toBe(REFERENCE_CONFIG);
    });
  });

  describe('createPayslip', () => {
    it('saves a payslip linked to the given expense', async () => {
      const computed = service.compute(2000, REFERENCE_CONFIG);
      await service.createPayslip({
        employeeId: 'emp-1',
        period: '2026-07',
        grossSalary: 2000,
        expenseId: 'exp-1',
        computed,
      });

      expect(payslipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          period: '2026-07',
          grossSalary: 2000,
          expenseId: 'exp-1',
          netPay: computed.netPay,
        }),
      );
    });
  });
});
