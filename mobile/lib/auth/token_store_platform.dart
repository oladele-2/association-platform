import 'token_store_io.dart' if (dart.library.html) 'token_store_stub.dart';

abstract class TokenStoreBackend {
  Future<Map<String, String>> readAll();
  Future<void> write(String key, String value);
  Future<String?> read(String key);
  Future<void> delete(String key);
}

TokenStoreBackend createTokenStoreBackend() => createPlatformTokenStoreBackend();
