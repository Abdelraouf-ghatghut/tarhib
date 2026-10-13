import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/bilingue.dart';
import '../../../shared/models/commande_resume.dart';
import '../../../shared/models/quota_consommation.dart';
import '../../../shared/statut_commande_libelle.dart';
import '../../../shared/widgets/erreur_avec_retry.dart';
import 'dashboard_providers.dart';

class EmployeDashboardScreen extends ConsumerWidget {
  const EmployeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final profil = ref.watch(authControllerProvider).value?.profil;
    final quotas = ref.watch(quotasMoiProvider);
    final commandesEnCours = ref.watch(commandesEnCoursProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          profil == null
              ? l10n.accueilEmploye
              : '${l10n.accueilEmploye} — ${profil.prenom}',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: l10n.boutonDeconnexion,
            onPressed: () =>
                ref.read(authControllerProvider.notifier).deconnecter(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/home/employe/commande/nouvelle'),
        icon: const Icon(Icons.add),
        label: Text(l10n.boutonNouvelleCommande),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(quotasMoiProvider);
          ref.invalidate(mesCommandesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _TitreSection(l10n.quotaRestantTitre),
            const SizedBox(height: 8),
            _SectionQuotas(quotas: quotas),
            const SizedBox(height: 24),
            _TitreSection(l10n.commandesEnCoursTitre),
            const SizedBox(height: 8),
            _SectionCommandesEnCours(commandes: commandesEnCours),
            // Espace pour ne pas masquer le dernier élément derrière le FAB.
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

class _TitreSection extends StatelessWidget {
  const _TitreSection(this.titre);

  final String titre;

  @override
  Widget build(BuildContext context) {
    return Text(titre, style: Theme.of(context).textTheme.titleMedium);
  }
}

class _SectionQuotas extends ConsumerWidget {
  const _SectionQuotas({required this.quotas});

  final AsyncValue<List<QuotaConsommation>> quotas;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return quotas.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, _) =>
          ErreurAvecRetry(onReessayer: () => ref.invalidate(quotasMoiProvider)),
      data: (liste) {
        if (liste.isEmpty) {
          return Text(l10n.aucunQuotaApplicable);
        }
        return Column(
          children: liste.map((quota) => _CarteQuota(quota: quota)).toList(),
        );
      },
    );
  }
}

class _CarteQuota extends StatelessWidget {
  const _CarteQuota({required this.quota});

  final QuotaConsommation quota;

  String _libellePeriode(AppLocalizations l10n) {
    switch (quota.periode) {
      case 'jour':
        return l10n.periodeJour;
      case 'semaine':
        return l10n.periodeSemaine;
      default:
        return l10n.periodeMois;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final libelleProduit = quota.produit == null
        ? l10n.quotaProduitTousLesProduits
        : texteBilingue(
            context,
            ar: quota.produit!.nomAr,
            en: quota.produit!.nomEn,
          );
    final progression = quota.valeurMax <= 0
        ? 0.0
        : (quota.valeurConsommee / quota.valeurMax).clamp(0, 1).toDouble();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(libelleProduit)),
                Text(_libellePeriode(l10n)),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: progression),
            const SizedBox(height: 4),
            Text(
              l10n.quotaValeurRestante(
                formaterNombre(quota.valeurRestante),
                formaterNombre(quota.valeurMax),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCommandesEnCours extends ConsumerWidget {
  const _SectionCommandesEnCours({required this.commandes});

  final AsyncValue<List<CommandeResume>> commandes;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return commandes.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, _) => ErreurAvecRetry(
        onReessayer: () => ref.invalidate(mesCommandesProvider),
      ),
      data: (liste) {
        if (liste.isEmpty) {
          return Text(l10n.aucuneCommandeEnCours);
        }
        return Column(
          children: liste
              .map(
                (commande) => Card(
                  child: ListTile(
                    title: Text(
                      libelleStatutCommande(context, commande.statut),
                    ),
                    subtitle: Text(
                      commande.lignes
                          .map(
                            (l) => texteBilingue(
                              context,
                              ar: l.nomAr,
                              en: l.nomEn,
                            ),
                          )
                          .join(', '),
                    ),
                    onTap: () =>
                        context.push('/home/employe/commande/${commande.id}'),
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }
}
