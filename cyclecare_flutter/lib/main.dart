import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:cyclecare_flutter/core/di/injection.dart';
import 'package:cyclecare_flutter/core/router/app_router.dart';
import 'package:cyclecare_flutter/core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase (Assuming options are configured via flutterfire CLI)
  // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  
  // Initialize Hive
  await Hive.initFlutter();
  
  // Configure Dependency Injection
  configureDependencies();
  
  runApp(const CycleCareApp());
}

class CycleCareApp extends StatelessWidget {
  const CycleCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'CycleCare',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      routerConfig: appRouter,
    );
  }
}
