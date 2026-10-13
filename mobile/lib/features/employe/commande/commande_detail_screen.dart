import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/bilingue.dart';
import '../../../shared/statut_commande_libelle.dart';
import '../../../shared/widgets/erreur_avec_retry.dart';
import 'commande_detail_providers.dart';

class CommandeDetailScreen extends ConsumerWidget {
  const CommandeDetailScreen({required this.commandeId, super.key});

  final String commandeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final commande = ref.watch(commandeDetailProvider(commandeId));

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.detailCommandeTitre),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: l10n.reessayer,
            onPressed: () => ref.invalidate(commandeDetailProvider(commandeId)),
          ),
        ],
      ),
      body: commande.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => ErreurAvecRetry(
          onReessayer: () => ref.invalidate(commandeDetailProvider(commandeId)),
        ),
        data: (commande) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Chip(
                label: Text(libelleStatutCommande(context, commande.statut)),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.detailProduits,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              ...commande.lignes.map(
                (ligne) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    texteBilingue(context, ar: ligne.nomAr, en: ligne.nomEn),
                  ),
                  trailing: Text(
                    '${formaterNombre(ligne.quantite)} × ${formaterPrix(context, ligne.prixUnitaireSnapshot)}',
                  ),
                ),
              ),
              const Divider(height: 32),
              _LigneInfo(
                label: l10n.detailDateCreation,
                valeur: DateFormat.yMd().add_Hm().format(commande.createdAt),
              ),
              if (commande.heureSouhaitee != null)
                _LigneInfo(
                  label: l10n.detailHeureSouhaitee,
                  valeur: DateFormat.yMd().add_Hm().format(
                    commande.heureSouhaitee!,
                  ),
                ),
              if (commande.lieuLivraison != null &&
                  commande.lieuLivraison!.isNotEmpty)
                _LigneInfo(
                  label: l10n.detailLieuLivraison,
                  valeur: commande.lieuLivraison!,
                ),
              if (commande.salle != null && commande.salle!.isNotEmpty)
                _LigneInfo(label: l10n.detailSalle, valeur: commande.salle!),
              _LigneInfo(
                label: l10n.detailPriorite,
                valeur: formaterNombre(commande.priorite),
              ),
              if (commande.commentaire != null &&
                  commande.commentaire!.isNotEmpty)
                _LigneInfo(
                  label: l10n.detailCommentaire,
                  valeur: commande.commentaire!,
                ),
            ],
          );
        },
      ),
    );
  }
}

class _LigneInfo extends StatelessWidget {
  const _LigneInfo({required this.label, required this.valeur});

  final String label;
  final String valeur;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          Expanded(child: Text(valeur, textAlign: TextAlign.end)),
        ],
      ),
    );
  }
}
