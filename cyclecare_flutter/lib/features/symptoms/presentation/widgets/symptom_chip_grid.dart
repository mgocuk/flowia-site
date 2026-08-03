import 'package:flutter/material.dart';
class SymptomChipGrid extends StatelessWidget {
  const SymptomChipGrid({super.key});
  @override Widget build(BuildContext context) => Wrap(spacing: 8, children: [Chip(label: Text('Cramps')), Chip(label: Text('Headache'))]);
}