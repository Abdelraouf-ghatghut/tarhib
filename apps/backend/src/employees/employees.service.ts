import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Employee } from './entities/employee.entity.js';
import { CreateEmployeeDto, EmployeeDto } from './dto/employee.dto.js';
import { KeycloakService } from '../auth/keycloak/keycloak.service.js';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    private readonly keycloakService: KeycloakService,
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
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    departmentId?: string,
    role?: string,
    active?: string,
  ): Promise<EmployeeDto[]> {
    const where: FindOptionsWhere<Employee> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (active !== undefined && active !== '') where.active = active === 'true';
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
