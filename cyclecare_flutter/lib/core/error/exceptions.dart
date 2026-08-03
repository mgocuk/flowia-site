class AppException implements Exception {
  final String message;
  AppException({required this.message});
}

class ServerException extends AppException {
  ServerException({required super.message});
}

class CacheException extends AppException {
  CacheException({required super.message});
}

class AuthException extends AppException {
  AuthException({required super.message});
}

class NetworkException extends AppException {
  NetworkException({super.message = 'Network Error'});
}
