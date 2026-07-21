import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FinancePayrollService } from './finance-payroll.service.js';

/** Génère automatiquement la paie du mois le 1er de chaque mois à 3h — le
 * bouton "Générer la paie" (FinanceController) permet de rattraper le mois
 * en cours si ce passage a été manqué (serveur arrêté ce jour-là). */
@Injectable()
export class FinancePayrollCronService {
  private readonly logger = new Logger(FinancePayrollCronService.name);

  constructor(private readonly payrollService: FinancePayrollService) {}

  @Cron('0 3 1 * *')
  async handleMonthlyPayroll(): Promise<void> {
    try {
      await this.payrollService.runPayroll();
    } catch (err) {
      this.logger.error(`Monthly payroll cron failed: ${String(err)}`);
    }
  }
}
