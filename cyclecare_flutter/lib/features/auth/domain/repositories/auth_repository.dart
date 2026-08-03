import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/user_entity.dart';
import '../../data/models/auth_response_model.dart';

abstract class AuthRepository {
  Future<Either<Failure, AuthResponse>> login(String email, String password);
  Future<Either<Failure, AuthResponse>> register(String email, String password, String name);
  Future<Either<Failure, void>> logout();
  Future<Either<Failure, AuthResponse>> refreshToken();
  Future<Either<Failure, void>> deleteAccount();
  Future<Either<Failure, UserEntity>> getCurrentUser();
}
