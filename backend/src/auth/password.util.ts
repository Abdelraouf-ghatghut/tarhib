import * as bcrypt from 'bcrypt';

const NB_ROUNDS_BCRYPT = 12;

export function hashMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, NB_ROUNDS_BCRYPT);
}

export function comparerMotDePasse(
  motDePasse: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}
