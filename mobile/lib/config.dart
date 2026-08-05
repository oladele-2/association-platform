import 'package:flutter/foundation.dart';

/// Runtime config from `--dart-define` (and safe debug defaults).
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.orgSlug,
    this.portalWebUrl = '',
  });

  final String apiBaseUrl;
  final String orgSlug;

  /// Optional CTA after registration / welcome (member web portal).
  final String portalWebUrl;

  /// Release builds **require** `API_BASE_URL` (HTTPS) and `ORG_SLUG`.
  /// Debug/profile allow emulator HTTP + placeholder slug for local runs.
  static AppConfig resolve() {
    const apiFromEnv = String.fromEnvironment('API_BASE_URL');
    const slugFromEnv = String.fromEnvironment('ORG_SLUG');
    const portalFromEnv = String.fromEnvironment('PORTAL_WEB_URL');
    const allowInsecure = bool.fromEnvironment(
      'ALLOW_INSECURE_API',
      defaultValue: false,
    );

    if (kReleaseMode) {
      if (apiFromEnv.isEmpty || slugFromEnv.isEmpty) {
        throw StateError(
          'Release builds require --dart-define=API_BASE_URL=… and '
          '--dart-define=ORG_SLUG=…',
        );
      }
      if (!apiFromEnv.startsWith('https://') && !allowInsecure) {
        throw StateError(
          'Release API_BASE_URL must use https:// '
          '(or set ALLOW_INSECURE_API=true for controlled exceptions)',
        );
      }
      return const AppConfig(
        apiBaseUrl: apiFromEnv,
        orgSlug: slugFromEnv,
        portalWebUrl: portalFromEnv,
      );
    }

    return AppConfig(
      apiBaseUrl: apiFromEnv.isEmpty ? 'http://10.0.2.2:3000' : apiFromEnv,
      // Generic placeholder — never ship a named tenant as product default.
      orgSlug: slugFromEnv.isEmpty ? 'demo' : slugFromEnv,
      portalWebUrl:
          portalFromEnv.isEmpty ? 'http://localhost:5173' : portalFromEnv,
    );
  }
}
