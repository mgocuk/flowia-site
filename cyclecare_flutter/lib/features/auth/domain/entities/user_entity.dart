import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String name;
  final String role;
  final bool isPremium;
  final DateTime createdAt;

  const UserEntity({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.isPremium,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, email, name, role, isPremium, createdAt];
}
