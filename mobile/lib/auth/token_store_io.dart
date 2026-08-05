import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import 'token_store_platform.dart';
import 'token_store_windows.dart';

TokenStoreBackend createPlatformTokenStoreBackend() {
  if (Platform.isWindows) {
    return WindowsCredentialTokenStore();
  }
  return FileVaultTokenStore();
}

/// User-home vault for non-Windows desktop; Android/iOS app sandbox when HOME is set.
/// Prefer platform Keystore/Keychain (flutter_secure_storage) before store release.
class FileVaultTokenStore implements TokenStoreBackend {
  Future<File> _file() async {
    final base = Directory(
      [
        Platform.environment['LOCALAPPDATA'],
        Platform.environment['HOME'],
        Directory.systemTemp.path,
      ].whereType<String>().firstWhere((e) => e.isNotEmpty, orElse: () => '.'),
    );
    final dir = Directory(
      '${base.path}${Platform.pathSeparator}association_mobile',
    );
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return File('${dir.path}${Platform.pathSeparator}session.vault.json');
  }

  Future<Map<String, String>> _load() async {
    try {
      final file = await _file();
      if (!await file.exists()) return {};
      final raw = jsonDecode(await file.readAsString());
      if (raw is! Map) return {};
      return raw.map((k, v) => MapEntry(k.toString(), v?.toString() ?? ''));
    } catch (e) {
      debugPrint('FileVaultTokenStore.load: $e');
      return {};
    }
  }

  Future<void> _save(Map<String, String> all) async {
    final file = await _file();
    await file.writeAsString(jsonEncode(all));
    try {
      if (!Platform.isWindows) {
        await Process.run('chmod', ['600', file.path]);
      }
    } catch (_) {}
  }

  @override
  Future<Map<String, String>> readAll() => _load();

  @override
  Future<void> write(String key, String value) async {
    final all = await _load();
    all[key] = value;
    await _save(all);
  }

  @override
  Future<String?> read(String key) async {
    final all = await _load();
    return all[key];
  }

  @override
  Future<void> delete(String key) async {
    final all = await _load();
    all.remove(key);
    await _save(all);
  }
}
