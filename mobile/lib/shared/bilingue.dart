import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Le backend renvoie systématiquement `nom_ar`/`nom_en` (jamais de texte déjà
/// traduit, cf. CLAUDE.md) — c'est ici que l'app choisit le champ à afficher
/// selon la langue active.
String texteBilingue(
  BuildContext context, {
  required String ar,
  required String en,
}) {
  final langue = Localizations.localeOf(context).languageCode;
  return langue == 'en' ? en : ar;
}

/// Dinar libyen (LYD) : symbole `د.ل` en arabe, code `LYD` en anglais
/// (cf. cahier des charges §12).
///
/// Chiffres : le cahier des charges §12 indique explicitement que ce point
/// (numérotation occidentale 0123 vs. arabe-orientale ٠١٢٣) reste « à
/// confirmer avant le développement de l'écran de commande et des montants ».
/// En l'absence de confirmation, on force la numérotation occidentale
/// (NumberFormat construit avec la locale `en`, seul le symbole de devise
/// varie) car c'est l'usage déclaré majoritaire en Libye dans le même
/// paragraphe — à revoir explicitement si le métier tranche autrement.
String formaterPrix(BuildContext context, double montant) {
  final langue = Localizations.localeOf(context).languageCode;
  final format = NumberFormat.currency(
    locale: 'en',
    symbol: langue == 'en' ? 'LYD' : 'د.ل',
    decimalDigits: 2,
  );
  return format.format(montant);
}

/// Même décision que [formaterPrix] concernant la numérotation (occidentale).
String formaterNombre(num valeur) {
  return NumberFormat.decimalPattern('en').format(valeur);
}
