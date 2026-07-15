import { Injectable } from '@nestjs/common';
import {
  CartValidationResult,
  LineValidationResult,
} from './validation-result.dto.js';
import { CreateOrderLineDto } from '../dto/create-order-line.dto.js';

export interface ProductSnapshot {
  id: string;
  type: 'COMMANDABLE' | 'LIBRE_SERVICE_VIP';
  allowedRoles: string[] | null;
  allowedBranches: string[] | null;
  active: boolean;
}

export interface StockSnapshot {
  productId: string;
  branchId: string;
  quantity: number;
}

export interface QuotaSnapshot {
  employeeId: string;
  productId: string;
  maxQuantity: number;
  usedQuantity: number;
}

export interface ValidationContext {
  employeeId: string;
  companyId: string;
  branchId: string;
  /** Nom de rôle legacy — conservé pour compat descendante (anciens produits) */
  role: string;
  /** UUID du rôle dynamique — source de vérité pour allowedRoles */
  roleId: string | null;
  products: ProductSnapshot[];
  stocks: StockSnapshot[];
  quotas: QuotaSnapshot[];
}

/**
 * Moteur de validation des commandes — ordre STRICT (CLAUDE.md §3.3) :
 *  1. Produit commandable + rôle autorisé + branche autorisée (serveur, jamais UI seule)
 *  2. Stock disponible branche >= quantité (revérifié à la confirmation)
 *  3. Quota restant période >= quantité
 *
 * Agrégation : ligne rejetée ≠ commande annulée entière
 * (sauf config société stricte — à ajouter en V2).
 */
@Injectable()
export class ValidationEngineService {
  validateCart(
    ctx: ValidationContext,
    lines: CreateOrderLineDto[],
  ): CartValidationResult {
    const results: LineValidationResult[] = lines.map((line) =>
      this.validateLine(ctx, line.productId, line.quantity),
    );

    const hasRejected = results.some((r) => r.decision === 'REJECTED');
    const hasPending = results.some((r) => r.decision === 'PENDING_APPROVAL');

    let overallDecision: CartValidationResult['overallDecision'];
    if (hasRejected) {
      overallDecision = 'PARTIALLY_REJECTED';
    } else if (hasPending) {
      overallDecision = 'PENDING_APPROVAL';
    } else {
      overallDecision = 'APPROVED';
    }

    return { lines: results, overallDecision };
  }

  private validateLine(
    ctx: ValidationContext,
    productId: string,
    quantity: number,
  ): LineValidationResult {
    // Étape 1 — Produit commandable + rôle autorisé (§3.3.1)
    const product = ctx.products.find((p) => p.id === productId && p.active);
    if (!product || product.type !== 'COMMANDABLE') {
      return {
        productId,
        quantity,
        decision: 'REJECTED',
        reason: 'PRODUCT_NOT_COMMANDABLE',
      };
    }
    // allowedRoles contient désormais des roleId (UUID) — le nom de rôle
    // legacy reste accepté pour la compatibilité des anciens produits.
    if (
      product.allowedRoles &&
      !product.allowedRoles.includes(ctx.role) &&
      !(ctx.roleId && product.allowedRoles.includes(ctx.roleId))
    ) {
      return {
        productId,
        quantity,
        decision: 'REJECTED',
        reason: 'ROLE_NOT_ALLOWED',
      };
    }
    if (
      product.allowedBranches &&
      product.allowedBranches.length > 0 &&
      !product.allowedBranches.includes(ctx.branchId)
    ) {
      return {
        productId,
        quantity,
        decision: 'REJECTED',
        reason: 'BRANCH_NOT_ALLOWED',
      };
    }

    // Étape 2 — Stock disponible dans la branche (§3.3.2)
    const stock = ctx.stocks.find(
      (s) => s.productId === productId && s.branchId === ctx.branchId,
    );
    if (!stock || stock.quantity < quantity) {
      return {
        productId,
        quantity,
        decision: 'REJECTED',
        reason: 'INSUFFICIENT_STOCK',
      };
    }

    // Étape 3 — Quota restant sur la période active (§3.3.3)
    const quota = ctx.quotas.find(
      (q) => q.employeeId === ctx.employeeId && q.productId === productId,
    );
    if (quota && quota.maxQuantity - quota.usedQuantity < quantity) {
      return {
        productId,
        quantity,
        decision: 'REJECTED',
        reason: 'QUOTA_EXCEEDED',
      };
    }

    return { productId, quantity, decision: 'APPROVED' };
  }
}
