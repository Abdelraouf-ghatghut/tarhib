/// URL de base de l'API NestJS. Surchargeable au lancement, ex. :
/// `flutter run --dart-define=API_BASE_URL=https://api.tarhib.ly`
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
}
