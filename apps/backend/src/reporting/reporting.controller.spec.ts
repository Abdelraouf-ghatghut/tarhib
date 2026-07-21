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
