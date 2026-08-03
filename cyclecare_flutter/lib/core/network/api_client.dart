import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:flutter/foundation.dart';
import '../storage/secure_storage.dart';
import '../error/exceptions.dart';

@lazySingleton
class ApiClient {
  final Dio dio;
  final SecureStorageService secureStorage;

  ApiClient(this.secureStorage) : dio = Dio() {
    dio.options.baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000/api/v1');
    dio.options.connectTimeout = const Duration(seconds: 30);
    dio.options.receiveTimeout = const Duration(seconds: 30);

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await secureStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Handle token refresh logic here
          }
          throw ServerException(message: e.message ?? 'Unknown error');
        },
      ),
    );

    if (kDebugMode) {
      dio.interceptors.add(LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true,
        responseHeader: true,
        responseBody: true,
        error: true,
      ));
    }
  }
}
