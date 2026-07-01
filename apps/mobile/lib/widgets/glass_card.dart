import 'package:flutter/material.dart';

/// Surface card — Material 3 filled card.
/// Named GlassCard for backward compatibility; glass effects removed.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = 16,
    this.sigmaBlur = 0, // kept for API compatibility, unused
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final double sigmaBlur;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      margin: margin ?? EdgeInsets.zero,
      elevation: 0,
      color: isDark ? const Color(0xFF141414) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(borderRadius),
        side: BorderSide(
          color: isDark ? const Color(0xFF2D2D2D) : const Color(0xFFEBECF0),
          width: 1,
        ),
      ),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(16),
        child: child,
      ),
    );
  }
}
