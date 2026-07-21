import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Employee, EmployeeScope } from './entities/employee.entity.js';
import {
  CreateEmployeeDto,
  EmployeeAdminDto,
  EmployeeDto,
} from './dto/employee.dto.js';

const SALARY_PERMISSION = 'employee.salary.manage';
import { KeycloakService } from '../auth/keycloak/keycloak.service.js';
import { Role } from '../roles/entities/role.entity.js';
import {
  ExpenseCategory,
  FinanceExpense,
} from '../finance/entities/finance-expense.entity.js';
import { FinancePeriod } from '../finance/entities/finance-period.entity.js';
import {
  computeProratedSalary,
  currentYearMonth,
} from '../finance/payroll-period.util.js';
import { isPeriodClosed } from '../finance/period-lock.util.js';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(FinanceExpense)
    private readonly expenseRepo: Repository<FinanceExpense>,
    @InjectRepository(FinancePeriod)
    private readonly periodRepo: Repository<FinancePeriod>,
    private readonly keycloakService: KeycloakService,
  ) {}

  async create(
    dto: CreateEmployeeDto,
    callerPermissions: string[] = [],
  ): Promise<EmployeeDto> {
    // Unicité vérifiée en amont : 409 explicite au lieu d'un 500 Postgres
    const duplicate = await this.repo.findOne({
      where: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
    });
    if (duplicate) {
      throw new ConflictException(
        duplicate.email === dto.email
          ? 'emailAlreadyRegistered'
          : 'phoneAlreadyRegistered',
      );
    }

    // Compte Keycloak créé avec le mot de passe fourni — sans lui, l'employé
    // ne pourrait jamais se connecter (JwtStrategy retombe sur l'email si
    // Anglais optionnel : repli sur l'arabe (colonnes non-null + Keycloak)
    const firstNameEn = dto.firstNameEn?.trim() || dto.firstNameAr;
    const lastNameEn = dto.lastNameEn?.trim() || dto.lastNameAr;

    // Keycloak échoue, donc non-fatal)
    let keycloakId: string | null = null;
    if (dto.password) {
      try {
        keycloakId = await this.keycloakService.createUser(
          dto.email,
          dto.password,
          firstNameEn,
          lastNameEn,
        );
      } catch (err) {
        this.logger.warn(
          `Keycloak account not created for ${dto.email}: ${String(err)}`,
        );
      }
    }

    const entity = this.repo.create({
      companyId: dto.companyId ?? null,
      branchId: dto.branchId ?? null,
      departmentId: dto.departmentId ?? null,
      floor: dto.floor ?? null,
      officeNumber: dto.officeNumber ?? null,
      firstNameAr: dto.firstNameAr,
      firstNameEn,
      lastNameAr: dto.lastNameAr,
      lastNameEn,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      roleId: dto.roleId ?? null,
      scope: dto.scope ?? EmployeeScope.CLIENT,
      active: dto.active ?? true,
      keycloakId,
      // Salaire : ignoré si l'appelant ne détient pas employee.salary.manage,
      // même si le payload en contient un (jamais fiable côté UI seule).
      salary: callerPermissions.includes(SALARY_PERMISSION)
        ? (dto.salary ?? null)
        : null,
      hireDate: dto.hireDate ?? null,
    });
    entity.additionalRoles = await this.loadAdditionalRoles(
      dto.additionalRoleIds,
      dto.roleId,
    );
    const saved = await this.repo.save(entity);
    await this.syncCurrentMonthSalaryExpense(saved);
    return this.toDto(saved);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    departmentId?: string,
    role?: string,
    active?: string,
    roleId?: string,
    skip = 0,
    take = 200,
  ): Promise<EmployeeDto[]> {
    const where: FindOptionsWhere<Employee> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (active !== undefined && active !== '') where.active = active === 'true';
    const resolvedWhere = roleId
      ? [
          { ...where, roleId },
          { ...where, additionalRoles: { id: roleId } },
        ]
      : where;
    const entities = await this.repo.find({
      where: resolvedWhere,
      order: { lastNameEn: 'ASC' },
      relations: ['additionalRoles'],
      skip,
      take,
    });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<EmployeeDto> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['additionalRoles'],
    });
    if (!entity) throw new NotFoundException(`Employee ${id} not found`);
    return this.toDto(entity);
  }

  async update(
    id: string,
    dto: Partial<CreateEmployeeDto>,
    callerPermissions: string[] = [],
  ): Promise<EmployeeDto> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['additionalRoles'],
    });
    if (!entity) throw new NotFoundException(`Employee ${id} not found`);

    // Unicité vérifiée en amont : 409 explicite au lieu d'un 500 Postgres
    if (dto.email !== undefined && dto.email !== entity.email) {
      const dup = await this.repo.findOne({ where: { email: dto.email } });
      if (dup) throw new ConflictException('emailAlreadyRegistered');
    }
    if (
      dto.phoneNumber !== undefined &&
      dto.phoneNumber !== entity.phoneNumber
    ) {
      const dup = await this.repo.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (dup) throw new ConflictException('phoneAlreadyRegistered');
    }

    if (dto.firstNameAr !== undefined) entity.firstNameAr = dto.firstNameAr;
    if (dto.firstNameEn !== undefined)
      entity.firstNameEn = dto.firstNameEn?.trim() || entity.firstNameAr;
    if (dto.lastNameAr !== undefined) entity.lastNameAr = dto.lastNameAr;
    if (dto.lastNameEn !== undefined)
      entity.lastNameEn = dto.lastNameEn?.trim() || entity.lastNameAr;
    if (dto.email !== undefined) entity.email = dto.email;
    if (dto.phoneNumber !== undefined) entity.phoneNumber = dto.phoneNumber;
    if (dto.companyId !== undefined) entity.companyId = dto.companyId;
    if (dto.departmentId !== undefined) entity.departmentId = dto.departmentId;
    if (dto.branchId !== undefined) entity.branchId = dto.branchId;
    if (dto.floor !== undefined) entity.floor = dto.floor ?? null;
    if (dto.officeNumber !== undefined)
      entity.officeNumber = dto.officeNumber ?? null;
    if (dto.roleId !== undefined) entity.roleId = dto.roleId;
    if (dto.additionalRoleIds !== undefined) {
      entity.additionalRoles = await this.loadAdditionalRoles(
        dto.additionalRoleIds,
        dto.roleId ?? entity.roleId,
      );
    }
    if (dto.scope !== undefined) entity.scope = dto.scope;
    if (dto.active !== undefined) entity.active = dto.active;
    if (
      dto.salary !== undefined &&
      callerPermissions.includes(SALARY_PERMISSION)
    ) {
      entity.salary = dto.salary ?? null;
    }
    if (dto.hireDate !== undefined) entity.hireDate = dto.hireDate ?? null;
    const saved = await this.repo.save(entity);
    await this.syncCurrentMonthSalaryExpense(saved);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Employee ${id} not found`);
    entity.active = false;
    await this.repo.save(entity);
  }

  async deactivate(id: string): Promise<EmployeeDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Employee ${id} not found`);
    entity.active = false;
    const saved = await this.repo.save(entity);

    // TARHIB-32: révocation des sessions Keycloak — fire-and-forget, non-fatal
    this.keycloakService
      .revokeUserSessions(entity.email)
      .catch((err: unknown) =>
        this.logger.error(
          `Session revocation failed for ${entity.email}: ${String(err)}`,
        ),
      );

    return this.toDto(saved);
  }

  /**
   * Synchronisation salaire ↔ dépense (المصاريف) : la ligne de dépense
   * "SALARIES" du mois en cours reflète toujours employees.salary —
   * fire-and-forget, ne doit jamais faire échouer la sauvegarde de l'employé
   * (même gabarit que la révocation Keycloak de deactivate() ci-dessus). Les
   * mois suivants sont générés par FinancePayrollService (cron mensuel +
   * rattrapage manuel). L'autre sens (dépense → salaire) est géré par
   * FinanceService via un update TypeORM brut, jamais par ce service, pour
   * ne pas créer de boucle — et uniquement pour le mois en cours (une
   * correction sur un mois passé ne doit pas changer le salaire actuel).
   */
  private async syncCurrentMonthSalaryExpense(saved: Employee): Promise<void> {
    try {
      const period = currentYearMonth();
      if (await isPeriodClosed(this.periodRepo, period)) {
        // Cas limite : le mois en cours a été clôturé pendant la
        // modification du salaire — la correction doit alors passer par
        // FinanceService.correctExpense, pas par cette synchronisation.
        this.logger.warn(
          `Salary expense sync skipped for employee ${saved.id}: period ${period} is closed`,
        );
        return;
      }
      const existing = await this.expenseRepo.findOne({
        where: {
          employeeId: saved.id,
          category: ExpenseCategory.SALARIES,
          payrollPeriod: period,
        },
      });
      const salary = saved.salary ? Number(saved.salary) : 0;

      if (salary <= 0) {
        if (existing) await this.expenseRepo.delete(existing.id);
        return;
      }

      const amount = computeProratedSalary(salary, saved.hireDate, period);
      if (amount === null) return; // prise de fonction postérieure au mois en cours

      if (existing) {
        existing.amount = amount;
        await this.expenseRepo.save(existing);
      } else {
        const label = `${saved.firstNameEn} ${saved.lastNameEn}`.trim();
        await this.expenseRepo.save(
          this.expenseRepo.create({
            category: ExpenseCategory.SALARIES,
            label: label || saved.email,
            amount,
            expenseDate: new Date().toISOString().slice(0, 10),
            // Le site d'affectation (companyId) est une mission, pas un lien
            // financier : le salaire d'un employé Tarhib ne dépend d'aucune
            // société cliente (même règle appliquée par FinanceService).
            companyId: null,
            employeeId: saved.id,
            payrollPeriod: period,
            notes: null,
          }),
        );
      }
    } catch (err) {
      this.logger.error(
        `Salary expense sync failed for employee ${saved.id}: ${String(err)}`,
      );
    }
  }

  private async loadAdditionalRoles(
    roleIds?: string[],
    primaryRoleId?: string | null,
  ): Promise<Role[]> {
    const uniqueRoleIds = [...new Set(roleIds ?? [])].filter(
      (roleId) => roleId !== primaryRoleId,
    );
    if (uniqueRoleIds.length === 0) return [];
    return this.roleRepo.find({
      where: uniqueRoleIds.map((roleId) => ({ id: roleId })),
    });
  }

  /**
   * Vue admin — inclut le salaire. Réservée aux appelants détenant
   * employee.salary.manage (voir EmployeesController.findAllAdmin).
   */
  async findAllAdmin(
    companyId?: string,
    branchId?: string,
    departmentId?: string,
    role?: string,
    active?: string,
    roleId?: string,
    skip = 0,
    take = 200,
  ): Promise<EmployeeAdminDto[]> {
    const where: FindOptionsWhere<Employee> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (active !== undefined && active !== '') where.active = active === 'true';
    const resolvedWhere = roleId
      ? [
          { ...where, roleId },
          { ...where, additionalRoles: { id: roleId } },
        ]
      : where;
    const entities = await this.repo.find({
      where: resolvedWhere,
      order: { lastNameEn: 'ASC' },
      relations: ['additionalRoles'],
      skip,
      take,
    });
    return entities.map((e) => this.toAdminDto(e));
  }

  private toDto(e: Employee): EmployeeDto {
    const dto = new EmployeeDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
    dto.branchId = e.branchId;
    dto.departmentId = e.departmentId;
    dto.floor = e.floor;
    dto.officeNumber = e.officeNumber;
    dto.firstNameAr = e.firstNameAr;
    dto.firstNameEn = e.firstNameEn;
    dto.lastNameAr = e.lastNameAr;
    dto.lastNameEn = e.lastNameEn;
    dto.email = e.email;
    dto.phoneNumber = e.phoneNumber;
    dto.role = e.role;
    dto.roleId = e.roleId;
    dto.additionalRoleIds = (e.additionalRoles ?? []).map((r) => r.id);
    dto.scope = e.scope;
    dto.active = e.active;
    dto.keycloakId = e.keycloakId;
    // salary délibérément omis — jamais exposé hors vue admin
    return dto;
  }

  private toAdminDto(e: Employee): EmployeeAdminDto {
    const dto = new EmployeeAdminDto();
    Object.assign(dto, this.toDto(e));
    dto.salary = e.salary ? Number(e.salary) : null;
    dto.hireDate = e.hireDate;
    return dto;
  }
}
