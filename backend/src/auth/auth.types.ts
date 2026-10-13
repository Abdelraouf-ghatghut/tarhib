export interface AccessTokenPayload {
  sub: string; // utilisateur_id
  role: string; // roles.code
  entreprise_id: string;
  site_id: string | null;
  departement_id: string | null;
}

export interface RefreshTokenPayload {
  sub: string; // utilisateur_id
  jti: string; // refresh_tokens.id
  rt: string; // secret brut, vérifié contre refresh_tokens.token_hash
}

export type AuthenticatedUser = AccessTokenPayload;

export interface RequestAvecUtilisateur {
  user?: AuthenticatedUser;
}
