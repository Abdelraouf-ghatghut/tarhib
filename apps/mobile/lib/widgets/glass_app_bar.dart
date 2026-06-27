import 'dart:ui';
import 'package:flutter/material.dart';

/// Translucent app bar with backdrop blur.
/// Wrap inside a [Stack] or use as [AppBar.flexibleSpace] after setting
/// [AppBar.backgroundColor] to [Colors.transparent].
class GlassAppBar extends StatelessWidget implements PreferredSizeWidget {
  const GlassAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.centerTitle = true,
  });

  final Widget title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool centerTitle;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reducedTransparency = MediaQuery.of(context).highContrast;

    final bgColor = reducedTransparency
        ? (isDark
            ? const Color(0xFF1A1A2E)
            : Theme.of(context).colorScheme.surface)
        : (isDark ? const Color(0x8014121E) : const Color(0x80FFFFFF));

    Widget bar = Container(
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(
          bottom: BorderSide(
            color: reducedTransparency
                ? Theme.of(context).dividerColor
                : const Color(0x30FFFFFF),
            width: 0.5,
          ),
        ),
      ),
      child: AppBar(
        title: title,
        actions: actions,
        leading: leading,
        centerTitle: centerTitle,
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
    );

    if (!reducedTransparency) {
      bar = ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: bar,
        ),
      );
    }

    return bar;
  }
}
