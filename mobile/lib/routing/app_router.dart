import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_controller.dart';
import '../features/agent/commande_detail/agent_commande_detail_screen.dart';
import '../features/agent/dashboard/agent_dashboard_screen.dart';
import '../features/agent/file_attente/file_attente_screen.dart';
import '../features/agent/livraison/livraisons_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/employe/catalogue/catalogue_screen.dart';
import '../features/employe/commande/commande_detail_screen.dart';
import '../features/employe/commande/nouvelle_commande_screen.dart';
import '../features/employe/dashboard/employe_dashboard_screen.dart';
import '../features/employe/historique/historique_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/profil/profil_screen.dart';
import 'role_guard.dart';

/// Pont entre `authControllerProvider` (Riverpod) et `GoRouter.refreshListenable`
/// (un simple `Listenable`) : go_router réévalue `redirect` chaque fois que
/// l'état d'authentification change, sans recréer le routeur lui-même.
class _NotificateurDeRafraichissement extends ChangeNotifier {
  void notifierChangement() => notifyListeners();
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final notificateur = _NotificateurDeRafraichissement();
  ref.listen(authControllerProvider, (_, _) {
    notificateur.notifierChangement();
  });
  ref.onDispose(notificateur.dispose);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: notificateur,
    redirect: (context, state) => redirigerSelonRole(ref, state),
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      // Nœud de redirection automatique (§4.2) : jamais affiché, `redirigerSelonRole`
      // envoie systématiquement vers le dashboard du rôle courant.
      GoRoute(
        path: '/home',
        builder: (context, state) => const SizedBox.shrink(),
      ),
      GoRoute(
        path: '/home/employe',
        builder: (context, state) => const EmployeDashboardScreen(),
        routes: [
          GoRoute(
            path: 'catalogue',
            builder: (context, state) => const CatalogueScreen(),
          ),
          GoRoute(
            path: 'commande/nouvelle',
            builder: (context, state) => const NouvelleCommandeScreen(),
          ),
          GoRoute(
            path: 'commande/:id',
            builder: (context, state) =>
                CommandeDetailScreen(commandeId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'historique',
            builder: (context, state) => const HistoriqueScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/home/agent',
        builder: (context, state) => const AgentDashboardScreen(),
        routes: [
          GoRoute(
            path: 'file-attente',
            builder: (context, state) => const FileAttenteScreen(),
          ),
          GoRoute(
            path: 'commande/:id',
            builder: (context, state) => AgentCommandeDetailScreen(
              commandeId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: 'livraisons',
            builder: (context, state) => const LivraisonsScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/profil',
        builder: (context, state) => const ProfilScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
    ],
  );
});
