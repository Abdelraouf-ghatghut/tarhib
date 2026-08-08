import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';
import {
  ExpenseCategory,
  FinanceExpense,
} from './entities/finance-expense.entity.js';
import { FinancePeriod } from './entities/finance-period.entity.js';
import {
  computeProratedSalary,
  currentYearMonth,
} from './payroll-period.util.js';
import { isPeriodClosed } from './period-lock.util.js';
import { PayslipService } from '../hr/payslip.service.js';
import { AccountingService } from '../accounting/accounting.service.js';

// Clé arbitraire mais stable (PR-1.7) — hashtext('finance:payroll') tiendrait
// aussi dans un bigint mais une constante en dur évite toute dépendance à la
// façon dont Postgres hash les chaînes (stabilité garantie dans le temps).
const PAYROLL_ADVISORY_LOCK_KEY = 727_001;

/**
 * Génération mensuelle des lignes de paie (السلاريس) pour le personnel
 * interne Tarhib — complète la synchronisation immédiate du mois en cours
 * faite par EmployeesService.syncCurrentMonthSalaryExpense() lors d'une
 * modification de salaire : ce service couvre les mois où le salaire n'a pas
 * été touché manuellement (déclenché par le cron mensuel ou le bouton de
 * rattrapage — voir FinanceController).
 */
@Injectable()
export class FinancePayrollService {
  private readonly logger = new Logger(FinancePayrollService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(FinanceExpense)
    private readonly expenseRepo: Repository<FinanceExpense>,
    @InjectRepository(FinancePeriod)
    private readonly periodRepo: Repository<FinancePeriod>,
    private readonly payslipService: PayslipService,
    private readonly accountingService: AccountingService,
  ) {}

  /**
   * Verrou advisory PostgreSQL (PR-1.7) : le cron mensuel et le bouton de
   * rattrapage manuel (FinanceController) appellent tous deux runPayroll()
   * — sans verrou, un déclenchement manuel pendant la fenêtre du cron (ou un
   * double-clic, ou plusieurs instances backend partageant le même schedule)
   * peuvent courir en parallèle. La protection par période existante
   * (`existing` ci-dessous) est un check-then-insert non atomique : deux
   * exécutions concurrentes peuvent toutes deux passer ce test avant que
   * l'une n'insère, créant une double ligne de salaire. Verrou tenu sur une
   * connexion dédiée (QueryRunner) pour toute la durée du run — le corps
   * métier continue d'utiliser les repos habituels (pool), seul l'acquire/
   * release doit rester sur la même session Postgres.
   */
  async runPayroll(
    period: string = currentYearMonth(),
  ): Promise<{ created: number; skipped: number }> {
    const queryRunner =
      this.employeeRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    try {
      const lockResult = (await queryRunner.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [PAYROLL_ADVISORY_LOCK_KEY],
      )) as [{ locked: boolean }];
      const locked = lockResult[0].locked;
      if (!locked) {
        throw new ConflictException('payrollRunInProgress');
      }
      try {
        return await this.runPayrollLocked(period);
      } finally {
        await queryRunner.query('SELECT pg_advisory_unlock($1)', [
          PAYROLL_ADVISORY_LOCK_KEY,
        ]);
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async runPayrollLocked(
    period: string,
  ): Promise<{ created: number; skipped: number }> {
    if (await isPeriodClosed(this.periodRepo, period)) {
      throw new ConflictException('periodClosed');
    }

    const employees = await this.employeeRepo.find({
      where: { scope: EmployeeScope.TARHIB, active: true },
    });
    const taxConfig = await this.payslipService.getConfig();

    let created = 0;
    let skipped = 0;

    for (const employee of employees) {
      const salary = employee.salary ? Number(employee.salary) : 0;
      if (salary <= 0) {
        skipped++;
        continue;
      }

      const existingExpense = await this.expenseRepo.findOne({
        where: {
          employeeId: employee.id,
          category: ExpenseCategory.SALARIES,
          payrollPeriod: period,
        },
      });
      if (existingExpense) {
        const existingPayslip = await this.payslipService.findByExpenseId(
          existingExpense.id,
        );
        if (existingPayslip) {
          skipped++;
          continue;
        }
      }

      // EmployeesService peut avoir créé la dépense du mois immédiatement
      // lors de la saisie du salaire. Dans ce cas, elle est la source de
      // vérité : la réutiliser et compléter le bulletin manquant au lieu de
      // considérer à tort toute la paie comme déjà traitée.
      const amount = existingExpense
        ? Number(existingExpense.amount)
        : computeProratedSalary(salary, employee.hireDate, period);
      if (amount === null) {
        skipped++; // prise de fonction postérieure à ce mois
        continue;
      }

      const label = `${employee.firstNameEn} ${employee.lastNameEn}`.trim();
      const savedExpense =
        existingExpense ??
        (await this.expenseRepo.save(
          this.expenseRepo.create({
            category: ExpenseCategory.SALARIES,
            label: label || employee.email,
            amount,
            expenseDate: `${period}-01`,
            // Le site d'affectation (companyId) est une mission, pas un lien
            // financier : le salaire d'un employé Tarhib ne dépend d'aucune
            // société cliente (même règle appliquée par FinanceService).
            companyId: null,
            employeeId: employee.id,
            payrollPeriod: period,
            notes: null,
          }),
        ));
      created++;

      // Bulletin de paie + écriture comptable — fire-and-forget non-fatal :
      // la ligne FinanceExpense ci-dessus reste la source de vérité du
      // salaire versé même si le calcul détaillé du bulletin échoue.
      try {
        const computed = this.payslipService.compute(amount, taxConfig);
        const payslip = await this.payslipService.createPayslip({
          employeeId: employee.id,
          period,
          grossSalary: amount,
          expenseId: savedExpense.id,
          computed,
        });
        const payrollEntryPosted =
          await this.accountingService.postPayrollEntry({
            id: payslip.id,
            date: `${period}-01`,
            grossSalary: amount,
            ...computed,
          });
        if (existingExpense && payrollEntryPosted) {
          // Une dépense créée depuis l'écran Finance peut déjà avoir une
          // écriture EXPENSE simplifiée. Le bulletin produit l'écriture PAYROLL
          // détaillée qui la remplace ; ne supprimer l'ancienne qu'après le
          // succès de la nouvelle pour ne jamais perdre la comptabilisation.
          await this.accountingService.removeExpenseEntry(existingExpense.id);
        }
      } catch (err) {
        this.logger.error(
          `Failed to generate payslip for employee ${employee.id}, period ${period}: ${String(err)}`,
        );
      }
    }

    this.logger.log(
      `Payroll run for ${period}: ${created} created, ${skipped} skipped`,
    );
    return { created, skipped };
  }
}
