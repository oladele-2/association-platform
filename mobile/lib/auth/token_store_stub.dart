import 'token_store_platform.dart';

class _MemoryBackend implements TokenStoreBackend {
  final Map<String, String> _data = {};

  @override
  Future<void> delete(String key) async => _data.remove(key);

  @override
  Future<String?> read(String key) async => _data[key];

  @override
  Future<Map<String, String>> readAll() async => Map.from(_data);

  @override
  Future<void> write(String key, String value) async => _data[key] = value;
}

TokenStoreBackend createPlatformTokenStoreBackend() => _MemoryBackend();
