import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { Order } from './entities/order.entity.js';
import {
  OrderLine,
  LineValidationStatus,
} from './entities/order-line.entity.js';
import {
  CreateOrderDto,
  OrderDto,
  OrderLineDto,
  OrderPriority,
  OrderStatus,
} from './dto/order.dto.js';
import {
  ValidationEngineService,
  ValidationContext,
} from './validation-engine/validation-engine.service.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductRecipeLine } from '../products/entities/product-recipe-line.entity.js';
import {
  InventoryItem,
  StockZone,
} from '../inventory/entities/inventory-item.entity.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { QuotasService } from '../quotas/quotas.service.js';
import { computeQuotaPeriod } from '../quotas/quota-period.js';
import { consumeQuotaAtomic } from '../quotas/quota-consumption.js';
import { PrioritySlaService } from '../priority-sla/priority-sla.service.js';
import { Role } from '../roles/entities/role.entity.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderLine)
    private readonly lineRepo: Repository<OrderLine>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(ProductRecipeLine)
    private readonly recipeRepo: Repository<ProductRecipeLine>,
    private readonly quotasService: QuotasService,
    private readonly validationEngine: ValidationEngineService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly prioritySla: PrioritySlaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Priorité SLA de la commande = niveau SLA du rôle de l'employé
   * (roles.sla_priority, cf. §"مستويات الأولوية موجودة لكل دور" — chaque
   * rôle porte son propre niveau P1..P5). Défaut P5 si le rôle n'a pas ce
   * champ renseigné ou n'a pas pu être résolu.
   */
  private async resolveOrderPriority(caller: JwtPayload): Promise<string> {
    if (!caller.roleId) return OrderPriority.P5;
    const role = await this.roleRepo.findOne({ where: { id: caller.roleId } });
    return role?.slaPriority || OrderPriority.P5;
  }

  /**
   * Les commandes sont préparées en cuisine : le stock CUISINE est décrémenté
   * en premier, et complété automatiquement depuis la BRANCHE si insuffisant
   * (InventoryService.decrementForPreparation). Produit composé (a une
   * recette) : décrémente ses ingrédients. Produit simple (pas de recette) :
   * décrémente son propre stock. Une rupture cuisine+branche combinées
   * bloque toute la transition (voir appelant).
   */
  private async decrementRecipeIngredients(
    order: Order,
    preparedBy: string,
  ): Promise<void> {
    const approvedLines = order.lines.filter(
      (l) => l.validationStatus === LineValidationStatus.APPROVED,
    );
    if (approvedLines.length === 0) return;

    const recipeLines = await this.recipeRepo.find({
      where: { productId: In(approvedLines.map((l) => l.productId)) },
    });

    // Une seule transaction pour toutes les lignes : une rupture en cours de
    // boucle annule les décrémentations déjà faites dans cette même tentative
    // plutôt que de laisser un stock partiellement décrémenté.
    await this.orderRepo.manager.transaction(async (manager) => {
      for (const line of approvedLines) {
        const recipesForLine = recipeLines.filter(
          (r) => r.productId === line.productId,
        );
        if (recipesForLine.length > 0) {
          for (const recipe of recipesForLine) {
            await this.inventoryService.decrementForPreparation(
              recipe.ingredientProductId,
              order.branchId,
              order.companyId,
              recipe.quantity * line.quantity,
              manager,
              preparedBy,
            );
          }
        } else {
          await this.inventoryService.decrementForPreparation(
            line.productId,
            order.branchId,
            order.companyId,
            line.quantity,
            manager,
            preparedBy,
          );
        }
      }
    });
  }

  async create(dto: CreateOrderDto, caller: JwtPayload): Promise<OrderDto> {
    // Agrégation du panier : plusieurs lignes d'un même produit sont fusionnées
    // → quota et stock validés sur la SOMME, jamais indépendamment par ligne.
    const aggregated = new Map<string, number>();
    for (const l of dto.lines) {
      aggregated.set(
        l.productId,
        (aggregated.get(l.productId) ?? 0) + l.quantity,
      );
    }
    const lines = [...aggregated.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    const productIds = [...aggregated.keys()];

    // Nomenclature (§3 CLAUDE.md) : un produit composé n'a pas de stock
    // propre — le stock à vérifier est celui de ses ingrédients.
    const recipeLines = await this.recipeRepo.find({
      where: { productId: In(productIds) },
    });
    const stockProductIds = [
      ...new Set([
        ...productIds,
        ...recipeLines.map((r) => r.ingredientProductId),
      ]),
    ];

    // Charge les vraies données (§3.3 CLAUDE.md — ordre strict). Disponibilité
    // = cuisine + branche combinées (la préparation décrémente la cuisine en
    // premier, la branche complète automatiquement en cas de manque — voir
    // decrementRecipeIngredients / InventoryService.decrementForPreparation).
    const [products, stockRows] = await Promise.all([
      this.productRepo.find({ where: productIds.map((id) => ({ id })) }),
      this.inventoryRepo.find({
        where: stockProductIds.flatMap((id) =>
          [StockZone.KITCHEN, StockZone.BRANCH].map((zone) => ({
            productId: id,
            branchId: caller.branchId || undefined,
            companyId: caller.companyId || undefined,
            zone,
          })),
        ),
      }),
    ]);
    const stockByProduct = new Map<string, number>();
    for (const row of stockRows) {
      stockByProduct.set(
        row.productId,
        (stockByProduct.get(row.productId) ?? 0) + row.quantity,
      );
    }
    const stocks = [...stockByProduct.entries()].map(
      ([productId, quantity]) => ({
        productId,
        branchId: caller.branchId || '',
        quantity,
      }),
    );

    // Quota effectif du rôle primaire (D2) : periodType + max par produit. La
    // consommation est ATOMIQUE dans la transaction (consumeQuotaAtomic), pas un
    // simple contrôle advisory → corrige P01 (additif) et P02 (garde du max).
    const effectiveQuotas = await this.quotasService.effectiveRoleQuotas(
      caller,
      productIds,
    );
    // Chemin legacy uniquement (employé sans rôle) : quota advisory via la table
    // `quotas`. Le chemin role-based ne charge rien ici (quota traité
    // atomiquement dans la transaction).
    const quotaSnapshots = caller.roleId
      ? []
      : await this.quotasService.snapshotsFor(caller, productIds);

    // Validation advisory §3.3 étapes 1-2 (produit/rôle/branche/stock) sur les
    // lignes agrégées. Le quota (étape 3) est traité atomiquement plus bas →
    // quotas:[] ici pour ne pas rejeter sur un snapshot périmé.
    const ctx: ValidationContext = {
      employeeId: caller.sub,
      companyId: caller.companyId || '',
      branchId: caller.branchId || '',
      role: caller.role || 'EMPLOYEE',
      roleId: caller.roleId ?? null,
      products: products.map((p) => ({
        id: p.id,
        isSold: p.isSold,
        allowedRoles: p.allowedRoles,
        allowedBranches: p.allowedBranches,
        active: p.active,
      })),
      stocks: stocks.map((s) => ({
        productId: s.productId,
        branchId: s.branchId,
        quantity: s.quantity,
      })),
      quotas: quotaSnapshots,
      recipes: recipeLines.map((r) => ({
        productId: r.productId,
        ingredientProductId: r.ingredientProductId,
        quantity: r.quantity,
      })),
    };

    const validation = this.validationEngine.validateCart(ctx, lines);
    const advisoryByProduct = new Map<
      string,
      { decision: string; reason: string | null }
    >();
    for (const v of validation.lines) {
      advisoryByProduct.set(v.productId, {
        decision: v.decision,
        reason: v.reason ?? null,
      });
    }

    if (validation.lines.every((v) => v.decision === 'REJECTED')) {
      throw new UnprocessableEntityException({
        message: 'orderValidationFailed',
        rejectedLines: validation.lines.filter(
          (v) => v.decision === 'REJECTED',
        ),
      });
    }

    const priority = await this.resolveOrderPriority(caller);
    // SLA personnalisé par entreprise (company_sla_levels), sinon défauts globaux
    const slaMinutes = await this.prioritySla.getSlaMinutes(
      caller.companyId,
      priority,
    );
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + slaMinutes * 60_000);

    // Transaction (R1) : consommation de quota atomique → décision finale des
    // lignes → insertion commande/lignes → registre de consommation (D12).
    // « Consume puis décide puis écris » garantit qu'une ligne rejetée par le
    // quota sous concurrence n'est jamais persistée APPROVED ; 0 ligne approuvée
    // rollback la consommation déjà faite.
    const saved = await this.orderRepo.manager.transaction(async (manager) => {
      const consumed = new Map<
        string,
        { periodStart: string; periodEnd: string; quantity: number }
      >();
      const quotaRejected = new Set<string>();

      for (const line of lines) {
        if (advisoryByProduct.get(line.productId)?.decision !== 'APPROVED') {
          continue; // déjà rejeté (produit/rôle/branche/stock)
        }
        const quota = effectiveQuotas.get(line.productId);
        if (caller.roleId && quota) {
          const { periodStart, periodEnd } = computeQuotaPeriod(
            quota.periodType,
            now,
          );
          const ok = await consumeQuotaAtomic(manager, {
            employeeId: caller.sub,
            productId: line.productId,
            companyId: caller.companyId,
            periodStart,
            periodEnd,
            quantity: line.quantity,
            maxQuantity: quota.maxQuantity,
          });
          if (ok) {
            consumed.set(line.productId, {
              periodStart,
              periodEnd,
              quantity: line.quantity,
            });
          } else {
            quotaRejected.add(line.productId);
          }
        } else if (!caller.roleId) {
          // Legacy (employé sans rôle) : incrément additif sur la table `quotas`.
          await this.incrementLegacyQuota(
            manager,
            caller.sub,
            line.productId,
            line.quantity,
          );
        }
        // roleId sans role_quota pour ce produit → illimité (D3), rien à consommer.
      }

      const orderLines = lines.map((line) => {
        const advisory = advisoryByProduct.get(line.productId);
        const rejectedForQuota = quotaRejected.has(line.productId);
        const approved = advisory?.decision === 'APPROVED' && !rejectedForQuota;
        return this.lineRepo.create({
          productId: line.productId,
          quantity: line.quantity,
          validationStatus: approved
            ? LineValidationStatus.APPROVED
            : LineValidationStatus.REJECTED,
          rejectionReason: approved
            ? null
            : rejectedForQuota
              ? 'QUOTA_EXCEEDED'
              : (advisory?.reason ?? null),
        });
      });

      if (
        !orderLines.some(
          (l) => l.validationStatus === LineValidationStatus.APPROVED,
        )
      ) {
        // Rollback : annule les consommations de quota déjà faites dans la tx.
        throw new UnprocessableEntityException({
          message: 'orderValidationFailed',
          rejectedLines: orderLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            decision: 'REJECTED',
            reason: l.rejectionReason,
          })),
        });
      }

      // Numéro de commande atomique par société (upsert, pas de doublon concurrent).
      const [{ assigned }] = await manager.query<{ assigned: number }[]>(
        `INSERT INTO company_order_counters (company_id, next_number)
         VALUES ($1, 2)
         ON CONFLICT (company_id)
         DO UPDATE SET next_number = company_order_counters.next_number + 1
         RETURNING next_number - 1 AS assigned`,
        [caller.companyId],
      );

      const order = this.orderRepo.create({
        employeeId: caller.sub,
        companyId: caller.companyId,
        branchId: caller.branchId,
        orderNumber: assigned,
        priority,
        slaDeadline,
        note: dto.note?.trim() || null,
        status: OrderStatus.APPROVED,
        approvedAt: now,
        lines: orderLines,
      });
      const savedOrder = await manager.save(Order, order);

      // Registre de consommation (D12) — FK order/line valides après le save.
      for (const savedLine of savedOrder.lines) {
        const c = consumed.get(savedLine.productId);
        if (c && savedLine.validationStatus === LineValidationStatus.APPROVED) {
          await manager.query(
            `INSERT INTO order_quota_consumptions
               (order_id, order_line_id, employee_id, product_id, company_id, period_start, period_end, quantity)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              savedOrder.id,
              savedLine.id,
              caller.sub,
              savedLine.productId,
              caller.companyId,
              c.periodStart,
              c.periodEnd,
              c.quantity,
            ],
          );
        }
      }
      return savedOrder;
    });

    this.notificationsGateway.emitOrderUpdate('order:new', {
      orderId: saved.id,
      branchId: saved.branchId,
    });

    return this.toDto(saved);
  }

  /**
   * Commandes de l'appelant uniquement — le filtre employeeId est imposé
   * côté serveur (jamais de confiance au query param, règle §3.4 CLAUDE.md).
   */
  findMine(caller: JwtPayload, status?: string): Promise<OrderDto[]> {
    return this.findAll(undefined, caller.sub, status);
  }

  async findAll(
    companyId?: string,
    employeeId?: string,
    status?: string,
    branchId?: string,
    page = 1,
    limit = 200,
  ): Promise<OrderDto[]> {
    const where: FindOptionsWhere<Order> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status as OrderStatus;
    const orders = await this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['lines'],
      skip: (Math.max(page, 1) - 1) * limit,
      take: limit,
    });
    const employeeIds = [...new Set(orders.map((order) => order.employeeId))];
    const employees = employeeIds.length
      ? await this.employeeRepo.find({
          where: employeeIds.map((keycloakId) => ({ keycloakId })),
        })
      : [];
    const employeeByKeycloakId = new Map(
      employees
        .filter((employee) => employee.keycloakId)
        .map((employee) => [employee.keycloakId!, employee]),
    );
    return orders.map((order) =>
      this.toDto(order, employeeByKeycloakId.get(order.employeeId)),
    );
  }

  async dashboardStats(caller: JwtPayload): Promise<{
    todayOrders: number;
    pendingCount: number;
    deliveredToday: number;
    avgSlaMinutes: number;
    mostOrdered: Array<{ productId: string; name: string; count: number }>;
  }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const where: FindOptionsWhere<Order> = {
      createdAt: Between(start, end),
    };
    if (!this.isPlatformAdmin(caller)) {
      if (caller.companyId) where.companyId = caller.companyId;
      if (caller.branchId) where.branchId = caller.branchId;
    }

    const orders = await this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['lines'],
    });

    const delivered = orders.filter(
      (order) => order.status === OrderStatus.DELIVERED,
    );
    const pending = orders.filter((order) =>
      [OrderStatus.PENDING, OrderStatus.APPROVED].includes(order.status),
    );

    const deliveryDurations = delivered
      .map((order) =>
        order.prepStartedAt && order.deliveredAt
          ? (order.deliveredAt.getTime() - order.prepStartedAt.getTime()) /
            60_000
          : null,
      )
      .filter(
        (duration): duration is number =>
          typeof duration === 'number' && Number.isFinite(duration),
      );

    const productCounts = new Map<string, number>();
    for (const order of orders) {
      for (const line of order.lines ?? []) {
        productCounts.set(
          line.productId,
          (productCounts.get(line.productId) ?? 0) + Number(line.quantity ?? 0),
        );
      }
    }

    const topProductIds = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId]) => productId);

    const products = topProductIds.length
      ? await this.productRepo.find({ where: { id: In(topProductIds) } })
      : [];
    const namesById = new Map(
      products.map((product) => [product.id, product.nameEn || product.nameAr]),
    );

    return {
      todayOrders: orders.length,
      pendingCount: pending.length,
      deliveredToday: delivered.length,
      avgSlaMinutes: deliveryDurations.length
        ? deliveryDurations.reduce((sum, value) => sum + value, 0) /
          deliveryDurations.length
        : 0,
      mostOrdered: topProductIds.map((productId) => ({
        productId,
        name: namesById.get(productId) ?? productId,
        count: productCounts.get(productId) ?? 0,
      })),
    };
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    caller: JwtPayload,
    reason?: string,
  ): Promise<OrderDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const allowed = this.allowedTransitions(caller, order.status);
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Role ${caller.role} cannot transition ${order.status} → ${status}`,
      );
    }
    // Un admin plateforme (superadmin) n'a aucune société assignée
    // (caller.companyId est null) : il gère toutes les sociétés et ne doit
    // donc jamais être bloqué par la vérification multi-tenant — même règle
    // que RolesService.findAll (cf. isTarhibAdmin).
    if (!this.isPlatformAdmin(caller) && order.companyId !== caller.companyId) {
      throw new ForbiddenException('crossTenantAccessDenied');
    }

    order.status = status;
    if (reason?.trim()) order.note = reason.trim();
    const now = new Date();
    if (status === OrderStatus.APPROVED) {
      order.approvedAt = now;
      order.approvedBy = caller.sub;
    } else if (status === OrderStatus.REJECTED) {
      order.rejectedAt = now;
      order.rejectedBy = caller.sub;
    } else if (status === OrderStatus.IN_PROGRESS) {
      order.prepStartedAt = now;
      order.preparedBy = caller.sub;
      // Décrémente le stock (ingrédients pour un produit composé, produit
      // lui-même sinon) au moment réel de préparation, pas à la confirmation
      // (le stock a pu changer entre-temps). Rupture bloque la transition —
      // le statut n'est pas persisté si decrementForPreparation rejette.
      await this.decrementRecipeIngredients(order, caller.sub);
    } else if (status === OrderStatus.READY) {
      order.readyAt = now;
      order.readyBy = caller.sub;
    } else if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = now;
      order.deliveredBy = caller.sub;
    }
    const saved = await this.orderRepo.save(order);

    // Notify employee via SMS + push FCM (TARHIB-9) — fire-and-forget,
    // don't block the response. orders.employee_id porte l'identité Keycloak
    // de l'appelant (cf. create), d'où la recherche keycloakId OU id.
    this.employeeRepo
      .findOne({
        where: [{ keycloakId: order.employeeId }, { id: order.employeeId }],
      })
      .then(async (employee) => {
        if (!employee) return;
        if (employee.phoneNumber) {
          await this.notificationsService.notifyOrderStatusChanged(
            order.id,
            status,
            employee.phoneNumber,
          );
        }
        if (employee.fcmToken) {
          await this.notificationsService.sendPush(
            employee.fcmToken,
            'Tarhib',
            `Commande #${order.id.slice(0, 8)} — nouveau statut : ${status}`,
            { orderId: order.id, type: 'order-status' },
          );
        }
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Notification failed for order ${order.id}: ${String(err)}`,
        ),
      );

    this.notificationsGateway.emitOrderUpdate('order:status', {
      orderId: saved.id,
      status: saved.status,
      branchId: saved.branchId,
    });

    return this.toDto(saved);
  }

  /**
   * Admin plateforme Tarhib (superadmin inclus) : n'a aucune société
   * assignée et ne doit être cantonné ni par le moteur de transitions ni
   * par la vérification multi-tenant (même détection que allowedTransitions).
   */
  private isPlatformAdmin(caller: JwtPayload): boolean {
    const perms = caller.permissions ?? [];
    return (
      perms.includes('company.manage') ||
      perms.includes('employee.manage') ||
      caller.role === 'ADMIN'
    );
  }

  private allowedTransitions(
    caller: JwtPayload,
    current: OrderStatus,
  ): OrderStatus[] {
    const perms = caller.permissions ?? [];

    const canPrepare = perms.includes('order.prepare');
    const canDeliver = perms.includes('order.deliver');
    const canApprove = perms.includes('order.approve');

    // Backward compat: legacy role strings
    const legacyAgent = caller.role === 'HOSPITALITY_AGENT';
    const legacyManager = caller.role === 'DEPARTMENT_MANAGER';

    if (this.isPlatformAdmin(caller)) {
      const full: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [
          OrderStatus.APPROVED,
          OrderStatus.IN_PROGRESS,
          OrderStatus.REJECTED,
        ],
        [OrderStatus.APPROVED]: [OrderStatus.IN_PROGRESS, OrderStatus.REJECTED],
        [OrderStatus.IN_PROGRESS]: [OrderStatus.READY, OrderStatus.REJECTED],
        [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.REJECTED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      };
      return full[current] ?? [];
    }

    if (canApprove || legacyManager) {
      const approver: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.APPROVED, OrderStatus.REJECTED],
        [OrderStatus.APPROVED]: [OrderStatus.REJECTED],
        [OrderStatus.IN_PROGRESS]: [],
        [OrderStatus.READY]: [],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      };
      return approver[current] ?? [];
    }

    if (canPrepare || canDeliver || legacyAgent) {
      // Cuisinier (order.prepare) : APPROVED→IN_PROGRESS→READY
      // Livreur (order.deliver) : READY→DELIVERED
      const agent: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS],
        [OrderStatus.APPROVED]: [OrderStatus.IN_PROGRESS],
        [OrderStatus.IN_PROGRESS]: canPrepare
          ? [OrderStatus.READY, OrderStatus.REJECTED]
          : [],
        [OrderStatus.READY]: canDeliver ? [OrderStatus.DELIVERED] : [],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      };
      return agent[current] ?? [];
    }

    return [];
  }

  async findOne(id: string): Promise<OrderDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.toDto(order);
  }

  /** Chargement par lot — évite le N+1 (ex. DeliveryService.queue()). */
  async findByIds(ids: string[]): Promise<OrderDto[]> {
    if (ids.length === 0) return [];
    const orders = await this.orderRepo.find({
      where: { id: In(ids) },
      relations: ['lines'],
    });
    return orders.map((order) => this.toDto(order));
  }

  /**
   * Consommation de quota LEGACY (employé sans rôle, table `quotas`) : incrément
   * additif dans la transaction de commande, gardé advisory par le moteur de
   * validation en amont (le chemin role-based passe par consumeQuotaAtomic).
   */
  private async incrementLegacyQuota(
    manager: EntityManager,
    employeeId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await manager.query(
      `UPDATE quotas SET used_quantity = used_quantity + $1
       WHERE employee_id = $2 AND product_id = $3
         AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE`,
      [quantity, employeeId, productId],
    );
  }

  private toDto(o: Order, employee?: Employee): OrderDto {
    const dto = new OrderDto();
    dto.id = o.id;
    dto.employeeId = o.employeeId;
    dto.recipientNameAr = employee
      ? `${employee.firstNameAr} ${employee.lastNameAr}`
      : null;
    dto.recipientNameEn = employee
      ? `${employee.firstNameEn} ${employee.lastNameEn}`
      : null;
    dto.recipientPhone = employee?.phoneNumber ?? null;
    dto.recipientFloor = employee?.floor ?? null;
    dto.recipientOffice = employee?.officeNumber ?? null;
    dto.branchId = o.branchId;
    dto.companyId = o.companyId;
    dto.orderNumber = o.orderNumber;
    dto.status = o.status;
    dto.priority = o.priority;
    dto.slaDeadline = o.slaDeadline.toISOString();
    dto.createdAt = o.createdAt.toISOString();
    dto.approvedAt = o.approvedAt;
    dto.approvedBy = o.approvedBy;
    dto.rejectedAt = o.rejectedAt;
    dto.rejectedBy = o.rejectedBy;
    dto.prepStartedAt = o.prepStartedAt;
    dto.preparedBy = o.preparedBy;
    dto.readyAt = o.readyAt;
    dto.readyBy = o.readyBy;
    dto.deliveredAt = o.deliveredAt;
    dto.deliveredBy = o.deliveredBy;
    dto.note = o.note ?? null;
    dto.lines = (o.lines ?? []).map((l) => {
      const line = new OrderLineDto();
      line.productId = l.productId;
      line.quantity = l.quantity;
      line.validationStatus = l.validationStatus;
      line.rejectionReason = l.rejectionReason ?? null;
      return line;
    });
    return dto;
  }
}
