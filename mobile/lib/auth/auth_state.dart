import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../config.dart';
import '../push_registration.dart';
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

  Map<String, String> toCacheMap() => {
        'displayName': displayName,
        'slug': slug,
        if (primaryColor != null) 'primaryColor': primaryColor!,
      };

  factory TenantInfo.fromCacheMap(Map<String, String> map, String fallbackSlug) {
    return TenantInfo(
      displayName: map['displayName']?.isNotEmpty == true
          ? map['displayName']!
          : 'Association',
      slug: map['slug']?.isNotEmpty == true ? map['slug']! : fallbackSlug,
      primaryColor: map['primaryColor'],
    );
  }
}

class AuthState extends ChangeNotifier {
  AuthState({required this.config, TokenStore? storage})
      : _storage = storage ?? TokenStore() {
    _api = ApiClient(
      baseUrl: config.apiBaseUrl,
      orgSlug: config.orgSlug,
      getAccessToken: () async => _accessToken,
      onUnauthorized: _handleUnauthorized,
    );
  }

  final AppConfig config;
  final TokenStore _storage;
  late final ApiClient _api;

  static const _refreshKey = 'refresh_token';
  static const _accessKey = 'access_token';
  static const _accessExpKey = 'access_expires_at';
  static const _brandNameKey = 'brand_display_name';
  static const _brandSlugKey = 'brand_slug';
  static const _brandColorKey = 'brand_primary_color';

  bool ready = false;
  String? _accessToken;
  DateTime? _accessExpiresAt;
  AuthUser? user;
  TenantInfo? tenant;
  String? bootstrapError;
  Future<bool>? _refreshInFlight;

  ApiClient get api => _api;
  bool get isAuthenticated => user != null && _accessToken != null;
  bool get needsPasswordReset => user?.mustResetPassword == true;
  bool get needsEmailVerification =>
      user != null && user!.emailVerified == false;

  Future<void> bootstrap() async {
    try {
      final resolved = await _api.request(
        'GET',
        '/v1/tenancy/resolve',
        query: {'slug': config.orgSlug},
      );
      final org = resolved['organization'] as Map<String, dynamic>? ?? {};
      final branding = resolved['branding'] as Map<String, dynamic>?;
      final slug = org['slug'] as String? ?? config.orgSlug;
      tenant = TenantInfo(
        displayName: org['displayName'] as String? ?? 'Association',
        slug: slug,
        primaryColor: branding?['primaryColor'] as String?,
      );
      _api.updateOrgSlug(slug);
      await _cacheBranding(tenant!);
    } catch (_) {
      tenant = await _loadCachedBranding();
      bootstrapError =
          'Using cached branding (API unreachable). Check API_BASE_URL / network.';
    }

    _accessToken = await _storage.read(_accessKey);
    final expRaw = await _storage.read(_accessExpKey);
    if (expRaw != null && expRaw.isNotEmpty) {
      _accessExpiresAt = DateTime.tryParse(expRaw);
    }
    final refresh = await _storage.read(_refreshKey);
    if (refresh != null && refresh.isNotEmpty) {
      try {
        if (_shouldRefreshProactively) {
          await _refreshWith(refresh);
        } else if (_accessToken == null || _accessToken!.isEmpty) {
          await _refreshWith(refresh);
        } else {
          // Have access + refresh; still validate refresh path is usable later via 401.
          // Restore minimal user from a lightweight refresh so shell knows identity.
          await _refreshWith(refresh);
        }
      } catch (_) {
        await _clearTokens();
      }
    }

    ready = true;
    notifyListeners();
    if (isAuthenticated) {
      unawaited(
        registerPushTokenIfEnabled(enableFcm: config.enableFcm, api: _api),
      );
    }
  }

  bool get _shouldRefreshProactively {
    final exp = _accessExpiresAt;
    if (exp == null) return true;
    return DateTime.now().isAfter(exp.subtract(const Duration(minutes: 1)));
  }

  Future<void> login(String email, String password) async {
    final session = await _api.post(
      '/v1/auth/login',
      body: {'email': email, 'password': password},
    );
    await _applySession(session);
    notifyListeners();
    // Best-effort; never block login on push setup.
    unawaited(
      registerPushTokenIfEnabled(enableFcm: config.enableFcm, api: _api),
    );
  }

  Future<void> logout() async {
    final refresh = await _storage.read(_refreshKey);
    await revokePushTokenIfEnabled(enableFcm: config.enableFcm, api: _api);
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

  Future<bool> _handleUnauthorized() async {
    _refreshInFlight ??= _refreshOnce().whenComplete(() {
      _refreshInFlight = null;
    });
    return _refreshInFlight!;
  }

  Future<bool> _refreshOnce() async {
    final refresh = await _storage.read(_refreshKey);
    if (refresh == null || refresh.isEmpty) {
      await _clearTokens();
      user = null;
      notifyListeners();
      return false;
    }
    try {
      await _refreshWith(refresh);
      notifyListeners();
      return true;
    } catch (_) {
      await _clearTokens();
      user = null;
      notifyListeners();
      return false;
    }
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
    final expiresIn = session['accessTokenExpiresIn'];
    if (expiresIn is num) {
      _accessExpiresAt =
          DateTime.now().add(Duration(seconds: expiresIn.toInt()));
      await _storage.write(
        _accessExpKey,
        _accessExpiresAt!.toUtc().toIso8601String(),
      );
    }
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
    _accessExpiresAt = null;
    await _storage.clearSessionKeys([
      _accessKey,
      _refreshKey,
      _accessExpKey,
    ]);
  }

  Future<void> _cacheBranding(TenantInfo info) async {
    await _storage.write(_brandNameKey, info.displayName);
    await _storage.write(_brandSlugKey, info.slug);
    if (info.primaryColor != null) {
      await _storage.write(_brandColorKey, info.primaryColor!);
    }
  }

  Future<TenantInfo> _loadCachedBranding() async {
    final map = await _storage.readAll();
    final cached = TenantInfo.fromCacheMap(
      {
        'displayName': map[_brandNameKey] ?? '',
        'slug': map[_brandSlugKey] ?? '',
        'primaryColor': map[_brandColorKey] ?? '',
      },
      config.orgSlug,
    );
    _api.updateOrgSlug(cached.slug);
    return cached;
  }
}
