/// Cf. cahier des charges §4.1 : seuls `EMPLOYE` et `AGENT` sont reconnus par
/// l'app mobile. Tout autre code de rôle (RESPONSABLE, ADMIN... cf.
/// `docs/schema.sql`) est explicitement hors périmètre — ces profils utilisent
/// l'application Web d'Administration, pas cette app.
enum AppRole {
  employe,
  agent;

  static AppRole? depuisCodeRole(String? code) {
    switch (code) {
      case 'EMPLOYE':
        return AppRole.employe;
      case 'AGENT':
        return AppRole.agent;
      default:
        return null;
    }
  }
}
