import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import 'token_store_platform.dart';

/// Persists session secrets via platform backend (Windows Credential Manager / file vault).
/// Migrates and deletes legacy plaintext `session.json` on first access.
class TokenStore {
  TokenStore({TokenStoreBackend? backend})
      : _backend = backend ?? createTokenStoreBackend();

  final TokenStoreBackend _backend;

  Future<Map<String, String>> readAll() async {
    await _migrateLegacyFileIfNeeded();
    return _backend.readAll();
  }

  Future<void> write(String key, String value) async {
    await _backend.write(key, value);
  }

  Future<String?> read(String key) async {
    await _migrateLegacyFileIfNeeded();
    return _backend.read(key);
  }

  Future<void> delete(String key) async {
    await _backend.delete(key);
  }

  Future<void> clearSessionKeys(Iterable<String> keys) async {
    for (final key in keys) {
      await delete(key);
    }
  }

  Future<File> _legacyFile() async {
    final base = Directory(
      [
        Platform.environment['LOCALAPPDATA'],
        Platform.environment['HOME'],
        Directory.systemTemp.path,
      ].whereType<String>().firstWhere((e) => e.isNotEmpty, orElse: () => '.'),
    );
    final dir =
        Directory('${base.path}${Platform.pathSeparator}association_mobile');
    return File('${dir.path}${Platform.pathSeparator}session.json');
  }

  Future<void> _migrateLegacyFileIfNeeded() async {
    try {
      final file = await _legacyFile();
      if (!await file.exists()) return;
      final raw = jsonDecode(await file.readAsString());
      if (raw is Map) {
        for (final e in raw.entries) {
          final k = e.key.toString();
          final v = e.value?.toString() ?? '';
          if (v.isEmpty) continue;
          final existing = await _backend.read(k);
          if (existing == null || existing.isEmpty) {
            await _backend.write(k, v);
          }
        }
      }
      await file.delete();
      debugPrint('TokenStore: migrated legacy plaintext session.json');
    } catch (e) {
      debugPrint('TokenStore.migrate: $e');
    }
  }
}
