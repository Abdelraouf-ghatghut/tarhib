import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface.js';

/**
 * Quota par utilisateur authentifié (JWT sub), pas par IP : à 1500+ employés
 * répartis sur plusieurs branches, un quota par IP serait partagé par tous
 * les employés d'une même branche derrière le même NAT/proxy d'entreprise —
 * un seul quota épuisé bloquerait tout le monde. Repli sur l'IP pour les
 * routes publiques (login, OTP...) où aucun utilisateur n'est encore résolu.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: {
    user?: JwtPayload;
    ip: string;
  }): Promise<string> {
    return Promise.resolve(req.user?.sub ?? req.ip);
  }
}
