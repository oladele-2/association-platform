import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../auth/auth_state.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  List<Map<String, dynamic>> _asList(dynamic raw) {
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    if (raw is Map<String, dynamic>) {
      final items = raw['items'] ?? raw['data'];
      if (items is List) {
        return items
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }
    }
    return const [];
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<AuthState>().api.get(
            '/v1/me/notifications',
            auth: true,
          );
      // api.get always returns Map; notifications API returns a list —
      // client wraps arrays under 'data'.
      setState(() => _items = _asList(data));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAll() async {
    setState(() => _busy = true);
    try {
      await context.read<AuthState>().api.post(
            '/v1/me/notifications/read-all',
            auth: true,
            body: {},
          );
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _markOne(String id) async {
    try {
      await context.read<AuthState>().api.post(
            '/v1/me/notifications/$id/read',
            auth: true,
            body: {},
          );
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
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
          Row(
            children: [
              Expanded(
                child: Text(
                  'Notifications',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              TextButton(
                onPressed: _busy || _items.isEmpty ? null : _markAll,
                child: const Text('Mark all read'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 12),
          if (_items.isEmpty)
            const Card(
              child: ListTile(title: Text('No notifications yet.')),
            )
          else
            ..._items.map((n) {
              final id = n['id'] as String;
              final unread = n['readAt'] == null;
              return Card(
                child: ListTile(
                  title: Text(n['title'] as String? ?? ''),
                  subtitle: Text(n['body'] as String? ?? ''),
                  trailing: unread
                      ? IconButton(
                          tooltip: 'Mark read',
                          onPressed: () => _markOne(id),
                          icon: const Icon(Icons.mark_email_read_outlined),
                        )
                      : const Icon(Icons.done, size: 18),
                  isThreeLine: true,
                ),
              );
            }),
        ],
      ),
    );
  }
}
