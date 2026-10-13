import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/bilingue.dart';
import '../../../shared/widgets/erreur_avec_retry.dart';
import 'catalogue_providers.dart';

class CatalogueScreen extends ConsumerWidget {
  const CatalogueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final catalogue = ref.watch(catalogueProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.catalogueTitre)),
      body: catalogue.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => ErreurAvecRetry(
          onReessayer: () => ref.invalidate(catalogueProvider),
        ),
        data: (produits) {
          if (produits.isEmpty) {
            return Center(child: Text(l10n.catalogueVide));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: produits.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final produit = produits[index];
              final nom = texteBilingue(
                context,
                ar: produit.nomAr,
                en: produit.nomEn,
              );
              final categorie = produit.categorie == null
                  ? null
                  : texteBilingue(
                      context,
                      ar: produit.categorie!.nomAr,
                      en: produit.categorie!.nomEn,
                    );

              return Card(
                child: ListTile(
                  title: Text(nom),
                  subtitle: categorie == null ? null : Text(categorie),
                  trailing: Text(formaterPrix(context, produit.prixUnitaire)),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
