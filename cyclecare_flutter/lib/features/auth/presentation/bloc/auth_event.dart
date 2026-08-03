import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object> get props => [];
}

class AuthCheckStatusEvent extends AuthEvent {}

class AuthLoginEvent extends AuthEvent {
  final String email;
  final String password;
  const AuthLoginEvent(this.email, this.password);
  @override
  List<Object> get props => [email, password];
}

class AuthRegisterEvent extends AuthEvent {
  final String email;
  final String password;
  final String name;
  const AuthRegisterEvent(this.email, this.password, this.name);
  @override
  List<Object> get props => [email, password, name];
}

class AuthLogoutEvent extends AuthEvent {}
