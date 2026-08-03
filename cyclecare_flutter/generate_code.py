import os

BASE_DIR = r"c:\Users\MustafaGOCUK\Desktop\cyclecare\cyclecare_flutter\lib\features"

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

FILES = {
    "auth/presentation/screens/login_screen.dart": """import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            context.go('/home');
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message)));
          }
        },
        builder: (context, state) {
          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Welcome Back', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 32),
                  TextFormField(
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Password'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: state is AuthLoading ? null : () {
                      if (_formKey.currentState!.validate()) {
                        context.read<AuthBloc>().add(AuthLoginEvent(_emailController.text, _passwordController.text));
                      }
                    },
                    child: state is AuthLoading ? const CircularProgressIndicator() : const Text('Login'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}""",
    "auth/data/repositories/auth_repository_impl.dart": """import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/entities/user_entity.dart';
import '../models/auth_response_model.dart';
import '../../../../core/error/failures.dart';

@Injectable(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  @override
  Future<Either<Failure, AuthResponse>> login(String email, String password) async {
    // Simulated successful login for scaffold purposes
    return Right(AuthResponse(
      accessToken: 'token', 
      refreshToken: 'refresh', 
      user: UserModel(id: '1', email: email, name: 'User', role: 'user', isPremium: false, createdAt: DateTime.now())
    ));
  }
  
  @override
  Future<Either<Failure, AuthResponse>> register(String email, String password, String name) async {
    return const Left(ServerFailure(message: 'Not implemented'));
  }
  
  @override
  Future<Either<Failure, void>> logout() async { return const Right(null); }
  
  @override
  Future<Either<Failure, AuthResponse>> refreshToken() async { return const Left(ServerFailure(message: 'Not implemented')); }
  
  @override
  Future<Either<Failure, void>> deleteAccount() async { return const Right(null); }
  
  @override
  Future<Either<Failure, UserEntity>> getCurrentUser() async { return const Left(AuthFailure(message: 'No user')); }
}"""
}

if __name__ == "__main__":
    for rel_path, content in FILES.items():
        full_path = os.path.join(BASE_DIR, os.path.normpath(rel_path))
        write_file(full_path, content)
    print("Files generated.")
