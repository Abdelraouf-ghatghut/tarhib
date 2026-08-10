import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/employee/home_screen.dart';
import 'screens/employee/catalog_screen.dart';
import 'screens/employee/cart_screen.dart';
import 'screens/employee/favorites_screen.dart';
import 'screens/employee/history_screen.dart';
import 'screens/employee/meeting_rooms_screen.dart';
import 'screens/employee/order_tracking_screen.dart';
import 'screens/agent/order_detail_screen.dart';
import 'screens/agent/queue_screen.dart';
import 'screens/agent/vip_stock_screen.dart';
import 'screens/manager/manager_dashboard_screen.dart';
import 'screens/manager/manager_order_detail_screen.dart';
import 'screens/manager/manager_orders_screen.dart';
import 'screens/profile/profile_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final loggedIn = authState.isAuthenticated;
      final onLogin = state.matchedLocation == '/login';

      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) {
        if (authState.isTarhibStaff) return authState.operationsHomePath;
        return '/employee';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // ── Employee shell ──────────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => EmployeeHomeScreen(child: child),
        routes: [
          GoRoute(path: '/employee', builder: (_, __) => const CatalogScreen()),
          GoRoute(
            path: '/employee/favorites',
            builder: (_, __) => const FavoritesScreen(),
          ),
          GoRoute(path: '/employee/cart', builder: (_, __) => const CartScreen()),
          GoRoute(path: '/employee/orders', builder: (_, __) => const HistoryScreen()),
          GoRoute(
            path: '/employee/orders/:id',
            builder: (_, state) =>
                OrderTrackingScreen(orderId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/employee/rooms',
            redirect: (_, __) =>
                authState.canBookMeeting ? null : '/employee',
            builder: (_, __) => const MeetingRoomsScreen(),
          ),
        ],
      ),

      // ── Hospitality agent ───────────────────────────────────────────────────
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

      // ── Department manager ──────────────────────────────────────────────────
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
        redirect: (_, __) => authState.canViewOperationsDashboard
            ? null
            : authState.operationsHomePath,
        builder: (_, __) => const ManagerDashboardScreen(),
      ),

      // ── Profile (all roles) ─────────────────────────────────────────────────
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});
