import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

abstract class ProfileState {}
class ProfileInitial extends ProfileState {}

abstract class ProfileEvent {}
class LoadProfile extends ProfileEvent {}

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  ProfileBloc() : super(ProfileInitial()) {
    on<LoadProfile>((event, emit) {});
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: BlocProvider(
        create: (_) => ProfileBloc()..add(LoadProfile()),
        child: BlocBuilder<ProfileBloc, ProfileState>(
          builder: (context, state) {
            return const Center(child: Text('User Profile Settings'));
          },
        ),
      ),
    );
  }
}
