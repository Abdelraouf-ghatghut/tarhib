// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'ترحيب';

  @override
  String get loginTitre => 'تسجيل الدخول';

  @override
  String get loginChampIdentifiant => 'البريد الإلكتروني أو الهاتف';

  @override
  String get loginChampMotDePasse => 'كلمة المرور';

  @override
  String get loginBouton => 'تسجيل الدخول';

  @override
  String get loginErreurIdentifiants =>
      'البريد الإلكتروني/الهاتف أو كلمة المرور غير صحيحة';

  @override
  String get loginErreurRoleNonSupporte => 'هذا الدور غير مدعوم في هذا التطبيق';

  @override
  String get loginErreurGenerique => 'حدث خطأ، حاول مرة أخرى';

  @override
  String get accueilEmploye => 'لوحة الموظف';

  @override
  String get accueilAgent => 'لوحة عامل الضيافة';

  @override
  String get boutonDeconnexion => 'تسجيل الخروج';

  @override
  String get profilTitre => 'الملف الشخصي';

  @override
  String get profilLangue => 'اللغة';

  @override
  String get placeholderEnConstruction => 'هذا القسم قيد الإنشاء';

  @override
  String get quotaRestantTitre => 'الحصة المتبقية';

  @override
  String get commandesEnCoursTitre => 'الطلبات الجارية';

  @override
  String get boutonNouvelleCommande => 'طلب جديد';

  @override
  String get aucunQuotaApplicable => 'لا توجد حصة مطبقة على دورك حالياً';

  @override
  String get aucuneCommandeEnCours => 'لا توجد طلبات جارية حالياً';

  @override
  String get erreurChargement => 'حدث خطأ في التحميل';

  @override
  String get reessayer => 'إعادة المحاولة';

  @override
  String get quotaProduitTousLesProduits => 'كل المنتجات';

  @override
  String quotaValeurRestante(String restant, String max) {
    return '$restant من $max';
  }

  @override
  String get periodeJour => 'يومي';

  @override
  String get periodeSemaine => 'أسبوعي';

  @override
  String get periodeMois => 'شهري';

  @override
  String get statutEnAttente => 'قيد الانتظار';

  @override
  String get statutEnAttenteApprobation => 'بانتظار الموافقة';

  @override
  String get statutValidee => 'تم التحقق';

  @override
  String get statutRefusee => 'مرفوضة';

  @override
  String get statutEnPreparation => 'قيد التحضير';

  @override
  String get statutEnLivraison => 'قيد التوصيل';

  @override
  String get statutLivree => 'تم التوصيل';

  @override
  String get statutAnnulee => 'ملغاة';

  @override
  String get catalogueTitre => 'القائمة';

  @override
  String get catalogueVide => 'لا توجد منتجات متاحة حالياً';

  @override
  String get nouvelleCommandeTitre => 'طلب جديد';

  @override
  String get nouvelleCommandeChampProduit => 'المنتج';

  @override
  String get nouvelleCommandeChampQuantite => 'الكمية';

  @override
  String get nouvelleCommandeChampLieu => 'مكان التسليم (اختياري)';

  @override
  String get nouvelleCommandeChampSalle => 'القاعة (اختياري)';

  @override
  String get nouvelleCommandeChampHeure => 'الوقت المطلوب (اختياري)';

  @override
  String get nouvelleCommandeChampCommentaire => 'ملاحظات (اختياري)';

  @override
  String get nouvelleCommandeBoutonChoisirHeure => 'اختر الوقت';

  @override
  String get nouvelleCommandeBoutonEffacerHeure => 'إزالة';

  @override
  String get nouvelleCommandeBoutonEnvoyer => 'إرسال الطلب';

  @override
  String get nouvelleCommandeValidationProduit => 'اختر منتجاً';

  @override
  String get nouvelleCommandeValidationQuantite =>
      'أدخل كمية صحيحة أكبر من صفر';

  @override
  String get nouvelleCommandeSucces => 'تم إنشاء الطلب بنجاح';

  @override
  String get refusProduitIndisponible => 'هذا المنتج غير متاح حالياً';

  @override
  String get refusStockInsuffisant => 'الكمية المطلوبة غير متوفرة في المخزون';

  @override
  String get refusQuotaDepasse => 'هذا الطلب يتجاوز حصتك المتاحة';

  @override
  String get refusHoraireFerme => 'الخدمة مغلقة في هذا الوقت';

  @override
  String get refusRoleNonAutorise => 'هذا المنتج غير متاح لدورك';

  @override
  String get erreurCommandeEchec => 'تعذر إنشاء الطلب، حاول مرة أخرى';

  @override
  String get detailCommandeTitre => 'تفاصيل الطلب';

  @override
  String get detailLieuLivraison => 'مكان التسليم';

  @override
  String get detailSalle => 'القاعة';

  @override
  String get detailHeureSouhaitee => 'الوقت المطلوب';

  @override
  String get detailCommentaire => 'ملاحظات';

  @override
  String get detailDateCreation => 'تاريخ الطلب';

  @override
  String get detailProduits => 'المنتجات';

  @override
  String get detailPriorite => 'الأولوية';
}
