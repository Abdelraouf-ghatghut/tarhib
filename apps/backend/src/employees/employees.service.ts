import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Employee, EmployeeScope } from './entities/employee.entity.js';
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
    roleId?: string,
  ): Promise<EmployeeDto[]> {
    const where: FindOptionsWhere<Employee> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (roleId) where.roleId = roleId;
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
    if (dto.roleId !== undefined) entity.roleId = dto.roleId;
    if (dto.scope !== undefined) entity.scope = dto.scope;
    if (dto.active !== undefined) entity.active = dto.active;
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
    dto.roleId = e.roleId;
    dto.scope = e.scope;
    dto.active = e.active;
    dto.keycloakId = e.keycloakId;
    return dto;
  }
}
