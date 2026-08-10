import 'package:flutter/material.dart';

import '../theme/snow_colors.dart';
import 'glass_card.dart';

/// Petite KPI Card pastel — identique au Dashboard SnowUI du Web Admin.
/// Icône dans un cercle teinté + valeur + libellé.
class KpiCard extends StatelessWidget {
  const KpiCard({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    this.accent = SnowColors.primary,
    this.accentSoft = SnowColors.primarySoft,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color accent;
  final Color accentSoft;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: accentSoft, shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: accent),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: SnowColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: SnowColors.textMuted),
          ),
        ],
      ),
    );
  }
}
