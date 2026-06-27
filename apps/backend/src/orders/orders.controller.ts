import {
  Body,
  Controller,
  Get,
  Param,
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
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CreateOrderDto, OrderDto } from './dto/order.dto.js';
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
    summary: 'Lister les commandes (filtrable par companyId / employeeId)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, type: [OrderDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<OrderDto[]> {
    return this.ordersService.findAll(companyId, employeeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une commande par ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.ordersService.findOne(id);
  }
}
