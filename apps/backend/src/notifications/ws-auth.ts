import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

/**
 * Vérification JWT pour le handshake WebSocket (PR-0.6a) — même JWKS Keycloak
 * que JwtStrategy (auth HTTP), mais implémentée directement en promesse : un
 * middleware Socket.IO (`server.use`) n'est pas un contexte Nest/Passport, on
 * ne peut pas y réutiliser le Guard HTTP tel quel.
 *
 * Vérifie uniquement l'identité (signature, expiration) — PAS les permissions
 * ni companyId/branchId du token (ces derniers peuvent être périmés, cf. E5 :
 * l'appelant doit re-résoudre companyId/branchId depuis la base, pas leur
 * faire confiance depuis le JWT).
 */
export function createWsTokenVerifier(
  jwksUri: string,
): (token: string) => Promise<{ sub: string }> {
  const client = new JwksClient({
    jwksUri,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return async function verify(token: string): Promise<{ sub: string }> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new Error('malformedToken');
    }
    const signingKey = await client.getSigningKey(decoded.header.kid);
    const publicKey = signingKey.getPublicKey();
    const payload = jwt.verify(token, publicKey) as jwt.JwtPayload;
    if (!payload.sub) throw new Error('missingSub');
    return { sub: payload.sub };
  };
}
