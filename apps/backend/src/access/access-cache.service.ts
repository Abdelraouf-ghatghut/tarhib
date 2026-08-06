import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import type { DataScope } from './access-policy.service.js';

/**
 * Cache best-effort du profil d'accès résolu (PR-1.0) — cible le principal
 * amplificateur de charge par requête : JwtStrategy.validate() refaisait
 * systématiquement employé + rôles + permissions en base (2-3 requêtes SQL)
 * à CHAQUE appel authentifié.
 *
 * Clé stable par keycloakId (= JWT `sub`, connu AVANT toute requête DB — un
 * hit évite donc le lookup Employee ET la résolution des rôles, pas
 * seulement le second). TTL court, jamais l'autorité : Redis en panne ou une
 * entrée absente retombe systématiquement sur la résolution DB complète
 * (cf. JwtStrategy). Invalidation explicite par EmployeesService à chaque
 * mutation d'un champ qui affecte l'accès (rôle, société, branche, statut
 * actif) — le TTL borne le pire cas si une invalidation était oubliée.
 */
export interface CachedAccessProfile {
  employeeId: string;
  email: string;
  companyId: string;
  branchId?: string;
  roleId?: string;
  roleIds?: string[];
  roleName?: string;
  roleNames?: string[];
  scope?: 'TARHIB' | 'CLIENT';
  role: string;
  permissions: string[];
  capabilities?: Record<string, boolean>;
  modules?: string[];
  dataScope?: DataScope;
}

const TTL_SECONDS = 60;

@Injectable()
export class AccessCacheService {
  private readonly logger = new Logger(AccessCacheService.name);

  constructor(private readonly redis: RedisService) {}

  private key(keycloakId: string): string {
    return `access:v1:${keycloakId}`;
  }

  async get(keycloakId: string): Promise<CachedAccessProfile | null> {
    try {
      const raw = await this.redis.get(this.key(keycloakId));
      if (!raw) return null;
      return JSON.parse(raw) as CachedAccessProfile;
    } catch (err: unknown) {
      // Best-effort : Redis en panne ou entrée corrompue → cache miss silencieux,
      // l'appelant retombe sur la résolution DB complète.
      this.logger.warn(
        `Lecture cache d'accès échouée (dégradé) : ${String(err)}`,
      );
      return null;
    }
  }

  async set(keycloakId: string, profile: CachedAccessProfile): Promise<void> {
    try {
      await this.redis.set(
        this.key(keycloakId),
        JSON.stringify(profile),
        TTL_SECONDS,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Écriture cache d'accès échouée (ignorée) : ${String(err)}`,
      );
    }
  }

  /** Sans effet si keycloakId est absent (ex. employé jamais connecté) — normal. */
  async invalidate(keycloakId: string | null | undefined): Promise<void> {
    if (!keycloakId) return;
    try {
      await this.redis.del(this.key(keycloakId));
    } catch (err: unknown) {
      // Pire cas si Redis est indisponible ici : la donnée périmée survit
      // jusqu'à expiration du TTL (60s) — jamais un blocage de la mutation.
      this.logger.warn(
        `Invalidation cache d'accès échouée (survivra au TTL) : ${String(err)}`,
      );
    }
  }
}
