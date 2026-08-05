import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

typedef AccessTokenGetter = Future<String?> Function();
typedef UnauthorizedHandler = Future<bool> Function();

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required String orgSlug,
    this.getAccessToken,
    this.onUnauthorized,
    http.Client? httpClient,
    this.timeout = const Duration(seconds: 30),
  })  : _orgSlug = orgSlug,
        _http = httpClient ?? http.Client();

  final String baseUrl;
  String _orgSlug;
  final AccessTokenGetter? getAccessToken;
  final UnauthorizedHandler? onUnauthorized;
  final http.Client _http;
  final Duration timeout;

  String get orgSlug => _orgSlug;

  void updateOrgSlug(String slug) {
    final trimmed = slug.trim();
    if (trimmed.isNotEmpty) _orgSlug = trimmed;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final normalized = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    return Uri.parse('$normalized$path').replace(queryParameters: query);
  }

  Future<Map<String, dynamic>> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool auth = false,
    bool retried = false,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'X-Organization-Slug': _orgSlug,
    };
    if (auth) {
      final token = await getAccessToken?.call();
      if (token == null || token.isEmpty) {
        throw ApiException(401, 'Not authenticated');
      }
      headers['Authorization'] = 'Bearer $token';
    }

    final uri = _uri(path, query);
    late http.Response res;
    try {
      switch (method.toUpperCase()) {
        case 'GET':
          res = await _http.get(uri, headers: headers).timeout(timeout);
          break;
        case 'POST':
          res = await _http
              .post(
                uri,
                headers: headers,
                body: body == null ? null : jsonEncode(body),
              )
              .timeout(timeout);
          break;
        case 'PATCH':
          res = await _http
              .patch(
                uri,
                headers: headers,
                body: body == null ? null : jsonEncode(body),
              )
              .timeout(timeout);
          break;
        default:
          throw ApiException(0, 'Unsupported method $method');
      }
    } on TimeoutException {
      throw ApiException(0, 'Request timed out');
    }

    if (res.statusCode == 401 && auth && !retried && onUnauthorized != null) {
      final refreshed = await onUnauthorized!();
      if (refreshed) {
        return request(
          method,
          path,
          body: body,
          query: query,
          auth: auth,
          retried: true,
        );
      }
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      var message = res.reasonPhrase ?? 'Request failed';
      try {
        final parsed = jsonDecode(res.body);
        if (parsed is Map && parsed['message'] != null) {
          final m = parsed['message'];
          message = m is List ? m.join(', ') : m.toString();
        }
      } catch (_) {}
      throw ApiException(res.statusCode, message);
    }

    if (res.body.isEmpty) return <String, dynamic>{};
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'data': decoded};
  }

  Future<Map<String, dynamic>> get(String path, {bool auth = false}) =>
      request('GET', path, auth: auth);

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
  }) =>
      request('POST', path, body: body, auth: auth);

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
  }) =>
      request('PATCH', path, body: body, auth: auth);
}
