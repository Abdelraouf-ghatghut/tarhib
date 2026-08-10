import { ReportingController } from './reporting.controller.js';
import type { ExecutiveReport, ReportingService } from './reporting.service.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import type { Request } from 'express';

const makeReport = (): ExecutiveReport => ({
  kpis: {
    companiesCount: 1,
    branchesCount: 2,
    clientEmployeesCount: 10,
    ordersCount: 5,
    deliveredCount: 3,
    pendingCount: 1,
    rejectedCount: 1,
    slaComplianceRate: 90,
    avgDeliveryMinutes: 20,
    totalStockValue: 12345.67,
    outOfStockCount: 4,
    purchasingSpend: 9999.99,
    fulfillmentRate: 75,
    medianDeliveryMinutes: 18,
    p90DeliveryMinutes: 35,
    purchaseCostPerDeliveredOrder: 12.5,
  },
  ordersTrend: [],
  slaTrend: [],
  ordersBreakdown: [],
  topCompanies: [],
  topProducts: [],
});

function makeReq(permissions: string[]): Request & { user: JwtPayload } {
  return { user: { permissions } } as unknown as Request & {
    user: JwtPayload;
  };
}

describe('ReportingController.getExecutiveReport — redaction des coûts (§4 CLAUDE.md)', () => {
  let service: { getExecutiveReport: jest.Mock };
  let controller: ReportingController;

  beforeEach(() => {
    service = { getExecutiveReport: jest.fn().mockResolvedValue(makeReport()) };
    controller = new ReportingController(
      service as unknown as ReportingService,
    );
  });

  it('strips monetary KPIs when the caller lacks procurement.cost.view and company.manage', async () => {
    const result = await controller.getExecutiveReport(
      makeReq(['report.view']),
    );
    expect(result.kpis.totalStockValue).toBe(0);
    expect(result.kpis.outOfStockCount).toBe(0);
    expect(result.kpis.purchasingSpend).toBe(0);
    // Le reste des KPIs (non monétaires) reste intact
    expect(result.kpis.ordersCount).toBe(5);
  });

  it('keeps monetary KPIs for a caller with procurement.cost.view', async () => {
    const result = await controller.getExecutiveReport(
      makeReq(['report.view', 'procurement.cost.view']),
    );
    expect(result.kpis.totalStockValue).toBe(12345.67);
    expect(result.kpis.purchasingSpend).toBe(9999.99);
  });

  it('keeps monetary KPIs for a caller with company.manage', async () => {
    const result = await controller.getExecutiveReport(
      makeReq(['company.manage']),
    );
    expect(result.kpis.totalStockValue).toBe(12345.67);
  });
});

describe('ReportingController — plafond de plage from/to (PR-1.5)', () => {
  let service: {
    getExecutiveReport: jest.Mock;
    getOrdersReport: jest.Mock;
    getSlaReport: jest.Mock;
  };
  let controller: ReportingController;

  beforeEach(() => {
    service = {
      getExecutiveReport: jest.fn().mockResolvedValue(makeReport()),
      getOrdersReport: jest.fn().mockResolvedValue({}),
      getSlaReport: jest.fn().mockResolvedValue({}),
    };
    controller = new ReportingController(
      service as unknown as ReportingService,
    );
  });

  it('rejects a range spanning more than 400 days', () => {
    // assertReportPeriod lève de façon synchrone (pas async) — un throw
    // pendant l'appel lui-même, pas une promesse rejetée.
    expect(() =>
      controller.getOrdersReport(
        makeReq(['report.view']),
        undefined,
        undefined,
        '2020-01-01',
        '2022-01-01',
      ),
    ).toThrow('reportPeriodTooLong');
    expect(service.getOrdersReport).not.toHaveBeenCalled();
  });

  it('rejects to before from', () => {
    expect(() =>
      controller.getSlaReport(
        makeReq(['report.view']),
        undefined,
        undefined,
        '2026-06-01',
        '2026-01-01',
      ),
    ).toThrow('reportPeriodToBeforeFrom');
  });

  it('allows a range within the cap', async () => {
    await expect(
      controller.getExecutiveReport(
        makeReq(['report.view']),
        undefined,
        undefined,
        '2026-01-01',
        '2026-06-01',
      ),
    ).resolves.toBeDefined();
  });

  it('allows an open-ended range (no from or no to)', async () => {
    await expect(
      controller.getOrdersReport(
        makeReq(['report.view']),
        undefined,
        undefined,
        '2020-01-01',
        undefined,
      ),
    ).resolves.toBeDefined();
  });

  it('forwards branch scope to the SLA service', async () => {
    await controller.getSlaReport(
      makeReq(['report.view']),
      'co-1',
      'br-1',
      '2026-01-01',
      '2026-01-31',
    );
    expect(service.getSlaReport).toHaveBeenCalledWith('co-1', {
      branchId: 'br-1',
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });
});
