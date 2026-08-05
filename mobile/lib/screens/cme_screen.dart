import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../auth/auth_state.dart';

class CmeScreen extends StatefulWidget {
  const CmeScreen({super.key});

  @override
  State<CmeScreen> createState() => _CmeScreenState();
}

class _CmeScreenState extends State<CmeScreen> {
  List<Map<String, dynamic>> _items = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _message;

  final _title = TextEditingController();
  final _fileId = TextEditingController();
  final _provider = TextEditingController();
  final _hours = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _title.dispose();
    _fileId.dispose();
    _provider.dispose();
    _hours.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _asList(Map<String, dynamic> page) {
    final items = page['items'];
    if (items is List) {
      return items
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
      final data = await context.read<AuthState>().api.get('/v1/me/cme', auth: true);
      setState(() => _items = _asList(data));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      await context.read<AuthState>().api.post(
        '/v1/me/cme',
        auth: true,
        body: {
          'title': _title.text.trim(),
          'fileId': _fileId.text.trim(),
          if (_provider.text.trim().isNotEmpty) 'provider': _provider.text.trim(),
          if (_hours.text.trim().isNotEmpty) 'creditHours': _hours.text.trim(),
        },
      );
      _title.clear();
      _fileId.clear();
      _provider.clear();
      _hours.clear();
      setState(() => _message = 'CME submitted for review.');
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
          Text('CME', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Submit requires a ready fileId from the Files upload flow '
            '(portal upload first for now).',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          if (_message != null) ...[
            const SizedBox(height: 8),
            Text(
              _message!,
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _title,
            decoration: const InputDecoration(
              labelText: 'Title',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _fileId,
            decoration: const InputDecoration(
              labelText: 'Evidence fileId (UUID)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _provider,
            decoration: const InputDecoration(
              labelText: 'Provider (optional)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _hours,
            decoration: const InputDecoration(
              labelText: 'Credit hours (optional)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Submitting...' : 'Submit CME'),
          ),
          const SizedBox(height: 24),
          Text('My submissions', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_items.isEmpty)
            const Card(
              child: ListTile(title: Text('No CME submissions yet.')),
            )
          else
            ..._items.map((item) {
              return Card(
                child: ListTile(
                  title: Text(item['title'] as String? ?? ''),
                  subtitle: Text(
                    '${item['status']} · ${item['creditHours'] ?? '-'} hrs'
                    '${item['provider'] != null ? ' · ${item['provider']}' : ''}',
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
