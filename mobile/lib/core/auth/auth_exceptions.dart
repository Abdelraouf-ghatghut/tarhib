/// Levée par [AuthController.connecter] quand le serveur authentifie
/// l'utilisateur mais que son rôle n'est pas l'un des deux pris en charge par
/// l'app mobile (cf. cahier des charges §4.1).
class RoleNonSupporteParAppException implements Exception {
  RoleNonSupporteParAppException(this.codeRole);

  final String? codeRole;

  @override
  String toString() => 'Rôle non supporté par l\'application : $codeRole';
}
