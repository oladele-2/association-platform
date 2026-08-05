import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../auth/auth_state.dart';
import '../open_url.dart';

/// Shown once after self-registration (`metadata.showWelcome`).
class WelcomeBanner extends StatefulWidget {
  const WelcomeBanner({super.key});

  @override
  State<WelcomeBanner> createState() => _WelcomeBannerState();
}

class _WelcomeBannerState extends State<WelcomeBanner> {
  bool _show = false;
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  Future<void> _check() async {
    final auth = context.read<AuthState>();
    try {
      final profile = await auth.api.get('/v1/me/profile', auth: true);
      final metadata = profile['metadata'];
      final welcome = metadata is Map && metadata['showWelcome'] == true;
      if (mounted) {
        setState(() {
          _show = welcome;
          _checked = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _checked = true);
    }
  }

  Future<void> _dismiss() async {
    final auth = context.read<AuthState>();
    try {
      await auth.api.patch(
        '/v1/me/profile',
        auth: true,
        body: {
          'metadata': {
            'showWelcome': false,
            'welcomeSeenAt': DateTime.now().toUtc().toIso8601String(),
          },
        },
      );
    } on ApiException {
      /* still hide */
    }
    if (mounted) setState(() => _show = false);
  }

  @override
  Widget build(BuildContext context) {
    if (!_checked || !_show) return const SizedBox.shrink();
    final portalUrl = context.read<AuthState>().config.portalWebUrl;

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Congratulations — you are registered',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Text(
              'You can use this app anytime. The member web portal is also available.',
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (portalUrl.isNotEmpty)
                  OutlinedButton(
                    onPressed: () => openExternalUrl(portalUrl),
                    child: const Text('Open portal'),
                  ),
                FilledButton(
                  onPressed: _dismiss,
                  child: const Text('Continue'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
