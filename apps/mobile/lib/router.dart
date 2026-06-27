import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/employee/home_screen.dart';
import 'screens/employee/catalog_screen.dart';
import 'screens/employee/cart_screen.dart';
import 'screens/employee/history_screen.dart';
import 'screens/employee/order_tracking_screen.dart';
import 'screens/agent/queue_screen.dart';
import 'screens/agent/order_detail_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final loggedIn = authState.isAuthenticated;
      final onLogin = state.matchedLocation == '/login';

      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) {
        return authState.isAgent ? '/agent/queue' : '/employee';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // ── Employee shell ──────────────────────────────────────────────────
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
        ],
      ),

      // ── Hospitality agent ───────────────────────────────────────────────
      GoRoute(path: '/agent/queue', builder: (_, __) => const QueueScreen()),
      GoRoute(
        path: '/agent/orders/:id',
        builder: (_, state) =>
            AgentOrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
    ],
  );
});
