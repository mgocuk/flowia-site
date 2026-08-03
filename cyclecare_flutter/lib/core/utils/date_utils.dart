import 'package:intl/intl.dart';

class CycleDateUtils {
  static String formatDate(DateTime date) {
    return DateFormat('MMM dd, yyyy').format(date);
  }

  static int getDaysBetween(DateTime from, DateTime to) {
    from = DateTime(from.year, from.month, from.day);
    to = DateTime(to.year, to.month, to.day);
    return (to.difference(from).inHours / 24).round();
  }

  static int getCycleDay(DateTime lastPeriodDate) {
    return getDaysBetween(lastPeriodDate, DateTime.now()) + 1;
  }

  static String getCyclePhase(int cycleDay, int avgCycle) {
    if (cycleDay <= 5) return 'Menstrual';
    if (cycleDay <= 12) return 'Follicular';
    if (cycleDay <= 16) return 'Ovulation';
    return 'Luteal';
  }
}
