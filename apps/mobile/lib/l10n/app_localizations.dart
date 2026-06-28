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
/// import 'l10n/app_localizations.dart';
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
    Locale('en')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Tarhib'**
  String get appTitle;

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get login;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginButton;

  /// No description provided for @loginError.
  ///
  /// In en, this message translates to:
  /// **'Invalid credentials. Please try again.'**
  String get loginError;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @catalog.
  ///
  /// In en, this message translates to:
  /// **'Catalog'**
  String get catalog;

  /// No description provided for @cart.
  ///
  /// In en, this message translates to:
  /// **'Cart'**
  String get cart;

  /// No description provided for @myOrders.
  ///
  /// In en, this message translates to:
  /// **'My Orders'**
  String get myOrders;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @addToCart.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get addToCart;

  /// No description provided for @removeFromCart.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get removeFromCart;

  /// No description provided for @submitOrder.
  ///
  /// In en, this message translates to:
  /// **'Submit Order'**
  String get submitOrder;

  /// No description provided for @orderSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Order submitted successfully'**
  String get orderSubmitted;

  /// No description provided for @orderEmpty.
  ///
  /// In en, this message translates to:
  /// **'Your cart is empty'**
  String get orderEmpty;

  /// No description provided for @quotaRemaining.
  ///
  /// In en, this message translates to:
  /// **'Remaining quota: {count}'**
  String quotaRemaining(int count);

  /// No description provided for @orderStatus_PENDING.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get orderStatus_PENDING;

  /// No description provided for @orderStatus_APPROVED.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get orderStatus_APPROVED;

  /// No description provided for @orderStatus_IN_PROGRESS.
  ///
  /// In en, this message translates to:
  /// **'In preparation'**
  String get orderStatus_IN_PROGRESS;

  /// No description provided for @orderStatus_DELIVERED.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get orderStatus_DELIVERED;

  /// No description provided for @orderStatus_REJECTED.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get orderStatus_REJECTED;

  /// No description provided for @priority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get priority;

  /// No description provided for @slaDeadline.
  ///
  /// In en, this message translates to:
  /// **'SLA deadline'**
  String get slaDeadline;

  /// No description provided for @slaExpired.
  ///
  /// In en, this message translates to:
  /// **'SLA exceeded'**
  String get slaExpired;

  /// No description provided for @orderHistory.
  ///
  /// In en, this message translates to:
  /// **'Order history'**
  String get orderHistory;

  /// No description provided for @noOrders.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get noOrders;

  /// No description provided for @orderQueue.
  ///
  /// In en, this message translates to:
  /// **'Order queue'**
  String get orderQueue;

  /// No description provided for @noOrdersInQueue.
  ///
  /// In en, this message translates to:
  /// **'No pending orders'**
  String get noOrdersInQueue;

  /// No description provided for @markInProgress.
  ///
  /// In en, this message translates to:
  /// **'Start preparation'**
  String get markInProgress;

  /// No description provided for @markDelivered.
  ///
  /// In en, this message translates to:
  /// **'Mark delivered'**
  String get markDelivered;

  /// No description provided for @reportOutOfStock.
  ///
  /// In en, this message translates to:
  /// **'Report out of stock'**
  String get reportOutOfStock;

  /// No description provided for @confirmAction.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirmAction;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @lineApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get lineApproved;

  /// No description provided for @lineRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get lineRejected;

  /// No description provided for @lineRejectionReason_PRODUCT_NOT_COMMANDABLE.
  ///
  /// In en, this message translates to:
  /// **'Product not orderable'**
  String get lineRejectionReason_PRODUCT_NOT_COMMANDABLE;

  /// No description provided for @lineRejectionReason_ROLE_NOT_ALLOWED.
  ///
  /// In en, this message translates to:
  /// **'Role not authorized'**
  String get lineRejectionReason_ROLE_NOT_ALLOWED;

  /// No description provided for @lineRejectionReason_INSUFFICIENT_STOCK.
  ///
  /// In en, this message translates to:
  /// **'Insufficient stock'**
  String get lineRejectionReason_INSUFFICIENT_STOCK;

  /// No description provided for @lineRejectionReason_QUOTA_EXCEEDED.
  ///
  /// In en, this message translates to:
  /// **'Quota exceeded'**
  String get lineRejectionReason_QUOTA_EXCEEDED;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @arabic.
  ///
  /// In en, this message translates to:
  /// **'العربية'**
  String get arabic;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @errorRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get errorRetry;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @quantity.
  ///
  /// In en, this message translates to:
  /// **'Qty'**
  String get quantity;

  /// No description provided for @product.
  ///
  /// In en, this message translates to:
  /// **'Product'**
  String get product;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @orderDetail.
  ///
  /// In en, this message translates to:
  /// **'Order detail'**
  String get orderDetail;

  /// No description provided for @validationResult.
  ///
  /// In en, this message translates to:
  /// **'Validation result'**
  String get validationResult;

  /// No description provided for @partiallyRejected.
  ///
  /// In en, this message translates to:
  /// **'Some lines were rejected'**
  String get partiallyRejected;

  /// No description provided for @pendingApproval.
  ///
  /// In en, this message translates to:
  /// **'Pending approval'**
  String get pendingApproval;

  /// No description provided for @approve.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get approve;

  /// No description provided for @reject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get reject;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to your workspace'**
  String get loginSubtitle;

  /// No description provided for @goodMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning,'**
  String get goodMorning;

  /// No description provided for @goodAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon,'**
  String get goodAfternoon;

  /// No description provided for @goodEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening,'**
  String get goodEvening;

  /// No description provided for @all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get all;

  /// No description provided for @ordersTotal.
  ///
  /// In en, this message translates to:
  /// **'orders'**
  String get ordersTotal;

  /// No description provided for @late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get late;

  /// No description provided for @allClear.
  ///
  /// In en, this message translates to:
  /// **'Queue is clear — great work!'**
  String get allClear;
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
      'that was used.');
}
