import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { AccountingService } from '../accounting/accounting.service.js';
import { FinanceAccount } from '../finance/entities/finance-account.entity.js';
import { FinanceExpense } from '../finance/entities/finance-expense.entity.js';
import { RoomBooking } from '../meeting-rooms/entities/room-booking.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderLine } from '../orders/entities/order-line.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import {
  CreateBudgetDto,
  CreateCostSnapshotDto,
  CreateFeedbackDto,
  CreateInvoiceDto,
  GenerateForecastDto,
  RecordPaymentDto,
  SetAttendanceDto,
} from './dto/performance.dto.js';
import {
  AttendanceStatus,
  BillingInvoice,
  BillingPayment,
  BillingRevenueRecognition,
  BudgetStatus,
  ForecastKind,
  ForecastSnapshot,
  InvoiceStatus,
  ManagementBudget,
  OrderCostSnapshot,
  ServiceFeedback,
  BookingAttendance,
} from './entities/performance.entities.js';

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class PerformanceManagementService {
  constructor(
    @InjectRepository(BillingInvoice)
    private readonly invoices: Repository<BillingInvoice>,
    @InjectRepository(BillingPayment)
    private readonly payments: Repository<BillingPayment>,
    @InjectRepository(BillingRevenueRecognition)
    private readonly recognitions: Repository<BillingRevenueRecognition>,
    @InjectRepository(ManagementBudget)
    private readonly budgets: Repository<ManagementBudget>,
    @InjectRepository(OrderCostSnapshot)
    private readonly costs: Repository<OrderCostSnapshot>,
    @InjectRepository(ServiceFeedback)
    private readonly feedback: Repository<ServiceFeedback>,
    @InjectRepository(BookingAttendance)
    private readonly attendance: Repository<BookingAttendance>,
    @InjectRepository(ForecastSnapshot)
    private readonly forecasts: Repository<ForecastSnapshot>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderLine)
    private readonly orderLines: Repository<OrderLine>,
    @InjectRepository(InventoryItem)
    private readonly inventory: Repository<InventoryItem>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(RoomBooking)
    private readonly bookings: Repository<RoomBooking>,
    @InjectRepository(FinanceExpense)
    private readonly expenses: Repository<FinanceExpense>,
    @InjectRepository(FinanceAccount)
    private readonly accounts: Repository<FinanceAccount>,
    private readonly accounting: AccountingService,
  ) {}

  async createInvoice(dto: CreateInvoiceDto): Promise<BillingInvoice> {
    if (dto.serviceTo < dto.serviceFrom || dto.dueDate < dto.issueDate)
      throw new BadRequestException('invalidInvoiceDates');
    const values = dto.lines.map((line) => {
      const net = Math.max(
        0,
        line.quantity * line.unitPrice - (line.discount ?? 0),
      );
      return { net, tax: net * ((line.taxRate ?? 0) / 100) };
    });
    const subtotal = round2(values.reduce((sum, line) => sum + line.net, 0));
    const taxAmount = round2(values.reduce((sum, line) => sum + line.tax, 0));
    const year = dto.issueDate.slice(0, 4);
    const count = await this.invoices
      .createQueryBuilder('i')
      .where('i.issue_date >= :from AND i.issue_date < :to', {
        from: `${year}-01-01`,
        to: `${Number(year) + 1}-01-01`,
      })
      .getCount();
    return this.invoices.save(
      this.invoices.create({
        ...dto,
        contractId: dto.contractId ?? null,
        currency: dto.currency ?? 'SAR',
        number: `INV-${year}-${String(count + 1).padStart(6, '0')}`,
        status: InvoiceStatus.DRAFT,
        subtotal,
        taxAmount,
        totalAmount: round2(subtotal + taxAmount),
        recognizedAmount: 0,
        paidAmount: 0,
      }),
    );
  }

  listInvoices(companyId?: string): Promise<BillingInvoice[]> {
    return this.invoices.find({
      where: companyId ? { companyId } : {},
      order: { issueDate: 'DESC' },
    });
  }

  async issueInvoice(id: string): Promise<BillingInvoice> {
    const invoice = await this.requireInvoice(id);
    if (invoice.status !== InvoiceStatus.DRAFT)
      throw new ConflictException('invoiceNotDraft');
    await this.accounting.postInvoiceEntry({
      id: invoice.id,
      companyId: invoice.companyId,
      issueDate: invoice.issueDate,
      totalAmount: Number(invoice.totalAmount),
      number: invoice.number,
    });
    invoice.status = InvoiceStatus.ISSUED;
    invoice.recognizedAmount = 0;
    await this.invoices.save(invoice);
    await this.recognitions.save(this.buildRecognitionSchedule(invoice));
    await this.recognizeRevenue(new Date().toISOString().slice(0, 10));
    return this.requireInvoice(id);
  }

  private buildRecognitionSchedule(
    invoice: BillingInvoice,
  ): BillingRevenueRecognition[] {
    const start = new Date(`${invoice.serviceFrom}T00:00:00Z`);
    const end = new Date(`${invoice.serviceTo}T00:00:00Z`);
    const totalDays =
      Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const schedule: BillingRevenueRecognition[] = [];
    let cursor = new Date(start);
    let allocated = 0;
    while (cursor <= end) {
      const monthEnd = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
      );
      const segmentEnd = monthEnd < end ? monthEnd : end;
      const days =
        Math.floor((segmentEnd.getTime() - cursor.getTime()) / 86_400_000) + 1;
      const isLast = segmentEnd.getTime() === end.getTime();
      const amount = isLast
        ? round2(Number(invoice.totalAmount) - allocated)
        : round2((Number(invoice.totalAmount) * days) / totalDays);
      allocated = round2(allocated + amount);
      schedule.push(
        this.recognitions.create({
          invoiceId: invoice.id,
          recognitionDate: segmentEnd.toISOString().slice(0, 10),
          amount,
          postedAt: null,
        }),
      );
      cursor = new Date(segmentEnd);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return schedule;
  }

  async recognizeRevenue(asOf: string): Promise<number> {
    const due = await this.recognitions
      .createQueryBuilder('r')
      .innerJoinAndSelect(BillingInvoice, 'i', 'i.id = r.invoice_id')
      .where('r.posted_at IS NULL')
      .andWhere('r.recognition_date <= :asOf', { asOf })
      .orderBy('r.recognition_date', 'ASC')
      .getMany();
    let posted = 0;
    for (const recognition of due) {
      const invoice = await this.requireInvoice(recognition.invoiceId);
      await this.accounting.postRevenueRecognitionEntry({
        id: recognition.id,
        companyId: invoice.companyId,
        invoiceNumber: invoice.number,
        date: recognition.recognitionDate,
        amount: Number(recognition.amount),
      });
      recognition.postedAt = new Date();
      await this.recognitions.save(recognition);
      invoice.recognizedAmount = round2(
        Number(invoice.recognizedAmount) + Number(recognition.amount),
      );
      await this.invoices.save(invoice);
      posted += 1;
    }
    return posted;
  }

  async recordPayment(
    id: string,
    dto: RecordPaymentDto,
  ): Promise<BillingInvoice> {
    const invoice = await this.requireInvoice(id);
    if (
      ![
        InvoiceStatus.ISSUED,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.OVERDUE,
      ].includes(invoice.status)
    )
      throw new ConflictException('invoiceNotPayable');
    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (dto.amount > remaining + 0.001)
      throw new BadRequestException('paymentExceedsBalance');
    const payment = await this.payments.save(
      this.payments.create({
        invoiceId: id,
        amount: dto.amount,
        paidAt: new Date(dto.paidAt),
        method: dto.method,
        reference: dto.reference ?? null,
      }),
    );
    await this.accounting.postInvoicePaymentEntry({
      id: payment.id,
      invoiceId: id,
      companyId: invoice.companyId,
      paidAt: dto.paidAt,
      amount: dto.amount,
    });
    invoice.paidAmount = round2(Number(invoice.paidAmount) + dto.amount);
    invoice.status =
      Number(invoice.paidAmount) >= Number(invoice.totalAmount)
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;
    return this.invoices.save(invoice);
  }

  private async requireInvoice(id: string): Promise<BillingInvoice> {
    const invoice = await this.invoices.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('invoiceNotFound');
    return invoice;
  }

  async createBudget(dto: CreateBudgetDto): Promise<ManagementBudget> {
    const totalAmount = round2(
      dto.lines.reduce((sum, line) => sum + line.amount, 0),
    );
    return this.budgets.save(
      this.budgets.create({
        ...dto,
        companyId: dto.companyId ?? null,
        branchId: dto.branchId ?? null,
        version: dto.version ?? 1,
        status: BudgetStatus.DRAFT,
        totalAmount,
      }),
    );
  }
  listBudgets(year?: number): Promise<ManagementBudget[]> {
    return this.budgets.find({
      where: year ? { fiscalYear: year } : {},
      order: { fiscalYear: 'DESC', version: 'DESC' },
    });
  }
  async setBudgetStatus(
    id: string,
    status: BudgetStatus,
  ): Promise<ManagementBudget> {
    const budget = await this.budgets.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('budgetNotFound');
    const allowed: Record<BudgetStatus, BudgetStatus[]> = {
      DRAFT: [BudgetStatus.SUBMITTED],
      SUBMITTED: [BudgetStatus.APPROVED, BudgetStatus.DRAFT],
      APPROVED: [BudgetStatus.LOCKED],
      LOCKED: [],
    };
    if (!allowed[budget.status].includes(status))
      throw new ConflictException('invalidBudgetTransition');
    budget.status = status;
    return this.budgets.save(budget);
  }

  async budgetVariance(id: string): Promise<{
    budget: number;
    actual: number;
    variance: number;
    consumptionRate: number | null;
  }> {
    const budget = await this.budgets.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('budgetNotFound');
    const qb = this.expenses
      .createQueryBuilder('e')
      .where('e.expense_date >= :from AND e.expense_date < :to', {
        from: `${budget.fiscalYear}-01-01`,
        to: `${budget.fiscalYear + 1}-01-01`,
      });
    if (budget.companyId)
      qb.andWhere('e.company_id = :companyId', { companyId: budget.companyId });
    const row = await qb
      .select('COALESCE(SUM(e.amount), 0)', 'actual')
      .getRawOne<{ actual: string }>();
    const actual = Number(row?.actual ?? 0);
    const amount = Number(budget.totalAmount);
    return {
      budget: amount,
      actual,
      variance: round2(actual - amount),
      consumptionRate: amount > 0 ? round2((actual / amount) * 100) : null,
    };
  }

  async createCostSnapshot(
    dto: CreateCostSnapshotDto,
  ): Promise<OrderCostSnapshot> {
    const order = await this.orders.findOne({
      where: { id: dto.orderId },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException('orderNotFound');
    const productIds = [...new Set(order.lines.map((line) => line.productId))];
    const products = productIds.length
      ? await this.products
          .createQueryBuilder('p')
          .where('p.id IN (:...ids)', { ids: productIds })
          .getMany()
      : [];
    const costByProduct = new Map(
      products.map((product) => [product.id, Number(product.unitCost ?? 0)]),
    );
    const productCost =
      dto.productCost ??
      round2(
        order.lines.reduce(
          (sum, line) =>
            sum + line.quantity * (costByProduct.get(line.productId) ?? 0),
          0,
        ),
      );
    const laborCost = dto.laborCost ?? 0;
    const deliveryCost = dto.deliveryCost ?? 0;
    const overheadCost = dto.overheadCost ?? 0;
    const totalCost = round2(
      productCost + laborCost + deliveryCost + overheadCost,
    );
    const existing = await this.costs.findOne({
      where: { orderId: dto.orderId },
    });
    return this.costs.save(
      this.costs.create({
        ...existing,
        ...dto,
        productCost,
        laborCost,
        deliveryCost,
        overheadCost,
        companyId: order.companyId,
        branchId: order.branchId,
        totalCost,
        calculationVersion:
          dto.productCost == null ? 'catalog-cost-v1' : 'manual-v1',
      }),
    );
  }

  async createFeedback(dto: CreateFeedbackDto): Promise<ServiceFeedback> {
    if (!dto.orderId && !dto.bookingId)
      throw new BadRequestException('feedbackTargetRequired');
    if (dto.orderId) {
      const order = await this.orders.findOne({ where: { id: dto.orderId } });
      if (
        !order ||
        order.companyId !== dto.companyId ||
        (dto.employeeId && order.employeeId !== dto.employeeId)
      )
        throw new NotFoundException('feedbackTargetNotFound');
    }
    if (dto.bookingId) {
      const booking = await this.bookings.findOne({
        where: { id: dto.bookingId },
      });
      if (
        !booking ||
        booking.companyId !== dto.companyId ||
        (dto.employeeId && booking.employeeId !== dto.employeeId)
      )
        throw new NotFoundException('feedbackTargetNotFound');
    }
    return this.feedback.save(
      this.feedback.create({
        ...dto,
        orderId: dto.orderId ?? null,
        bookingId: dto.bookingId ?? null,
        employeeId: dto.employeeId ?? null,
        qualityRating: dto.qualityRating ?? null,
        punctualityRating: dto.punctualityRating ?? null,
        comment: dto.comment ?? null,
      }),
    );
  }

  async setAttendance(
    bookingId: string,
    dto: SetAttendanceDto,
  ): Promise<BookingAttendance> {
    const booking = await this.bookings.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('bookingNotFound');
    const existing = await this.attendance.findOne({ where: { bookingId } });
    const now = new Date();
    return this.attendance.save(
      this.attendance.create({
        ...existing,
        bookingId,
        status: dto.status,
        actualParticipants:
          dto.actualParticipants ?? existing?.actualParticipants ?? null,
        absenceReason: dto.absenceReason ?? null,
        checkedInAt:
          dto.status === AttendanceStatus.CHECKED_IN
            ? now
            : (existing?.checkedInAt ?? null),
        completedAt:
          dto.status === AttendanceStatus.COMPLETED
            ? now
            : (existing?.completedAt ?? null),
      }),
    );
  }

  async markNoShows(graceMinutes = 30): Promise<number> {
    const rows = await this.bookings
      .createQueryBuilder('b')
      .leftJoin(BookingAttendance, 'a', 'a.booking_id = b.id')
      .where("b.status = 'CONFIRMED'")
      .andWhere(
        `b.start_time < NOW() - INTERVAL '${Math.max(1, Math.floor(graceMinutes))} minutes'`,
      )
      .andWhere('(a.id IS NULL OR a.status = :pending)', {
        pending: AttendanceStatus.PENDING,
      })
      .getMany();
    for (const booking of rows)
      await this.setAttendance(booking.id, {
        status: AttendanceStatus.NO_SHOW,
      });
    return rows.length;
  }

  async generateForecast(
    dto: GenerateForecastDto,
  ): Promise<ForecastSnapshot[]> {
    if (dto.kind === ForecastKind.STOCK && !dto.entityId)
      throw new BadRequestException('stockForecastProductRequired');
    const horizon = dto.horizonDays ?? 14;
    const history = await this.historicalDailyValues(
      dto.kind,
      dto.companyId,
      dto.branchId,
    );
    const weights = [0.4, 0.3, 0.2, 0.1];
    const average = history.length
      ? history
          .slice(-4)
          .reduce(
            (sum, value, i, values) =>
              sum + value * weights[weights.length - values.length + i],
            0,
          ) /
        weights
          .slice(weights.length - Math.min(4, history.length))
          .reduce((a, b) => a + b, 0)
      : 0;
    const deviation = history.length
      ? Math.sqrt(
          history.reduce((sum, value) => sum + (value - average) ** 2, 0) /
            history.length,
        )
      : 0;
    let baseValue = 0;
    if (dto.kind === ForecastKind.STOCK) {
      const qb = this.inventory
        .createQueryBuilder('i')
        .where('i.product_id = :productId', { productId: dto.entityId });
      if (dto.companyId)
        qb.andWhere('i.company_id = :companyId', { companyId: dto.companyId });
      if (dto.branchId)
        qb.andWhere('i.branch_id = :branchId', { branchId: dto.branchId });
      const row = await qb
        .select('COALESCE(SUM(i.quantity), 0)', 'value')
        .getRawOne<{ value: string }>();
      baseValue = Number(row?.value ?? 0);
    } else if (dto.kind === ForecastKind.CASH) {
      const balances = await this.accounts.find();
      baseValue = balances.reduce(
        (sum, account) => sum + Number(account.balance),
        0,
      );
    }
    const generated: ForecastSnapshot[] = [];
    for (let i = 1; i <= horizon; i += 1) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + i);
      generated.push(
        this.forecasts.create({
          kind: dto.kind,
          companyId: dto.companyId ?? null,
          branchId: dto.branchId ?? null,
          entityId: dto.entityId ?? null,
          forecastDate: date.toISOString().slice(0, 10),
          predictedValue: round2(
            dto.kind === ForecastKind.DEMAND
              ? average
              : dto.kind === ForecastKind.STOCK
                ? Math.max(0, baseValue - average * i)
                : baseValue + average * i,
          ),
          lowerBound: round2(
            Math.max(
              0,
              (dto.kind === ForecastKind.DEMAND
                ? average
                : dto.kind === ForecastKind.STOCK
                  ? Math.max(0, baseValue - average * i)
                  : baseValue + average * i) -
                1.28 * deviation * Math.sqrt(i),
            ),
          ),
          upperBound: round2(
            (dto.kind === ForecastKind.DEMAND
              ? average
              : dto.kind === ForecastKind.STOCK
                ? Math.max(0, baseValue - average * i)
                : baseValue + average * i) +
              1.28 * deviation * Math.sqrt(i),
          ),
          modelVersion: 'weighted-average-v1',
          factors: {
            historyDays: history.length,
            weights,
            baseValue,
            ...dto.factors,
          },
        }),
      );
    }
    return this.forecasts.save(generated);
  }

  private async historicalDailyValues(
    kind: ForecastKind,
    companyId?: string,
    branchId?: string,
  ): Promise<number[]> {
    if (kind === ForecastKind.DEMAND) {
      const qb = this.orders
        .createQueryBuilder('o')
        .where("o.created_at >= NOW() - INTERVAL '28 days'");
      if (companyId) qb.andWhere('o.company_id = :companyId', { companyId });
      if (branchId) qb.andWhere('o.branch_id = :branchId', { branchId });
      const rows = await qb
        .select("DATE_TRUNC('day', o.created_at)", 'day')
        .addSelect('COUNT(*)', 'value')
        .groupBy('day')
        .orderBy('day', 'ASC')
        .getRawMany<{ value: string }>();
      return rows.map((row) => Number(row.value));
    }
    if (kind === ForecastKind.STOCK) {
      const qb = this.orderLines
        .createQueryBuilder('l')
        .innerJoin('l.order', 'o')
        .where("o.created_at >= NOW() - INTERVAL '28 days'");
      if (companyId) qb.andWhere('o.company_id = :companyId', { companyId });
      if (branchId) qb.andWhere('o.branch_id = :branchId', { branchId });
      const rows = await qb
        .select("DATE_TRUNC('day', o.created_at)", 'day')
        .addSelect('SUM(l.quantity)', 'value')
        .groupBy('day')
        .orderBy('day', 'ASC')
        .getRawMany<{ value: string }>();
      return rows.map((row) => Number(row.value));
    }
    const paymentRows = await this.payments
      .createQueryBuilder('p')
      .innerJoin(BillingInvoice, 'i', 'i.id = p.invoice_id')
      .where("p.paid_at >= NOW() - INTERVAL '28 days'")
      .andWhere(companyId ? 'i.company_id = :companyId' : '1=1', { companyId })
      .select("DATE_TRUNC('day', p.paid_at)", 'day')
      .addSelect('SUM(p.amount)', 'value')
      .groupBy('day')
      .getRawMany<{ day: Date; value: string }>();
    const expenseRows = await this.expenses
      .createQueryBuilder('e')
      .where("e.expense_date >= CURRENT_DATE - INTERVAL '28 days'")
      .andWhere(companyId ? 'e.company_id = :companyId' : '1=1', { companyId })
      .select('e.expense_date', 'day')
      .addSelect('-SUM(e.amount)', 'value')
      .groupBy('day')
      .getRawMany<{ day: string; value: string }>();
    const netByDay = new Map<string, number>();
    for (const row of [...paymentRows, ...expenseRows]) {
      const day = new Date(row.day).toISOString().slice(0, 10);
      netByDay.set(day, (netByDay.get(day) ?? 0) + Number(row.value));
    }
    return [...netByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }

  listForecasts(kind?: ForecastKind): Promise<ForecastSnapshot[]> {
    return this.forecasts.find({
      where: kind ? { kind } : {},
      order: { forecastDate: 'ASC' },
      take: 180,
    });
  }

  async dashboard(
    from: string,
    to: string,
    companyId?: string,
  ): Promise<Record<string, number | null>> {
    const invoiceWhere: FindOptionsWhere<BillingInvoice> = {
      issueDate: Between(from, to),
    };
    if (companyId) invoiceWhere.companyId = companyId;
    const [
      invoices,
      paymentPeriodRow,
      receivableRow,
      recognitionRows,
      costs,
      feedback,
      attendance,
      budgets,
    ] = await Promise.all([
      this.invoices.find({ where: invoiceWhere }),
      this.payments
        .createQueryBuilder('p')
        .innerJoin(BillingInvoice, 'i', 'i.id = p.invoice_id')
        .where('p.paid_at BETWEEN :from AND :to', {
          from,
          to: `${to}T23:59:59.999Z`,
        })
        .andWhere(companyId ? 'i.company_id = :companyId' : '1=1', {
          companyId,
        })
        .select('COALESCE(SUM(p.amount), 0)', 'value')
        .getRawOne<{ value: string }>(),
      this.invoices
        .createQueryBuilder('i')
        .where('i.issue_date <= :to', { to })
        .andWhere("i.status NOT IN ('DRAFT','CANCELLED')")
        .andWhere(companyId ? 'i.company_id = :companyId' : '1=1', {
          companyId,
        })
        .select('COALESCE(SUM(i.total_amount - i.paid_amount), 0)', 'value')
        .getRawOne<{ value: string }>(),
      this.recognitions
        .createQueryBuilder('r')
        .innerJoin(BillingInvoice, 'i', 'i.id = r.invoice_id')
        .where('r.posted_at IS NOT NULL')
        .andWhere('r.recognition_date BETWEEN :from AND :to', { from, to })
        .andWhere(companyId ? 'i.company_id = :companyId' : '1=1', {
          companyId,
        })
        .getMany(),
      this.costs
        .createQueryBuilder('c')
        .where('c.created_at BETWEEN :from AND :to', {
          from,
          to: `${to}T23:59:59.999Z`,
        })
        .andWhere(companyId ? 'c.company_id = :companyId' : '1=1', {
          companyId,
        })
        .getMany(),
      this.feedback
        .createQueryBuilder('f')
        .where('f.created_at BETWEEN :from AND :to', {
          from,
          to: `${to}T23:59:59.999Z`,
        })
        .andWhere(companyId ? 'f.company_id = :companyId' : '1=1', {
          companyId,
        })
        .getMany(),
      this.attendance
        .createQueryBuilder('a')
        .where('a.updated_at BETWEEN :from AND :to', {
          from,
          to: `${to}T23:59:59.999Z`,
        })
        .getMany(),
      this.budgets.find({
        where: {
          fiscalYear: Number(from.slice(0, 4)),
          status: BudgetStatus.LOCKED,
          ...(companyId ? { companyId } : {}),
        },
      }),
    ]);
    const billedRevenue = invoices
      .filter(
        (i) =>
          i.status !== InvoiceStatus.DRAFT &&
          i.status !== InvoiceStatus.CANCELLED,
      )
      .reduce((s, i) => s + Number(i.totalAmount), 0);
    const recognizedRevenue = recognitionRows.reduce(
      (s, r) => s + Number(r.amount),
      0,
    );
    const collectedRevenue = Number(paymentPeriodRow?.value ?? 0);
    const receivables = Number(receivableRow?.value ?? 0);
    const directCosts = costs.reduce((s, c) => s + Number(c.totalCost), 0);
    const csatPositive = feedback.filter((f) => f.rating >= 4).length;
    const attended = attendance.filter((a) =>
      [AttendanceStatus.CHECKED_IN, AttendanceStatus.COMPLETED].includes(
        a.status,
      ),
    ).length;
    const noShows = attendance.filter(
      (a) => a.status === AttendanceStatus.NO_SHOW,
    ).length;
    const budget = budgets.reduce((s, b) => s + Number(b.totalAmount), 0);
    return {
      billedRevenue: round2(billedRevenue),
      recognizedRevenue: round2(recognizedRevenue),
      collectedRevenue: round2(collectedRevenue),
      receivables: round2(receivables),
      directCosts: round2(directCosts),
      grossMargin: round2(recognizedRevenue - directCosts),
      grossMarginRate:
        recognizedRevenue > 0
          ? round2(
              ((recognizedRevenue - directCosts) / recognizedRevenue) * 100,
            )
          : null,
      budget: round2(budget),
      budgetVariance: round2(directCosts - budget),
      csat: feedback.length
        ? round2((csatPositive / feedback.length) * 100)
        : null,
      feedbackCount: feedback.length,
      noShowRate:
        attended + noShows
          ? round2((noShows / (attended + noShows)) * 100)
          : null,
    };
  }
}
