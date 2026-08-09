import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanyDocumentsService } from './company-documents.service.js';
import { CompanyDocument } from './entities/company-document.entity.js';

const repo = {
  create: jest.fn((value: unknown) => value),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

describe('CompanyDocumentsService', () => {
  let service: CompanyDocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CompanyDocumentsService,
        { provide: getRepositoryToken(CompanyDocument), useValue: repo },
      ],
    }).compile();
    service = module.get(CompanyDocumentsService);
  });

  it('creates a named document with a private download route', async () => {
    const now = new Date('2026-08-09T00:00:00Z');
    repo.save.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'عقد التأسيس',
      documentRef: 'contract-document:private',
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.create(
      '11111111-1111-1111-1111-111111111111',
      '  عقد التأسيس  ',
      'contract-document:private',
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'عقد التأسيس' }),
    );
    expect(result.documentUrl).toBe(
      '/company-documents/11111111-1111-1111-1111-111111111111/file',
    );
  });

  it('rejects an unknown document', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findEntity('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
