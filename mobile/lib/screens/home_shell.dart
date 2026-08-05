import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/auth_state.dart';
import 'cme_screen.dart';
import 'dues_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _destinations = [
    NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
    NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
    NavigationDestination(icon: Icon(Icons.payments_outlined), label: 'Dues'),
    NavigationDestination(icon: Icon(Icons.school_outlined), label: 'CME'),
    NavigationDestination(
      icon: Icon(Icons.notifications_outlined),
      label: 'Alerts',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final pages = [
      _HomeTab(email: auth.user?.email ?? '', org: auth.tenant?.displayName ?? ''),
      const ProfileScreen(),
      const DuesScreen(),
      const CmeScreen(),
      const NotificationsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(auth.tenant?.displayName ?? 'Member'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => context.read<AuthState>().logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _destinations,
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab({required this.email, required this.org});

  final String email;
  final String org;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text('Welcome', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(email, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(org, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 20),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Use the tabs below for Profile, Dues, CME, and Alerts. '
              'Digital membership ID and on-device CME evidence upload are planned '
              'for a later slice.',
            ),
          ),
        ),
      ],
    );
  }
}
