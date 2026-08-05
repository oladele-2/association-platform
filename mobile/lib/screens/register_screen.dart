import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../auth/auth_state.dart';
import '../open_url.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _honeypot = TextEditingController();

  List<Map<String, dynamic>> _types = [];
  List<Map<String, dynamic>> _institutions = [];
  String? _membershipTypeId;
  String? _institutionId;
  String _sex = '';
  DateTime? _dob;
  bool _loadingCatalog = true;
  bool _busy = false;
  bool _done = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCatalog());
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _honeypot.dispose();
    super.dispose();
  }

  Future<void> _loadCatalog() async {
    setState(() {
      _loadingCatalog = true;
      _error = null;
    });
    try {
      final api = context.read<AuthState>().api;
      final data = await api.get('/v1/public/registration');
      final types = (data['membershipTypes'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      final institutions = (data['institutions'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      Map<String, dynamic>? def;
      for (final t in types) {
        if (t['isDefault'] == true) {
          def = t;
          break;
        }
      }
      def ??= types.isNotEmpty ? types.first : null;
      setState(() {
        _types = types;
        _institutions = institutions;
        _membershipTypeId = def?['id'] as String?;
        _loadingCatalog = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loadingCatalog = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loadingCatalog = false;
      });
    }
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = context.read<AuthState>().api;
      await api.post(
        '/v1/public/registration',
        body: {
          'email': _email.text.trim(),
          'password': _password.text,
          'firstName': _firstName.text.trim(),
          'lastName': _lastName.text.trim(),
          if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
          if (_sex.isNotEmpty) 'sex': _sex,
          if (_dob != null)
            'dateOfBirth': _dob!.toIso8601String().split('T').first,
          if (_membershipTypeId != null) 'membershipTypeId': _membershipTypeId,
          if (_institutionId != null && _institutionId!.isNotEmpty)
            'primaryInstitutionId': _institutionId,
          'website': _honeypot.text,
        },
      );
      setState(() => _done = true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 30),
      firstDate: DateTime(1920),
      lastDate: now,
    );
    if (picked != null) setState(() => _dob = picked);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final brand = auth.tenant?.displayName ?? 'Association';
    final config = auth.config;

    if (_done) {
      return Scaffold(
        appBar: AppBar(title: const Text('Welcome')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Congratulations',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Your account is ready. Sign in here, or open the member portal on the web.',
                ),
                const Spacer(),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Sign in'),
                ),
                if (config.portalWebUrl.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => openExternalUrl(config.portalWebUrl),
                    child: const Text('Open member portal'),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: SafeArea(
        child: _loadingCatalog
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text(brand, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 4),
                  Text(
                    'Create your member account',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 20),
                  TextField(
                    controller: _firstName,
                    decoration: const InputDecoration(
                      labelText: 'First name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _lastName,
                    decoration: const InputDecoration(
                      labelText: 'Last name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      _dob == null
                          ? 'Date of birth (optional)'
                          : 'DOB: ${_dob!.toIso8601String().split('T').first}',
                    ),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: _pickDob,
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _sex.isEmpty ? null : _sex,
                    decoration: const InputDecoration(
                      labelText: 'Sex',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'female', child: Text('Female')),
                      DropdownMenuItem(value: 'male', child: Text('Male')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                      DropdownMenuItem(
                        value: 'unspecified',
                        child: Text('Unspecified'),
                      ),
                    ],
                    onChanged: (v) => setState(() => _sex = v ?? ''),
                  ),
                  if (_types.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _membershipTypeId,
                      decoration: const InputDecoration(
                        labelText: 'Membership type',
                        border: OutlineInputBorder(),
                      ),
                      items: _types
                          .map(
                            (t) => DropdownMenuItem(
                              value: t['id'] as String,
                              child: Text('${t['name']}'),
                            ),
                          )
                          .toList(),
                      onChanged: (v) => setState(() => _membershipTypeId = v),
                    ),
                  ],
                  if (_institutions.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _institutionId,
                      decoration: const InputDecoration(
                        labelText: 'Institution',
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        const DropdownMenuItem(value: '', child: Text('None')),
                        ..._institutions.map(
                          (i) => DropdownMenuItem(
                            value: i['id'] as String,
                            child: Text('${i['name']}'),
                          ),
                        ),
                      ],
                      onChanged: (v) => setState(() => _institutionId = v),
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password (min 10 characters)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  // Honeypot — must stay empty / off-screen for bots that fill all fields.
                  Opacity(
                    opacity: 0,
                    child: SizedBox(
                      height: 1,
                      child: TextField(
                        controller: _honeypot,
                        decoration: const InputDecoration(labelText: 'Website'),
                        autofillHints: const [],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: Text(_busy ? 'Creating…' : 'Register'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Already have an account? Sign in'),
                  ),
                ],
              ),
      ),
    );
  }
}
