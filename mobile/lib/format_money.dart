import 'package:intl/intl.dart';

/// Formats integer minor units (kobo/cents) using the invoice/org currency code.
String formatMoneyFromMinor(dynamic minor, [String? currency]) {
  final n = minor is String ? num.tryParse(minor) : minor as num?;
  if (n == null) return '-';
  final code = (currency ?? 'NGN').trim().toUpperCase();
  final safe = code.isEmpty ? 'NGN' : code;
  try {
    return NumberFormat.simpleCurrency(name: safe).format(n / 100);
  } catch (_) {
    return NumberFormat.currency(symbol: '$safe ', decimalDigits: 2)
        .format(n / 100);
  }
}
