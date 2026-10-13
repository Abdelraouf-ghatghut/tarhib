import 'package:flutter/widgets.dart';

import '../l10n/generated/app_localizations.dart';

/// Traduit un `code_refus` brut de l'enum `code_refus_commande` (réponse 422
/// de `POST /commandes`) en message localisé — le backend ne renvoie jamais
/// de texte, seulement le code (cf. règle bilinguisme de CLAUDE.md).
String? libelleCodeRefusCommande(BuildContext context, String? codeRefus) {
  final l10n = AppLocalizations.of(context)!;
  switch (codeRefus) {
    case 'produit_indisponible':
      return l10n.refusProduitIndisponible;
    case 'stock_insuffisant':
      return l10n.refusStockInsuffisant;
    case 'quota_depasse':
      return l10n.refusQuotaDepasse;
    case 'horaire_ferme':
      return l10n.refusHoraireFerme;
    case 'role_non_autorise':
      return l10n.refusRoleNonAutorise;
    default:
      return null;
  }
}
