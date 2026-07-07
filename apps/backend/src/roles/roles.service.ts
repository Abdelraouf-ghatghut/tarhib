import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleScope, SlaPriority } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';
import { RoleQuota, QuotaPeriodType } from './entities/role-quota.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import {
  CreateRoleDto,
  CreateRoleQuotaDto,
  RoleDto,
  RoleQuotaInputDto,
  UpdateRoleDto,
} from './dto/role.dto.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RoleQuota)
    private readonly roleQuotaRepo: Repository<RoleQuota>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async findAll(caller: JwtPayload): Promise<RoleDto[]> {
    // Portail interne : un admin plateforme (role.manage) voit tous les rôles,
    // internes comme clients — il n'est pas cantonné à une société (le
    // superadmin n'a d'ailleurs aucune affectation). Les autres appelants ne
    // voient que les rôles clients de leur société.
    const isTarhibAdmin = caller.permissions?.includes('role.manage');
    if (!isTarhibAdmin && !caller.companyId) return [];

    const roles = await this.roleRepo.find({
      where: isTarhibAdmin
        ? undefined
        : { companyId: caller.companyId, scope: RoleScope.CLIENT },
      relations: ['permissions', 'quotas'],
    });
    return roles.map(this.toDto);
  }

  async findOne(id: string): Promise<RoleDto> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions', 'quotas'],
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return this.toDto(role);
  }

  async create(dto: CreateRoleDto, caller: JwtPayload): Promise<RoleDto> {
    const isTarhibAdmin = caller.permissions?.includes('role.manage');

    if (dto.scope === RoleScope.TARHIB && !isTarhibAdmin) {
      throw new ForbiddenException(
        'Only Tarhib admins can create TARHIB roles',
      );
    }
    if (dto.scope === RoleScope.CLIENT && !dto.companyId) {
      // Un appelant sans affectation (superadmin) doit expliciter la société
      if (!caller.companyId) {
        throw new BadRequestException('companyRequiredForClientRole');
      }
      dto.companyId = caller.companyId;
    }

    const permissionKeys = dto.permissionKeys ?? [];
    const permissions = permissionKeys.length
      ? await this.permissionRepo.find({
          where: permissionKeys.map((key) => ({ key })),
        })
      : [];

    const quotas = dto.scope === RoleScope.CLIENT ? (dto.quotas ?? []) : [];

    const role = this.roleRepo.create({
      companyId: dto.companyId ?? null,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn?.trim() || null,
      scope: dto.scope,
      slaPriority: dto.slaPriority ?? SlaPriority.P5,
      isSystem: false,
      // Dérivé automatiquement : au moins 1 quota = quotas activés (pas de switch manuel)
      quotasEnabled: quotas.length > 0,
      permissions,
    });

    const saved = await this.roleRepo.save(role);
    saved.quotas = await this.replaceQuotas(saved, quotas);
    return this.toDto(saved);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDto> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions', 'quotas'],
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    // Les rôles système (internes seedés) restent modifiables — le superadmin
    // ajuste leurs permissions via la même page ; seule la suppression est
    // bloquée (voir remove) pour garder la base de rôles cohérente.

    if (dto.nameAr) role.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) role.nameEn = dto.nameEn?.trim() || null;
    if (dto.slaPriority) role.slaPriority = dto.slaPriority;

    if (dto.permissionKeys) {
      role.permissions = await this.permissionRepo.find({
        where: dto.permissionKeys.map((key) => ({ key })),
      });
    }

    if (dto.quotas && role.scope === RoleScope.CLIENT) {
      role.quotas = await this.replaceQuotas(role, dto.quotas);
      role.quotasEnabled = dto.quotas.length > 0;
    }

    const saved = await this.roleRepo.save(role);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    // Pas de notion de « rôle système » : tout rôle actuellement assigné à un
    // employé est protégé, qu'il ait été créé par défaut ou par un admin.
    const assignedCount = await this.employeeRepo.count({
      where: { roleId: id },
    });
    if (assignedCount > 0) {
      throw new BadRequestException('roleInUseCannotDelete');
    }
    await this.roleRepo.remove(role);
  }

  /** Remplace intégralement les quotas d'un rôle CLIENT. */
  private async replaceQuotas(
    role: Role,
    quotas: RoleQuotaInputDto[],
  ): Promise<RoleQuota[]> {
    if (role.scope !== RoleScope.CLIENT || !role.companyId) return [];

    await this.roleQuotaRepo.delete({ roleId: role.id });
    if (!quotas.length) return [];

    return this.roleQuotaRepo.save(
      quotas.map((q) =>
        this.roleQuotaRepo.create({
          roleId: role.id,
          companyId: role.companyId as string,
          productId: q.productId,
          periodType: q.periodType,
          maxQuantity: q.maxQuantity,
        }),
      ),
    );
  }

  private async syncQuotasEnabled(role: Role): Promise<void> {
    const count = await this.roleQuotaRepo.count({
      where: { roleId: role.id },
    });
    const enabled = count > 0;
    if (role.quotasEnabled !== enabled) {
      role.quotasEnabled = enabled;
      await this.roleRepo.save(role);
    }
  }

  async setQuota(
    roleId: string,
    callerCompanyId: string,
    dto: CreateRoleQuotaDto,
  ): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);

    const existing = await this.roleQuotaRepo.findOne({
      where: {
        roleId,
        productId: dto.productId,
        periodType: dto.periodType as QuotaPeriodType,
      },
    });

    if (existing) {
      existing.maxQuantity = dto.maxQuantity;
      await this.roleQuotaRepo.save(existing);
    } else {
      await this.roleQuotaRepo.save(
        this.roleQuotaRepo.create({
          roleId,
          companyId: role.companyId ?? callerCompanyId,
          productId: dto.productId,
          periodType: dto.periodType as QuotaPeriodType,
          maxQuantity: dto.maxQuantity,
        }),
      );
    }
    await this.syncQuotasEnabled(role);
  }

  async getQuotas(roleId: string): Promise<RoleQuota[]> {
    return this.roleQuotaRepo.find({ where: { roleId } });
  }

  async removeQuota(roleId: string, quotaId: string): Promise<void> {
    const quota = await this.roleQuotaRepo.findOne({
      where: { id: quotaId, roleId },
    });
    if (!quota) throw new NotFoundException(`Quota ${quotaId} not found`);
    await this.roleQuotaRepo.remove(quota);

    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role) await this.syncQuotasEnabled(role);
  }

  toDto = (role: Role): RoleDto => ({
    id: role.id,
    companyId: role.companyId,
    nameAr: role.nameAr,
    nameEn: role.nameEn,
    scope: role.scope,
    slaPriority: role.slaPriority,
    isSystem: role.isSystem,
    quotasEnabled: role.quotasEnabled,
    permissions: (role.permissions ?? []).map((p) => p.key),
    quotas: (role.quotas ?? []).map((q) => ({
      id: q.id,
      productId: q.productId,
      periodType: q.periodType,
      maxQuantity: q.maxQuantity,
    })),
    createdAt: role.createdAt?.toISOString?.() ?? String(role.createdAt),
    updatedAt: role.updatedAt?.toISOString?.() ?? String(role.updatedAt),
  });
}
