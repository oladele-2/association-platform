import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../auth/auth_state.dart';

class DuesScreen extends StatefulWidget {
  const DuesScreen({super.key});

  @override
  State<DuesScreen> createState() => _DuesScreenState();
}

class _DuesScreenState extends State<DuesScreen> {
  List<Map<String, dynamic>> _invoices = const [];
  List<Map<String, dynamic>> _payments = const [];
  final Set<String> _selected = {};
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _message;

  final _naira = NumberFormat.currency(locale: 'en_NG', symbol: 'NGN ');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  String _money(dynamic kobo) {
    final n = kobo is String ? num.tryParse(kobo) : kobo as num?;
    if (n == null) return '-';
    return _naira.format(n / 100);
  }

  List<Map<String, dynamic>> _asList(Map<String, dynamic> pageOrList) {
    final items = pageOrList['items'];
    if (items is List) {
      return items
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    final data = pageOrList['data'];
    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return const [];
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<AuthState>().api;
      final inv = await api.get('/v1/me/invoices', auth: true);
      final pay = await api.get('/v1/me/payments', auth: true);
      setState(() {
        _invoices = _asList(inv);
        _payments = _asList(pay);
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _payable(String status) =>
      ['issued', 'partially_paid', 'overdue', 'pending'].contains(status);

  Future<void> _paySelected() async {
    if (_selected.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      final result = await context.read<AuthState>().api.post(
        '/v1/me/payments/paystack/initialize',
        auth: true,
        body: {
          'invoiceIds': _selected.toList(),
          'idempotencyKey':
              'mobile-${DateTime.now().millisecondsSinceEpoch}-${_selected.length}',
        },
      );
      final url = result['authorizationUrl'] as String?;
      if (url != null && url.isNotEmpty) {
        await Clipboard.setData(ClipboardData(text: url));
        setState(() => _message = 'Payment URL copied to clipboard.');
      } else {
        setState(() => _message = 'Payment initialized (mock gateway).');
      }
      _selected.clear();
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _emptyCard(String label) {
    return Card(
      child: ListTile(title: Text(label)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Dues & Payments',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          if (_error != null)
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          if (_message != null)
            Text(
              _message!,
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          const SizedBox(height: 12),
          Text('Invoices', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_invoices.isEmpty)
            _emptyCard('No invoices yet.')
          else
            ..._invoices.map((inv) {
              final id = inv['id'] as String;
              final status = inv['status'] as String? ?? '';
              final canPay = _payable(status);
              return Card(
                child: CheckboxListTile(
                  value: _selected.contains(id),
                  onChanged: canPay
                      ? (v) {
                          setState(() {
                            if (v == true) {
                              _selected.add(id);
                            } else {
                              _selected.remove(id);
                            }
                          });
                        }
                      : null,
                  title: Text(inv['invoiceNo'] as String? ?? id),
                  subtitle: Text('${_money(inv['amountDueKobo'])} · $status'),
                ),
              );
            }),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy || _selected.isEmpty ? null : _paySelected,
            child: Text(
              _busy ? 'Starting...' : 'Pay selected (${_selected.length})',
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Recent payments',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (_payments.isEmpty)
            _emptyCard('No payments yet.')
          else
            ..._payments.map((p) {
              return Card(
                child: ListTile(
                  title: Text(
                    p['reference'] as String? ?? p['id'] as String? ?? '',
                  ),
                  subtitle: Text(
                    '${_money(p['amountKobo'])} · ${p['channel']} · ${p['status']}',
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
