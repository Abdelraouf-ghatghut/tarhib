import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/agent/order_detail_screen.dart';
import '../screens/agent/queue_screen.dart';
import '../screens/agent/vip_stock_screen.dart';
import '../screens/profile/profile_screen.dart';

final agentRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final loggedIn = authState.isAuthenticated;
      final onLogin = state.matchedLocation == '/login';

      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) return '/agent/queue';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // ── Agent queue ────────────────────────────────────────────────────────
      GoRoute(path: '/agent/queue', builder: (_, __) => const QueueScreen()),
      GoRoute(
        path: '/agent/orders/:id',
        builder: (_, state) =>
            AgentOrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/agent/vip-stock',
        builder: (_, __) => const VipStockScreen(),
      ),

      // ── Profile ────────────────────────────────────────────────────────────
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});
