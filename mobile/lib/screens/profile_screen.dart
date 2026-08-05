import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../auth/auth_state.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  final _phone = TextEditingController();
  final _altEmail = TextEditingController();
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _message;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _phone.dispose();
    _altEmail.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<AuthState>().api.get(
            '/v1/me/profile',
            auth: true,
          );
      _profile = data;
      _phone.text = (data['phone'] as String?) ?? '';
      _altEmail.text = (data['alternateEmail'] as String?) ?? '';
    } on ApiException catch (e) {
      _error = e.message;
      _profile = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      final data = await context.read<AuthState>().api.patch(
        '/v1/me/profile',
        auth: true,
        body: {
          'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
          'alternateEmail':
              _altEmail.text.trim().isEmpty ? null : _altEmail.text.trim(),
        },
      );
      setState(() {
        _profile = data;
        _message = 'Profile updated.';
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String get _fullName {
    final p = _profile;
    if (p == null) return '';
    return [
      p['title'],
      p['firstName'],
      p['middleName'],
      p['lastName'],
    ].whereType<String>().where((s) => s.isNotEmpty).join(' ');
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text('My Profile', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        if (_message != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              _message!,
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          ),
        if (_profile == null)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No member profile is linked to this login yet.'),
            ),
          )
        else ...[
          Card(
            child: ListTile(
              title: Text(_fullName),
              subtitle: Text(
                '${_profile!['membershipTypeName'] ?? 'Member'} · '
                '${_profile!['status']}'
                '${_profile!['membershipNo'] != null ? ' · #${_profile!['membershipNo']}' : ''}',
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _phone,
            decoration: const InputDecoration(
              labelText: 'Phone',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _altEmail,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Alternate email',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Saving…' : 'Save changes'),
          ),
        ],
      ],
    );
  }
}
