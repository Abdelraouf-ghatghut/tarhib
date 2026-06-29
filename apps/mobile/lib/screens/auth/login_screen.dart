import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/tarhib_scaffold.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {
  late final TabController _tabs;
  late final AnimationController _logoCtrl;
  late final Animation<double> _logoScale;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _logoCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    _logoScale = Tween<double>(begin: 1.0, end: 1.06).animate(
      CurvedAnimation(parent: _logoCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    _logoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return TarhibScaffold(
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── Logo ──────────────────────────────────────────────────────
                ScaleTransition(
                  scale: _logoScale,
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: scheme.primary,
                      boxShadow: [
                        BoxShadow(
                          color: scheme.primary.withValues(alpha: 0.5),
                          blurRadius: 40,
                          spreadRadius: 4,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.local_cafe_rounded,
                        color: Colors.white, size: 44),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  l.appTitle,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: scheme.primary,
                        letterSpacing: -0.5,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  l.loginSubtitle,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.55),
                        height: 1.5,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                // ── Tab selector ──────────────────────────────────────────────
                GlassCard(
                  borderRadius: 16,
                  padding: const EdgeInsets.all(4),
                  child: TabBar(
                    controller: _tabs,
                    indicator: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: scheme.primary,
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    labelColor: Colors.white,
                    unselectedLabelColor: scheme.onSurface.withValues(alpha: 0.6),
                    labelStyle:
                        const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    tabs: [
                      Tab(text: l.loginWithPassword),
                      Tab(text: l.loginWithOtp),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // ── Form card ─────────────────────────────────────────────────
                SizedBox(
                  height: 340,
                  child: TabBarView(
                    controller: _tabs,
                    children: [
                      _PasswordForm(l: l),
                      _OtpForm(l: l),
                    ],
                  ),
                ),

                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => context.push('/signup'),
                  child: Text(l.signupLink),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Password form ─────────────────────────────────────────────────────────────

class _PasswordForm extends ConsumerStatefulWidget {
  const _PasswordForm({required this.l});
  final AppLocalizations l;

  @override
  ConsumerState<_PasswordForm> createState() => _PasswordFormState();
}

class _PasswordFormState extends ConsumerState<_PasswordForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref
        .read(authProvider.notifier)
        .login(_emailCtrl.text.trim(), _passwordCtrl.text);
  }

  @override
  Widget build(BuildContext context) {
    final l = widget.l;
    final auth = ref.watch(authProvider);
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(
        color: isDark
            ? const Color(0x40FFFFFF)
            : scheme.outline.withValues(alpha: 0.3),
      ),
    );

    return GlassCard(
      borderRadius: 28,
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: l.email,
                prefixIcon: Icon(Icons.person_outline_rounded,
                    color: scheme.primary.withValues(alpha: 0.8)),
                filled: true,
                fillColor: isDark
                    ? const Color(0x14FFFFFF)
                    : scheme.primary.withValues(alpha: 0.04),
                border: inputBorder,
                enabledBorder: inputBorder,
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: scheme.primary, width: 2),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              validator: (v) => (v == null || v.isEmpty) ? l.email : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _passwordCtrl,
              obscureText: _obscure,
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: l.password,
                prefixIcon: Icon(Icons.lock_outline_rounded,
                    color: scheme.primary.withValues(alpha: 0.8)),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: scheme.onSurface.withValues(alpha: 0.5),
                  ),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
                filled: true,
                fillColor: isDark
                    ? const Color(0x14FFFFFF)
                    : scheme.primary.withValues(alpha: 0.04),
                border: inputBorder,
                enabledBorder: inputBorder,
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: scheme.primary, width: 2),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              validator: (v) => (v == null || v.isEmpty) ? l.password : null,
            ),
            if (auth.error != null) ...[
              const SizedBox(height: 12),
              _ErrorBanner(message: l.loginError),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: auth.isLoading ? null : _submit,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape:
                    RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: auth.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child:
                          CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                    )
                  : Text(l.loginButton,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── OTP form ──────────────────────────────────────────────────────────────────

class _OtpForm extends ConsumerStatefulWidget {
  const _OtpForm({required this.l});
  final AppLocalizations l;

  @override
  ConsumerState<_OtpForm> createState() => _OtpFormState();
}

class _OtpFormState extends ConsumerState<_OtpForm> {
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  bool _otpSent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (_phoneCtrl.text.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ApiClient.rawDio.post(
        '/auth/otp/request',
        data: {'phone': _phoneCtrl.text.trim()},
      );
      setState(() => _otpSent = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otpCtrl.text.trim().length < 4) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final resp = await ApiClient.rawDio.post<Map<String, dynamic>>(
        '/auth/otp/verify',
        data: {
          'phone': _phoneCtrl.text.trim(),
          'otp': _otpCtrl.text.trim(),
        },
      );
      final token = resp.data?['access_token'] as String?;
      if (token != null && mounted) {
        await ref.read(authProvider.notifier).loginWithToken(token);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = widget.l;
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(
        color: isDark
            ? const Color(0x40FFFFFF)
            : scheme.outline.withValues(alpha: 0.3),
      ),
    );

    return GlassCard(
      borderRadius: 28,
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Phone field (always visible)
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            enabled: !_otpSent,
            decoration: InputDecoration(
              labelText: l.phone,
              prefixIcon: Icon(Icons.phone_outlined,
                  color: scheme.primary.withValues(alpha: 0.8)),
              filled: true,
              fillColor: isDark
                  ? const Color(0x14FFFFFF)
                  : scheme.primary.withValues(alpha: 0.04),
              border: inputBorder,
              enabledBorder: inputBorder,
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: scheme.primary, width: 2),
              ),
              disabledBorder: inputBorder,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            ),
          ),

          // OTP code field (after OTP sent)
          if (_otpSent) ...[
            const SizedBox(height: 14),
            TextField(
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 12),
              decoration: InputDecoration(
                hintText: l.otpCodeHint,
                counterText: '',
                filled: true,
                fillColor: isDark
                    ? const Color(0x14FFFFFF)
                    : scheme.primary.withValues(alpha: 0.04),
                border: inputBorder,
                enabledBorder: inputBorder,
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: scheme.primary, width: 2),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              ),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _loading ? null : () => setState(() => _otpSent = false),
              child: Text(
                l.resendOtp,
                style: TextStyle(
                  fontSize: 12,
                  color: scheme.primary,
                  decoration: TextDecoration.underline,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],

          if (_error != null) ...[
            const SizedBox(height: 10),
            _ErrorBanner(message: _error!),
          ],

          const SizedBox(height: 20),
          FilledButton(
            onPressed: _loading
                ? null
                : _otpSent
                    ? _verifyOtp
                    : _sendOtp,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: _loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2.5, color: Colors.white),
                  )
                : Text(
                    _otpSent ? l.verifyOtp : l.sendOtp,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Error banner ──────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.error.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: scheme.error, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style: TextStyle(color: scheme.error, fontSize: 12, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
