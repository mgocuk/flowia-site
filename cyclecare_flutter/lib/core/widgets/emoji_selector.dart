import 'package:flutter/material.dart';

class MoodOption {
  final int id;
  final String emoji;
  final String label;

  const MoodOption({required this.id, required this.emoji, required this.label});
}

class EmojiSelector extends StatelessWidget {
  final List<MoodOption> moods;
  final int? selectedId;
  final ValueChanged<int> onSelect;

  const EmojiSelector({
    Key? key,
    required this.moods,
    required this.selectedId,
    required this.onSelect,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: moods.map((m) {
        final isSelected = selectedId == m.id;
        return GestureDetector(
          onTap: () => onSelect(m.id),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFFFCE4EC) : Colors.white,
              shape: BoxShape.circle,
              border: Border.all(
                color: isSelected ? const Color(0xFFE8789A) : const Color(0xFFE5E5EA),
                width: isSelected ? 2.5 : 1.0,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: const Color(0xFFE8789A).withOpacity(0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      )
                    ]
                  : [],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(m.emoji, style: TextStyle(fontSize: isSelected ? 32 : 26)),
                const SizedBox(height: 4),
                Text(
                  m.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? const Color(0xFFE8789A) : const Color(0xFF8E8E93),
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
