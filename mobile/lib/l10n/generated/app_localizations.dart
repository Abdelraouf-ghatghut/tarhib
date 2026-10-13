import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In ar, this message translates to:
  /// **'ترحيب'**
  String get appTitle;

  /// No description provided for @loginTitre.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الدخول'**
  String get loginTitre;

  /// No description provided for @loginChampIdentifiant.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني أو الهاتف'**
  String get loginChampIdentifiant;

  /// No description provided for @loginChampMotDePasse.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get loginChampMotDePasse;

  /// No description provided for @loginBouton.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الدخول'**
  String get loginBouton;

  /// No description provided for @loginErreurIdentifiants.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني/الهاتف أو كلمة المرور غير صحيحة'**
  String get loginErreurIdentifiants;

  /// No description provided for @loginErreurRoleNonSupporte.
  ///
  /// In ar, this message translates to:
  /// **'هذا الدور غير مدعوم في هذا التطبيق'**
  String get loginErreurRoleNonSupporte;

  /// No description provided for @loginErreurGenerique.
  ///
  /// In ar, this message translates to:
  /// **'حدث خطأ، حاول مرة أخرى'**
  String get loginErreurGenerique;

  /// No description provided for @accueilEmploye.
  ///
  /// In ar, this message translates to:
  /// **'لوحة الموظف'**
  String get accueilEmploye;

  /// No description provided for @accueilAgent.
  ///
  /// In ar, this message translates to:
  /// **'لوحة عامل الضيافة'**
  String get accueilAgent;

  /// No description provided for @boutonDeconnexion.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get boutonDeconnexion;

  /// No description provided for @profilTitre.
  ///
  /// In ar, this message translates to:
  /// **'الملف الشخصي'**
  String get profilTitre;

  /// No description provided for @profilLangue.
  ///
  /// In ar, this message translates to:
  /// **'اللغة'**
  String get profilLangue;

  /// No description provided for @placeholderEnConstruction.
  ///
  /// In ar, this message translates to:
  /// **'هذا القسم قيد الإنشاء'**
  String get placeholderEnConstruction;

  /// No description provided for @quotaRestantTitre.
  ///
  /// In ar, this message translates to:
  /// **'الحصة المتبقية'**
  String get quotaRestantTitre;

  /// No description provided for @commandesEnCoursTitre.
  ///
  /// In ar, this message translates to:
  /// **'الطلبات الجارية'**
  String get commandesEnCoursTitre;

  /// No description provided for @boutonNouvelleCommande.
  ///
  /// In ar, this message translates to:
  /// **'طلب جديد'**
  String get boutonNouvelleCommande;

  /// No description provided for @aucunQuotaApplicable.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد حصة مطبقة على دورك حالياً'**
  String get aucunQuotaApplicable;

  /// No description provided for @aucuneCommandeEnCours.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طلبات جارية حالياً'**
  String get aucuneCommandeEnCours;

  /// No description provided for @erreurChargement.
  ///
  /// In ar, this message translates to:
  /// **'حدث خطأ في التحميل'**
  String get erreurChargement;

  /// No description provided for @reessayer.
  ///
  /// In ar, this message translates to:
  /// **'إعادة المحاولة'**
  String get reessayer;

  /// No description provided for @quotaProduitTousLesProduits.
  ///
  /// In ar, this message translates to:
  /// **'كل المنتجات'**
  String get quotaProduitTousLesProduits;

  /// No description provided for @quotaValeurRestante.
  ///
  /// In ar, this message translates to:
  /// **'{restant} من {max}'**
  String quotaValeurRestante(String restant, String max);

  /// No description provided for @periodeJour.
  ///
  /// In ar, this message translates to:
  /// **'يومي'**
  String get periodeJour;

  /// No description provided for @periodeSemaine.
  ///
  /// In ar, this message translates to:
  /// **'أسبوعي'**
  String get periodeSemaine;

  /// No description provided for @periodeMois.
  ///
  /// In ar, this message translates to:
  /// **'شهري'**
  String get periodeMois;

  /// No description provided for @statutEnAttente.
  ///
  /// In ar, this message translates to:
  /// **'قيد الانتظار'**
  String get statutEnAttente;

  /// No description provided for @statutEnAttenteApprobation.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار الموافقة'**
  String get statutEnAttenteApprobation;

  /// No description provided for @statutValidee.
  ///
  /// In ar, this message translates to:
  /// **'تم التحقق'**
  String get statutValidee;

  /// No description provided for @statutRefusee.
  ///
  /// In ar, this message translates to:
  /// **'مرفوضة'**
  String get statutRefusee;

  /// No description provided for @statutEnPreparation.
  ///
  /// In ar, this message translates to:
  /// **'قيد التحضير'**
  String get statutEnPreparation;

  /// No description provided for @statutEnLivraison.
  ///
  /// In ar, this message translates to:
  /// **'قيد التوصيل'**
  String get statutEnLivraison;

  /// No description provided for @statutLivree.
  ///
  /// In ar, this message translates to:
  /// **'تم التوصيل'**
  String get statutLivree;

  /// No description provided for @statutAnnulee.
  ///
  /// In ar, this message translates to:
  /// **'ملغاة'**
  String get statutAnnulee;

  /// No description provided for @catalogueTitre.
  ///
  /// In ar, this message translates to:
  /// **'القائمة'**
  String get catalogueTitre;

  /// No description provided for @catalogueVide.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد منتجات متاحة حالياً'**
  String get catalogueVide;

  /// No description provided for @nouvelleCommandeTitre.
  ///
  /// In ar, this message translates to:
  /// **'طلب جديد'**
  String get nouvelleCommandeTitre;

  /// No description provided for @nouvelleCommandeChampProduit.
  ///
  /// In ar, this message translates to:
  /// **'المنتج'**
  String get nouvelleCommandeChampProduit;

  /// No description provided for @nouvelleCommandeChampQuantite.
  ///
  /// In ar, this message translates to:
  /// **'الكمية'**
  String get nouvelleCommandeChampQuantite;

  /// No description provided for @nouvelleCommandeChampLieu.
  ///
  /// In ar, this message translates to:
  /// **'مكان التسليم (اختياري)'**
  String get nouvelleCommandeChampLieu;

  /// No description provided for @nouvelleCommandeChampSalle.
  ///
  /// In ar, this message translates to:
  /// **'القاعة (اختياري)'**
  String get nouvelleCommandeChampSalle;

  /// No description provided for @nouvelleCommandeChampHeure.
  ///
  /// In ar, this message translates to:
  /// **'الوقت المطلوب (اختياري)'**
  String get nouvelleCommandeChampHeure;

  /// No description provided for @nouvelleCommandeChampCommentaire.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات (اختياري)'**
  String get nouvelleCommandeChampCommentaire;

  /// No description provided for @nouvelleCommandeBoutonChoisirHeure.
  ///
  /// In ar, this message translates to:
  /// **'اختر الوقت'**
  String get nouvelleCommandeBoutonChoisirHeure;

  /// No description provided for @nouvelleCommandeBoutonEffacerHeure.
  ///
  /// In ar, this message translates to:
  /// **'إزالة'**
  String get nouvelleCommandeBoutonEffacerHeure;

  /// No description provided for @nouvelleCommandeBoutonEnvoyer.
  ///
  /// In ar, this message translates to:
  /// **'إرسال الطلب'**
  String get nouvelleCommandeBoutonEnvoyer;

  /// No description provided for @nouvelleCommandeValidationProduit.
  ///
  /// In ar, this message translates to:
  /// **'اختر منتجاً'**
  String get nouvelleCommandeValidationProduit;

  /// No description provided for @nouvelleCommandeValidationQuantite.
  ///
  /// In ar, this message translates to:
  /// **'أدخل كمية صحيحة أكبر من صفر'**
  String get nouvelleCommandeValidationQuantite;

  /// No description provided for @nouvelleCommandeSucces.
  ///
  /// In ar, this message translates to:
  /// **'تم إنشاء الطلب بنجاح'**
  String get nouvelleCommandeSucces;

  /// No description provided for @refusProduitIndisponible.
  ///
  /// In ar, this message translates to:
  /// **'هذا المنتج غير متاح حالياً'**
  String get refusProduitIndisponible;

  /// No description provided for @refusStockInsuffisant.
  ///
  /// In ar, this message translates to:
  /// **'الكمية المطلوبة غير متوفرة في المخزون'**
  String get refusStockInsuffisant;

  /// No description provided for @refusQuotaDepasse.
  ///
  /// In ar, this message translates to:
  /// **'هذا الطلب يتجاوز حصتك المتاحة'**
  String get refusQuotaDepasse;

  /// No description provided for @refusHoraireFerme.
  ///
  /// In ar, this message translates to:
  /// **'الخدمة مغلقة في هذا الوقت'**
  String get refusHoraireFerme;

  /// No description provided for @refusRoleNonAutorise.
  ///
  /// In ar, this message translates to:
  /// **'هذا المنتج غير متاح لدورك'**
  String get refusRoleNonAutorise;

  /// No description provided for @erreurCommandeEchec.
  ///
  /// In ar, this message translates to:
  /// **'تعذر إنشاء الطلب، حاول مرة أخرى'**
  String get erreurCommandeEchec;

  /// No description provided for @detailCommandeTitre.
  ///
  /// In ar, this message translates to:
  /// **'تفاصيل الطلب'**
  String get detailCommandeTitre;

  /// No description provided for @detailLieuLivraison.
  ///
  /// In ar, this message translates to:
  /// **'مكان التسليم'**
  String get detailLieuLivraison;

  /// No description provided for @detailSalle.
  ///
  /// In ar, this message translates to:
  /// **'القاعة'**
  String get detailSalle;

  /// No description provided for @detailHeureSouhaitee.
  ///
  /// In ar, this message translates to:
  /// **'الوقت المطلوب'**
  String get detailHeureSouhaitee;

  /// No description provided for @detailCommentaire.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات'**
  String get detailCommentaire;

  /// No description provided for @detailDateCreation.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الطلب'**
  String get detailDateCreation;

  /// No description provided for @detailProduits.
  ///
  /// In ar, this message translates to:
  /// **'المنتجات'**
  String get detailProduits;

  /// No description provided for @detailPriorite.
  ///
  /// In ar, this message translates to:
  /// **'الأولوية'**
  String get detailPriorite;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
