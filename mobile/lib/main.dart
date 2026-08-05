import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth/auth_state.dart';
import 'config.dart';
import 'screens/gate_screen.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.resolve();
  runApp(AssociationMobileApp(config: config));
}

class AssociationMobileApp extends StatelessWidget {
  const AssociationMobileApp({super.key, required this.config});

  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState(config: config)..bootstrap(),
      child: const _RootApp(),
    );
  }
}

class _RootApp extends StatelessWidget {
  const _RootApp();

  /// Neutral seed — never an org-specific brand color.
  static const _fallbackSeed = Color(0xFF2E5A88);

  Color _parseColor(String? hex, Color fallback) {
    if (hex == null || hex.isEmpty) return fallback;
    var value = hex.replaceFirst('#', '');
    if (value.length == 6) value = 'FF$value';
    final parsed = int.tryParse(value, radix: 16);
    if (parsed == null) return fallback;
    return Color(parsed);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final primary = _parseColor(auth.tenant?.primaryColor, _fallbackSeed);

    Widget home;
    if (!auth.ready) {
      home = const Scaffold(body: Center(child: CircularProgressIndicator()));
    } else if (!auth.isAuthenticated) {
      home = const LoginScreen();
    } else if (auth.needsPasswordReset) {
      home = const GateScreen(
        title: 'Password reset required',
        body:
            'Your account must reset its password before using the member app. '
            'Complete the reset in the web portal, then sign in again.',
      );
    } else if (auth.needsEmailVerification) {
      home = const GateScreen(
        title: 'Verify your email',
        body:
            'Confirm your email address via the link sent to your inbox '
            '(or the web portal), then sign in again.',
      );
    } else {
      home = const HomeShell();
    }

    return MaterialApp(
      title: auth.tenant?.displayName ?? 'Association',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: home,
    );
  }
}
