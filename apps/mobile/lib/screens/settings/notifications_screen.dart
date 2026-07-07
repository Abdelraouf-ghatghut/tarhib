import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/settings_tile.dart';
import '../../widgets/tarhib_scaffold.dart';

/// Préférences de notifications — stockage local (aucune API dédiée côté
/// backend pour des toggles granulaires ; l'enregistrement du token FCM,
/// lui, reste géré séparément par auth_provider au login).
class _NotifPrefs {
  static const _prefix = 'notif_';
  static const master = '${_prefix}master';
  static const newOrder = '${_prefix}new_order';
  static const orderApproved = '${_prefix}order_approved';
  static const orderRejected = '${_prefix}order_rejected';
  static const orderReady = '${_prefix}order_ready';
  static const offers = '${_prefix}offers';
  static const reminders = '${_prefix}reminders';
}

final _notifPrefsProvider =
    FutureProvider.autoDispose<Map<String, bool>>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return {
    _NotifPrefs.master: prefs.getBool(_NotifPrefs.master) ?? true,
    _NotifPrefs.newOrder: prefs.getBool(_NotifPrefs.newOrder) ?? true,
    _NotifPrefs.orderApproved: prefs.getBool(_NotifPrefs.orderApproved) ?? true,
    _NotifPrefs.orderRejected: prefs.getBool(_NotifPrefs.orderRejected) ?? true,
    _NotifPrefs.orderReady: prefs.getBool(_NotifPrefs.orderReady) ?? true,
    _NotifPrefs.offers: prefs.getBool(_NotifPrefs.offers) ?? true,
    _NotifPrefs.reminders: prefs.getBool(_NotifPrefs.reminders) ?? false,
  };
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _set(WidgetRef ref, String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
    ref.invalidate(_notifPrefsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final prefsAsync = ref.watch(_notifPrefsProvider);

    return TarhibScaffold(
      appBar: GlassAppBar(title: Text(l.notifications), centerTitle: true),
      child: SafeArea(
        child: prefsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => const SizedBox.shrink(),
          data: (prefs) {
            final master = prefs[_NotifPrefs.master] ?? true;
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 24, 20, 32),
              children: [
                GlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l.allowNotifications,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    value: master,
                    onChanged: (v) => _set(ref, _NotifPrefs.master, v),
                  ),
                ),
                const SizedBox(height: 24),
                Opacity(
                  opacity: master ? 1 : 0.4,
                  child: IgnorePointer(
                    ignoring: !master,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SettingsSectionLabel(l.orderNotifications),
                        GlassCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            children: [
                              _ToggleRow(
                                label: l.notifNewOrder,
                                value: prefs[_NotifPrefs.newOrder] ?? true,
                                onChanged: (v) => _set(ref, _NotifPrefs.newOrder, v),
                              ),
                              const Divider(height: 1),
                              _ToggleRow(
                                label: l.notifOrderApproved,
                                value: prefs[_NotifPrefs.orderApproved] ?? true,
                                onChanged: (v) => _set(ref, _NotifPrefs.orderApproved, v),
                              ),
                              const Divider(height: 1),
                              _ToggleRow(
                                label: l.notifOrderRejected,
                                value: prefs[_NotifPrefs.orderRejected] ?? true,
                                onChanged: (v) => _set(ref, _NotifPrefs.orderRejected, v),
                              ),
                              const Divider(height: 1),
                              _ToggleRow(
                                label: l.notifOrderReady,
                                value: prefs[_NotifPrefs.orderReady] ?? true,
                                onChanged: (v) => _set(ref, _NotifPrefs.orderReady, v),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        SettingsSectionLabel(l.otherNotifications),
                        GlassCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            children: [
                              _ToggleRow(
                                label: l.notifOffersUpdates,
                                value: prefs[_NotifPrefs.offers] ?? true,
                                onChanged: (v) => _set(ref, _NotifPrefs.offers, v),
                              ),
                              const Divider(height: 1),
                              _ToggleRow(
                                label: l.notifReminders,
                                value: prefs[_NotifPrefs.reminders] ?? false,
                                onChanged: (v) => _set(ref, _NotifPrefs.reminders, v),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  const _ToggleRow({required this.label, required this.value, required this.onChanged});
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label, style: const TextStyle(fontSize: 14, color: SnowColors.textPrimary)),
      value: value,
      onChanged: onChanged,
    );
  }
}
