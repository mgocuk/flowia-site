import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

abstract class ReportsState {}
class ReportsInitial extends ReportsState {}

abstract class ReportsEvent {}
class LoadReports extends ReportsEvent {}

class ReportsBloc extends Bloc<ReportsEvent, ReportsState> {
  ReportsBloc() : super(ReportsInitial()) {
    on<LoadReports>((event, emit) {});
  }
}

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: BlocProvider(
        create: (_) => ReportsBloc()..add(LoadReports()),
        child: BlocBuilder<ReportsBloc, ReportsState>(
          builder: (context, state) {
            return const Center(child: Text('Health Analytics and Charts'));
          },
        ),
      ),
    );
  }
}
