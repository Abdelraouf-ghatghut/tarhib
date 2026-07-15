import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/agent/order_detail_screen.dart';
import '../screens/agent/queue_screen.dart';
import '../screens/agent/vip_stock_screen.dart';
import '../screens/manager/manager_dashboard_screen.dart';
import '../screens/manager/manager_order_detail_screen.dart';
import '../screens/manager/manager_orders_screen.dart';
import '../screens/profile/profile_screen.dart';

final agentRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final loggedIn = authState.isAuthenticated;
      final onLogin = state.matchedLocation == '/login';

      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) {
        return authState.operationsHomePath;
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // ── Agent d'hospitalité ────────────────────────────────────────────────
      GoRoute(
        path: '/agent/queue',
        redirect: (_, __) =>
            authState.canViewOrderQueue ? null : authState.operationsHomePath,
        builder: (_, __) => const QueueScreen(),
      ),
      GoRoute(
        path: '/agent/orders/:id',
        redirect: (_, __) =>
            authState.canViewOrderQueue ? null : authState.operationsHomePath,
        builder: (_, state) =>
            AgentOrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/agent/vip-stock',
        redirect: (_, __) =>
            authState.canViewVip ? null : authState.operationsHomePath,
        builder: (_, __) => const VipStockScreen(),
      ),

      // ── Manager de département ─────────────────────────────────────────────
      GoRoute(
        path: '/manager/orders',
        redirect: (_, __) =>
            authState.isManager ? null : authState.operationsHomePath,
        builder: (_, __) => const ManagerOrdersScreen(),
      ),
      GoRoute(
        path: '/manager/orders/:id',
        redirect: (_, __) =>
            authState.isManager ? null : authState.operationsHomePath,
        builder: (_, state) =>
            ManagerOrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/manager/dashboard',
        redirect: (_, __) =>
            authState.canViewOperationsDashboard
                ? null
                : authState.operationsHomePath,
        builder: (_, __) => const ManagerDashboardScreen(),
      ),

      // ── Profil (partagé) ───────────────────────────────────────────────────
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});
