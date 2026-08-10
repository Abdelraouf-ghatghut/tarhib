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

  @override
  String get loginSubtitle => 'تسجيل الدخول إلى مساحة عملك';

  @override
  String get goodMorning => 'صباح الخير،';

  @override
  String get goodAfternoon => 'مساء الخير،';

  @override
  String get goodEvening => 'مساء النور،';

  @override
  String get all => 'الكل';

  @override
  String get ordersTotal => 'طلبات';

  @override
  String get late => 'متأخر';

  @override
  String get allClear => 'القائمة فارغة — أحسنت!';

  @override
  String get nextOrder => 'الطلب التالي';

  @override
  String get deliveryPhoto => 'صورة التسليم';

  @override
  String get photoUploading => 'جارٍ رفع الصورة...';

  @override
  String get takePhoto => 'التقاط صورة';

  @override
  String get photoOptional => 'الصورة اختيارية';

  @override
  String nSelected(int n) {
    return 'تم تحديد $n';
  }

  @override
  String get selectAll => 'تحديد الكل';

  @override
  String get vipStock => 'مخزون VIP';

  @override
  String get filterAll => 'الكل';

  @override
  String get batchStart => 'بدء الكل';

  @override
  String get batchMarkDelivered => 'تسليم الكل';

  @override
  String get offlineMode => 'وضع عدم الاتصال — عرض البيانات المحفوظة';

  @override
  String get markReplenished => 'تحديد كمجدد';

  @override
  String get vipLocations => 'مواقع VIP';

  @override
  String get stockBelowThreshold => 'تحت الحد الأدنى';

  @override
  String get replenishTask => 'مهمة التجديد';

  @override
  String get currentStock => 'المخزون الحالي';

  @override
  String stockLevel(int current, int min, int max) {
    return '$current (أدنى $min / أقصى $max)';
  }

  @override
  String get threshold => 'الحد الأدنى';

  @override
  String get managerDashboard => 'لوحة التحكم';

  @override
  String get todayOrders => 'طلبات اليوم';

  @override
  String get pendingCount => 'في الانتظار';

  @override
  String get deliveredToday => 'مسلّم اليوم';

  @override
  String get avgSlaMinutes => 'متوسط SLA (دقيقة)';

  @override
  String get mostOrdered => 'الأكثر طلباً';

  @override
  String get employeeQuotas => 'حصص الموظف';

  @override
  String quotaUsed(int used, int max) {
    return '$used / $max';
  }

  @override
  String get roleLabel => 'الدور';

  @override
  String get theme => 'المظهر';

  @override
  String get themeSystem => 'النظام';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get roleAgent => 'وكيل الضيافة';

  @override
  String get roleManager => 'مدير القسم';

  @override
  String get roleAdmin => 'المسؤول';

  @override
  String get roleEmployee => 'موظف';

  @override
  String get quickReorder => 'إعادة الطلب';

  @override
  String get reorderConfirm => 'إعادة طلب هذه العناصر؟';

  @override
  String get meetingRooms => 'قاعات الاجتماعات';

  @override
  String get bookRoom => 'حجز';

  @override
  String get myBookings => 'حجوزاتي';

  @override
  String get available => 'متاحة';

  @override
  String get booked => 'محجوزة';

  @override
  String get cancelBooking => 'إلغاء الحجز';

  @override
  String get noRoomsAvailable => 'لا توجد قاعات متاحة';

  @override
  String get noBookings => 'لا توجد حجوزات';

  @override
  String get addNote => 'إضافة ملاحظة';

  @override
  String get notePlaceholder => 'تعليمات خاصة...';

  @override
  String get confirmOrder => 'تأكيد الطلب';

  @override
  String get orderSummary => 'ملخص الطلب';

  @override
  String get loginWithPassword => 'كلمة المرور';

  @override
  String get loginWithOtp => 'OTP';

  @override
  String get phone => 'رقم الهاتف';

  @override
  String get otpCodeHint => 'أدخل رمز التحقق';

  @override
  String get resendOtp => 'إعادة إرسال الرمز';

  @override
  String get verifyOtp => 'تحقق';

  @override
  String get sendOtp => 'إرسال الرمز';

  @override
  String get confirmOrderTitle => 'تأكيد الطلب';

  @override
  String confirmOrderItems(int n) {
    return '$n عنصر';
  }

  @override
  String get estimatedPriority => 'الأولوية المتوقعة';

  @override
  String get confirmAndSubmit => 'تأكيد وإرسال';

  @override
  String linesAccepted(int n) {
    return '$n سطر مقبول';
  }

  @override
  String linesRejected(int n) {
    return '$n سطر مرفوض';
  }

  @override
  String get outOfStockTitle => 'نفاد المخزون';

  @override
  String get outOfStockBody => 'الإبلاغ عن نفاد هذا المنتج؟';

  @override
  String get outOfStockReported => 'تم الإبلاغ عن نفاد المخزون';

  @override
  String get previousOrder => 'الطلب السابق';

  @override
  String get searchHint => 'البحث في المنتجات...';

  @override
  String get quota => 'الحصة';

  @override
  String quotaOf(int used, int max) {
    return '$used / $max';
  }

  @override
  String get catalogEmpty => 'لا توجد منتجات متاحة';

  @override
  String get catalogEmptySubtitle => 'تحقق لاحقاً أو تواصل مع المسؤول';

  @override
  String capacity(int n) {
    return 'السعة: $n';
  }

  @override
  String get occupied => 'مشغولة';

  @override
  String get bookingConfirmed => 'تم تأكيد الحجز';

  @override
  String get startTime => 'وقت البداية';

  @override
  String get endTime => 'وقت النهاية';

  @override
  String get roleDirecteurGeneral => 'المدير العام';

  @override
  String get roleViceDirecteur => 'نائب المدير';

  @override
  String get roleDirecteurBranche => 'مدير الفرع';

  @override
  String get roleSuperviseur => 'مشرف';

  @override
  String get roleCuisinier => 'طاهٍ';

  @override
  String get roleLivreur => 'عامل توصيل';

  @override
  String get roleFemmeMenage => 'عاملة نظافة';

  @override
  String get roleCustom => 'دور مخصص';

  @override
  String get permissionLabel => 'صلاحية';

  @override
  String get permissionsLabel => 'الصلاحيات';

  @override
  String get createRole => 'إنشاء دور';

  @override
  String get editRole => 'تعديل الدور';

  @override
  String get deleteRole => 'حذف الدور';

  @override
  String get systemRole => 'دور نظام';

  @override
  String get systemRoleCannotDelete => 'لا يمكن حذف أدوار النظام';

  @override
  String get roleScope => 'النطاق';

  @override
  String get roleScopeTarhib => 'ترحيب (داخلي)';

  @override
  String get roleScopeClient => 'شركة عميلة';

  @override
  String get slaPriority => 'أولوية SLA';

  @override
  String get quotaPerRole => 'الحصة حسب الدور';

  @override
  String get setQuota => 'تحديد الحصة';

  @override
  String get quotaPeriodDaily => 'يومي';

  @override
  String get quotaPeriodWeekly => 'أسبوعي';

  @override
  String get quotaPeriodMonthly => 'شهري';

  @override
  String get meetingServices => 'خدمات الاجتماع';

  @override
  String get orderServicesForMeeting => 'طلب خدمات لهذا الاجتماع';

  @override
  String get meetingServiceOrdered => 'تم طلب الخدمات';

  @override
  String get noMeetingServices => 'لم يتم طلب خدمات بعد';

  @override
  String get signupLink => 'ليس لديك حساب؟ سجّل';

  @override
  String get signupTitle => 'إنشاء حساب';

  @override
  String get signupCompanySection => 'الشركة';

  @override
  String get signupCompanyCode => 'رمز الشركة';

  @override
  String get signupIdentitySection => 'معلوماتك الشخصية';

  @override
  String get signupPasswordSection => 'كلمة المرور';

  @override
  String get signupPasswordMin => '8 أحرف على الأقل';

  @override
  String get signupButton => 'إرسال طلب التسجيل';

  @override
  String get signupPendingTitle => 'تم إرسال الطلب';

  @override
  String get signupPendingBody =>
      'حسابك في انتظار موافقة المسؤول. ستتلقى بريداً إلكترونياً عند التفعيل.';

  @override
  String get backToLogin => 'العودة إلى تسجيل الدخول';

  @override
  String get firstNameEn => 'الاسم الأول (EN)';

  @override
  String get lastNameEn => 'اللقب (EN)';

  @override
  String get firstNameAr => 'الاسم الأول (AR)';

  @override
  String get lastNameAr => 'اللقب (AR)';

  @override
  String get meetingServiceBreakfast => 'إفطار + خدمة';

  @override
  String get meetingServiceLunch => 'غداء + خدمة';

  @override
  String get chooseServicePackage => 'اختر باقة الخدمة';

  @override
  String get servicePackage => 'باقة الخدمة';

  @override
  String get notAvailable => 'غير متوفر';

  @override
  String get lineAcceptedBadge => 'مقبولة';

  @override
  String get cartHasInvalidLines =>
      'بعض العناصر غير متوفرة أو تتجاوز حصتك — عدّلها أو أزلها لإرسال الطلب';

  @override
  String get orderWillAutoConfirm =>
      'متوفر وضمن الحصة — سيتم تأكيد هذا الطلب تلقائياً';

  @override
  String get orderAutoConfirmedSubtitle =>
      'تم تأكيد طلبك تلقائياً وإرساله للتحضير';

  @override
  String get orderLines => 'العناصر';

  @override
  String get timeRemaining => 'الوقت المتبقي';

  @override
  String get minutesShort => 'د';

  @override
  String get accountApproved => 'حساب نشط';

  @override
  String get quotasTracked => 'منتجات محدودة الحصة';

  @override
  String get settingsTitle => 'الإعدادات';

  @override
  String get personalInfo => 'معلومات شخصية';

  @override
  String get languageAppearance => 'اللغة والمظهر';

  @override
  String get notifications => 'الإشعارات';

  @override
  String get aboutApp => 'حول التطبيق';

  @override
  String get chooseLanguageHint => 'اختر لغتك المفضلة';

  @override
  String get defaultLanguage => 'اللغة الافتراضية';

  @override
  String get languageAppliesInstantly => 'سيتم تطبيق اللغة فوراً في التطبيق';

  @override
  String get allowNotifications => 'السماح بالإشعارات';

  @override
  String get orderNotifications => 'إشعارات الطلبات';

  @override
  String get notifNewOrder => 'طلب جديد';

  @override
  String get notifOrderApproved => 'تم اعتماد الطلب';

  @override
  String get notifOrderRejected => 'تم رفض الطلب';

  @override
  String get notifOrderReady => 'الطلب جاهز للاستلام';

  @override
  String get otherNotifications => 'أخرى';

  @override
  String get notifOffersUpdates => 'العروض والتحديثات';

  @override
  String get notifReminders => 'التذكيرات';

  @override
  String appVersion(String version) {
    return 'الإصدار $version';
  }

  @override
  String get aboutDescription =>
      'يتيح لك تطبيق طريب للموظفين طلب المشروبات والوجبات الخفيفة والوجبات، وحجز قاعات الاجتماعات، ومتابعة طلباتك في الوقت الفعلي — كل ذلك ضمن حصص شركتك.';
}
