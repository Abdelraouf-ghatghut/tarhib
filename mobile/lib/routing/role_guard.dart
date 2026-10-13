import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/app_role.dart';
import '../core/auth/auth_controller.dart';

/// Routes accessibles aux deux rôles une fois authentifié (en plus de l'espace
/// propre à chaque rôle sous `/home/employe` ou `/home/agent`).
const _routesCommunes = {'/home', '/profil', '/notifications'};

/// Implémente le mécanisme de redirection décrit au §4.1 du cahier des
/// charges, dans l'ordre indiqué :
/// 1. authentifié ? sinon → `/login`
/// 2. la route demandée appartient-elle à l'espace du rôle courant ? sinon →
///    le dashboard de ce rôle
/// 3. sinon, laisse passer
String? redirigerSelonRole(Ref ref, GoRouterState state) {
  final authState = ref.read(authControllerProvider);
  final session = authState.value;

  // Restauration de session (lecture du secure storage) encore en cours :
  // ne pas trancher. Le `refreshListenable` du routeur réévalue dès que
  // l'état devient disponible (cf. app_router.dart).
  if (authState.isLoading || session == null) {
    return null;
  }

  final destination = state.matchedLocation;
  final versLogin = destination == '/login';

  // Authentifié côté serveur mais rôle non pris en charge par l'app (cf.
  // AppRole) : traité comme non authentifié, l'app ne doit pas laisser entrer.
  if (!session.estAuthentifie) {
    return versLogin ? null : '/login';
  }

  final role = session.role!;

  // Un utilisateur authentifié ne doit jamais revoir l'écran de connexion ;
  // `/home` est un nœud de redirection automatique (cf. table §4.2), jamais
  // un écran affiché.
  if (versLogin || destination == '/home') {
    return _accueilDuRole(role);
  }

  if (!_routesCommunes.contains(destination) &&
      !_appartientAuRole(destination, role)) {
    return _accueilDuRole(role);
  }

  return null;
}

String _accueilDuRole(AppRole role) =>
    role == AppRole.employe ? '/home/employe' : '/home/agent';

bool _appartientAuRole(String chemin, AppRole role) {
  return role == AppRole.employe
      ? chemin.startsWith('/home/employe')
      : chemin.startsWith('/home/agent');
}
