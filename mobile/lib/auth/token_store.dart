import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

/// Lightweight token persistence without native plugins (Windows symlink / Dev Mode).
/// Upgrade to flutter_secure_storage when Developer Mode / mobile builds require it.
class TokenStore {
  Future<File> _file() async {
    final base = Directory(
      [
        Platform.environment['LOCALAPPDATA'],
        Platform.environment['HOME'],
        Directory.systemTemp.path,
      ].whereType<String>().firstWhere((e) => e.isNotEmpty, orElse: () => '.'),
    );
    final dir = Directory('${base.path}${Platform.pathSeparator}association_mobile');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return File('${dir.path}${Platform.pathSeparator}session.json');
  }

  Future<Map<String, String>> readAll() async {
    try {
      final file = await _file();
      if (!await file.exists()) return {};
      final raw = jsonDecode(await file.readAsString());
      if (raw is! Map) return {};
      return raw.map((k, v) => MapEntry(k.toString(), v?.toString() ?? ''));
    } catch (e) {
      debugPrint('TokenStore.readAll: $e');
      return {};
    }
  }

  Future<void> write(String key, String value) async {
    final all = await readAll();
    all[key] = value;
    final file = await _file();
    await file.writeAsString(jsonEncode(all));
  }

  Future<String?> read(String key) async {
    final all = await readAll();
    return all[key];
  }

  Future<void> delete(String key) async {
    final all = await readAll();
    all.remove(key);
    final file = await _file();
    await file.writeAsString(jsonEncode(all));
  }
}
