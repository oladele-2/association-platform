import 'dart:convert';

import 'package:association_mobile/api/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('sends org slug and bearer token', () async {
    late http.Request seen;
    final client = ApiClient(
      baseUrl: 'http://example.test',
      orgSlug: 'demo',
      getAccessToken: () async => 'tok',
      httpClient: MockClient((request) async {
        seen = request;
        return http.Response('{"ok":true}', 200);
      }),
    );

    await client.get('/v1/me/profile', auth: true);
    expect(seen.headers['X-Organization-Slug'], 'demo');
    expect(seen.headers['Authorization'], 'Bearer tok');
  });

  test('fails fast when auth required without token', () async {
    final client = ApiClient(
      baseUrl: 'http://example.test',
      orgSlug: 'demo',
      getAccessToken: () async => null,
      httpClient: MockClient((_) async => http.Response('{}', 200)),
    );
    await expectLater(
      client.get('/v1/me/profile', auth: true),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)),
    );
  });

  test('retries once after successful onUnauthorized', () async {
    var calls = 0;
    final client = ApiClient(
      baseUrl: 'http://example.test',
      orgSlug: 'demo',
      getAccessToken: () async => 'tok',
      onUnauthorized: () async => true,
      httpClient: MockClient((request) async {
        calls++;
        if (calls == 1) {
          return http.Response('{"message":"expired"}', 401);
        }
        return http.Response(jsonEncode({'ok': true}), 200);
      }),
    );

    final res = await client.get('/v1/me/profile', auth: true);
    expect(res['ok'], true);
    expect(calls, 2);
  });

  test('updateOrgSlug applies to subsequent requests', () async {
    late http.Request seen;
    final client = ApiClient(
      baseUrl: 'http://example.test',
      orgSlug: 'old',
      httpClient: MockClient((request) async {
        seen = request;
        return http.Response('{}', 200);
      }),
    );
    client.updateOrgSlug('new-slug');
    await client.get('/v1/tenancy/resolve');
    expect(seen.headers['X-Organization-Slug'], 'new-slug');
  });
}
