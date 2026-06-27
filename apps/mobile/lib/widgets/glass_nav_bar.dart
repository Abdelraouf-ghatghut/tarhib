import 'dart:ui';
import 'package:flutter/material.dart';

/// Glass bottom navigation bar — wraps [NavigationBar] with backdrop blur.
class GlassNavBar extends StatelessWidget {
  const GlassNavBar({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.destinations,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<NavigationDestination> destinations;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reducedTransparency = MediaQuery.of(context).highContrast;

    final bgColor = reducedTransparency
        ? null
        : (isDark ? const Color(0x8014121E) : const Color(0x80FFFFFF));

    Widget nav = NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: onDestinationSelected,
      destinations: destinations,
      backgroundColor: bgColor ?? Colors.transparent,
      elevation: 0,
      indicatorColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
    );

    if (!reducedTransparency) {
      nav = ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Container(
            decoration: BoxDecoration(
              color: bgColor,
              border: Border(
                top: BorderSide(
                  color: const Color(0x40FFFFFF),
                  width: 0.5,
                ),
              ),
            ),
            child: nav,
          ),
        ),
      );
    }

    return nav;
  }
}
