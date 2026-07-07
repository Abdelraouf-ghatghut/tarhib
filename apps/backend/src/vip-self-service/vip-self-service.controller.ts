import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { VipSelfServiceService } from './vip-self-service.service.js';
import {
  AddVipLocationProductDto,
  AdjustVipLocationProductDto,
  CreateVipLocationDto,
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
  @ApiOperation({
    summary:
      'Emplacements VIP — liste plate (1 ligne par produit, contrat mobile préservé)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiResponse({ status: 200, type: [VipLocationDto] })
  getLocations(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<VipLocationDto[]> {
    return this.service.getLocations(companyId, branchId, departmentId);
  }

  @Post('locations')
  @ApiOperation({
    summary:
      'Créer un lieu VIP avec un ou plusieurs produits initiaux (société/branche, optionnellement département et/ou employé)',
  })
  @ApiResponse({ status: 201, type: [VipLocationDto] })
  createLocation(@Body() dto: CreateVipLocationDto): Promise<VipLocationDto[]> {
    return this.service.createLocation(dto);
  }

  @Post('locations/:id/products')
  @ApiOperation({ summary: 'Ajouter un produit à un lieu VIP existant' })
  @ApiResponse({ status: 201, type: VipLocationDto })
  addProduct(
    @Param('id') id: string,
    @Body() dto: AddVipLocationProductDto,
  ): Promise<VipLocationDto> {
    return this.service.addProduct(id, dto);
  }

  @Delete('location-products/:id')
  @ApiOperation({ summary: "Retirer un produit d'un lieu VIP" })
  removeProduct(@Param('id') id: string): Promise<void> {
    return this.service.removeProduct(id);
  }

  @Patch('location-products/:id')
  @ApiOperation({
    summary: "Ajuster quantité/seuils d'un produit dans un lieu VIP",
  })
  @ApiResponse({ status: 200, type: VipLocationDto })
  adjustProduct(
    @Param('id') id: string,
    @Body() dto: AdjustVipLocationProductDto,
  ): Promise<VipLocationDto> {
    return this.service.adjustProduct(id, dto);
  }

  @Patch('locations/:id/replenish')
  @ApiOperation({
    summary:
      'Marquer un produit VIP comme réapprovisionné (id = VipLocationProduct, cf. mobile)',
  })
  @ApiResponse({ status: 200, type: VipLocationDto })
  replenishLocation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<VipLocationDto> {
    return this.service.replenishLocation(id, user.sub);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Tâches de réapprovisionnement VIP' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: VipTaskStatus })
  @ApiResponse({ status: 200, type: [VipReplenishmentTaskDto] })
  getTasks(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: VipTaskStatus,
  ): Promise<VipReplenishmentTaskDto[]> {
    return this.service.getTasks(companyId, branchId, status);
  }

  @Patch('tasks/:id/complete')
  @ApiOperation({ summary: 'Marquer une tâche de réappro VIP comme complétée' })
  @ApiResponse({ status: 200, type: VipReplenishmentTaskDto })
  completeTask(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<VipReplenishmentTaskDto> {
    return this.service.completeTask(id, user.sub);
  }
}
