import 'package:association_mobile/config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('local config defaults org slug', () {
    expect(AppConfig.local.orgSlug, 'nma-ogun');
    expect(AppConfig.local.apiBaseUrl.isNotEmpty, isTrue);
  });
}
