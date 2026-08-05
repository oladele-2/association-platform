import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../config.dart';
import 'token_store.dart';

class AuthUser {
  AuthUser({
    required this.id,
    required this.email,
    required this.emailVerified,
    required this.mustResetPassword,
    required this.status,
  });

  final String id;
  final String email;
  final bool emailVerified;
  final bool mustResetPassword;
  final String status;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      emailVerified: json['emailVerified'] as bool? ?? false,
      mustResetPassword: json['mustResetPassword'] as bool? ?? false,
      status: json['status'] as String? ?? '',
    );
  }
}

class TenantInfo {
  TenantInfo({
    required this.displayName,
    required this.slug,
    this.primaryColor,
  });

  final String displayName;
  final String slug;
  final String? primaryColor;
}

class AuthState extends ChangeNotifier {
  AuthState({required this.config}) : _storage = TokenStore() {
    _api = ApiClient(
      baseUrl: config.apiBaseUrl,
      orgSlug: config.orgSlug,
      getAccessToken: () async => _accessToken,
    );
  }

  final AppConfig config;
  final TokenStore _storage;
  late final ApiClient _api;

  static const _refreshKey = 'refresh_token';
  static const _accessKey = 'access_token';

  bool ready = false;
  String? _accessToken;
  AuthUser? user;
  TenantInfo? tenant;
  String? bootstrapError;

  ApiClient get api => _api;
  bool get isAuthenticated => user != null && _accessToken != null;

  Future<void> bootstrap() async {
    try {
      final resolved = await _api.request(
        'GET',
        '/v1/tenancy/resolve',
        query: {'slug': config.orgSlug},
      );
      final org = resolved['organization'] as Map<String, dynamic>? ?? {};
      final branding = resolved['branding'] as Map<String, dynamic>?;
      tenant = TenantInfo(
        displayName: org['displayName'] as String? ?? 'Association',
        slug: org['slug'] as String? ?? config.orgSlug,
        primaryColor: branding?['primaryColor'] as String?,
      );
    } catch (_) {
      tenant = TenantInfo(
        displayName: 'NMA Ogun State',
        slug: config.orgSlug,
        primaryColor: '#0b6b3a',
      );
      bootstrapError = 'Offline branding defaults (API unreachable).';
    }

    _accessToken = await _storage.read(_accessKey);
    final refresh = await _storage.read(_refreshKey);
    if (refresh != null && refresh.isNotEmpty) {
      try {
        await _refreshWith(refresh);
      } catch (_) {
        await _clearTokens();
      }
    }

    ready = true;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final session = await _api.post(
      '/v1/auth/login',
      body: {'email': email, 'password': password},
    );
    await _applySession(session);
    notifyListeners();
  }

  Future<void> logout() async {
    final refresh = await _storage.read(_refreshKey);
    try {
      await _api.post(
        '/v1/auth/logout',
        body: refresh == null ? <String, dynamic>{} : {'refreshToken': refresh},
      );
    } catch (_) {}
    await _clearTokens();
    user = null;
    notifyListeners();
  }

  Future<void> _refreshWith(String refreshToken) async {
    final session = await _api.post(
      '/v1/auth/refresh',
      body: {'refreshToken': refreshToken},
    );
    await _applySession(session);
  }

  Future<void> _applySession(Map<String, dynamic> session) async {
    _accessToken = session['accessToken'] as String?;
    final refresh = session['refreshToken'] as String?;
    final userJson = session['user'] as Map<String, dynamic>?;
    if (_accessToken != null) {
      await _storage.write(_accessKey, _accessToken!);
    }
    if (refresh != null) {
      await _storage.write(_refreshKey, refresh);
    }
    if (userJson != null) {
      user = AuthUser.fromJson(userJson);
    }
  }

  Future<void> _clearTokens() async {
    _accessToken = null;
    await _storage.delete(_accessKey);
    await _storage.delete(_refreshKey);
  }
}
