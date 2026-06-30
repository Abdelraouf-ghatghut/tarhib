import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_nav_bar.dart';
import '../../widgets/tarhib_scaffold.dart';

class EmployeeHomeScreen extends ConsumerWidget {
  final Widget child;
  const EmployeeHomeScreen({super.key, required this.child});

  static const _tabs = ['/employee', '/employee/cart', '/employee/orders'];

  int _currentIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/employee/orders')) return 2;
    if (loc.startsWith('/employee/cart')) return 1;
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

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              greeting,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.55),
                letterSpacing: 0.3,
              ),
            ),
            Text(
              auth.email ?? l.appTitle,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.2,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          // Badge panier rapide (hors onglet panier)
          if (cartCount > 0 && idx != 1)
            GestureDetector(
              onTap: () => context.go('/employee/cart'),
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .primary
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Theme.of(context)
                        .colorScheme
                        .primary
                        .withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shopping_cart_rounded,
                        size: 16,
                        color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: 5),
                    Text(
                      '$cartCount',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Toggle langue AR/EN
          IconButton(
            icon: Text(
              locale.languageCode == 'ar' ? 'EN' : 'ع',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            onPressed: () {
              final next = locale.languageCode == 'ar' ? 'en' : 'ar';
              ref.read(localeProvider.notifier).state = Locale(next);
            },
            tooltip: l.language,
          ),

          // Meeting rooms shortcut
          IconButton(
            icon: const Icon(Icons.meeting_room_outlined, size: 22),
            onPressed: () => context.push('/employee/rooms'),
            tooltip: l.meetingRooms,
          ),
          // Profil
          IconButton(
            icon: const Icon(Icons.person_outline_rounded, size: 22),
            onPressed: () => context.push('/profile'),
            tooltip: l.profile,
          ),
          const SizedBox(width: 4),
        ],
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
      child: child,
    );
  }
}
