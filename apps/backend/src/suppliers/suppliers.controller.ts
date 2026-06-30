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
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto, SupplierDto } from './dto/supplier.dto.js';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un fournisseur' })
  @ApiResponse({ status: 201, type: SupplierDto })
  create(@Body() dto: CreateSupplierDto): Promise<SupplierDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les fournisseurs' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 200, type: [SupplierDto] })
  findAll(@Query('companyId') companyId?: string): Promise<SupplierDto[]> {
    return this.service.findAll(companyId);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: SupplierDto })
  findOne(@Param('id') id: string): Promise<SupplierDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, type: SupplierDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupplierDto>,
  ): Promise<SupplierDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
