import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/bookings_provider.dart';
import '../../providers/orders_provider.dart';
import '../../providers/quotas_provider.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/kpi_card.dart';
import '../../widgets/settings_tile.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/tarhib_scaffold.dart';

/// Carte profil + statistiques rapides + navigation vers les réglages —
/// reprend exactement les codes visuels du Dashboard SnowUI (Web Admin).
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final auth = ref.watch(authProvider);

    final ordersCount = ref.watch(ordersProvider).value?.length;
    final bookingsCount =
        auth.canBookMeeting ? ref.watch(myBookingsCountProvider).value : null;
    final quotasCount = ref.watch(quotasProvider).value?.length;

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
            // ── Profile card ──────────────────────────────────────────────
            GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
              child: Column(
                children: [
                  Container(
                    width: 84,
                    height: 84,
                    decoration: const BoxDecoration(
                      color: SnowColors.primarySoft,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        initials,
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                          color: SnowColors.primaryStrong,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    auth.email ?? '-',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: SnowColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  StatusBadge(
                    label: l.accountApproved,
                    tone: SnowStatusTone.success,
                    icon: Icons.verified_rounded,
                    dense: true,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Quick stats ───────────────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: KpiCard(
                    icon: Icons.receipt_long_rounded,
                    value: '${ordersCount ?? '-'}',
                    label: l.myOrders,
                    accent: SnowColors.primary,
                    accentSoft: SnowColors.primarySoft,
                  ),
                ),
                if (auth.canBookMeeting) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: KpiCard(
                      icon: Icons.meeting_room_rounded,
                      value: '${bookingsCount ?? '-'}',
                      label: l.myBookings,
                      accent: SnowColors.info,
                      accentSoft: SnowColors.infoSoft,
                    ),
                  ),
                ],
                const SizedBox(width: 10),
                Expanded(
                  child: KpiCard(
                    icon: Icons.pie_chart_rounded,
                    value: '${quotasCount ?? '-'}',
                    label: l.quotasTracked,
                    accent: SnowColors.successStrong,
                    accentSoft: SnowColors.successSoft,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── Navigation list ───────────────────────────────────────────
            SettingsSectionLabel(l.settingsTitle),
            SettingsTile(
              icon: Icons.person_outline_rounded,
              title: l.personalInfo,
              subtitle: auth.email,
              onTap: () => _showPersonalInfo(context, l, auth.email, auth.role),
            ),
            const SizedBox(height: 8),
            SettingsTile(
              icon: Icons.language_rounded,
              title: l.languageAppearance,
              onTap: () => context.push('/settings/language'),
            ),
            const SizedBox(height: 8),
            SettingsTile(
              icon: Icons.notifications_none_rounded,
              title: l.notifications,
              onTap: () => context.push('/settings/notifications'),
            ),
            const SizedBox(height: 8),
            SettingsTile(
              icon: Icons.info_outline_rounded,
              title: l.aboutApp,
              onTap: () => context.push('/settings/about'),
            ),
            const SizedBox(height: 24),

            SettingsTile(
              icon: Icons.logout_rounded,
              title: l.logout,
              destructive: true,
              onTap: () => ref.read(authProvider.notifier).logout(),
            ),
          ],
        ),
      ),
    );
  }

  void _showPersonalInfo(
      BuildContext context, AppLocalizations l, String? email, String? role) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        decoration: const BoxDecoration(
          color: SnowColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.personalInfo,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            const SizedBox(height: 16),
            _InfoLine(icon: Icons.email_outlined, label: l.email, value: email ?? '-'),
            const SizedBox(height: 12),
            _InfoLine(
                icon: Icons.badge_outlined,
                label: l.roleLabel,
                value: role ?? l.roleEmployee),
          ],
        ),
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: SnowColors.primary),
        const SizedBox(width: 12),
        Text(label, style: const TextStyle(fontSize: 13, color: SnowColors.textMuted)),
        const Spacer(),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      ],
    );
  }
}
