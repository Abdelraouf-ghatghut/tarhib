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
}
