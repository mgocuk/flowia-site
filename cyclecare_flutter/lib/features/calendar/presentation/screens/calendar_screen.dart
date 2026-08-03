import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

abstract class CalendarState {}
class CalendarInitial extends CalendarState {}

abstract class CalendarEvent {}
class LoadCalendar extends CalendarEvent {}

class CalendarBloc extends Bloc<CalendarEvent, CalendarState> {
  CalendarBloc() : super(CalendarInitial()) {
    on<LoadCalendar>((event, emit) {});
  }
}

class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Calendar')),
      body: BlocProvider(
        create: (_) => CalendarBloc()..add(LoadCalendar()),
        child: BlocBuilder<CalendarBloc, CalendarState>(
          builder: (context, state) {
            return const Center(child: Text('Calendar View Here'));
          },
        ),
      ),
    );
  }
}
