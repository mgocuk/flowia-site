import 'package:hive_flutter/hive_flutter.dart';
import 'package:injectable/injectable.dart';

@lazySingleton
class HiveStorageService {
  static const String cycleBox = 'cycles';
  static const String symptomBox = 'symptoms';
  static const String moodBox = 'moods';

  Future<void> init() async {
    await Hive.openBox(cycleBox);
    await Hive.openBox(symptomBox);
    await Hive.openBox(moodBox);
  }
  
  Box getCycleBox() => Hive.box(cycleBox);
  Box getSymptomBox() => Hive.box(symptomBox);
  Box getMoodBox() => Hive.box(moodBox);
}
