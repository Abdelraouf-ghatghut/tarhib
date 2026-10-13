import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/locale_controller.dart';
import '../../l10n/generated/app_localizations.dart';

/// Sélecteur de langue (cf. cahier des charges §12) : les noms des langues
/// ("العربية", "English") sont des endonymes, pas du texte d'interface — ils
/// ne passent donc pas par `intl`, comme c'est l'usage pour ce type de menu.
class ProfilScreen extends ConsumerWidget {
  const ProfilScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final localeActive = ref.watch(localeControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.profilTitre)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.profilLangue,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            SegmentedButton<Locale>(
              segments: const [
                ButtonSegment(value: Locale('ar'), label: Text('العربية')),
                ButtonSegment(value: Locale('en'), label: Text('English')),
              ],
              selected: {localeActive},
              onSelectionChanged: (selection) => ref
                  .read(localeControllerProvider.notifier)
                  .changerLangue(selection.first),
            ),
          ],
        ),
      ),
    );
  }
}
