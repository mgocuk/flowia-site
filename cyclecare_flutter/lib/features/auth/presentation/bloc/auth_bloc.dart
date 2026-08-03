import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'auth_event.dart';
import 'auth_state.dart';
import '../../domain/repositories/auth_repository.dart';

@injectable
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository repository;

  AuthBloc(this.repository) : super(AuthInitial()) {
    on<AuthCheckStatusEvent>((event, emit) async {
      emit(AuthLoading());
      final result = await repository.getCurrentUser();
      result.fold(
        (failure) => emit(AuthUnauthenticated()),
        (user) => emit(AuthAuthenticated(user)),
      );
    });

    on<AuthLoginEvent>((event, emit) async {
      emit(AuthLoading());
      final result = await repository.login(event.email, event.password);
      result.fold(
        (failure) => emit(AuthError(failure.message)),
        (response) => emit(AuthAuthenticated(response.user)),
      );
    });

    on<AuthRegisterEvent>((event, emit) async {
      emit(AuthLoading());
      final result = await repository.register(event.email, event.password, event.name);
      result.fold(
        (failure) => emit(AuthError(failure.message)),
        (response) => emit(AuthAuthenticated(response.user)),
      );
    });

    on<AuthLogoutEvent>((event, emit) async {
      emit(AuthLoading());
      await repository.logout();
      emit(AuthUnauthenticated());
    });
  }
}
