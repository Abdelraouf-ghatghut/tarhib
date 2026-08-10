/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { ConflictException } from '@nestjs/common';
import { InvoicePdfService } from './invoice-pdf.service.js';

const repository = () => ({
  findOne: jest.fn(),
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => ({ id: 'document-id', ...value })),
});

describe('InvoicePdfService', () => {
  const invoices = repository();
  const documents = repository();
  const companies = repository();
  const config = { get: jest.fn() };
  const service = new InvoicePdfService(
    invoices as never,
    documents as never,
    companies as never,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns the immutable generated document when it already exists', async () => {
    const existing = { id: 'existing', content: Buffer.from('pdf') };
    documents.findOne.mockResolvedValue(existing);
    await expect(service.getOrGenerate('invoice-id', 'ar')).resolves.toBe(
      existing,
    );
    expect(invoices.findOne).not.toHaveBeenCalled();
  });

  it('refuses to freeze a draft invoice', async () => {
    documents.findOne.mockResolvedValue(null);
    invoices.findOne.mockResolvedValue({ id: 'invoice-id', status: 'DRAFT' });
    await expect(
      service.getOrGenerate('invoice-id', 'en'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('generates, hashes and stores an issued invoice in English', async () => {
    documents.findOne.mockResolvedValue(null);
    invoices.findOne.mockResolvedValue({
      id: 'invoice-id',
      number: 'INV-2026-001',
      companyId: 'company-id',
      status: 'ISSUED',
      issueDate: '2026-08-01',
      dueDate: '2026-08-31',
      serviceFrom: '2026-08-01',
      serviceTo: '2026-08-31',
      currency: 'SAR',
      lines: [
        { description: 'Hospitalite', quantity: 2, unitPrice: 50, discount: 0 },
      ],
      subtotal: 100,
      taxAmount: 15,
      totalAmount: 115,
      paidAmount: 0,
    });
    companies.findOne.mockResolvedValue({
      nameAr: 'Customer',
      nameEn: 'Customer',
    });
    const result = await service.getOrGenerate('invoice-id', 'en', 'user-id');
    expect(result.fileName).toBe('INV-2026-001-en.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Buffer.isBuffer(result.content)).toBe(true);
    expect(result.content.subarray(0, 4).toString()).toBe('%PDF');
    expect(result.generatedBy).toBe('user-id');
  });
});
