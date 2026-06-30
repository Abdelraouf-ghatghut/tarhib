import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/employee/home_screen.dart';
import '../screens/employee/catalog_screen.dart';
import '../screens/employee/cart_screen.dart';
import '../screens/employee/history_screen.dart';
import '../screens/employee/meeting_rooms_screen.dart';
import '../screens/employee/order_tracking_screen.dart';
import '../screens/manager/manager_dashboard_screen.dart';
import '../screens/manager/manager_order_detail_screen.dart';
import '../screens/manager/manager_orders_screen.dart';
import '../screens/profile/profile_screen.dart';

final clientRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final loggedIn = authState.isAuthenticated;
      final onLogin = state.matchedLocation == '/login';

      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) {
        if (authState.hasPermission('order.approve')) return '/manager/orders';
        return '/employee';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // ── Employee shell ─────────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => EmployeeHomeScreen(child: child),
        routes: [
          GoRoute(path: '/employee', builder: (_, __) => const CatalogScreen()),
          GoRoute(path: '/employee/cart', builder: (_, __) => const CartScreen()),
          GoRoute(path: '/employee/orders', builder: (_, __) => const HistoryScreen()),
          GoRoute(
            path: '/employee/orders/:id',
            builder: (_, state) =>
                OrderTrackingScreen(orderId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/employee/rooms',
            builder: (_, __) => const MeetingRoomsScreen(),
          ),
        ],
      ),

      // ── Manager ────────────────────────────────────────────────────────────
      GoRoute(path: '/manager/orders', builder: (_, __) => const ManagerOrdersScreen()),
      GoRoute(
        path: '/manager/orders/:id',
        builder: (_, state) =>
            ManagerOrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/manager/dashboard',
        builder: (_, __) => const ManagerDashboardScreen(),
      ),

      // ── Profile ────────────────────────────────────────────────────────────
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});
