import 'package:flutter/material.dart';
class HealthScoreCard extends StatelessWidget {
  const HealthScoreCard({super.key});
  @override Widget build(BuildContext context) => Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Health Score: 92/100', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))));
}