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
  String get loginTitre => 'Login';

  @override
  String get loginChampIdentifiant => 'Email or phone';

  @override
  String get loginChampMotDePasse => 'Password';

  @override
  String get loginBouton => 'Log in';

  @override
  String get loginErreurIdentifiants => 'Invalid email/phone or password';

  @override
  String get loginErreurRoleNonSupporte =>
      'This role isn\'t supported by this app';

  @override
  String get loginErreurGenerique => 'Something went wrong, please try again';

  @override
  String get accueilEmploye => 'Employee dashboard';

  @override
  String get accueilAgent => 'Hospitality agent dashboard';

  @override
  String get boutonDeconnexion => 'Log out';

  @override
  String get profilTitre => 'Profile';

  @override
  String get profilLangue => 'Language';

  @override
  String get placeholderEnConstruction => 'This section is under construction';

  @override
  String get quotaRestantTitre => 'Remaining quota';

  @override
  String get commandesEnCoursTitre => 'Orders in progress';

  @override
  String get boutonNouvelleCommande => 'New order';

  @override
  String get aucunQuotaApplicable => 'No quota currently applies to your role';

  @override
  String get aucuneCommandeEnCours => 'No orders in progress';

  @override
  String get erreurChargement => 'Something went wrong while loading';

  @override
  String get reessayer => 'Retry';

  @override
  String get quotaProduitTousLesProduits => 'All products';

  @override
  String quotaValeurRestante(String restant, String max) {
    return '$restant of $max';
  }

  @override
  String get periodeJour => 'Daily';

  @override
  String get periodeSemaine => 'Weekly';

  @override
  String get periodeMois => 'Monthly';

  @override
  String get statutEnAttente => 'Pending';

  @override
  String get statutEnAttenteApprobation => 'Awaiting approval';

  @override
  String get statutValidee => 'Validated';

  @override
  String get statutRefusee => 'Rejected';

  @override
  String get statutEnPreparation => 'Being prepared';

  @override
  String get statutEnLivraison => 'Out for delivery';

  @override
  String get statutLivree => 'Delivered';

  @override
  String get statutAnnulee => 'Cancelled';

  @override
  String get catalogueTitre => 'Catalogue';

  @override
  String get catalogueVide => 'No products available right now';

  @override
  String get nouvelleCommandeTitre => 'New order';

  @override
  String get nouvelleCommandeChampProduit => 'Product';

  @override
  String get nouvelleCommandeChampQuantite => 'Quantity';

  @override
  String get nouvelleCommandeChampLieu => 'Delivery location (optional)';

  @override
  String get nouvelleCommandeChampSalle => 'Room (optional)';

  @override
  String get nouvelleCommandeChampHeure => 'Requested time (optional)';

  @override
  String get nouvelleCommandeChampCommentaire => 'Comments (optional)';

  @override
  String get nouvelleCommandeBoutonChoisirHeure => 'Pick a time';

  @override
  String get nouvelleCommandeBoutonEffacerHeure => 'Clear';

  @override
  String get nouvelleCommandeBoutonEnvoyer => 'Submit order';

  @override
  String get nouvelleCommandeValidationProduit => 'Select a product';

  @override
  String get nouvelleCommandeValidationQuantite =>
      'Enter a valid quantity greater than zero';

  @override
  String get nouvelleCommandeSucces => 'Order created successfully';

  @override
  String get refusProduitIndisponible =>
      'This product isn\'t available right now';

  @override
  String get refusStockInsuffisant => 'The requested quantity isn\'t in stock';

  @override
  String get refusQuotaDepasse =>
      'This order would exceed your available quota';

  @override
  String get refusHoraireFerme => 'The service is closed at this time';

  @override
  String get refusRoleNonAutorise =>
      'This product isn\'t available for your role';

  @override
  String get erreurCommandeEchec =>
      'Couldn\'t create the order, please try again';

  @override
  String get detailCommandeTitre => 'Order details';

  @override
  String get detailLieuLivraison => 'Delivery location';

  @override
  String get detailSalle => 'Room';

  @override
  String get detailHeureSouhaitee => 'Requested time';

  @override
  String get detailCommentaire => 'Comments';

  @override
  String get detailDateCreation => 'Order date';

  @override
  String get detailProduits => 'Products';

  @override
  String get detailPriorite => 'Priority';
}
