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
  String get login => 'تسجيل الدخول';

  @override
  String get email => 'البريد الإلكتروني';

  @override
  String get password => 'كلمة المرور';

  @override
  String get loginButton => 'دخول';

  @override
  String get loginError => 'بيانات الاعتماد غير صحيحة. حاول مرة أخرى.';

  @override
  String get logout => 'تسجيل الخروج';

  @override
  String get catalog => 'الكتالوج';

  @override
  String get cart => 'السلة';

  @override
  String get myOrders => 'طلباتي';

  @override
  String get profile => 'الملف الشخصي';

  @override
  String get addToCart => 'إضافة';

  @override
  String get removeFromCart => 'إزالة';

  @override
  String get submitOrder => 'إرسال الطلب';

  @override
  String get orderSubmitted => 'تم إرسال الطلب بنجاح';

  @override
  String get orderEmpty => 'سلتك فارغة';

  @override
  String quotaRemaining(int count) {
    return 'الحصة المتبقية: $count';
  }

  @override
  String get orderStatus_PENDING => 'قيد الانتظار';

  @override
  String get orderStatus_APPROVED => 'تمت الموافقة';

  @override
  String get orderStatus_IN_PROGRESS => 'قيد التحضير';

  @override
  String get orderStatus_DELIVERED => 'تم التسليم';

  @override
  String get orderStatus_REJECTED => 'مرفوض';

  @override
  String get priority => 'الأولوية';

  @override
  String get slaDeadline => 'الموعد النهائي';

  @override
  String get slaExpired => 'تجاوز الوقت المحدد';

  @override
  String get orderHistory => 'سجل الطلبات';

  @override
  String get noOrders => 'لا توجد طلبات بعد';

  @override
  String get orderQueue => 'قائمة انتظار الطلبات';

  @override
  String get noOrdersInQueue => 'لا توجد طلبات معلقة';

  @override
  String get markInProgress => 'بدء التحضير';

  @override
  String get markDelivered => 'تحديد كمُسلَّم';

  @override
  String get reportOutOfStock => 'الإبلاغ عن نفاد المخزون';

  @override
  String get confirmAction => 'تأكيد';

  @override
  String get cancel => 'إلغاء';

  @override
  String get lineApproved => 'مقبول';

  @override
  String get lineRejected => 'مرفوض';

  @override
  String get lineRejectionReason_PRODUCT_NOT_COMMANDABLE =>
      'المنتج غير قابل للطلب';

  @override
  String get lineRejectionReason_ROLE_NOT_ALLOWED => 'الدور غير مخول';

  @override
  String get lineRejectionReason_INSUFFICIENT_STOCK => 'المخزون غير كافٍ';

  @override
  String get lineRejectionReason_QUOTA_EXCEEDED => 'تجاوز الحصة';

  @override
  String get language => 'اللغة';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'English';

  @override
  String get errorRetry => 'إعادة المحاولة';

  @override
  String get loading => 'جارٍ التحميل…';

  @override
  String get quantity => 'الكمية';

  @override
  String get product => 'المنتج';

  @override
  String get category => 'الفئة';

  @override
  String get orderDetail => 'تفاصيل الطلب';

  @override
  String get validationResult => 'نتيجة التحقق';

  @override
  String get partiallyRejected => 'تم رفض بعض الأسطر';

  @override
  String get pendingApproval => 'في انتظار الموافقة';

  @override
  String get approve => 'موافقة';

  @override
  String get reject => 'رفض';
}
