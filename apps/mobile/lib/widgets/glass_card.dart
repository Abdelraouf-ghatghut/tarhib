import 'dart:ui';
import 'package:flutter/material.dart';

/// Liquid Glass surface — backdrop blur + translucent fill + specular edge.
/// Per SKILL.md: do NOT use on dense data tables or long forms.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = 20,
    this.sigmaBlur = 18,
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
    final reducedTransparency = MediaQuery.of(context).highContrast;

    // Fallback opaque when system requests reduced transparency
    final bgColor = reducedTransparency
        ? (isDark
            ? const Color(0xFF1A1A2E)
            : Theme.of(context).colorScheme.surface)
        : (isDark
            ? const Color(0x5914121E)
            : const Color(0x26FFFFFF));

    final border = reducedTransparency
        ? Border.all(color: Theme.of(context).dividerColor)
        : Border.all(color: const Color(0x40FFFFFF), width: 1);

    final radius = BorderRadius.circular(borderRadius);

    Widget content = Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: radius,
        border: border,
        boxShadow: reducedTransparency
            ? null
            : const [
                BoxShadow(
                  color: Color(0x1F000000),
                  blurRadius: 32,
                  offset: Offset(0, 8),
                ),
              ],
      ),
      child: Stack(
        children: [
          // Specular highlight — thin top gradient, direction-agnostic (symmetric)
          if (!reducedTransparency)
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              height: 1.5,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Color(0x00FFFFFF),
                      Color(0x99FFFFFF),
                      Color(0x00FFFFFF),
                    ],
                  ),
                ),
              ),
            ),
          Padding(
            padding: padding ?? const EdgeInsets.all(16),
            child: child,
          ),
        ],
      ),
    );

    if (!reducedTransparency) {
      content = ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: sigmaBlur, sigmaY: sigmaBlur),
          child: content,
        ),
      );
    }

    if (margin != null) {
      content = Padding(padding: margin!, child: content);
    }

    return content;
  }
}
