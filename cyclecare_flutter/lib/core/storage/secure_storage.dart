import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

@lazySingleton
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService() : _storage = const FlutterSecureStorage();

  static const String _tokenKey = 'access_token';
  static const String _refreshKey = 'refresh_token';

  Future<void> saveToken(String token) async => await _storage.write(key: _tokenKey, value: token);
  Future<String?> getToken() async => await _storage.read(key: _tokenKey);
  
  Future<void> saveRefreshToken(String token) async => await _storage.write(key: _refreshKey, value: token);
  Future<String?> getRefreshToken() async => await _storage.read(key: _refreshKey);

  Future<void> clearAll() async => await _storage.deleteAll();
}
