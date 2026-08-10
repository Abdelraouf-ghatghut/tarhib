// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Tarhib';

  @override
  String get login => 'Login';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get loginButton => 'Sign in';

  @override
  String get loginError => 'Invalid credentials. Please try again.';

  @override
  String get logout => 'Logout';

  @override
  String get catalog => 'Catalog';

  @override
  String get cart => 'Cart';

  @override
  String get myOrders => 'My Orders';

  @override
  String get profile => 'Profile';

  @override
  String get addToCart => 'Add';

  @override
  String get removeFromCart => 'Remove';

  @override
  String get submitOrder => 'Submit Order';

  @override
  String get orderSubmitted => 'Order submitted successfully';

  @override
  String get orderEmpty => 'Your cart is empty';

  @override
  String quotaRemaining(int count) {
    return 'Remaining quota: $count';
  }

  @override
  String get orderStatus_PENDING => 'Pending';

  @override
  String get orderStatus_APPROVED => 'Approved';

  @override
  String get orderStatus_IN_PROGRESS => 'In preparation';

  @override
  String get orderStatus_DELIVERED => 'Delivered';

  @override
  String get orderStatus_REJECTED => 'Rejected';

  @override
  String get priority => 'Priority';

  @override
  String get slaDeadline => 'SLA deadline';

  @override
  String get slaExpired => 'SLA exceeded';

  @override
  String get orderHistory => 'Order history';

  @override
  String get noOrders => 'No orders yet';

  @override
  String get orderQueue => 'Order queue';

  @override
  String get noOrdersInQueue => 'No pending orders';

  @override
  String get markInProgress => 'Start preparation';

  @override
  String get markDelivered => 'Mark delivered';

  @override
  String get reportOutOfStock => 'Report out of stock';

  @override
  String get confirmAction => 'Confirm';

  @override
  String get cancel => 'Cancel';

  @override
  String get lineApproved => 'Approved';

  @override
  String get lineRejected => 'Rejected';

  @override
  String get lineRejectionReason_PRODUCT_NOT_COMMANDABLE =>
      'Product not orderable';

  @override
  String get lineRejectionReason_ROLE_NOT_ALLOWED => 'Role not authorized';

  @override
  String get lineRejectionReason_INSUFFICIENT_STOCK => 'Insufficient stock';

  @override
  String get lineRejectionReason_QUOTA_EXCEEDED => 'Quota exceeded';

  @override
  String get language => 'Language';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'English';

  @override
  String get errorRetry => 'Retry';

  @override
  String get loading => 'Loading…';

  @override
  String get quantity => 'Qty';

  @override
  String get product => 'Product';

  @override
  String get category => 'Category';

  @override
  String get orderDetail => 'Order detail';

  @override
  String get validationResult => 'Validation result';

  @override
  String get partiallyRejected => 'Some lines were rejected';

  @override
  String get pendingApproval => 'Pending approval';

  @override
  String get approve => 'Approve';

  @override
  String get reject => 'Reject';

  @override
  String get loginSubtitle => 'Sign in to your workspace';

  @override
  String get goodMorning => 'Good morning,';

  @override
  String get goodAfternoon => 'Good afternoon,';

  @override
  String get goodEvening => 'Good evening,';

  @override
  String get all => 'All';

  @override
  String get ordersTotal => 'orders';

  @override
  String get late => 'Late';

  @override
  String get allClear => 'Queue is clear — great work!';

  @override
  String get nextOrder => 'Next order';

  @override
  String get deliveryPhoto => 'Delivery photo';

  @override
  String get photoUploading => 'Uploading photo...';

  @override
  String get takePhoto => 'Take photo';

  @override
  String get photoOptional => 'Photo is optional';

  @override
  String nSelected(int n) {
    return '$n selected';
  }

  @override
  String get selectAll => 'Select all';

  @override
  String get vipStock => 'VIP stock';

  @override
  String get filterAll => 'All';

  @override
  String get batchStart => 'Start all';

  @override
  String get batchMarkDelivered => 'Deliver all';

  @override
  String get offlineMode => 'Offline — showing cached data';

  @override
  String get markReplenished => 'Mark replenished';

  @override
  String get vipLocations => 'VIP Locations';

  @override
  String get stockBelowThreshold => 'Below threshold';

  @override
  String get replenishTask => 'Replenishment task';

  @override
  String get currentStock => 'Current stock';

  @override
  String stockLevel(int current, int min, int max) {
    return '$current (min $min / max $max)';
  }

  @override
  String get threshold => 'Threshold';

  @override
  String get managerDashboard => 'Dashboard';

  @override
  String get todayOrders => 'Today\'s orders';

  @override
  String get pendingCount => 'Pending';

  @override
  String get deliveredToday => 'Delivered today';

  @override
  String get avgSlaMinutes => 'Avg SLA (min)';

  @override
  String get mostOrdered => 'Most ordered';

  @override
  String get employeeQuotas => 'Employee quotas';

  @override
  String quotaUsed(int used, int max) {
    return '$used / $max';
  }

  @override
  String get roleLabel => 'Role';

  @override
  String get theme => 'Theme';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get roleAgent => 'Hospitality Agent';

  @override
  String get roleManager => 'Department Manager';

  @override
  String get roleAdmin => 'Admin';

  @override
  String get roleEmployee => 'Employee';

  @override
  String get quickReorder => 'Quick reorder';

  @override
  String get reorderConfirm => 'Reorder these items?';

  @override
  String get meetingRooms => 'Meeting rooms';

  @override
  String get bookRoom => 'Book';

  @override
  String get myBookings => 'My bookings';

  @override
  String get available => 'Available';

  @override
  String get booked => 'Booked';

  @override
  String get cancelBooking => 'Cancel booking';

  @override
  String get noRoomsAvailable => 'No rooms available';

  @override
  String get noBookings => 'No bookings';

  @override
  String get addNote => 'Add a note';

  @override
  String get notePlaceholder => 'Special instructions...';

  @override
  String get confirmOrder => 'Confirm order';

  @override
  String get orderSummary => 'Order summary';

  @override
  String get loginWithPassword => 'Password';

  @override
  String get loginWithOtp => 'OTP';

  @override
  String get phone => 'Phone number';

  @override
  String get otpCodeHint => 'Enter verification code';

  @override
  String get resendOtp => 'Resend code';

  @override
  String get verifyOtp => 'Verify';

  @override
  String get sendOtp => 'Send code';

  @override
  String get confirmOrderTitle => 'Confirm order';

  @override
  String confirmOrderItems(int n) {
    return '$n items';
  }

  @override
  String get estimatedPriority => 'Estimated priority';

  @override
  String get confirmAndSubmit => 'Confirm & submit';

  @override
  String linesAccepted(int n) {
    return '$n lines accepted';
  }

  @override
  String linesRejected(int n) {
    return '$n lines rejected';
  }

  @override
  String get outOfStockTitle => 'Out of stock';

  @override
  String get outOfStockBody => 'Report this item as out of stock?';

  @override
  String get outOfStockReported => 'Reported as out of stock';

  @override
  String get previousOrder => 'Previous order';

  @override
  String get searchHint => 'Search products...';

  @override
  String get quota => 'Quota';

  @override
  String quotaOf(int used, int max) {
    return '$used / $max';
  }

  @override
  String get catalogEmpty => 'No products available';

  @override
  String get catalogEmptySubtitle => 'Check back later or contact your admin';

  @override
  String capacity(int n) {
    return 'Capacity: $n';
  }

  @override
  String get occupied => 'Occupied';

  @override
  String get bookingConfirmed => 'Booking confirmed';

  @override
  String get startTime => 'Start time';

  @override
  String get endTime => 'End time';

  @override
  String get roleDirecteurGeneral => 'General Manager';

  @override
  String get roleViceDirecteur => 'Deputy Manager';

  @override
  String get roleDirecteurBranche => 'Branch Manager';

  @override
  String get roleSuperviseur => 'Supervisor';

  @override
  String get roleCuisinier => 'Cook';

  @override
  String get roleLivreur => 'Delivery Agent';

  @override
  String get roleFemmeMenage => 'Cleaning Staff';

  @override
  String get roleCustom => 'Custom role';

  @override
  String get permissionLabel => 'Permission';

  @override
  String get permissionsLabel => 'Permissions';

  @override
  String get createRole => 'Create role';

  @override
  String get editRole => 'Edit role';

  @override
  String get deleteRole => 'Delete role';

  @override
  String get systemRole => 'System role';

  @override
  String get systemRoleCannotDelete => 'System roles cannot be deleted';

  @override
  String get roleScope => 'Scope';

  @override
  String get roleScopeTarhib => 'Tarhib (internal)';

  @override
  String get roleScopeClient => 'Client company';

  @override
  String get slaPriority => 'SLA priority';

  @override
  String get quotaPerRole => 'Quota per role';

  @override
  String get setQuota => 'Set quota';

  @override
  String get quotaPeriodDaily => 'Daily';

  @override
  String get quotaPeriodWeekly => 'Weekly';

  @override
  String get quotaPeriodMonthly => 'Monthly';

  @override
  String get meetingServices => 'Meeting services';

  @override
  String get orderServicesForMeeting => 'Order services for this meeting';

  @override
  String get meetingServiceOrdered => 'Services ordered';

  @override
  String get noMeetingServices => 'No services ordered yet';

  @override
  String get signupLink => 'No account? Register';

  @override
  String get signupTitle => 'Create account';

  @override
  String get signupCompanySection => 'Company';

  @override
  String get signupCompanyCode => 'Company code (slug)';

  @override
  String get signupIdentitySection => 'Your information';

  @override
  String get signupPasswordSection => 'Password';

  @override
  String get signupPasswordMin => 'Minimum 8 characters';

  @override
  String get signupButton => 'Submit registration';

  @override
  String get signupPendingTitle => 'Registration submitted';

  @override
  String get signupPendingBody =>
      'Your account is pending admin approval. You will receive an email once activated.';

  @override
  String get backToLogin => 'Back to login';

  @override
  String get firstNameEn => 'First name (EN)';

  @override
  String get lastNameEn => 'Last name (EN)';

  @override
  String get firstNameAr => 'First name (AR)';

  @override
  String get lastNameAr => 'Last name (AR)';

  @override
  String get meetingServiceBreakfast => 'Breakfast + service';

  @override
  String get meetingServiceLunch => 'Lunch + service';

  @override
  String get chooseServicePackage => 'Choose a service package';

  @override
  String get servicePackage => 'Service package';

  @override
  String get notAvailable => 'Not available';

  @override
  String get lineAcceptedBadge => 'Accepted';

  @override
  String get cartHasInvalidLines =>
      'Some items are unavailable or exceed your quota — remove or adjust them to submit';

  @override
  String get orderWillAutoConfirm =>
      'Available and within quota — this order will be confirmed automatically';

  @override
  String get orderAutoConfirmedSubtitle =>
      'Your order has been confirmed automatically and sent for preparation';

  @override
  String get orderLines => 'Items';

  @override
  String get timeRemaining => 'Time remaining';

  @override
  String get minutesShort => 'min';

  @override
  String get accountApproved => 'Active account';

  @override
  String get quotasTracked => 'Tracked products';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get personalInfo => 'Personal information';

  @override
  String get languageAppearance => 'Language & appearance';

  @override
  String get notifications => 'Notifications';

  @override
  String get aboutApp => 'About the app';

  @override
  String get chooseLanguageHint => 'Choose your preferred language';

  @override
  String get defaultLanguage => 'Default language';

  @override
  String get languageAppliesInstantly =>
      'The language applies instantly across the app';

  @override
  String get allowNotifications => 'Allow notifications';

  @override
  String get orderNotifications => 'Order notifications';

  @override
  String get notifNewOrder => 'New order';

  @override
  String get notifOrderApproved => 'Order approved';

  @override
  String get notifOrderRejected => 'Order rejected';

  @override
  String get notifOrderReady => 'Order ready for pickup';

  @override
  String get otherNotifications => 'Other';

  @override
  String get notifOffersUpdates => 'Offers & updates';

  @override
  String get notifReminders => 'Reminders';

  @override
  String appVersion(String version) {
    return 'Version $version';
  }

  @override
  String get aboutDescription =>
      'Tarhib Employee lets you order drinks, snacks and meals, book meeting rooms and track your orders in real time — all within your company\'s quotas.';
}
