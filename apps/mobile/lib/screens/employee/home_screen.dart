import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/glass_nav_bar.dart';

class EmployeeHomeScreen extends ConsumerWidget {
  final Widget child;
  const EmployeeHomeScreen({super.key, required this.child});

  static const _tabs = [
    '/employee',
    '/employee/favorites',
    '/employee/cart',
    '/employee/orders',
  ];

  int _currentIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/employee/orders')) return 3;
    if (loc.startsWith('/employee/cart')) return 2;
    if (loc.startsWith('/employee/favorites')) return 1;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final cartCount =
        ref.watch(cartProvider).fold<int>(0, (s, line) => s + line.quantity);
    final idx = _currentIndex(context);
    final auth = ref.watch(authProvider);
    final locale = ref.watch(localeProvider);
    final favoritesLabel =
        locale.languageCode == 'ar' ? 'المفضلة' : 'Favorites';

    // Badge commandes en cours sur l'onglet historique
    final inProgressCount = ref
            .watch(ordersProvider)
            .whenData((orders) => orders
                .where((o) => o.status.name == 'IN_PROGRESS')
                .length)
            .value ??
        0;

    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? l.goodMorning
        : hour < 18
            ? l.goodAfternoon
            : l.goodEvening;

    final initials = (auth.email ?? 'U')
        .split('@')
        .first
        .split('.')
        .map((s) => s.isNotEmpty ? s[0].toUpperCase() : '')
        .take(2)
        .join();

    return Scaffold(
      // ── Header SnowUI : carte blanche flottante, avatar + salutation ────────
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight + 16),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: SnowColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: SnowColors.primary.withValues(alpha: 0.08),
              ),
              boxShadow: [
                BoxShadow(
                  color: SnowColors.primary.withValues(alpha: 0.10),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => context.push('/profile'),
                  child: CircleAvatar(
                    radius: 19,
                    backgroundColor: SnowColors.primarySoft,
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: SnowColors.primaryStrong,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        greeting,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: SnowColors.textMuted,
                          height: 1.15,
                        ),
                      ),
                      Text(
                        auth.email ?? l.appTitle,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: SnowColors.textPrimary,
                          height: 1.15,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // Badge panier rapide (hors onglet panier)
                if (cartCount > 0 && idx != 2)
                  _HeaderIconButton(
                    icon: Icons.shopping_cart_rounded,
                    badge: cartCount,
                    accent: SnowColors.primary,
                    accentSoft: SnowColors.primarySoft,
                    onTap: () => context.go('/employee/cart'),
                  ),
                const SizedBox(width: 6),
                if (auth.canBookMeeting) ...[
                  _HeaderIconButton(
                    icon: Icons.meeting_room_outlined,
                    accent: SnowColors.textSecondary,
                    accentSoft: SnowColors.surfaceMuted,
                    onTap: () => context.push('/employee/rooms'),
                  ),
                  const SizedBox(width: 6),
                ],
                _HeaderIconButton(
                  icon: Icons.notifications_none_rounded,
                  accent: SnowColors.textSecondary,
                  accentSoft: SnowColors.surfaceMuted,
                  onTap: () => context.push('/profile'),
                ),
                const SizedBox(width: 6),
                GestureDetector(
                  onTap: () {
                    final next = locale.languageCode == 'ar' ? 'en' : 'ar';
                    ref.read(localeProvider.notifier).state = Locale(next);
                  },
                  child: Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: SnowColors.surfaceMuted,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      locale.languageCode == 'ar' ? 'EN' : 'ع',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: SnowColors.primaryStrong,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: GlassNavBar(
        selectedIndex: idx,
        onDestinationSelected: (i) => context.go(_tabs[i]),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.grid_view_outlined),
            selectedIcon: const Icon(Icons.grid_view_rounded),
            label: l.catalog,
          ),
          NavigationDestination(
            icon: const Icon(Icons.favorite_border_rounded),
            selectedIcon: const Icon(Icons.favorite_rounded),
            label: favoritesLabel,
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text('$cartCount'),
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text('$cartCount'),
              child: const Icon(Icons.shopping_cart_rounded),
            ),
            label: l.cart,
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: inProgressCount > 0,
              label: Text('$inProgressCount'),
              child: const Icon(Icons.receipt_long_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: inProgressCount > 0,
              label: Text('$inProgressCount'),
              child: const Icon(Icons.receipt_long_rounded),
            ),
            label: l.myOrders,
          ),
        ],
      ),
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              SnowColors.primary.withValues(alpha: 0.055),
              SnowColors.background,
              SnowColors.background,
            ],
          ),
        ),
        child: child,
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.onTap,
    required this.accent,
    required this.accentSoft,
    this.badge,
  });

  final IconData icon;
  final VoidCallback onTap;
  final Color accent;
  final Color accentSoft;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: accentSoft, shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: accent),
          ),
          if (badge != null && badge! > 0)
            Positioned(
              top: -2,
              right: -2,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                constraints: const BoxConstraints(minWidth: 16),
                decoration: BoxDecoration(
                  color: SnowColors.primary,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: [
                    BoxShadow(
                        color: SnowColors.primary.withValues(alpha: 0.4),
                        blurRadius: 6),
                  ],
                ),
                child: Text(
                  '$badge',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
