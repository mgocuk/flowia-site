import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// Placeholder for actual screens
class SplashScreen extends StatelessWidget { const SplashScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Splash'))); }
class LoginScreen extends StatelessWidget { const LoginScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Login'))); }
class RegisterScreen extends StatelessWidget { const RegisterScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Register'))); }
class OnboardingScreen extends StatelessWidget { const OnboardingScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Onboarding'))); }
class HomeScreen extends StatelessWidget { const HomeScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Home'))); }
class CalendarScreen extends StatelessWidget { const CalendarScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Calendar'))); }
class ReportsScreen extends StatelessWidget { const ReportsScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Reports'))); }
class ProfileScreen extends StatelessWidget { const ProfileScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Profile'))); }
class LogPeriodScreen extends StatelessWidget { const LogPeriodScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Log Period'))); }
class SymptomsScreen extends StatelessWidget { const SymptomsScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Symptoms'))); }
class MoodScreen extends StatelessWidget { const MoodScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Mood'))); }
class FertilityScreen extends StatelessWidget { const FertilityScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Fertility'))); }
class InsightsScreen extends StatelessWidget { const InsightsScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Insights'))); }
class SettingsScreen extends StatelessWidget { const SettingsScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Settings'))); }
class PremiumScreen extends StatelessWidget { const PremiumScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Premium'))); }
class JournalScreen extends StatelessWidget { const JournalScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Journal'))); }
class NotificationsScreen extends StatelessWidget { const NotificationsScreen({super.key}); @override Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Notifications'))); }

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) {
        return Scaffold(
          body: child,
          bottomNavigationBar: BottomNavigationBar(
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.calendar_month), label: 'Calendar'),
              BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: 'Reports'),
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
            ],
            onTap: (index) {
              switch (index) {
                case 0:
                  context.go('/home');
                  break;
                case 1:
                  context.go('/calendar');
                  break;
                case 2:
                  context.go('/reports');
                  break;
                case 3:
                  context.go('/profile');
                  break;
              }
            },
          ),
        );
      },
      routes: [
        GoRoute(
          path: '/home',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/calendar',
          builder: (context, state) => const CalendarScreen(),
        ),
        GoRoute(
          path: '/reports',
          builder: (context, state) => const ReportsScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileScreen(),
        ),
      ],
    ),
    GoRoute(path: '/log-period', builder: (context, state) => const LogPeriodScreen()),
    GoRoute(path: '/symptoms', builder: (context, state) => const SymptomsScreen()),
    GoRoute(path: '/mood', builder: (context, state) => const MoodScreen()),
    GoRoute(path: '/fertility', builder: (context, state) => const FertilityScreen()),
    GoRoute(path: '/insights', builder: (context, state) => const InsightsScreen()),
    GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
    GoRoute(path: '/premium', builder: (context, state) => const PremiumScreen()),
    GoRoute(path: '/journal', builder: (context, state) => const JournalScreen()),
    GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
  ],
  redirect: (context, state) {
    // Auth redirect logic placeholder
    bool isAuthenticated = false; // replace with actual auth check
    bool isSplash = state.uri.path == '/';
    bool isLoggingIn = state.uri.path == '/login' || state.uri.path == '/register';

    if (!isAuthenticated && !isSplash && !isLoggingIn) {
      return '/login';
    }
    return null;
  },
);
