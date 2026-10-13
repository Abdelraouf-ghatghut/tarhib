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
      'Lister les commandes (filtrable par companyId / employeeId / status)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, type: [OrderDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ): Promise<OrderDto[]> {
    return this.ordersService.findAll(companyId, employeeId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une commande par ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Changer le statut (transitions selon rôle RBAC)' })
  @ApiResponse({ status: 200, type: OrderDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderDto> {
    return this.ordersService.updateStatus(id, dto.status, user);
  }
}
