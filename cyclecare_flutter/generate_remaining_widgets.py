import os

BASE_DIR = r"c:\Users\MustafaGOCUK\Desktop\cyclecare\cyclecare_flutter\lib\features"

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

FILES = {
    "symptoms/presentation/widgets/symptom_chip_grid.dart": """import 'package:flutter/material.dart';
class SymptomChipGrid extends StatelessWidget {
  const SymptomChipGrid({super.key});
  @override Widget build(BuildContext context) => Wrap(spacing: 8, children: [Chip(label: Text('Cramps')), Chip(label: Text('Headache'))]);
}""",
    "moods/presentation/widgets/emoji_selector.dart": """import 'package:flutter/material.dart';
class EmojiSelector extends StatelessWidget {
  const EmojiSelector({super.key});
  @override Widget build(BuildContext context) => Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: const [Text('😊', style: TextStyle(fontSize: 32)), Text('😢', style: TextStyle(fontSize: 32))]);
}""",
    "fertility/presentation/widgets/fertility_timeline.dart": """import 'package:flutter/material.dart';
class FertilityTimeline extends StatelessWidget {
  const FertilityTimeline({super.key});
  @override Widget build(BuildContext context) => Container(height: 100, color: Colors.pink[50], child: const Center(child: Text('Fertility Window Timeline')));
}""",
    "reports/presentation/widgets/health_score_card.dart": """import 'package:flutter/material.dart';
class HealthScoreCard extends StatelessWidget {
  const HealthScoreCard({super.key});
  @override Widget build(BuildContext context) => Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Health Score: 92/100', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))));
}""",
    "subscription/presentation/widgets/pricing_card.dart": """import 'package:flutter/material.dart';
class PricingCard extends StatelessWidget {
  const PricingCard({super.key});
  @override Widget build(BuildContext context) => Card(color: Colors.purple[50], child: Padding(padding: EdgeInsets.all(24), child: Column(children: [Text('Premium', style: TextStyle(fontSize: 24)), Text('\\$4.99/mo', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold))])));
}"""
}

if __name__ == "__main__":
    for rel_path, content in FILES.items():
        write_file(os.path.join(BASE_DIR, os.path.normpath(rel_path)), content)
