import 'dart:convert';
import 'dart:ffi';

import 'package:ffi/ffi.dart';
import 'package:flutter/foundation.dart';
import 'package:win32/win32.dart';

import 'token_store_platform.dart';

/// Windows Credential Manager vault (entire key map as one JSON blob).
class WindowsCredentialTokenStore implements TokenStoreBackend {
  static const _target = 'AssociationPlatform/mobile_session';
  static const _user = 'association_mobile';

  Future<Map<String, String>> _load() async {
    final pTarget = _target.toNativeUtf16();
    final ppCred = calloc<Pointer<CREDENTIAL>>();
    try {
      final ok = CredRead(pTarget, CRED_TYPE_GENERIC, 0, ppCred);
      if (ok != TRUE) return {};
      final cred = ppCred.value.ref;
      final bytes = cred.CredentialBlob.asTypedList(cred.CredentialBlobSize);
      final raw = utf8.decode(bytes);
      CredFree(ppCred.value);
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return {};
      return decoded.map((k, v) => MapEntry(k.toString(), v?.toString() ?? ''));
    } catch (e) {
      debugPrint('WindowsCredentialTokenStore.load: $e');
      return {};
    } finally {
      calloc.free(pTarget);
      calloc.free(ppCred);
    }
  }

  Future<void> _save(Map<String, String> all) async {
    final payload = utf8.encode(jsonEncode(all));
    final blob = calloc<Uint8>(payload.length);
    final blobList = blob.asTypedList(payload.length);
    blobList.setAll(0, payload);

    final pTarget = _target.toNativeUtf16();
    final pUser = _user.toNativeUtf16();
    final pCred = calloc<CREDENTIAL>();
    try {
      pCred.ref
        ..Type = CRED_TYPE_GENERIC
        ..TargetName = pTarget
        ..Persist = CRED_PERSIST_LOCAL_MACHINE
        ..UserName = pUser
        ..CredentialBlob = blob
        ..CredentialBlobSize = payload.length;

      final ok = CredWrite(pCred, 0);
      if (ok != TRUE) {
        throw StateError('CredWrite failed: ${GetLastError()}');
      }
    } finally {
      calloc.free(blob);
      calloc.free(pTarget);
      calloc.free(pUser);
      calloc.free(pCred);
    }
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
    if (all.isEmpty) {
      final pTarget = _target.toNativeUtf16();
      try {
        CredDelete(pTarget, CRED_TYPE_GENERIC, 0);
      } finally {
        calloc.free(pTarget);
      }
      return;
    }
    await _save(all);
  }
}
