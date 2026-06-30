import 'package:flutter/material.dart';

enum EmptyStateType { cart, orders, queue, rooms, catalog, generic }

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.type,
    required this.title,
    this.subtitle,
    this.action,
  });

  final EmptyStateType type;
  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Illustration(type: type, isDark: isDark, scheme: scheme),
            const SizedBox(height: 24),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                style: TextStyle(
                  fontSize: 14,
                  color: scheme.onSurface.withValues(alpha: 0.55),
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: 24),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

class _Illustration extends StatelessWidget {
  const _Illustration({
    required this.type,
    required this.isDark,
    required this.scheme,
  });

  final EmptyStateType type;
  final bool isDark;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      height: 160,
      child: CustomPaint(
        painter: _IllustrationPainter(
          type: type,
          primary: scheme.primary,
          secondary: scheme.secondary,
          surface: scheme.surface,
          isDark: isDark,
        ),
      ),
    );
  }
}

class _IllustrationPainter extends CustomPainter {
  final EmptyStateType type;
  final Color primary;
  final Color secondary;
  final Color surface;
  final bool isDark;

  const _IllustrationPainter({
    required this.type,
    required this.primary,
    required this.secondary,
    required this.surface,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final bg = Paint()
      ..color = primary.withValues(alpha: isDark ? 0.15 : 0.08)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(size.center(Offset.zero), size.width / 2, bg);

    final iconPaint = Paint()
      ..color = primary.withValues(alpha: 0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..color = primary.withValues(alpha: isDark ? 0.3 : 0.15)
      ..style = PaintingStyle.fill;

    final cx = size.width / 2;
    final cy = size.height / 2;

    switch (type) {
      case EmptyStateType.cart:
        _drawCart(canvas, cx, cy, iconPaint, fillPaint);
      case EmptyStateType.orders:
        _drawOrders(canvas, cx, cy, iconPaint, fillPaint);
      case EmptyStateType.queue:
        _drawQueue(canvas, cx, cy, iconPaint, fillPaint);
      case EmptyStateType.rooms:
        _drawRooms(canvas, cx, cy, iconPaint, fillPaint);
      case EmptyStateType.catalog:
        _drawCatalog(canvas, cx, cy, iconPaint, fillPaint);
      case EmptyStateType.generic:
        _drawGeneric(canvas, cx, cy, iconPaint, fillPaint);
    }
  }

  void _drawCart(Canvas canvas, double cx, double cy, Paint stroke, Paint fill) {
    final body = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx, cy), width: 56, height: 40),
      const Radius.circular(8),
    );
    canvas.drawRRect(body, fill);
    canvas.drawRRect(body, stroke);
    // Handle
    final path = Path()
      ..moveTo(cx - 28, cy - 20)
      ..lineTo(cx - 40, cy - 30)
      ..lineTo(cx - 50, cy - 30);
    canvas.drawPath(path, stroke);
    // Wheels
    canvas.drawCircle(Offset(cx - 16, cy + 24), 5, fill);
    canvas.drawCircle(Offset(cx - 16, cy + 24), 5, stroke);
    canvas.drawCircle(Offset(cx + 16, cy + 24), 5, fill);
    canvas.drawCircle(Offset(cx + 16, cy + 24), 5, stroke);
    // Plus sign
    canvas.drawLine(Offset(cx, cy - 8), Offset(cx, cy + 8), stroke);
    canvas.drawLine(Offset(cx - 8, cy), Offset(cx + 8, cy), stroke);
  }

  void _drawOrders(Canvas canvas, double cx, double cy, Paint stroke, Paint fill) {
    final rect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx, cy), width: 52, height: 64),
      const Radius.circular(6),
    );
    canvas.drawRRect(rect, fill);
    canvas.drawRRect(rect, stroke);
    for (var i = -1; i <= 1; i++) {
      canvas.drawLine(
        Offset(cx - 16, cy + i * 14),
        Offset(cx + 16, cy + i * 14),
        stroke,
      );
    }
    // Checkmark at top
    final check = Path()
      ..moveTo(cx - 8, cy - 26)
      ..lineTo(cx - 2, cy - 20)
      ..lineTo(cx + 10, cy - 32);
    final checkPaint = Paint()
      ..color = primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(check, checkPaint);
  }

  void _drawQueue(Canvas canvas, double cx, double cy, Paint stroke, Paint fill) {
    for (var i = 0; i < 3; i++) {
      final y = cy - 20 + i * 20.0;
      final card = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx + i * 4, y), width: 60 - i * 8, height: 14),
        const Radius.circular(4),
      );
      canvas.drawRRect(card, fill);
      canvas.drawRRect(card, stroke);
    }
    // Clock
    canvas.drawCircle(Offset(cx + 28, cy + 28), 18, fill);
    canvas.drawCircle(Offset(cx + 28, cy + 28), 18, stroke);
    canvas.drawLine(Offset(cx + 28, cy + 28), Offset(cx + 28, cy + 16), stroke);
    canvas.drawLine(Offset(cx + 28, cy + 28), Offset(cx + 36, cy + 28), stroke);
  }

  void _drawRooms(Canvas canvas, double cx, double cy, Paint stroke, Paint fill) {
    final room = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx, cy - 8), width: 64, height: 48),
      const Radius.circular(6),
    );
    canvas.drawRRect(room, fill);
    canvas.drawRRect(room, stroke);
    // Table
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy - 8), width: 36, height: 20),
      fill,
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy - 8), width: 36, height: 20),
      stroke,
    );
    // Door
    final door = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx, cy + 28), width: 20, height: 24),
      const Radius.circular(4),
    );
    canvas.drawRRect(door, fill);
    canvas.drawRRect(door, stroke);
  }

  void _drawCatalog(Canvas canvas, double cx, double cy, Paint stroke, Paint fill) {
    for (var i = 0; i < 4; i++) {
      final x = cx - 20 + (i % 2) * 40.0;
      final y = cy - 16 + (i ~/ 2) * 36.0;
      final card = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(x, y), width: 28, height: 28),
        const Radius.circular(6),
      );
      canvas.drawRRect(card, fill);
      canvas.drawRRect(card, stroke);
    }
  }

  void _drawGeneric(Canvas canvas, double cx, double cy, Paint stroke, Paint fill) {
    canvas.drawCircle(Offset(cx, cy), 28, fill);
    canvas.drawCircle(Offset(cx, cy), 28, stroke);
    canvas.drawLine(Offset(cx, cy - 14), Offset(cx, cy - 4), stroke);
    canvas.drawCircle(Offset(cx, cy + 8), 3, stroke..style = PaintingStyle.fill);
    stroke.style = PaintingStyle.stroke;
  }

  @override
  bool shouldRepaint(_IllustrationPainter old) =>
      old.type != type || old.primary != primary || old.isDark != isDark;
}
