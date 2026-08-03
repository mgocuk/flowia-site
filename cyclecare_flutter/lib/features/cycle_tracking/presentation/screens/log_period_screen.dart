import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

abstract class CycleState {}
class CycleInitial extends CycleState {}

abstract class CycleEvent {}
class LoadCycleData extends CycleEvent {}

class CycleBloc extends Bloc<CycleEvent, CycleState> {
  CycleBloc() : super(CycleInitial()) {
    on<LoadCycleData>((event, emit) {});
  }
}

class LogPeriodScreen extends StatelessWidget {
  const LogPeriodScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log Period')),
      body: BlocProvider(
        create: (_) => CycleBloc()..add(LoadCycleData()),
        child: BlocBuilder<CycleBloc, CycleState>(
          builder: (context, state) {
            return const Center(child: Text('Log Period Flow Here'));
          },
        ),
      ),
    );
  }
}
