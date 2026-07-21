import {
  Body,
  Controller,
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
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import { CreateOrderDto, OrderDto } from './dto/order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une commande — déclenche le moteur de validation §3.3',
  })
  @ApiResponse({ status: 201, type: OrderDto })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderDto> {
    return this.ordersService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lister les commandes (filtrable par companyId / branchId / employeeId / status, paginé)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, description: 'Défaut 1' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Défaut 200, max 500',
  })
  @ApiResponse({ status: 200, type: [OrderDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<OrderDto[]> {
    const scope = constrainRequestedScope(user!, { companyId, branchId });
    return this.ordersService.findAll(
      scope.companyId,
      employeeId,
      status,
      scope.branchId,
      Number(page) || 1,
      Math.min(Number(limit) || 200, 500),
    );
  }

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Statistiques Operations pour le dashboard manager',
  })
  dashboardStats(@CurrentUser() user: JwtPayload) {
    return this.ordersService.dashboardStats(user);
  }

  @Get('me')
  @ApiOperation({
    summary: "Commandes de l'appelant (filtre employeeId imposé côté serveur)",
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, type: [OrderDto] })
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ): Promise<OrderDto[]> {
    return this.ordersService.findMine(user, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une commande par ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderDto> {
    const order = await this.ordersService.findOne(id);
    assertResourceScope(user, order);
    return order;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Changer le statut (transitions selon rôle RBAC)' })
  @ApiResponse({ status: 200, type: OrderDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderDto> {
    return this.ordersService.updateStatus(id, dto.status, user, dto.reason);
  }
}
