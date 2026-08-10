import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/tarhib_scaffold.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;

    return TarhibScaffold(
      appBar: GlassAppBar(title: Text(l.aboutApp), centerTitle: true),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 24, 20, 32),
          children: [
            Center(
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: SnowColors.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.local_cafe_rounded, color: Colors.white, size: 34),
              ),
            ),
            const SizedBox(height: 16),
            Text(l.appTitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: 4),
            Text(l.appVersion('1.2.0'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: SnowColors.textMuted)),
            const SizedBox(height: 24),
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.aboutDescription,
                      style: const TextStyle(fontSize: 13, height: 1.6, color: SnowColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
