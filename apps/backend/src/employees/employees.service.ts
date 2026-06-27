import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity.js';
import { CreateEmployeeDto, EmployeeDto } from './dto/employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeDto> {
    const entity = this.repo.create({
      companyId: dto.companyId,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      firstNameAr: dto.firstNameAr,
      firstNameEn: dto.firstNameEn,
      lastNameAr: dto.lastNameAr,
      lastNameEn: dto.lastNameEn,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      role: dto.role,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(companyId?: string, branchId?: string): Promise<EmployeeDto[]> {
    const where: Partial<Employee> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    const entities = await this.repo.find({
      where,
      order: { lastNameEn: 'ASC' },
    });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<EmployeeDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Employee ${id} not found`);
    return this.toDto(entity);
  }

  async update(
    id: string,
    dto: Partial<CreateEmployeeDto>,
  ): Promise<EmployeeDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Employee ${id} not found`);
    if (dto.firstNameAr !== undefined) entity.firstNameAr = dto.firstNameAr;
    if (dto.firstNameEn !== undefined) entity.firstNameEn = dto.firstNameEn;
    if (dto.lastNameAr !== undefined) entity.lastNameAr = dto.lastNameAr;
    if (dto.lastNameEn !== undefined) entity.lastNameEn = dto.lastNameEn;
    if (dto.email !== undefined) entity.email = dto.email;
    if (dto.phoneNumber !== undefined) entity.phoneNumber = dto.phoneNumber;
    if (dto.role !== undefined) entity.role = dto.role;
    if (dto.departmentId !== undefined) entity.departmentId = dto.departmentId;
    if (dto.branchId !== undefined) entity.branchId = dto.branchId;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Employee ${id} not found`);
    entity.active = false;
    await this.repo.save(entity);
  }

  private toDto(e: Employee): EmployeeDto {
    const dto = new EmployeeDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
    dto.branchId = e.branchId;
    dto.departmentId = e.departmentId;
    dto.firstNameAr = e.firstNameAr;
    dto.firstNameEn = e.firstNameEn;
    dto.lastNameAr = e.lastNameAr;
    dto.lastNameEn = e.lastNameEn;
    dto.email = e.email;
    dto.phoneNumber = e.phoneNumber;
    dto.role = e.role;
    dto.active = e.active;
    return dto;
  }
}
