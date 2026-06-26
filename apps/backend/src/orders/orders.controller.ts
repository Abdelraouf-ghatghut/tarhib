import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto, OrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une commande (déclenche le moteur de validation)' })
  @ApiResponse({ status: 201, type: OrderDto })
  create(@Body() dto: CreateOrderDto): Promise<OrderDto> {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les commandes' })
  @ApiResponse({ status: 200, type: [OrderDto] })
  findAll(): Promise<OrderDto[]> {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une commande par ID' })
  @ApiResponse({ status: 200, type: OrderDto })
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.ordersService.findOne(id);
  }
}
