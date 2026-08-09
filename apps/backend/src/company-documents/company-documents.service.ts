import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { CompanyDocument } from './entities/company-document.entity.js';
import { CompanyDocumentDto } from './dto/company-document.dto.js';

@Injectable()
export class CompanyDocumentsService {
  constructor(
    @InjectRepository(CompanyDocument)
    private readonly repo: Repository<CompanyDocument>,
  ) {}

  async create(
    id: string,
    name: string,
    documentReference: string,
  ): Promise<CompanyDocumentDto> {
    const entity = this.repo.create({
      id: id || randomUUID(),
      name: name.trim(),
      documentRef: documentReference,
    });
    return this.toDto(await this.repo.save(entity));
  }

  async findAll(): Promise<CompanyDocumentDto[]> {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toDto(row));
  }

  async findEntity(id: string): Promise<CompanyDocument> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('companyDocumentNotFound');
    return entity;
  }

  async remove(id: string): Promise<CompanyDocument> {
    const entity = await this.findEntity(id);
    await this.repo.remove(entity);
    return entity;
  }

  private toDto(entity: CompanyDocument): CompanyDocumentDto {
    return {
      id: entity.id,
      name: entity.name,
      documentUrl: `/company-documents/${entity.id}/file`,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
