import {
  Controller,
  Get,
  Param,
  Patch,
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
      'Emplacements VIP (produits LIBRE_SERVICE_VIP avec niveau de stock)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, type: [VipLocationDto] })
  getLocations(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<VipLocationDto[]> {
    return this.service.getLocations(companyId, branchId);
  }

  @Patch('locations/:id/replenish')
  @ApiOperation({ summary: 'Marquer un emplacement VIP comme réapprovisionné' })
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
