import 'package:flutter/material.dart';

import '../theme/snow_colors.dart';

enum SnowStatusTone { primary, success, warning, danger, neutral, info }

/// Badge pastel SnowUI — pilule fond clair + texte teinté, jamais de couleur
/// saturée pleine. Utilisé pour statuts de commande, réservation, quota…
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.tone = SnowStatusTone.neutral,
    this.icon,
    this.dense = false,
  });

  final String label;
  final SnowStatusTone tone;
  final IconData? icon;
  final bool dense;

  ({Color bg, Color fg}) _colors() => switch (tone) {
        SnowStatusTone.primary =>
          (bg: SnowColors.primarySoft, fg: SnowColors.primaryStrong),
        SnowStatusTone.success =>
          (bg: SnowColors.successSoft, fg: SnowColors.successStrong),
        SnowStatusTone.warning =>
          (bg: SnowColors.warningSoft, fg: SnowColors.warningStrong),
        SnowStatusTone.danger =>
          (bg: SnowColors.dangerSoft, fg: SnowColors.dangerStrong),
        SnowStatusTone.info => (bg: SnowColors.infoSoft, fg: SnowColors.info),
        SnowStatusTone.neutral =>
          (bg: SnowColors.surfaceMuted, fg: SnowColors.textSecondary),
      };

  @override
  Widget build(BuildContext context) {
    final c = _colors();
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 8 : 12,
        vertical: dense ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: dense ? 11 : 13, color: c.fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: dense ? 11 : 12,
              fontWeight: FontWeight.w700,
              color: c.fg,
              height: 1,
            ),
          ),
        ],
      ),
    );
  }
}
