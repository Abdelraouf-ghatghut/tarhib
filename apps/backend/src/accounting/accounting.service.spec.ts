import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service.js';
import { ChartOfAccount } from './entities/chart-of-account.entity.js';
import {
  JournalEntry,
  JournalEntrySource,
  JournalEntryStatus,
} from './entities/journal-entry.entity.js';
import { JournalEntryLine } from './entities/journal-entry-line.entity.js';
import { FiscalYear, FiscalYearStatus } from './entities/fiscal-year.entity.js';
import { ExpenseCategory } from '../finance/entities/finance-expense.entity.js';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
  delete: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(),
});

const makeQb = (rows: Record<string, unknown>[]) => ({
  innerJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue(rows),
});

// Comptes seedés utilisés par les tests (id = code pour simplifier les
// assertions).
const accountByCode = (code: string) => ({ id: code, code });

describe('AccountingService', () => {
  let service: AccountingService;
  let accountRepo: ReturnType<typeof mockRepo>;
  let entryRepo: ReturnType<typeof mockRepo>;
  let lineRepo: ReturnType<typeof mockRepo>;
  let fiscalYearRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: getRepositoryToken(ChartOfAccount), useFactory: mockRepo },
        { provide: getRepositoryToken(JournalEntry), useFactory: mockRepo },
        {
          provide: getRepositoryToken(JournalEntryLine),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(FiscalYear), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(AccountingService);
    accountRepo = module.get(getRepositoryToken(ChartOfAccount));
    entryRepo = module.get(getRepositoryToken(JournalEntry));
    lineRepo = module.get(getRepositoryToken(JournalEntryLine));
    fiscalYearRepo = module.get(getRepositoryToken(FiscalYear));

    accountRepo.findOne.mockImplementation(
      ({ where: { code } }: { where: { code: string } }) =>
        Promise.resolve(accountByCode(code)),
    );
    fiscalYearRepo.findOne.mockResolvedValue({
      id: 'fy-2026',
      year: 2026,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: FiscalYearStatus.OPEN,
    });
  });

  describe('postEntry — partie double', () => {
    it('rejects an entry whose debits and credits do not balance', async () => {
      await expect(
        service.postEntry({
          date: '2026-07-01',
          label: 'Test',
          source: JournalEntrySource.MANUAL,
          lines: [
            { accountId: 'a1', debit: 100 },
            { accountId: 'a2', credit: 50 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a balanced entry and generates a sequential reference', async () => {
      entryRepo.count.mockResolvedValue(4);
      const entry = await service.postEntry({
        date: '2026-07-01',
        label: 'Test',
        source: JournalEntrySource.MANUAL,
        lines: [
          { accountId: 'a1', debit: 100 },
          { accountId: 'a2', credit: 100 },
        ],
      });
      expect(entry.reference).toBe('JE-2026-000005');
    });

    it('rejects posting into a closed fiscal year', async () => {
      fiscalYearRepo.findOne.mockResolvedValue({
        id: 'fy-2026',
        year: 2026,
        status: FiscalYearStatus.CLOSED,
      });

      await expect(
        service.postEntry({
          date: '2026-07-01',
          label: 'Test',
          source: JournalEntrySource.MANUAL,
          lines: [
            { accountId: 'a1', debit: 100 },
            { accountId: 'a2', credit: 100 },
          ],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('validateDraftEntry', () => {
    it('posts a draft entry and rejects a non-draft one', async () => {
      entryRepo.findOne.mockResolvedValue({
        id: 'je-1',
        status: JournalEntryStatus.DRAFT,
        lines: [],
      });
      const result = await service.validateDraftEntry('je-1', 'actor-1');
      expect(result.status).toBe(JournalEntryStatus.POSTED);

      entryRepo.findOne.mockResolvedValue({
        id: 'je-2',
        status: JournalEntryStatus.POSTED,
        lines: [],
      });
      await expect(
        service.validateDraftEntry('je-2', 'actor-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('closeFiscalYear', () => {
    it('prepares a DRAFT tax entry and does not close when the year is profitable', async () => {
      fiscalYearRepo.findOne.mockResolvedValue({
        id: 'fy-2026',
        year: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: FiscalYearStatus.OPEN,
      });
      entryRepo.findOne
        .mockResolvedValueOnce(null) // no prior TAX entry
        .mockResolvedValue(null);
      lineRepo.createQueryBuilder.mockReturnValue(
        makeQb([
          {
            accountId: '706000',
            code: '706000',
            label: 'Ventes',
            type: 'REVENUE',
            totalDebit: '0',
            totalCredit: '10000',
          },
          {
            accountId: '606100',
            code: '606100',
            label: 'Loyers',
            type: 'EXPENSE',
            totalDebit: '4000',
            totalCredit: '0',
          },
        ]),
      );

      const result = await service.closeFiscalYear(2026, 'actor-1');

      expect(result.draftTaxEntry).not.toBeNull();
      expect(result.draftTaxEntry?.status).toBe(JournalEntryStatus.DRAFT);
      // Résultat net = 10000 - 4000 = 6000 → impôt 20% + 4% = 24% = 1440
      expect(
        result.draftTaxEntry?.lines.find((l) => l.accountId === '695000')
          ?.debit,
      ).toBe(1440);
      expect(fiscalYearRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: FiscalYearStatus.CLOSED }),
      );
    });

    it('closes once the tax entry has been validated (POSTED)', async () => {
      fiscalYearRepo.findOne.mockResolvedValue({
        id: 'fy-2026',
        year: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: FiscalYearStatus.OPEN,
      });
      entryRepo.findOne.mockResolvedValue({
        id: 'je-tax',
        status: JournalEntryStatus.POSTED,
        lines: [],
      });

      const result = await service.closeFiscalYear(2026, 'actor-1');

      expect(result.draftTaxEntry).toBeNull();
      expect(fiscalYearRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FiscalYearStatus.CLOSED }),
      );
    });

    it('closes immediately when the year is not profitable (no tax entry)', async () => {
      fiscalYearRepo.findOne.mockResolvedValue({
        id: 'fy-2026',
        year: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: FiscalYearStatus.OPEN,
      });
      entryRepo.findOne.mockResolvedValue(null);
      lineRepo.createQueryBuilder.mockReturnValue(
        makeQb([
          {
            accountId: '706000',
            code: '706000',
            label: 'Ventes',
            type: 'REVENUE',
            totalDebit: '0',
            totalCredit: '1000',
          },
          {
            accountId: '606100',
            code: '606100',
            label: 'Loyers',
            type: 'EXPENSE',
            totalDebit: '4000',
            totalCredit: '0',
          },
        ]),
      );

      const result = await service.closeFiscalYear(2026, 'actor-1');

      expect(result.draftTaxEntry).toBeNull();
      expect(entryRepo.save).not.toHaveBeenCalled();
      expect(fiscalYearRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FiscalYearStatus.CLOSED }),
      );
    });

    it('rejects closing an already-closed fiscal year', async () => {
      fiscalYearRepo.findOne.mockResolvedValue({
        id: 'fy-2026',
        year: 2026,
        status: FiscalYearStatus.CLOSED,
      });
      await expect(
        service.closeFiscalYear(2026, 'actor-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('reopenFiscalYear', () => {
    it('resets a closed fiscal year back to OPEN', async () => {
      fiscalYearRepo.findOne.mockResolvedValue({
        id: 'fy-2026',
        year: 2026,
        status: FiscalYearStatus.CLOSED,
        closedAt: new Date(),
        closedBy: 'actor-1',
      });
      const result = await service.reopenFiscalYear(2026);
      expect(result.status).toBe(FiscalYearStatus.OPEN);
      expect(result.closedAt).toBeNull();
    });
  });

  describe('postExpenseEntry — pont Finance', () => {
    it('debits the category account and credits Banque when paid', async () => {
      await service.postExpenseEntry({
        id: 'exp-1',
        category: ExpenseCategory.RENT,
        amount: 500,
        expenseDate: '2026-07-01',
        paid: true,
      });

      expect(entryRepo.delete).toHaveBeenCalledWith({
        source: JournalEntrySource.EXPENSE,
        sourceId: 'exp-1',
      });
      const saved = entryRepo.save.mock.calls[0][0] as {
        lines: Array<{ accountId: string; debit: number; credit: number }>;
      };
      expect(saved.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ accountId: '606100', debit: 500 }),
          expect.objectContaining({ accountId: '512000', credit: 500 }),
        ]),
      );
    });

    it('credits Personnel à payer for an unpaid SALARIES expense', async () => {
      await service.postExpenseEntry({
        id: 'exp-2',
        category: ExpenseCategory.SALARIES,
        amount: 3000,
        expenseDate: '2026-07-01',
        paid: false,
      });

      const saved = entryRepo.save.mock.calls[0][0] as {
        lines: Array<{ accountId: string; debit: number; credit: number }>;
      };
      expect(saved.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ accountId: '641000', debit: 3000 }),
          expect.objectContaining({ accountId: '421000', credit: 3000 }),
        ]),
      );
    });

    it('reverses debit/credit sides for a negative amount (contre-passation)', async () => {
      await service.postExpenseEntry({
        id: 'exp-3',
        category: ExpenseCategory.RENT,
        amount: -500,
        expenseDate: '2026-07-01',
        paid: true,
      });

      const saved = entryRepo.save.mock.calls[0][0] as {
        lines: Array<{ accountId: string; debit: number; credit: number }>;
      };
      expect(saved.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ accountId: '606100', credit: 500 }),
          expect.objectContaining({ accountId: '512000', debit: 500 }),
        ]),
      );
    });

    it('never throws even when the fiscal year is closed (fire-and-forget)', async () => {
      fiscalYearRepo.findOne.mockResolvedValue({
        id: 'fy-2026',
        year: 2026,
        status: FiscalYearStatus.CLOSED,
      });

      await expect(
        service.postExpenseEntry({
          id: 'exp-4',
          category: ExpenseCategory.RENT,
          amount: 500,
          expenseDate: '2026-07-01',
          paid: true,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('postContractStampDuty', () => {
    it('posts 1% of the contract amount', async () => {
      await service.postContractStampDuty({
        id: 'contract-1',
        amount: 50000,
        startDate: '2026-07-01',
      });

      const saved = entryRepo.save.mock.calls[0][0] as {
        lines: Array<{ accountId: string; debit: number; credit: number }>;
      };
      expect(saved.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ accountId: '627000', debit: 500 }),
          expect.objectContaining({ accountId: '447000', credit: 500 }),
        ]),
      );
    });

    it('does nothing for a zero-amount contract', async () => {
      await service.postContractStampDuty({
        id: 'contract-2',
        amount: 0,
        startDate: '2026-07-01',
      });
      expect(entryRepo.save).not.toHaveBeenCalled();
    });
  });
});
