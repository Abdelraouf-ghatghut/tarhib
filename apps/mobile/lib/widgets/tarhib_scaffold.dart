import 'package:flutter/material.dart';

/// Standard Material 3 Scaffold — glass effects removed for clarity.
/// Named TarhibScaffold for backward compatibility.
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
    return Scaffold(
      appBar: appBar,
      bottomNavigationBar: bottomNavigationBar,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      body: child,
    );
  }
}
