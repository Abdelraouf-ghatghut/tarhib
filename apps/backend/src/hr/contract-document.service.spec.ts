import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ContractDocumentService } from './contract-document.service.js';

describe('ContractDocumentService', () => {
  let root: string;
  let service: ContractDocumentService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'tarhib-contracts-'));
    service = new ContractDocumentService({
      get: jest.fn().mockReturnValue(root),
    } as unknown as ConfigService);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('stores a PDF compressed and restores the original bytes', async () => {
    const buffer = Buffer.from('%PDF-1.7\n' + 'contract scan\n'.repeat(100));
    const reference = await service.store(
      '11111111-1111-1111-1111-111111111111',
      {
        buffer,
        size: buffer.length,
      },
    );

    expect(reference).toMatch(/^contract-document:.*\.pdf\.gz$/);
    const document = await service.read(reference);
    expect(document.contentType).toBe('application/pdf');
    expect(document.buffer).toEqual(buffer);
  });

  it('rejects content whose signature is not PDF, JPEG or PNG', async () => {
    const buffer = Buffer.from('<script>alert(1)</script>');
    await expect(
      service.store('11111111-1111-1111-1111-111111111111', {
        buffer,
        size: buffer.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes the private compressed object', async () => {
    const buffer = Buffer.from('%PDF-1.7\ntest');
    const reference = await service.store(
      '11111111-1111-1111-1111-111111111111',
      {
        buffer,
        size: buffer.length,
      },
    );
    const relative = reference.replace('contract-document:', '');

    await service.remove(reference);

    await expect(stat(join(root, relative))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
