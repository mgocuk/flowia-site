import 'package:flutter/material.dart';
class PricingCard extends StatelessWidget {
  const PricingCard({super.key});
  @override Widget build(BuildContext context) => Card(color: Colors.purple[50], child: Padding(padding: EdgeInsets.all(24), child: Column(children: [Text('Premium', style: TextStyle(fontSize: 24)), Text('\$4.99/mo', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold))])));
}