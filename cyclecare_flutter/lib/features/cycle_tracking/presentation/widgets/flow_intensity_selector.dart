import 'package:flutter/material.dart';

class FlowIntensitySelector extends StatefulWidget {
  final Function(String) onSelected;
  
  const FlowIntensitySelector({super.key, required this.onSelected});

  @override
  State<FlowIntensitySelector> createState() => _FlowIntensitySelectorState();
}

class _FlowIntensitySelectorState extends State<FlowIntensitySelector> {
  String? _selected;
  final List<String> _intensities = ['Light', 'Medium', 'Heavy', 'Spotting'];

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: _intensities.map((intensity) {
        final isSelected = _selected == intensity;
        return GestureDetector(
          onTap: () {
            setState(() => _selected = intensity);
            widget.onSelected(intensity);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isSelected ? Theme.of(context).primaryColor : Colors.grey[200],
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              intensity,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class PainSlider extends StatefulWidget {
  final Function(double) onChanged;
  
  const PainSlider({super.key, required this.onChanged});

  @override
  State<PainSlider> createState() => _PainSliderState();
}

class _PainSliderState extends State<PainSlider> {
  double _value = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Pain Level: ${_value.toInt()} / 10'),
        Slider(
          value: _value,
          min: 0,
          max: 10,
          divisions: 10,
          activeColor: Colors.redAccent,
          onChanged: (val) {
            setState(() => _value = val);
            widget.onChanged(val);
          },
        ),
      ],
    );
  }
}
