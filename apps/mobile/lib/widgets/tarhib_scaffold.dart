import 'package:flutter/material.dart';

/// Scaffold with the Tarhib brand gradient background.
/// Wrap any screen that needs the Liquid Glass effect behind its surfaces.
class TarhibScaffold extends StatelessWidget {
  const TarhibScaffold({
    super.key,
    required this.child,
    this.appBar,
    this.bottomNavigationBar,
    this.resizeToAvoidBottomInset = true,
  });

  final Widget child;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final bool resizeToAvoidBottomInset;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final gradient = isDark
        ? const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0D1B10), Color(0xFF1A1A2E), Color(0xFF0D1B10)],
          )
        : const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFE8F5E9), Color(0xFFE3F2FD), Color(0xFFF1F8E9)],
          );

    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: true,
      extendBody: true,
      appBar: appBar,
      bottomNavigationBar: bottomNavigationBar,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      body: Container(
        decoration: BoxDecoration(gradient: gradient),
        child: child,
      ),
    );
  }
}
