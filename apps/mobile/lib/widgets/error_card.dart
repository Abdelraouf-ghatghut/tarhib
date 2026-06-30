import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'glass_card.dart';

/// Unified error display — parses DioException for human-readable messages.
class ErrorCard extends StatelessWidget {
  const ErrorCard({
    super.key,
    required this.error,
    required this.onRetry,
    this.margin,
  });

  final Object error;
  final VoidCallback onRetry;
  final EdgeInsetsGeometry? margin;

  String _message(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    if (error is DioException) {
      final dioErr = error as DioException;
      switch (dioErr.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
          return 'Connexion trop lente. Vérifiez votre réseau.';
        case DioExceptionType.connectionError:
          return 'Impossible de joindre le serveur.';
        default:
          final code = dioErr.response?.statusCode;
          if (code == 401) return 'Session expirée. Reconnectez-vous.';
          if (code == 403) return 'Accès refusé.';
          if (code != null && code >= 500) return 'Erreur serveur (${code}). Réessayez.';
      }
    }
    final msg = error.toString();
    if (msg.length > 120) return '${msg.substring(0, 120)}…';
    return msg;
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return Center(
      child: GlassCard(
        margin: margin ?? const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 48, color: scheme.error),
            const SizedBox(height: 16),
            Text(
              _message(context),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: scheme.onSurface.withValues(alpha: 0.75),
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(l.errorRetry),
            ),
          ],
        ),
      ),
    );
  }
}
