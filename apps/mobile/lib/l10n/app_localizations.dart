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

  /// No description provided for @nextOrder.
  ///
  /// In en, this message translates to:
  /// **'Next order'**
  String get nextOrder;

  /// No description provided for @deliveryPhoto.
  ///
  /// In en, this message translates to:
  /// **'Delivery photo'**
  String get deliveryPhoto;

  /// No description provided for @photoUploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading photo...'**
  String get photoUploading;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get takePhoto;

  /// No description provided for @photoOptional.
  ///
  /// In en, this message translates to:
  /// **'Photo is optional'**
  String get photoOptional;

  /// No description provided for @nSelected.
  ///
  /// In en, this message translates to:
  /// **'{n} selected'**
  String nSelected(int n);

  /// No description provided for @selectAll.
  ///
  /// In en, this message translates to:
  /// **'Select all'**
  String get selectAll;

  /// No description provided for @vipStock.
  ///
  /// In en, this message translates to:
  /// **'VIP stock'**
  String get vipStock;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @batchStart.
  ///
  /// In en, this message translates to:
  /// **'Start all'**
  String get batchStart;

  /// No description provided for @batchMarkDelivered.
  ///
  /// In en, this message translates to:
  /// **'Deliver all'**
  String get batchMarkDelivered;

  /// No description provided for @offlineMode.
  ///
  /// In en, this message translates to:
  /// **'Offline — showing cached data'**
  String get offlineMode;

  /// No description provided for @markReplenished.
  ///
  /// In en, this message translates to:
  /// **'Mark replenished'**
  String get markReplenished;

  /// No description provided for @vipLocations.
  ///
  /// In en, this message translates to:
  /// **'VIP Locations'**
  String get vipLocations;

  /// No description provided for @stockBelowThreshold.
  ///
  /// In en, this message translates to:
  /// **'Below threshold'**
  String get stockBelowThreshold;

  /// No description provided for @replenishTask.
  ///
  /// In en, this message translates to:
  /// **'Replenishment task'**
  String get replenishTask;

  /// No description provided for @currentStock.
  ///
  /// In en, this message translates to:
  /// **'Current stock'**
  String get currentStock;

  /// No description provided for @stockLevel.
  ///
  /// In en, this message translates to:
  /// **'{current} (min {min} / max {max})'**
  String stockLevel(int current, int min, int max);

  /// No description provided for @threshold.
  ///
  /// In en, this message translates to:
  /// **'Threshold'**
  String get threshold;

  /// No description provided for @managerDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get managerDashboard;

  /// No description provided for @todayOrders.
  ///
  /// In en, this message translates to:
  /// **'Today\'s orders'**
  String get todayOrders;

  /// No description provided for @pendingCount.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pendingCount;

  /// No description provided for @deliveredToday.
  ///
  /// In en, this message translates to:
  /// **'Delivered today'**
  String get deliveredToday;

  /// No description provided for @avgSlaMinutes.
  ///
  /// In en, this message translates to:
  /// **'Avg SLA (min)'**
  String get avgSlaMinutes;

  /// No description provided for @mostOrdered.
  ///
  /// In en, this message translates to:
  /// **'Most ordered'**
  String get mostOrdered;

  /// No description provided for @employeeQuotas.
  ///
  /// In en, this message translates to:
  /// **'Employee quotas'**
  String get employeeQuotas;

  /// No description provided for @quotaUsed.
  ///
  /// In en, this message translates to:
  /// **'{used} / {max}'**
  String quotaUsed(int used, int max);

  /// No description provided for @roleLabel.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get roleLabel;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get theme;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @roleAgent.
  ///
  /// In en, this message translates to:
  /// **'Hospitality Agent'**
  String get roleAgent;

  /// No description provided for @roleManager.
  ///
  /// In en, this message translates to:
  /// **'Department Manager'**
  String get roleManager;

  /// No description provided for @roleAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get roleAdmin;

  /// No description provided for @roleEmployee.
  ///
  /// In en, this message translates to:
  /// **'Employee'**
  String get roleEmployee;

  /// No description provided for @quickReorder.
  ///
  /// In en, this message translates to:
  /// **'Quick reorder'**
  String get quickReorder;

  /// No description provided for @reorderConfirm.
  ///
  /// In en, this message translates to:
  /// **'Reorder these items?'**
  String get reorderConfirm;

  /// No description provided for @meetingRooms.
  ///
  /// In en, this message translates to:
  /// **'Meeting rooms'**
  String get meetingRooms;

  /// No description provided for @bookRoom.
  ///
  /// In en, this message translates to:
  /// **'Book'**
  String get bookRoom;

  /// No description provided for @myBookings.
  ///
  /// In en, this message translates to:
  /// **'My bookings'**
  String get myBookings;

  /// No description provided for @available.
  ///
  /// In en, this message translates to:
  /// **'Available'**
  String get available;

  /// No description provided for @booked.
  ///
  /// In en, this message translates to:
  /// **'Booked'**
  String get booked;

  /// No description provided for @cancelBooking.
  ///
  /// In en, this message translates to:
  /// **'Cancel booking'**
  String get cancelBooking;

  /// No description provided for @noRoomsAvailable.
  ///
  /// In en, this message translates to:
  /// **'No rooms available'**
  String get noRoomsAvailable;

  /// No description provided for @noBookings.
  ///
  /// In en, this message translates to:
  /// **'No bookings'**
  String get noBookings;

  /// No description provided for @addNote.
  ///
  /// In en, this message translates to:
  /// **'Add a note'**
  String get addNote;

  /// No description provided for @notePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Special instructions...'**
  String get notePlaceholder;

  /// No description provided for @confirmOrder.
  ///
  /// In en, this message translates to:
  /// **'Confirm order'**
  String get confirmOrder;

  /// No description provided for @orderSummary.
  ///
  /// In en, this message translates to:
  /// **'Order summary'**
  String get orderSummary;

  /// No description provided for @loginWithPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get loginWithPassword;

  /// No description provided for @loginWithOtp.
  ///
  /// In en, this message translates to:
  /// **'OTP'**
  String get loginWithOtp;

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone number'**
  String get phone;

  /// No description provided for @otpCodeHint.
  ///
  /// In en, this message translates to:
  /// **'Enter verification code'**
  String get otpCodeHint;

  /// No description provided for @resendOtp.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get resendOtp;

  /// No description provided for @verifyOtp.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get verifyOtp;

  /// No description provided for @sendOtp.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendOtp;

  /// No description provided for @confirmOrderTitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm order'**
  String get confirmOrderTitle;

  /// No description provided for @confirmOrderItems.
  ///
  /// In en, this message translates to:
  /// **'{n} items'**
  String confirmOrderItems(int n);

  /// No description provided for @estimatedPriority.
  ///
  /// In en, this message translates to:
  /// **'Estimated priority'**
  String get estimatedPriority;

  /// No description provided for @confirmAndSubmit.
  ///
  /// In en, this message translates to:
  /// **'Confirm & submit'**
  String get confirmAndSubmit;

  /// No description provided for @linesAccepted.
  ///
  /// In en, this message translates to:
  /// **'{n} lines accepted'**
  String linesAccepted(int n);

  /// No description provided for @linesRejected.
  ///
  /// In en, this message translates to:
  /// **'{n} lines rejected'**
  String linesRejected(int n);

  /// No description provided for @outOfStockTitle.
  ///
  /// In en, this message translates to:
  /// **'Out of stock'**
  String get outOfStockTitle;

  /// No description provided for @outOfStockBody.
  ///
  /// In en, this message translates to:
  /// **'Report this item as out of stock?'**
  String get outOfStockBody;

  /// No description provided for @outOfStockReported.
  ///
  /// In en, this message translates to:
  /// **'Reported as out of stock'**
  String get outOfStockReported;

  /// No description provided for @previousOrder.
  ///
  /// In en, this message translates to:
  /// **'Previous order'**
  String get previousOrder;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Search products...'**
  String get searchHint;

  /// No description provided for @quota.
  ///
  /// In en, this message translates to:
  /// **'Quota'**
  String get quota;

  /// No description provided for @quotaOf.
  ///
  /// In en, this message translates to:
  /// **'{used} / {max}'**
  String quotaOf(int used, int max);

  /// No description provided for @catalogEmpty.
  ///
  /// In en, this message translates to:
  /// **'No products available'**
  String get catalogEmpty;

  /// No description provided for @catalogEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Check back later or contact your admin'**
  String get catalogEmptySubtitle;

  /// No description provided for @capacity.
  ///
  /// In en, this message translates to:
  /// **'Capacity: {n}'**
  String capacity(int n);

  /// No description provided for @occupied.
  ///
  /// In en, this message translates to:
  /// **'Occupied'**
  String get occupied;

  /// No description provided for @bookingConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Booking confirmed'**
  String get bookingConfirmed;

  /// No description provided for @startTime.
  ///
  /// In en, this message translates to:
  /// **'Start time'**
  String get startTime;

  /// No description provided for @endTime.
  ///
  /// In en, this message translates to:
  /// **'End time'**
  String get endTime;

  /// No description provided for @roleDirecteurGeneral.
  ///
  /// In en, this message translates to:
  /// **'General Manager'**
  String get roleDirecteurGeneral;

  /// No description provided for @roleViceDirecteur.
  ///
  /// In en, this message translates to:
  /// **'Deputy Manager'**
  String get roleViceDirecteur;

  /// No description provided for @roleDirecteurBranche.
  ///
  /// In en, this message translates to:
  /// **'Branch Manager'**
  String get roleDirecteurBranche;

  /// No description provided for @roleSuperviseur.
  ///
  /// In en, this message translates to:
  /// **'Supervisor'**
  String get roleSuperviseur;

  /// No description provided for @roleCuisinier.
  ///
  /// In en, this message translates to:
  /// **'Cook'**
  String get roleCuisinier;

  /// No description provided for @roleLivreur.
  ///
  /// In en, this message translates to:
  /// **'Delivery Agent'**
  String get roleLivreur;

  /// No description provided for @roleFemmeMenage.
  ///
  /// In en, this message translates to:
  /// **'Cleaning Staff'**
  String get roleFemmeMenage;

  /// No description provided for @roleCustom.
  ///
  /// In en, this message translates to:
  /// **'Custom role'**
  String get roleCustom;

  /// No description provided for @permissionLabel.
  ///
  /// In en, this message translates to:
  /// **'Permission'**
  String get permissionLabel;

  /// No description provided for @permissionsLabel.
  ///
  /// In en, this message translates to:
  /// **'Permissions'**
  String get permissionsLabel;

  /// No description provided for @createRole.
  ///
  /// In en, this message translates to:
  /// **'Create role'**
  String get createRole;

  /// No description provided for @editRole.
  ///
  /// In en, this message translates to:
  /// **'Edit role'**
  String get editRole;

  /// No description provided for @deleteRole.
  ///
  /// In en, this message translates to:
  /// **'Delete role'**
  String get deleteRole;

  /// No description provided for @systemRole.
  ///
  /// In en, this message translates to:
  /// **'System role'**
  String get systemRole;

  /// No description provided for @systemRoleCannotDelete.
  ///
  /// In en, this message translates to:
  /// **'System roles cannot be deleted'**
  String get systemRoleCannotDelete;

  /// No description provided for @roleScope.
  ///
  /// In en, this message translates to:
  /// **'Scope'**
  String get roleScope;

  /// No description provided for @roleScopeTarhib.
  ///
  /// In en, this message translates to:
  /// **'Tarhib (internal)'**
  String get roleScopeTarhib;

  /// No description provided for @roleScopeClient.
  ///
  /// In en, this message translates to:
  /// **'Client company'**
  String get roleScopeClient;

  /// No description provided for @slaPriority.
  ///
  /// In en, this message translates to:
  /// **'SLA priority'**
  String get slaPriority;

  /// No description provided for @quotaPerRole.
  ///
  /// In en, this message translates to:
  /// **'Quota per role'**
  String get quotaPerRole;

  /// No description provided for @setQuota.
  ///
  /// In en, this message translates to:
  /// **'Set quota'**
  String get setQuota;

  /// No description provided for @quotaPeriodDaily.
  ///
  /// In en, this message translates to:
  /// **'Daily'**
  String get quotaPeriodDaily;

  /// No description provided for @quotaPeriodWeekly.
  ///
  /// In en, this message translates to:
  /// **'Weekly'**
  String get quotaPeriodWeekly;

  /// No description provided for @quotaPeriodMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get quotaPeriodMonthly;

  /// No description provided for @meetingServices.
  ///
  /// In en, this message translates to:
  /// **'Meeting services'**
  String get meetingServices;

  /// No description provided for @orderServicesForMeeting.
  ///
  /// In en, this message translates to:
  /// **'Order services for this meeting'**
  String get orderServicesForMeeting;

  /// No description provided for @meetingServiceOrdered.
  ///
  /// In en, this message translates to:
  /// **'Services ordered'**
  String get meetingServiceOrdered;

  /// No description provided for @noMeetingServices.
  ///
  /// In en, this message translates to:
  /// **'No services ordered yet'**
  String get noMeetingServices;

  /// No description provided for @signupLink.
  ///
  /// In en, this message translates to:
  /// **'No account? Register'**
  String get signupLink;

  /// No description provided for @signupTitle.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get signupTitle;

  /// No description provided for @signupCompanySection.
  ///
  /// In en, this message translates to:
  /// **'Company'**
  String get signupCompanySection;

  /// No description provided for @signupCompanyCode.
  ///
  /// In en, this message translates to:
  /// **'Company code (slug)'**
  String get signupCompanyCode;

  /// No description provided for @signupIdentitySection.
  ///
  /// In en, this message translates to:
  /// **'Your information'**
  String get signupIdentitySection;

  /// No description provided for @signupPasswordSection.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get signupPasswordSection;

  /// No description provided for @signupPasswordMin.
  ///
  /// In en, this message translates to:
  /// **'Minimum 8 characters'**
  String get signupPasswordMin;

  /// No description provided for @signupButton.
  ///
  /// In en, this message translates to:
  /// **'Submit registration'**
  String get signupButton;

  /// No description provided for @signupPendingTitle.
  ///
  /// In en, this message translates to:
  /// **'Registration submitted'**
  String get signupPendingTitle;

  /// No description provided for @signupPendingBody.
  ///
  /// In en, this message translates to:
  /// **'Your account is pending admin approval. You will receive an email once activated.'**
  String get signupPendingBody;

  /// No description provided for @backToLogin.
  ///
  /// In en, this message translates to:
  /// **'Back to login'**
  String get backToLogin;

  /// No description provided for @firstNameEn.
  ///
  /// In en, this message translates to:
  /// **'First name (EN)'**
  String get firstNameEn;

  /// No description provided for @lastNameEn.
  ///
  /// In en, this message translates to:
  /// **'Last name (EN)'**
  String get lastNameEn;

  /// No description provided for @firstNameAr.
  ///
  /// In en, this message translates to:
  /// **'First name (AR)'**
  String get firstNameAr;

  /// No description provided for @lastNameAr.
  ///
  /// In en, this message translates to:
  /// **'Last name (AR)'**
  String get lastNameAr;

  /// No description provided for @meetingServiceBreakfast.
  ///
  /// In en, this message translates to:
  /// **'Breakfast + service'**
  String get meetingServiceBreakfast;

  /// No description provided for @meetingServiceLunch.
  ///
  /// In en, this message translates to:
  /// **'Lunch + service'**
  String get meetingServiceLunch;

  /// No description provided for @chooseServicePackage.
  ///
  /// In en, this message translates to:
  /// **'Choose a service package'**
  String get chooseServicePackage;

  /// No description provided for @servicePackage.
  ///
  /// In en, this message translates to:
  /// **'Service package'**
  String get servicePackage;
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
