import {
  ValidationEngineService,
  ValidationContext,
} from './validation-engine.service.js';
import { CreateOrderLineDto } from '../dto/create-order-line.dto.js';

describe('ValidationEngineService — moteur de validation (CLAUDE.md §3.3)', () => {
  let engine: ValidationEngineService;

  const makeCtx = (
    overrides: Partial<ValidationContext> = {},
  ): ValidationContext => ({
    employeeId: 'emp-1',
    companyId: 'co-1',
    branchId: 'br-1',
    role: 'EMPLOYEE',
    roleId: null,
    products: [
      {
        id: 'prod-cmd',
        isSold: true,
        allowedRoles: null,
        allowedBranches: null,
        active: true,
      },
      {
        id: 'prod-vip',
        isSold: false,
        allowedRoles: null,
        allowedBranches: null,
        active: true,
      },
      {
        id: 'prod-restricted',
        isSold: true,
        allowedRoles: ['DEPARTMENT_MANAGER'],
        allowedBranches: null,
        active: true,
      },
    ],
    stocks: [{ productId: 'prod-cmd', branchId: 'br-1', quantity: 10 }],
    quotas: [],
    recipes: [],
    ...overrides,
  });

  const line = (productId: string, quantity = 1): CreateOrderLineDto => ({
    productId,
    quantity,
  });

  beforeEach(() => {
    engine = new ValidationEngineService();
  });

  // ── Étape 1 : produit commandable + rôle ──────────────────────────────────

  it('should REJECT a LIBRE_SERVICE_VIP product — rule §3.3.1', () => {
    const result = engine.validateCart(makeCtx(), [line('prod-vip')]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('PRODUCT_NOT_COMMANDABLE');
  });

  it('should REJECT an unknown/inactive product — rule §3.3.1', () => {
    const result = engine.validateCart(makeCtx(), [line('prod-unknown')]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('PRODUCT_NOT_COMMANDABLE');
  });

  it('should REJECT when caller role not in allowedRoles — rule §3.3.1', () => {
    const result = engine.validateCart(makeCtx({ role: 'EMPLOYEE' }), [
      line('prod-restricted'),
    ]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('ROLE_NOT_ALLOWED');
  });

  it('should APPROVE when caller role is in allowedRoles', () => {
    const ctx = makeCtx({ role: 'DEPARTMENT_MANAGER' });
    ctx.stocks.push({
      productId: 'prod-restricted',
      branchId: 'br-1',
      quantity: 5,
    });
    const result = engine.validateCart(ctx, [line('prod-restricted')]);
    expect(result.lines[0].decision).toBe('APPROVED');
  });

  it('should APPROVE when caller roleId (UUID) is in allowedRoles — rôles dynamiques', () => {
    const ctx = makeCtx({ role: 'EMPLOYEE', roleId: 'role-uuid-1' });
    ctx.products.find((p) => p.id === 'prod-restricted')!.allowedRoles = [
      'role-uuid-1',
    ];
    ctx.stocks.push({
      productId: 'prod-restricted',
      branchId: 'br-1',
      quantity: 5,
    });
    const result = engine.validateCart(ctx, [line('prod-restricted')]);
    expect(result.lines[0].decision).toBe('APPROVED');
  });

  it('should REJECT when neither role name nor roleId match allowedRoles', () => {
    const ctx = makeCtx({ role: 'EMPLOYEE', roleId: 'role-uuid-2' });
    ctx.products.find((p) => p.id === 'prod-restricted')!.allowedRoles = [
      'role-uuid-1',
    ];
    const result = engine.validateCart(ctx, [line('prod-restricted')]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('ROLE_NOT_ALLOWED');
  });

  it('should REJECT when caller branch not in allowedBranches — rule §3.3.1', () => {
    const ctx = makeCtx({ branchId: 'br-other' });
    ctx.products.find((p) => p.id === 'prod-cmd')!.allowedBranches = ['br-1'];
    const result = engine.validateCart(ctx, [line('prod-cmd')]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('BRANCH_NOT_ALLOWED');
  });

  it('should APPROVE when caller branch is in allowedBranches', () => {
    const ctx = makeCtx();
    ctx.products.find((p) => p.id === 'prod-cmd')!.allowedBranches = ['br-1'];
    const result = engine.validateCart(ctx, [line('prod-cmd')]);
    expect(result.lines[0].decision).toBe('APPROVED');
  });

  it('should stop at the branch check (not check stock) when branch not allowed', () => {
    const ctx = makeCtx({ branchId: 'br-other' });
    ctx.products.find((p) => p.id === 'prod-cmd')!.allowedBranches = ['br-1'];
    ctx.stocks = []; // no stock at all — should not reach step 2
    const result = engine.validateCart(ctx, [line('prod-cmd')]);
    expect(result.lines[0].reason).toBe('BRANCH_NOT_ALLOWED');
  });

  // ── Étape 2 : stock disponible ────────────────────────────────────────────

  it('should REJECT when stock in branch < quantity — rule §3.3.2', () => {
    const result = engine.validateCart(makeCtx(), [line('prod-cmd', 99)]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('INSUFFICIENT_STOCK');
  });

  it('should REJECT when no stock entry exists for the branch', () => {
    const ctx = makeCtx({ branchId: 'br-other' });
    const result = engine.validateCart(ctx, [line('prod-cmd')]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('INSUFFICIENT_STOCK');
  });

  // ── Étape 2 (nomenclature) : produit composé — disponibilité par ingrédient ─

  it('should APPROVE a composed product when every ingredient has enough stock', () => {
    const ctx = makeCtx({
      recipes: [
        {
          productId: 'prod-cmd',
          ingredientProductId: 'ing-coffee',
          quantity: 7,
        },
        {
          productId: 'prod-cmd',
          ingredientProductId: 'ing-sugar',
          quantity: 5,
        },
      ],
      stocks: [
        { productId: 'ing-coffee', branchId: 'br-1', quantity: 70 },
        { productId: 'ing-sugar', branchId: 'br-1', quantity: 50 },
      ],
    });
    const result = engine.validateCart(ctx, [line('prod-cmd', 10)]);
    expect(result.lines[0].decision).toBe('APPROVED');
  });

  it('should REJECT a composed product when one ingredient runs short — the binding constraint', () => {
    const ctx = makeCtx({
      recipes: [
        {
          productId: 'prod-cmd',
          ingredientProductId: 'ing-coffee',
          quantity: 7,
        },
        {
          productId: 'prod-cmd',
          ingredientProductId: 'ing-sugar',
          quantity: 5,
        },
      ],
      stocks: [
        { productId: 'ing-coffee', branchId: 'br-1', quantity: 70 }, // enough for 10
        { productId: 'ing-sugar', branchId: 'br-1', quantity: 20 }, // enough for only 4
      ],
    });
    const result = engine.validateCart(ctx, [line('prod-cmd', 10)]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('INSUFFICIENT_STOCK');
  });

  it('should REJECT a composed product when an ingredient has no stock entry at all', () => {
    const ctx = makeCtx({
      recipes: [
        { productId: 'prod-cmd', ingredientProductId: 'ing-cup', quantity: 1 },
      ],
      stocks: [],
    });
    const result = engine.validateCart(ctx, [line('prod-cmd', 1)]);
    expect(result.lines[0].reason).toBe('INSUFFICIENT_STOCK');
  });

  it('ignores the composed product’s own (nonexistent) stock entry once it has recipe lines', () => {
    // Le produit a un ancien enregistrement de stock propre (résiduel) mais
    // possède désormais une recette — seuls les ingrédients comptent.
    const ctx = makeCtx({
      recipes: [
        {
          productId: 'prod-cmd',
          ingredientProductId: 'ing-coffee',
          quantity: 7,
        },
      ],
      stocks: [
        { productId: 'prod-cmd', branchId: 'br-1', quantity: 999 },
        { productId: 'ing-coffee', branchId: 'br-1', quantity: 7 },
      ],
    });
    const result = engine.validateCart(ctx, [line('prod-cmd', 1)]);
    expect(result.lines[0].decision).toBe('APPROVED');
  });

  // ── Étape 3 : quota ───────────────────────────────────────────────────────

  it('should REJECT when quota exceeded — rule §3.3.3', () => {
    const ctx = makeCtx({
      quotas: [
        {
          employeeId: 'emp-1',
          productId: 'prod-cmd',
          maxQuantity: 5,
          usedQuantity: 4,
        },
      ],
    });
    const result = engine.validateCart(ctx, [line('prod-cmd', 2)]);
    expect(result.lines[0].decision).toBe('REJECTED');
    expect(result.lines[0].reason).toBe('QUOTA_EXCEEDED');
  });

  it('should APPROVE when quantity fits within remaining quota', () => {
    const ctx = makeCtx({
      quotas: [
        {
          employeeId: 'emp-1',
          productId: 'prod-cmd',
          maxQuantity: 10,
          usedQuantity: 3,
        },
      ],
    });
    const result = engine.validateCart(ctx, [line('prod-cmd', 5)]);
    expect(result.lines[0].decision).toBe('APPROVED');
  });

  it('should APPROVE when no quota is configured for the product', () => {
    const result = engine.validateCart(makeCtx(), [line('prod-cmd', 3)]);
    expect(result.lines[0].decision).toBe('APPROVED');
  });

  // ── Strict order: role checked BEFORE stock, stock BEFORE quota ───────────

  it('should stop at step 1 (not check stock) when product is VIP', () => {
    const ctx = makeCtx();
    ctx.stocks = []; // no stock at all — should not reach step 2
    const result = engine.validateCart(ctx, [line('prod-vip')]);
    expect(result.lines[0].reason).toBe('PRODUCT_NOT_COMMANDABLE');
  });

  it('should stop at step 2 (not check quota) when stock is insufficient', () => {
    const ctx = makeCtx({
      quotas: [
        {
          employeeId: 'emp-1',
          productId: 'prod-cmd',
          maxQuantity: 100,
          usedQuantity: 0,
        },
      ],
    });
    const result = engine.validateCart(ctx, [line('prod-cmd', 50)]);
    expect(result.lines[0].reason).toBe('INSUFFICIENT_STOCK');
  });

  // ── Agrégation du panier ──────────────────────────────────────────────────

  it('should return PARTIALLY_REJECTED when at least one line is rejected', () => {
    const result = engine.validateCart(makeCtx(), [
      line('prod-cmd', 1),
      line('prod-vip', 1),
    ]);
    expect(result.overallDecision).toBe('PARTIALLY_REJECTED');
  });

  it('should return APPROVED when all lines pass all checks', () => {
    const result = engine.validateCart(makeCtx(), [line('prod-cmd', 1)]);
    expect(result.overallDecision).toBe('APPROVED');
  });

  it('should not block the entire cart for a single rejected line', () => {
    const result = engine.validateCart(makeCtx(), [
      line('prod-cmd', 1),
      line('prod-vip', 1),
    ]);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].decision).toBe('APPROVED');
    expect(result.lines[1].decision).toBe('REJECTED');
    // Overall is PARTIALLY_REJECTED, not a full block
    expect(result.overallDecision).toBe('PARTIALLY_REJECTED');
  });
});
