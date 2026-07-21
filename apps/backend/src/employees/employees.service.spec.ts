import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { Employee } from './entities/employee.entity.js';
import { EmployeeRole } from './dto/employee.dto.js';
import { KeycloakService } from '../auth/keycloak/keycloak.service.js';
import { Role } from '../roles/entities/role.entity.js';
import {
  ExpenseCategory,
  FinanceExpense,
} from '../finance/entities/finance-expense.entity.js';
import { FinancePeriod } from '../finance/entities/finance-period.entity.js';
import { currentYearMonth } from '../finance/payroll-period.util.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
});

const mockKeycloak = () => ({
  createUser: jest.fn().mockResolvedValue('kc-1'),
  revokeUserSessions: jest.fn().mockResolvedValue(undefined),
});

const baseEmployee = () => ({
  id: 'emp-1',
  keycloakId: null,
  companyId: 'co-1',
  branchId: 'br-1',
  departmentId: 'dept-1',
  firstNameAr: 'محمد',
  firstNameEn: 'Mohamed',
  lastNameAr: 'علي',
  lastNameEn: 'Ali',
  email: 'm.ali@co.com',
  phoneNumber: '+213555000001',
  role: EmployeeRole.EMPLOYEE,
  active: true,
});

describe('EmployeesService', () => {
  let service: EmployeesService;
  let repo: ReturnType<typeof mockRepo>;
  let keycloak: ReturnType<typeof mockKeycloak>;
  let expenseRepo: ReturnType<typeof mockRepo>;
  let periodRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(Role), useFactory: mockRepo },
        { provide: getRepositoryToken(FinanceExpense), useFactory: mockRepo },
        { provide: getRepositoryToken(FinancePeriod), useFactory: mockRepo },
        { provide: KeycloakService, useFactory: mockKeycloak },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    repo = module.get(getRepositoryToken(Employee));
    keycloak = module.get(KeycloakService);
    expenseRepo = module.get(getRepositoryToken(FinanceExpense));
    expenseRepo.findOne.mockResolvedValue(null);
    expenseRepo.create.mockImplementation((v: unknown) => v);
    expenseRepo.save.mockImplementation((v: unknown) => v);
    periodRepo = module.get(getRepositoryToken(FinancePeriod));
    periodRepo.findOne.mockResolvedValue(null); // mois en cours ouvert par défaut
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      companyId: 'co-1',
      branchId: 'br-1',
      departmentId: 'dept-1',
      firstNameAr: 'محمد',
      firstNameEn: 'Mohamed',
      lastNameAr: 'علي',
      lastNameEn: 'Ali',
      email: 'm.ali@co.com',
      phoneNumber: '+213555000001',
      roleId: 'role-1',
      scope: 'TARHIB' as never,
    };

    it('should create and return an employee DTO with roleId and scope', async () => {
      repo.findOne.mockResolvedValue(null); // pas de doublon
      const entity = { ...baseEmployee(), roleId: 'role-1', scope: 'TARHIB' };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 'role-1', scope: 'TARHIB' }),
      );
      expect(result.roleId).toBe('role-1');
      expect(result.email).toBe('m.ali@co.com');
    });

    it('should create the Keycloak account when a password is provided', async () => {
      repo.findOne.mockResolvedValue(null);
      const entity = baseEmployee();
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      await service.create({ ...dto, password: 'Secret123!' });
      expect(keycloak.createUser).toHaveBeenCalledWith(
        'm.ali@co.com',
        'Secret123!',
        'Mohamed',
        'Ali',
      );
    });

    it('should reject duplicate email with 409 instead of a DB error', async () => {
      repo.findOne.mockResolvedValue(baseEmployee());
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return employee when found', async () => {
      repo.findOne.mockResolvedValue(baseEmployee());
      const result = await service.findOne('emp-1');
      expect(result.id).toBe('emp-1');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete employee by setting active=false', async () => {
      const entity = baseEmployee();
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockResolvedValue({ ...entity, active: false });

      await service.remove('emp-1');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      );
    });
  });

  describe('findAll', () => {
    it('should filter by companyId', async () => {
      repo.find.mockResolvedValue([baseEmployee()]);
      const result = await service.findAll('co-1');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'co-1' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('salary → expense sync (vice versa: expense → salary is handled by FinanceService)', () => {
    const dto = {
      companyId: 'co-1',
      branchId: 'br-1',
      departmentId: 'dept-1',
      firstNameAr: 'محمد',
      firstNameEn: 'Mohamed',
      lastNameAr: 'علي',
      lastNameEn: 'Ali',
      email: 'm.ali@co.com',
      phoneNumber: '+213555000001',
      scope: 'TARHIB' as never,
      salary: 5000,
    };

    it('creates a SALARIES expense when a new employee has a salary set', async () => {
      repo.findOne.mockResolvedValue(null);
      const entity = { ...baseEmployee(), salary: 5000 };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);
      expenseRepo.findOne.mockResolvedValue(null);

      await service.create(dto, ['employee.salary.manage']);

      expect(expenseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ExpenseCategory.SALARIES,
          amount: 5000,
          employeeId: 'emp-1',
          payrollPeriod: currentYearMonth(),
        }),
      );
    });

    it('never links the employee assignment site (companyId) to the salary expense', async () => {
      repo.findOne.mockResolvedValue(null);
      // baseEmployee() a companyId: 'co-1' (site d'affectation) — le salaire
      // ne doit jamais en hériter, c'est une mission, pas un lien financier.
      const entity = { ...baseEmployee(), salary: 5000 };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);
      expenseRepo.findOne.mockResolvedValue(null);

      await service.create(dto, ['employee.salary.manage']);

      expect(expenseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: null }),
      );
    });

    it('prorates the current month amount when hireDate falls within it', async () => {
      const [year, month] = currentYearMonth().split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const hireDay = Math.min(15, daysInMonth);
      const hireDate = `${currentYearMonth()}-${String(hireDay).padStart(2, '0')}`;
      const daysWorked = daysInMonth - hireDay + 1;

      repo.findOne.mockResolvedValue(null);
      const entity = { ...baseEmployee(), salary: 3000, hireDate };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);
      expenseRepo.findOne.mockResolvedValue(null);

      await service.create({ ...dto, hireDate }, ['employee.salary.manage']);

      expect(expenseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: Math.round(3000 * (daysWorked / daysInMonth) * 100) / 100,
        }),
      );
    });

    it('does not create a salary expense when hireDate is in a future month', async () => {
      repo.findOne.mockResolvedValue(null);
      const futureYear = new Date().getFullYear() + 5;
      const entity = {
        ...baseEmployee(),
        salary: 3000,
        hireDate: `${futureYear}-01-01`,
      };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);
      expenseRepo.findOne.mockResolvedValue(null);

      await service.create({ ...dto, hireDate: `${futureYear}-01-01` }, [
        'employee.salary.manage',
      ]);

      expect(expenseRepo.save).not.toHaveBeenCalled();
    });

    it('updates the existing SALARIES expense amount instead of creating a duplicate', async () => {
      const entity = { ...baseEmployee(), salary: 7000 };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockResolvedValue(entity);
      const existingExpense = {
        id: 'exp-1',
        amount: 5000,
        employeeId: 'emp-1',
      };
      expenseRepo.findOne.mockResolvedValue(existingExpense);

      await service.update('emp-1', { salary: 7000 }, [
        'employee.salary.manage',
      ]);

      expect(expenseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'exp-1', amount: 7000 }),
      );
      expect(expenseRepo.create).not.toHaveBeenCalled();
    });

    it('deletes the linked SALARIES expense when the salary is cleared', async () => {
      const entity = { ...baseEmployee(), salary: null };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockResolvedValue(entity);
      expenseRepo.findOne.mockResolvedValue({ id: 'exp-1' });

      await service.update('emp-1', { salary: null as unknown as number }, [
        'employee.salary.manage',
      ]);

      expect(expenseRepo.delete).toHaveBeenCalledWith('exp-1');
    });

    it('never fails the employee save when the expense sync throws', async () => {
      const entity = { ...baseEmployee(), salary: 5000 };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockResolvedValue(entity);
      expenseRepo.findOne.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('emp-1', { salary: 5000 }, ['employee.salary.manage']),
      ).resolves.toBeDefined();
    });

    it('skips the sync silently when the current month is closed', async () => {
      const entity = { ...baseEmployee(), salary: 5000 };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockResolvedValue(entity);
      periodRepo.findOne.mockResolvedValue({ status: 'CLOSED' });

      await expect(
        service.update('emp-1', { salary: 5000 }, ['employee.salary.manage']),
      ).resolves.toBeDefined();
      expect(expenseRepo.save).not.toHaveBeenCalled();
      expect(expenseRepo.delete).not.toHaveBeenCalled();
    });
  });
});
