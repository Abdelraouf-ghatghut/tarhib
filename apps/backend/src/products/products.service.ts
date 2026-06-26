import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateProductDto, ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  create(_dto: CreateProductDto): Promise<ProductDto> {
    throw new NotImplementedException();
  }

  findAll(): Promise<ProductDto[]> {
    throw new NotImplementedException();
  }

  findOne(_id: string): Promise<ProductDto> {
    throw new NotImplementedException();
  }

  update(_id: string, _dto: Partial<CreateProductDto>): Promise<ProductDto> {
    throw new NotImplementedException();
  }

  remove(_id: string): Promise<void> {
    throw new NotImplementedException();
  }
}
