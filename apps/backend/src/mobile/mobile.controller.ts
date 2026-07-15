import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { QuotasService } from '../quotas/quotas.service.js';

export interface MobileQuotaDto {
  productId: string;
  maxQuantity: number;
  usedQuantity: number;
  remaining: number;
}

@ApiTags('mobile')
@ApiBearerAuth()
@Controller('mobile')
export class MobileController {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly accessPolicy: AccessPolicyService,
    private readonly quotasService: QuotasService,
  ) {}

  @Get('quotas')
  @ApiOperation({
    summary:
      'Quotas restants du caller par produit (affichage catalogue employé)',
  })
  async myQuotas(@CurrentUser() user: JwtPayload): Promise<MobileQuotaDto[]> {
    const snapshots = await this.quotasService.snapshotsFor(user);
    return snapshots.map((s) => ({
      productId: s.productId,
      maxQuantity: s.maxQuantity,
      usedQuantity: s.usedQuantity,
      remaining: Math.max(s.maxQuantity - s.usedQuantity, 0),
    }));
  }

  @Get('me')
  @ApiOperation({ summary: 'Current mobile client profile, roles and modules' })
  async me(@CurrentUser() user: JwtPayload) {
    const employee = await this.findEmployee(user);
    return this.accessPolicy.resolve(employee);
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Current mobile client capabilities only' })
  async capabilities(@CurrentUser() user: JwtPayload) {
    const employee = await this.findEmployee(user);
    const access = await this.accessPolicy.resolve(employee);
    return {
      capabilities: access.capabilities,
      modules: access.modules,
      permissions: access.permissions,
      dataScope: access.dataScope,
    };
  }

  private async findEmployee(user: JwtPayload): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: [{ keycloakId: user.sub }, { id: user.sub }],
      // company/branch : noms affichés sur l'écran profil de l'app Employee.
      relations: ['additionalRoles', 'company', 'branch'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }
}
