import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/tarhib_scaffold.dart';

/// Choix de langue — changement instantané, RTL/LTR automatique.
class LanguageScreen extends ConsumerWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final locale = ref.watch(localeProvider);

    return TarhibScaffold(
      appBar: GlassAppBar(title: Text(l.language), centerTitle: true),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 24, 20, 32),
          children: [
            Text(
              l.chooseLanguageHint,
              style: const TextStyle(fontSize: 13, color: SnowColors.textMuted, height: 1.5),
            ),
            const SizedBox(height: 20),
            GlassCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  _LanguageOption(
                    flag: '🇸🇦',
                    label: l.arabic,
                    subtitle: l.defaultLanguage,
                    selected: locale.languageCode == 'ar',
                    onTap: () => ref.read(localeProvider.notifier).state = const Locale('ar'),
                  ),
                  const Divider(indent: 60, endIndent: 16, height: 1),
                  _LanguageOption(
                    flag: '🇬🇧',
                    label: l.english,
                    selected: locale.languageCode == 'en',
                    onTap: () => ref.read(localeProvider.notifier).state = const Locale('en'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SnowColors.primarySoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 16, color: SnowColors.primaryStrong),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(l.languageAppliesInstantly,
                        style: const TextStyle(
                            fontSize: 12,
                            color: SnowColors.primaryStrong,
                            fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  const _LanguageOption({
    required this.flag,
    required this.label,
    this.subtitle,
    required this.selected,
    required this.onTap,
  });
  final String flag;
  final String label;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Text(flag, style: const TextStyle(fontSize: 24)),
      title: Text(label,
          style: TextStyle(
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500, fontSize: 15)),
      subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(fontSize: 12)) : null,
      trailing: selected
          ? const Icon(Icons.check_circle_rounded, color: SnowColors.primary, size: 22)
          : const Icon(Icons.circle_outlined, color: SnowColors.border, size: 22),
    );
  }
}
