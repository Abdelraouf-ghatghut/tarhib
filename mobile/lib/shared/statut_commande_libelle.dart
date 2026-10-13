import 'package:flutter/widgets.dart';

import '../l10n/generated/app_localizations.dart';

/// Traduit un `statut` brut de l'enum `statut_commande` (backend) en libellé
/// localisé — le backend ne renvoie jamais de texte, seulement le code
/// (cf. règle bilinguisme de CLAUDE.md).
String libelleStatutCommande(BuildContext context, String statut) {
  final l10n = AppLocalizations.of(context)!;
  switch (statut) {
    case 'en_attente':
      return l10n.statutEnAttente;
    case 'en_attente_approbation':
      return l10n.statutEnAttenteApprobation;
    case 'validee':
      return l10n.statutValidee;
    case 'refusee':
      return l10n.statutRefusee;
    case 'en_preparation':
      return l10n.statutEnPreparation;
    case 'en_livraison':
      return l10n.statutEnLivraison;
    case 'livree':
      return l10n.statutLivree;
    case 'annulee':
      return l10n.statutAnnulee;
    default:
      return statut;
  }
}
