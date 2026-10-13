export interface ProfilUtilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  actif: boolean;
  derniere_connexion: Date | null;
  entreprise: {
    id: string;
    nom: string;
  };
  site: {
    id: string;
    nom: string;
  } | null;
  departement: {
    id: string;
    nom: string;
  } | null;
  role: {
    id: string;
    code: string;
    nom: string;
    niveau_priorite: number;
  };
  permissions: string[];
}

/** Vue allégée utilisée pour le CRUD (création, liste, détail, modification) — sans les permissions. */
export interface UtilisateurResume {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  actif: boolean;
  derniere_connexion: Date | null;
  entreprise: {
    id: string;
    nom: string;
  };
  site: {
    id: string;
    nom: string;
  } | null;
  departement: {
    id: string;
    nom: string;
  } | null;
  role: {
    id: string;
    code: string;
    nom: string;
  };
}
