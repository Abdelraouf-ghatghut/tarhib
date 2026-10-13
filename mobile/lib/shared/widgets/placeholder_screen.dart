import 'package:flutter/material.dart';

import '../../l10n/generated/app_localizations.dart';

/// Stub pour les écrans dont le contenu métier n'est pas encore implémenté
/// (catalogue, historique, file d'attente...). Garde la structure de routes
/// du cahier des charges §4.2 navigable dès ce socle, sans texte en dur :
/// le message est traduit comme le reste de l'app.
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(body: Center(child: Text(l10n.placeholderEnConstruction)));
  }
}
