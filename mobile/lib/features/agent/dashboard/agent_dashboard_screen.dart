import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../l10n/generated/app_localizations.dart';

class AgentDashboardScreen extends ConsumerWidget {
  const AgentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final profil = ref.watch(authControllerProvider).value?.profil;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.accueilAgent),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: l10n.boutonDeconnexion,
            onPressed: () =>
                ref.read(authControllerProvider.notifier).deconnecter(),
          ),
        ],
      ),
      body: Center(
        child: Text(
          profil == null
              ? l10n.accueilAgent
              : '${l10n.accueilAgent} — ${profil.prenom}',
        ),
      ),
    );
  }
}
