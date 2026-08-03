import 'dart:math';
import 'package:flutter/material.dart';

class CycleRingWidget extends StatelessWidget {
  final int cycleDay;
  final int avgCycle;
  final String phase;
  final double size;

  const CycleRingWidget({
    super.key,
    required this.cycleDay,
    required this.avgCycle,
    required this.phase,
    this.size = 200,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _CycleRingPainter(
          cycleDay: cycleDay,
          avgCycle: avgCycle,
          phaseColor: _getPhaseColor(),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Day $cycleDay', style: Theme.of(context).textTheme.headlineMedium),
              Text(phase, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: _getPhaseColor())),
            ],
          ),
        ),
      ),
    );
  }

  Color _getPhaseColor() {
    switch (phase.toLowerCase()) {
      case 'menstrual': return const Color(0xFFE57373);
      case 'follicular': return const Color(0xFF81C784);
      case 'ovulation': return const Color(0xFF64B5F6);
      case 'luteal': return const Color(0xFFFFD54F);
      default: return Colors.grey;
    }
  }
}

class _CycleRingPainter extends CustomPainter {
  final int cycleDay;
  final int avgCycle;
  final Color phaseColor;

  _CycleRingPainter({required this.cycleDay, required this.avgCycle, required this.phaseColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2 - 10;
    
    // Background ring
    final bgPaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, bgPaint);

    // Progress arc
    final progressPaint = Paint()
      ..color = phaseColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;
      
    final progressAngle = (cycleDay / avgCycle) * 2 * pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2, // Start at top
      progressAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
