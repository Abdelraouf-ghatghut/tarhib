import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/tarhib_scaffold.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final auth = ref.watch(authProvider);
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);
    final scheme = Theme.of(context).colorScheme;

    final initials = (auth.email ?? 'U')
        .split('@')
        .first
        .split('.')
        .map((s) => s.isNotEmpty ? s[0].toUpperCase() : '')
        .take(2)
        .join();

    return TarhibScaffold(
      appBar: GlassAppBar(title: Text(l.profile), centerTitle: true),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 24, 20, 32),
          children: [
            // ── Avatar ──────────────────────────────────────────────────────────
            Center(
              child: GlassCard(
                padding: EdgeInsets.zero,
                borderRadius: 999,
                child: Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: scheme.primary.withValues(alpha: 0.15),
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: scheme.primary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              auth.email ?? '—',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.2),
            ),
            const SizedBox(height: 4),
            Text(
              _roleLabel(auth.role, l),
              textAlign: TextAlign.center,
              style:
                  TextStyle(fontSize: 13, color: scheme.primary, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 32),

            // ── Info card ────────────────────────────────────────────────────────
            GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                children: [
                  _InfoRow(icon: Icons.badge_outlined, label: l.roleLabel, value: _roleLabel(auth.role, l)),
                  const Divider(indent: 56, endIndent: 16, height: 1),
                  _InfoRow(icon: Icons.email_outlined, label: l.email, value: auth.email ?? '—'),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Language toggle ──────────────────────────────────────────────────
            GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionLabel(l.language),
                  _LanguageTile(
                    code: 'ar',
                    label: l.arabic,
                    selected: locale.languageCode == 'ar',
                    onTap: () => ref.read(localeProvider.notifier).state = const Locale('ar'),
                  ),
                  const Divider(indent: 56, endIndent: 16, height: 1),
                  _LanguageTile(
                    code: 'en',
                    label: l.english,
                    selected: locale.languageCode == 'en',
                    onTap: () => ref.read(localeProvider.notifier).state = const Locale('en'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Theme selector ───────────────────────────────────────────────────
            GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionLabel(l.theme),
                  _ThemeTile(
                    icon: Icons.brightness_auto_rounded,
                    label: l.themeSystem,
                    selected: themeMode == ThemeMode.system,
                    onTap: () => ref.read(themeModeProvider.notifier).set(ThemeMode.system),
                  ),
                  const Divider(indent: 56, endIndent: 16, height: 1),
                  _ThemeTile(
                    icon: Icons.light_mode_rounded,
                    label: l.themeLight,
                    selected: themeMode == ThemeMode.light,
                    onTap: () => ref.read(themeModeProvider.notifier).set(ThemeMode.light),
                  ),
                  const Divider(indent: 56, endIndent: 16, height: 1),
                  _ThemeTile(
                    icon: Icons.dark_mode_rounded,
                    label: l.themeDark,
                    selected: themeMode == ThemeMode.dark,
                    onTap: () => ref.read(themeModeProvider.notifier).set(ThemeMode.dark),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // ── Logout ───────────────────────────────────────────────────────────
            FilledButton.icon(
              onPressed: () => ref.read(authProvider.notifier).logout(),
              icon: const Icon(Icons.logout_rounded),
              label: Text(l.logout),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: scheme.error,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _roleLabel(String? role, AppLocalizations l) => switch (role) {
        'HOSPITALITY_AGENT' => l.roleAgent,
        'DEPARTMENT_MANAGER' => l.roleManager,
        'ADMIN' => l.roleAdmin,
        _ => l.roleEmployee,
      };
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45),
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: scheme.primary.withValues(alpha: 0.8)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 11,
                        color: scheme.onSurface.withValues(alpha: 0.5))),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LanguageTile extends StatelessWidget {
  const _LanguageTile(
      {required this.code, required this.label, required this.selected, required this.onTap});
  final String code;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      leading: Text(code == 'ar' ? '🇸🇦' : '🇬🇧', style: const TextStyle(fontSize: 22)),
      title: Text(label,
          style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
      trailing: selected ? Icon(Icons.check_rounded, color: scheme.primary, size: 20) : null,
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile(
      {required this.icon, required this.label, required this.selected, required this.onTap});
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      leading: Icon(icon, color: selected ? scheme.primary : scheme.onSurface.withValues(alpha: 0.55)),
      title: Text(label,
          style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
      trailing: selected ? Icon(Icons.check_rounded, color: scheme.primary, size: 20) : null,
    );
  }
}
