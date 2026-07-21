import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import { VipSelfServiceService } from './vip-self-service.service.js';
import {
  AddVipLocationProductDto,
  AdjustVipLocationProductDto,
  CreateVipLocationDto,
  ReplenishSourceDto,
  VipLocationDto,
  VipReplenishmentTaskDto,
} from './dto/vip-self-service.dto.js';
import { VipTaskStatus } from './entities/vip-replenishment-task.entity.js';

@ApiTags('vip-self-service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vip-self-service')
export class VipSelfServiceController {
  constructor(private readonly service: VipSelfServiceService) {}

  @Get('locations')
  @RequireAnyPermission('vip.location.view', 'vip.view', 'vip.manage')
  @ApiOperation({
    summary:
      'Emplacements VIP — liste plate (1 ligne par produit, contrat mobile préservé)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiResponse({ status: 200, type: [VipLocationDto] })
  getLocations(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<VipLocationDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.service.getLocations(
      scope.companyId,
      scope.branchId,
      departmentId,
    );
  }

  @Post('locations')
  @RequireAnyPermission('vip.location.manage', 'vip.manage')
  @ApiOperation({
    summary:
      'Créer un lieu VIP avec un ou plusieurs produits initiaux (société/branche, optionnellement département et/ou employé)',
  })
  @ApiResponse({ status: 201, type: [VipLocationDto] })
  createLocation(
    @Body() dto: CreateVipLocationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VipLocationDto[]> {
    assertResourceScope(user, dto);
    return this.service.createLocation(dto);
  }

  @Post('locations/:id/products')
  @RequireAnyPermission('vip.location.manage', 'vip.manage')
  @ApiOperation({ summary: 'Ajouter un produit à un lieu VIP existant' })
  @ApiResponse({ status: 201, type: VipLocationDto })
  async addProduct(
    @Param('id') id: string,
    @Body() dto: AddVipLocationProductDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VipLocationDto> {
    assertResourceScope(user, await this.service.getLocationScope(id));
    return this.service.addProduct(id, dto);
  }

  @Delete('location-products/:id')
  @RequireAnyPermission('vip.location.manage', 'vip.manage')
  @HttpCode(204)
  @ApiOperation({ summary: "Retirer un produit d'un lieu VIP" })
  async removeProduct(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    assertResourceScope(user, await this.service.getLocationProductScope(id));
    return this.service.removeProduct(id);
  }

  @Patch('location-products/:id')
  @RequireAnyPermission('vip.location.manage', 'vip.manage')
  @ApiOperation({
    summary: "Ajuster quantité/seuils d'un produit dans un lieu VIP",
  })
  @ApiResponse({ status: 200, type: VipLocationDto })
  async adjustProduct(
    @Param('id') id: string,
    @Body() dto: AdjustVipLocationProductDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VipLocationDto> {
    assertResourceScope(user, await this.service.getLocationProductScope(id));
    return this.service.adjustProduct(id, dto);
  }

  @Patch('locations/:id/replenish')
  @RequireAnyPermission('vip.task.complete', 'vip.manage')
  @ApiOperation({
    summary:
      'Marquer un produit VIP comme réapprovisionné (id = VipLocationProduct, cf. mobile)',
  })
  @ApiResponse({ status: 200, type: VipLocationDto })
  async replenishLocation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto?: ReplenishSourceDto,
  ): Promise<VipLocationDto> {
    assertResourceScope(user, await this.service.getLocationProductScope(id));
    return this.service.replenishLocation(
      id,
      user.sub,
      user.permissions,
      dto?.sourceZone,
    );
  }

  @Get('tasks')
  @RequireAnyPermission('vip.task.view', 'vip.view', 'vip.manage')
  @ApiOperation({ summary: 'Tâches de réapprovisionnement VIP' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: VipTaskStatus })
  @ApiResponse({ status: 200, type: [VipReplenishmentTaskDto] })
  getTasks(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: VipTaskStatus,
  ): Promise<VipReplenishmentTaskDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.service.getTasks(scope.companyId, scope.branchId, status);
  }

  @Patch('tasks/:id/complete')
  @RequireAnyPermission('vip.task.complete', 'vip.manage')
  @ApiOperation({ summary: 'Marquer une tâche de réappro VIP comme complétée' })
  @ApiResponse({ status: 200, type: VipReplenishmentTaskDto })
  async completeTask(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto?: ReplenishSourceDto,
  ): Promise<VipReplenishmentTaskDto> {
    assertResourceScope(user, await this.service.getTaskScope(id));
    return this.service.completeTask(
      id,
      user.sub,
      user.permissions,
      dto?.sourceZone,
    );
  }
}
