import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { Employee } from './entities/employee.entity.js';
import { EmployeeRole } from './dto/employee.dto.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    repo = module.get(getRepositoryToken(Employee));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return an employee DTO', async () => {
      const entity = baseEmployee();
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

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
        role: EmployeeRole.EMPLOYEE,
      };

      const result = await service.create(dto);
      expect(result.role).toBe(EmployeeRole.EMPLOYEE);
      expect(result.email).toBe('m.ali@co.com');
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
});
