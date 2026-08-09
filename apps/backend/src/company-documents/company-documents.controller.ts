import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import {
  ContractDocumentService,
  type ContractUpload,
} from '../hr/contract-document.service.js';
import { CompanyDocumentsService } from './company-documents.service.js';
import {
  CompanyDocumentDto,
  CreateCompanyDocumentDto,
} from './dto/company-document.dto.js';

@ApiTags('company-documents')
@Controller('company-documents')
@RequirePermission('company.manage')
export class CompanyDocumentsController {
  constructor(
    private readonly service: CompanyDocumentsService,
    private readonly documents: ContractDocumentService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: [CompanyDocumentDto] })
  findAll(): Promise<CompanyDocumentDto[]> {
    return this.service.findAll();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'file'],
      properties: {
        name: { type: 'string', example: 'عقد التأسيس' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async create(
    @Body() dto: CreateCompanyDocumentDto,
    @UploadedFile() file: ContractUpload,
  ): Promise<CompanyDocumentDto> {
    const id = randomUUID();
    const reference = await this.documents.store(id, file);
    try {
      return await this.service.create(id, dto.name, reference);
    } catch (err) {
      await this.documents.remove(reference);
      throw err;
    }
  }

  @Get(':id/file')
  async read(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const entity = await this.service.findEntity(id);
    const document = await this.documents.read(entity.documentRef);
    response.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `inline; filename="company-document-${id}.${document.extension}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(document.buffer);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    const entity = await this.service.remove(id);
    await this.documents.remove(entity.documentRef);
  }
}
