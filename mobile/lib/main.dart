import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth/auth_state.dart';
import 'config.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AssociationMobileApp());
}

class AssociationMobileApp extends StatelessWidget {
  const AssociationMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState(config: AppConfig.local)..bootstrap(),
      child: const _RootApp(),
    );
  }
}

class _RootApp extends StatelessWidget {
  const _RootApp();

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
    final primary = _parseColor(
      auth.tenant?.primaryColor,
      const Color(0xFF0B6B3A),
    );

    return MaterialApp(
      title: auth.tenant?.displayName ?? 'Association',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: !auth.ready
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            )
          : auth.isAuthenticated
              ? const HomeShell()
              : const LoginScreen(),
    );
  }
}
