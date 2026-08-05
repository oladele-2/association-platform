import 'package:association_mobile/config.dart';
import 'package:association_mobile/format_money.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('debug resolve uses generic demo slug when ORG_SLUG unset', () {
    final config = AppConfig.resolve();
    expect(config.orgSlug, isNot(equals('nma-ogun')));
    expect(config.orgSlug, 'demo');
    expect(config.apiBaseUrl.isNotEmpty, isTrue);
  });

  test('formatMoneyFromMinor respects currency code', () {
    expect(formatMoneyFromMinor(500000, 'NGN'), contains('5'));
    expect(formatMoneyFromMinor('10000', 'USD'), isNot(equals('-')));
  });
}
