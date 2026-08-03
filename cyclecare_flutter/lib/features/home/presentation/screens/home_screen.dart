import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

abstract class HomeState {}
class HomeInitial extends HomeState {}

abstract class HomeEvent {}
class LoadHomeData extends HomeEvent {}

class HomeBloc extends Bloc<HomeEvent, HomeState> {
  HomeBloc() : super(HomeInitial()) {
    on<LoadHomeData>((event, emit) {});
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: BlocProvider(
        create: (_) => HomeBloc()..add(LoadHomeData()),
        child: BlocBuilder<HomeBloc, HomeState>(
          builder: (context, state) {
            return const Center(child: Text('Dashboard Analytics Here'));
          },
        ),
      ),
    );
  }
}
