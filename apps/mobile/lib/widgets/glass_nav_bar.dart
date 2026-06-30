import 'package:flutter/material.dart';

/// Material 3 NavigationBar — replaces the glass version.
/// Named GlassNavBar for backward compatibility.
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
    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: onDestinationSelected,
      destinations: destinations,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      elevation: 3,
    );
  }
}
