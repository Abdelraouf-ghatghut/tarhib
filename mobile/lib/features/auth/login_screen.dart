import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/auth/auth_exceptions.dart';
import '../../l10n/generated/app_localizations.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifiantControleur = TextEditingController();
  final _motDePasseControleur = TextEditingController();
  bool _enCours = false;

  @override
  void dispose() {
    _identifiantControleur.dispose();
    _motDePasseControleur.dispose();
    super.dispose();
  }

  Future<void> _seConnecter() async {
    final l10n = AppLocalizations.of(context)!;
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _enCours = true);
    try {
      await ref
          .read(authControllerProvider.notifier)
          .connecter(
            identifiant: _identifiantControleur.text.trim(),
            motDePasse: _motDePasseControleur.text,
          );
      // Pas de navigation explicite : la redirection vers le dashboard du
      // rôle est déclenchée automatiquement par go_router (cf. role_guard.dart)
      // dès que l'état d'authentification change.
    } on RoleNonSupporteParAppException {
      if (mounted) {
        _afficherErreur(l10n.loginErreurRoleNonSupporte);
      }
    } on DioException catch (erreur) {
      // Seul un vrai 401 du backend signifie des identifiants invalides —
      // toute autre erreur (réseau, CORS, serveur indisponible...) doit
      // rester distincte pour ne pas induire l'utilisateur en erreur sur
      // la cause réelle (cf. règle bilinguisme/codes d'erreur de CLAUDE.md).
      if (mounted) {
        _afficherErreur(
          erreur.response?.statusCode == 401
              ? l10n.loginErreurIdentifiants
              : l10n.loginErreurGenerique,
        );
      }
    } catch (_) {
      if (mounted) {
        _afficherErreur(l10n.loginErreurGenerique);
      }
    } finally {
      if (mounted) {
        setState(() => _enCours = false);
      }
    }
  }

  void _afficherErreur(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.appTitle)),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Form(
            key: _formKey,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    l10n.loginTitre,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _identifiantControleur,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: l10n.loginChampIdentifiant,
                    ),
                    validator: (valeur) =>
                        (valeur == null || valeur.trim().isEmpty) ? '' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _motDePasseControleur,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: l10n.loginChampMotDePasse,
                    ),
                    validator: (valeur) =>
                        (valeur == null || valeur.isEmpty) ? '' : null,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _enCours ? null : _seConnecter,
                    child: _enCours
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l10n.loginBouton),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
