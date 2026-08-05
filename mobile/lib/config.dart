/// Runtime config for local / staging API.
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.orgSlug,
  });

  /// Empty or localhost: use Android emulator → host: `10.0.2.2:3000`
  final String apiBaseUrl;
  final String orgSlug;

  static const AppConfig local = AppConfig(
    apiBaseUrl: String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000',
    ),
    orgSlug: String.fromEnvironment(
      'ORG_SLUG',
      defaultValue: 'nma-ogun',
    ),
  );
}
