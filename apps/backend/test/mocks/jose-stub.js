/**
 * Stub Jest pour `jose` (dépendance de jwks-rsa) : le paquet est ESM-only et
 * fait échouer le chargement des suites qui importent JwtStrategy. Les tests
 * unitaires ne vérifient jamais de signature JWKS réelle — les fonctions ne
 * sont donc jamais appelées, seul l'import doit réussir.
 */
module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === '__esModule') return true;
      return () => {
        throw new Error(
          `jose.${String(prop)} appelé dans un test unitaire — mocker JwksClient/KeycloakService à la place`,
        );
      };
    },
  },
);
