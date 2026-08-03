import 'package:flutter/material.dart';

class SymptomChip {
  final String id;
  final String label;
  final String icon;

  const SymptomChip({required this.id, required this.label, required this.icon});
}

class SymptomChipGrid extends StatelessWidget {
  final List<SymptomChip> items;
  final List<String> selectedIds;
  final ValueChanged<String> onToggle;

  const SymptomChipGrid({
    Key? key,
    required this.items,
    required this.selectedIds,
    required this.onToggle,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: items.map((item) {
        final isSelected = selectedIds.contains(item.id);
        return InkWell(
          onTap: () => onToggle(item.id),
          borderRadius: BorderRadius.circular(16),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFFE8789A) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? const Color(0xFFE8789A) : const Color(0xFFE5E5EA),
                width: 1.5,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: const Color(0xFFE8789A).withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      )
                    ]
                  : [],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(item.icon, style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 6),
                Text(
                  item.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                    color: isSelected ? Colors.white : const Color(0xFF2C2C2E),
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
