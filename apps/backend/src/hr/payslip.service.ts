import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollTaxConfig } from './entities/payroll-tax-config.entity.js';
import { Payslip } from './entities/payslip.entity.js';
import {
  PayrollTaxConfigDto,
  PayslipDto,
  UpdatePayrollTaxConfigDto,
} from './dto/hr.dto.js';

const round = (n: number) => Math.round(n * 100) / 100;

export interface ComputedPayslip {
  cnssEmployeeContribution: number;
  cnssEmployerContribution: number;
  solidarityFundAmount: number;
  jihadTaxAmount: number;
  incomeTaxAmount: number;
  stampDutyAmount: number;
  netPay: number;
}

/**
 * Calcul du bulletin de paie selon le barème fiscal libyen (loi n°7/2010) —
 * voir PayrollTaxConfig. Reproduit l'ordre exact fourni par le métier :
 * CNSS salarié → solidarité → Jihad → impôt sur le revenu progressif →
 * timbre sur le net restant → net à payer. La part employeur (CNSS 14,35%)
 * n'entre jamais dans le calcul du net — charge Tarhib additionnelle.
 */
@Injectable()
export class PayslipService {
  constructor(
    @InjectRepository(PayrollTaxConfig)
    private readonly configRepo: Repository<PayrollTaxConfig>,
    @InjectRepository(Payslip)
    private readonly payslipRepo: Repository<Payslip>,
  ) {}

  async getConfig(): Promise<PayrollTaxConfig> {
    const config = await this.configRepo.find({ take: 1 });
    if (!config[0]) {
      throw new NotFoundException('Payroll tax config not seeded');
    }
    return config[0];
  }

  async getConfigDto(): Promise<PayrollTaxConfigDto> {
    return this.toConfigDto(await this.getConfig());
  }

  async updateConfig(
    dto: UpdatePayrollTaxConfigDto,
  ): Promise<PayrollTaxConfigDto> {
    const config = await this.getConfig();
    Object.assign(config, dto);
    return this.toConfigDto(await this.configRepo.save(config));
  }

  compute(grossSalary: number, config: PayrollTaxConfig): ComputedPayslip {
    const cnssEmployeeContribution = round(
      (grossSalary * Number(config.cnssEmployeeRate)) / 100,
    );
    const cnssEmployerContribution = round(
      (grossSalary * Number(config.cnssEmployerRate)) / 100,
    );
    const solidarityFundAmount = round(
      (grossSalary * Number(config.solidarityFundRate)) / 100,
    );
    const jihadTaxAmount = round(
      (grossSalary * Number(config.jihadTaxIndividualRate)) / 100,
    );

    let incomeTaxAmount = 0;
    if (grossSalary > Number(config.personalExemptionThreshold)) {
      const ceiling = Number(config.incomeTaxBracket1Ceiling);
      const bracket1 = Math.min(grossSalary, ceiling);
      const bracket2 = Math.max(0, grossSalary - ceiling);
      incomeTaxAmount = round(
        (bracket1 * Number(config.incomeTaxBracket1Rate)) / 100 +
          (bracket2 * Number(config.incomeTaxBracket2Rate)) / 100,
      );
    }

    const netBeforeStamp =
      grossSalary -
      (cnssEmployeeContribution +
        solidarityFundAmount +
        jihadTaxAmount +
        incomeTaxAmount);
    const stampDutyAmount = round(
      (netBeforeStamp * Number(config.payrollStampDutyRate)) / 100,
    );
    const netPay = round(netBeforeStamp - stampDutyAmount);

    return {
      cnssEmployeeContribution,
      cnssEmployerContribution,
      solidarityFundAmount,
      jihadTaxAmount,
      incomeTaxAmount,
      stampDutyAmount,
      netPay,
    };
  }

  async createPayslip(data: {
    employeeId: string;
    period: string;
    grossSalary: number;
    expenseId: string;
    computed: ComputedPayslip;
  }): Promise<Payslip> {
    return this.payslipRepo.save(
      this.payslipRepo.create({
        employeeId: data.employeeId,
        period: data.period,
        grossSalary: data.grossSalary,
        expenseId: data.expenseId,
        ...data.computed,
      }),
    );
  }

  async findAllPayslips(filters: {
    employeeId?: string;
    period?: string;
  }): Promise<PayslipDto[]> {
    const rows = await this.payslipRepo.find({
      where: {
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.period ? { period: filters.period } : {}),
      },
      order: { generatedAt: 'DESC' },
    });
    return rows.map((r) => this.toPayslipDto(r));
  }

  async findOnePayslip(id: string): Promise<PayslipDto> {
    const row = await this.payslipRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Payslip ${id} not found`);
    return this.toPayslipDto(row);
  }

  private toConfigDto(e: PayrollTaxConfig): PayrollTaxConfigDto {
    return {
      id: e.id,
      incomeTaxBracket1Rate: Number(e.incomeTaxBracket1Rate),
      incomeTaxBracket1Ceiling: Number(e.incomeTaxBracket1Ceiling),
      incomeTaxBracket2Rate: Number(e.incomeTaxBracket2Rate),
      personalExemptionThreshold: Number(e.personalExemptionThreshold),
      jihadTaxIndividualRate: Number(e.jihadTaxIndividualRate),
      solidarityFundRate: Number(e.solidarityFundRate),
      payrollStampDutyRate: Number(e.payrollStampDutyRate),
      cnssEmployeeRate: Number(e.cnssEmployeeRate),
      cnssEmployerRate: Number(e.cnssEmployerRate),
    };
  }

  private toPayslipDto(e: Payslip): PayslipDto {
    return {
      id: e.id,
      employeeId: e.employeeId,
      period: e.period,
      grossSalary: Number(e.grossSalary),
      cnssEmployeeContribution: Number(e.cnssEmployeeContribution),
      cnssEmployerContribution: Number(e.cnssEmployerContribution),
      solidarityFundAmount: Number(e.solidarityFundAmount),
      jihadTaxAmount: Number(e.jihadTaxAmount),
      incomeTaxAmount: Number(e.incomeTaxAmount),
      stampDutyAmount: Number(e.stampDutyAmount),
      netPay: Number(e.netPay),
      expenseId: e.expenseId,
      generatedAt: e.generatedAt.toISOString(),
    };
  }
}
