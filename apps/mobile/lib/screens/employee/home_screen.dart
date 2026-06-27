import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
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
        ref.watch(cartProvider).fold<int>(0, (s, l) => s + l.quantity);
    final idx = _currentIndex(context);

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.local_cafe_rounded,
              color: Theme.of(context).colorScheme.primary,
              size: 22,
            ),
            const SizedBox(width: 8),
            Text(
              l.appTitle,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authProvider.notifier).logout(),
            tooltip: l.logout,
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
            selectedIcon: const Icon(Icons.shopping_cart_rounded),
            label: l.cart,
          ),
          NavigationDestination(
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long_rounded),
            label: l.myOrders,
          ),
        ],
      ),
      child: child,
    );
  }
}
