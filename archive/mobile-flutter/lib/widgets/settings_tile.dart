import 'package:flutter/material.dart';

import '../theme/snow_colors.dart';
import 'glass_card.dart';

/// Ligne de réglage SnowUI — jamais un simple ListTile : icône dans un cercle
/// pastel, titre, description optionnelle, chevron, hover léger via InkWell.
class SettingsTile extends StatelessWidget {
  const SettingsTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.accent = SnowColors.primary,
    this.accentSoft = SnowColors.primarySoft,
    this.destructive = false,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color accent;
  final Color accentSoft;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final fg = destructive ? SnowColors.dangerStrong : SnowColors.textPrimary;
    final iconAccent = destructive ? SnowColors.dangerStrong : accent;
    final iconBg = destructive ? SnowColors.dangerSoft : accentSoft;

    return GlassCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
              child: Icon(icon, size: 18, color: iconAccent),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14, color: fg),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, color: SnowColors.textMuted),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null)
              trailing!
            else if (onTap != null)
              const Icon(Icons.chevron_right_rounded,
                  size: 20, color: SnowColors.textMuted),
          ],
        ),
      ),
    );
  }
}

/// En-tête de section discret (majuscules, gris) au-dessus d'un groupe de
/// SettingsTile — cohérent avec le Web Admin.
class SettingsSectionLabel extends StatelessWidget {
  const SettingsSectionLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 4, 10),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: SnowColors.textMuted,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
