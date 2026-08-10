import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _companySlugCtrl = TextEditingController();
  final _firstNameEnCtrl = TextEditingController();
  final _lastNameEnCtrl = TextEditingController();
  final _firstNameArCtrl = TextEditingController();
  final _lastNameArCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  bool _submitted = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _companySlugCtrl.dispose();
    _firstNameEnCtrl.dispose();
    _lastNameEnCtrl.dispose();
    _firstNameArCtrl.dispose();
    _lastNameArCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ApiClient.rawDio.post('/auth/register', data: {
        'email': _emailCtrl.text.trim(),
        'companySlug': _companySlugCtrl.text.trim().toLowerCase(),
        'firstNameEn': _firstNameEnCtrl.text.trim(),
        'lastNameEn': _lastNameEnCtrl.text.trim(),
        'firstNameAr': _firstNameArCtrl.text.trim(),
        'lastNameAr': _lastNameArCtrl.text.trim(),
        'phoneNumber': _phoneCtrl.text.trim(),
        'password': _passwordCtrl.text,
      });
      setState(() => _submitted = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    if (_submitted) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle_outline_rounded,
                    size: 72, color: scheme.primary),
                const SizedBox(height: 24),
                Text(
                  l.signupPendingTitle,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  l.signupPendingBody,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.6),
                        height: 1.5,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                FilledButton(
                  onPressed: () => context.go('/login'),
                  child: Text(l.backToLogin),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: scheme.outlineVariant),
    );
    final focusBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: scheme.primary, width: 2),
    );

    InputDecoration field(String label, IconData icon) => InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 20),
          border: border,
          enabledBorder: border,
          focusedBorder: focusBorder,
          filled: true,
          fillColor: scheme.surfaceContainerLow,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        );

    return Scaffold(
      appBar: AppBar(
        title: Text(l.signupTitle),
        leading: BackButton(onPressed: () => context.go('/login')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Company code
              Text(l.signupCompanySection,
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(color: scheme.primary)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _companySlugCtrl,
                decoration: field(l.signupCompanyCode, Icons.business_outlined),
                validator: (v) =>
                    (v == null || v.isEmpty) ? l.signupCompanyCode : null,
              ),
              const SizedBox(height: 20),

              // Identity
              Text(l.signupIdentitySection,
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(color: scheme.primary)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameEnCtrl,
                      decoration: field(l.firstNameEn, Icons.person_outline),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? l.firstNameEn : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameEnCtrl,
                      decoration: field(l.lastNameEn, Icons.person_outline),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? l.lastNameEn : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameArCtrl,
                      textDirection: TextDirection.rtl,
                      decoration: field(l.firstNameAr, Icons.person_outline),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameArCtrl,
                      textDirection: TextDirection.rtl,
                      decoration: field(l.lastNameAr, Icons.person_outline),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: field(l.email, Icons.email_outlined),
                validator: (v) {
                  if (v == null || v.isEmpty) return l.email;
                  if (!v.contains('@')) return l.email;
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: field(l.phone, Icons.phone_outlined),
                validator: (v) =>
                    (v == null || v.isEmpty) ? l.phone : null,
              ),
              const SizedBox(height: 20),

              // Password
              Text(l.signupPasswordSection,
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(color: scheme.primary)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: _obscure,
                decoration: field(l.password, Icons.lock_outline).copyWith(
                  suffixIcon: IconButton(
                    icon: Icon(_obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.length < 8) return l.signupPasswordMin;
                  return null;
                },
              ),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.errorContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(_error!,
                      style: TextStyle(color: scheme.onErrorContainer)),
                ),
              ],

              const SizedBox(height: 24),
              FilledButton(
                onPressed: _loading ? null : _submit,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.white),
                      )
                    : Text(l.signupButton,
                        style:
                            const TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
