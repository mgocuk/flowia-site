class ApiEndpoints {
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  
  static const String currentCycle = '/cycle/current';
  static const String logPeriod = '/cycle/log';
  static const String predictions = '/cycle/predictions';
  
  static const String logSymptoms = '/symptoms/log';
  static const String logMood = '/moods/log';
  static const String fertilityStatus = '/fertility/status';
  
  static const String reportsCycle = '/reports/cycle';
  static const String reportsSymptoms = '/reports/symptoms';
  
  static const String insights = '/insights';
  
  static const String journal = '/journal';
  static const String journalEntry = '/journal/entry';
  
  static const String profile = '/profile';
  static const String subscriptionPurchase = '/subscription/purchase';
}
