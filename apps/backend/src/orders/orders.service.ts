import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateOrderDto, OrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  create(_dto: CreateOrderDto): Promise<OrderDto> {
    throw new NotImplementedException();
  }

  findAll(): Promise<OrderDto[]> {
    throw new NotImplementedException();
  }

  findOne(_id: string): Promise<OrderDto> {
    throw new NotImplementedException();
  }
}
