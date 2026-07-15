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
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { constrainRequestedScope } from '../common/access/request-scope.js';
import { OrderDto, OrderStatus } from '../orders/dto/order.dto.js';
import { OrdersService } from '../orders/orders.service.js';

@ApiTags('kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('queue')
  @RequireAnyPermission(
    'order.queue.view',
    'order.prepare',
    'order.queue.manage',
  )
  @ApiOperation({
    summary: "File d'attente cuisine — commandes APPROVED + IN_PROGRESS",
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 200, type: [OrderDto] })
  async getKitchenQueue(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ): Promise<OrderDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    const [approved, inProgress] = await Promise.all([
      this.ordersService.findAll(
        scope.companyId,
        undefined,
        OrderStatus.APPROVED,
      ),
      this.ordersService.findAll(
        scope.companyId,
        undefined,
        OrderStatus.IN_PROGRESS,
      ),
    ]);

    const combined = [...approved, ...inProgress].filter(
      (o) => !scope.branchId || o.branchId === scope.branchId,
    );

    // Trier par SLA croissant (commandes urgentes en premier)
    combined.sort(
      (a, b) =>
        new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime(),
    );

    return combined;
  }

  @Patch('orders/:id/start')
  @RequireAnyPermission('order.prepare')
  @ApiOperation({
    summary: 'Cuisinier — démarrer la préparation (APPROVED → IN_PROGRESS)',
  })
  @ApiResponse({ status: 200, type: OrderDto })
  startPreparation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderDto> {
    return this.ordersService.updateStatus(id, OrderStatus.IN_PROGRESS, user);
  }

  @Patch('orders/:id/ready')
  @RequireAnyPermission('order.prepare')
  @ApiOperation({ summary: 'Cuisinier — marquer prête (IN_PROGRESS → READY)' })
  @ApiResponse({ status: 200, type: OrderDto })
  markReady(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderDto> {
    return this.ordersService.updateStatus(id, OrderStatus.READY, user);
  }
}
