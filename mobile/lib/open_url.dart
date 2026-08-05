import 'dart:io';

import 'package:flutter/foundation.dart';

/// Opens a URL with the platform shell (no Flutter plugins / symlink requirement).
Future<bool> openExternalUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null || !(uri.isScheme('https') || uri.isScheme('http'))) {
    return false;
  }
  try {
    if (Platform.isWindows) {
      final result = await Process.run('cmd', ['/c', 'start', '', url]);
      return result.exitCode == 0;
    }
    if (Platform.isMacOS) {
      final result = await Process.run('open', [url]);
      return result.exitCode == 0;
    }
    if (Platform.isLinux) {
      final result = await Process.run('xdg-open', [url]);
      return result.exitCode == 0;
    }
    if (Platform.isAndroid) {
      final result = await Process.run('am', [
        'start',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        url,
      ]);
      return result.exitCode == 0;
    }
    debugPrint('openExternalUrl: unsupported platform for shell launch');
    return false;
  } catch (e) {
    debugPrint('openExternalUrl: $e');
    return false;
  }
}
