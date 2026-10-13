import 'package:flutter/material.dart';

import '../../l10n/generated/app_localizations.dart';

/// Affichage d'erreur générique avec action de nouvelle tentative, partagé
/// par tous les écrans qui consomment un `FutureProvider` Riverpod.
class ErreurAvecRetry extends StatelessWidget {
  const ErreurAvecRetry({required this.onReessayer, super.key});

  final VoidCallback onReessayer;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l10n.erreurChargement),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: onReessayer, child: Text(l10n.reessayer)),
        ],
      ),
    );
  }
}
