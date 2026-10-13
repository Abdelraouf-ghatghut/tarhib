import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/dio_client.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/bilingue.dart';
import '../../../shared/code_refus_commande_libelle.dart';
import '../../../shared/models/produit.dart';
import '../../../shared/widgets/erreur_avec_retry.dart';
import '../catalogue/catalogue_providers.dart';
import '../dashboard/dashboard_providers.dart';

class NouvelleCommandeScreen extends ConsumerStatefulWidget {
  const NouvelleCommandeScreen({super.key});

  @override
  ConsumerState<NouvelleCommandeScreen> createState() =>
      _NouvelleCommandeScreenState();
}

class _NouvelleCommandeScreenState
    extends ConsumerState<NouvelleCommandeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantiteControleur = TextEditingController(text: '1');
  final _lieuControleur = TextEditingController();
  final _salleControleur = TextEditingController();
  final _commentaireControleur = TextEditingController();

  Produit? _produitSelectionne;
  DateTime? _heureSouhaitee;
  bool _envoiEnCours = false;

  @override
  void dispose() {
    _quantiteControleur.dispose();
    _lieuControleur.dispose();
    _salleControleur.dispose();
    _commentaireControleur.dispose();
    super.dispose();
  }

  Future<void> _choisirHeure() async {
    final maintenant = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _heureSouhaitee ?? maintenant,
      firstDate: maintenant.subtract(const Duration(days: 1)),
      lastDate: maintenant.add(const Duration(days: 30)),
    );
    if (date == null || !mounted) {
      return;
    }
    final heure = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_heureSouhaitee ?? maintenant),
    );
    if (heure == null) {
      return;
    }
    setState(() {
      _heureSouhaitee = DateTime(
        date.year,
        date.month,
        date.day,
        heure.hour,
        heure.minute,
      );
    });
  }

  Future<void> _envoyer() async {
    final l10n = AppLocalizations.of(context)!;
    if (!_formKey.currentState!.validate() || _produitSelectionne == null) {
      setState(() {}); // force l'affichage de l'erreur de sélection du produit
      return;
    }

    setState(() => _envoiEnCours = true);
    try {
      final dio = ref.read(dioProvider);
      final corps = <String, dynamic>{
        'lignes': [
          {
            'produit_id': _produitSelectionne!.id,
            'quantite': num.parse(_quantiteControleur.text.trim()),
          },
        ],
        if (_lieuControleur.text.trim().isNotEmpty)
          'lieu_livraison': _lieuControleur.text.trim(),
        if (_salleControleur.text.trim().isNotEmpty)
          'salle': _salleControleur.text.trim(),
        if (_heureSouhaitee != null)
          'heure_souhaitee': _heureSouhaitee!.toIso8601String(),
        if (_commentaireControleur.text.trim().isNotEmpty)
          'commentaire': _commentaireControleur.text.trim(),
      };

      final reponse = await dio.post<Map<String, dynamic>>(
        '/orders',
        data: corps,
      );
      final commandeId = reponse.data!['id'] as String;

      ref.invalidate(mesCommandesProvider);

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.nouvelleCommandeSucces)));
      context.pushReplacement('/home/employe/commande/$commandeId');
    } on DioException catch (erreur) {
      final codeRefus = erreur.response?.data is Map
          ? (erreur.response!.data as Map)['code_refus'] as String?
          : null;
      final message =
          libelleCodeRefusCommande(context, codeRefus) ??
          l10n.erreurCommandeEchec;
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    } finally {
      if (mounted) {
        setState(() => _envoiEnCours = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final catalogue = ref.watch(catalogueProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.nouvelleCommandeTitre)),
      body: catalogue.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => ErreurAvecRetry(
          onReessayer: () => ref.invalidate(catalogueProvider),
        ),
        data: (produits) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<Produit>(
                  key: const Key('champ_produit'),
                  initialValue: _produitSelectionne,
                  decoration: InputDecoration(
                    labelText: l10n.nouvelleCommandeChampProduit,
                  ),
                  items: produits
                      .map(
                        (produit) => DropdownMenuItem(
                          value: produit,
                          child: Text(
                            texteBilingue(
                              context,
                              ar: produit.nomAr,
                              en: produit.nomEn,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (valeur) =>
                      setState(() => _produitSelectionne = valeur),
                  validator: (valeur) => valeur == null
                      ? l10n.nouvelleCommandeValidationProduit
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _quantiteControleur,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: l10n.nouvelleCommandeChampQuantite,
                  ),
                  validator: (valeur) {
                    final nombre = num.tryParse(valeur?.trim() ?? '');
                    return (nombre == null || nombre <= 0)
                        ? l10n.nouvelleCommandeValidationQuantite
                        : null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _lieuControleur,
                  decoration: InputDecoration(
                    labelText: l10n.nouvelleCommandeChampLieu,
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _salleControleur,
                  decoration: InputDecoration(
                    labelText: l10n.nouvelleCommandeChampSalle,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _heureSouhaitee == null
                            ? l10n.nouvelleCommandeChampHeure
                            : DateFormat.yMd().add_Hm().format(
                                _heureSouhaitee!,
                              ),
                      ),
                    ),
                    TextButton(
                      onPressed: _choisirHeure,
                      child: Text(l10n.nouvelleCommandeBoutonChoisirHeure),
                    ),
                    if (_heureSouhaitee != null)
                      TextButton(
                        onPressed: () => setState(() => _heureSouhaitee = null),
                        child: Text(l10n.nouvelleCommandeBoutonEffacerHeure),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _commentaireControleur,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: l10n.nouvelleCommandeChampCommentaire,
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _envoiEnCours ? null : _envoyer,
                  child: _envoiEnCours
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(l10n.nouvelleCommandeBoutonEnvoyer),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
