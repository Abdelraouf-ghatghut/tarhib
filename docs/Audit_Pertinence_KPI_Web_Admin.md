# Audit de pertinence des KPI du Web Admin Tarhib

**Date :** 9 aout 2026  
**Perimetre :** dashboard, rapports, stock, quotas, salles, achats, finance, comptabilite et libre-service VIP  
**Angle d'analyse :** utilite pour une entreprise de services d'hospitalite corporate, fiabilite du calcul, actionnabilite et qualite de visualisation

## 1. Synthese executive

Le Web Admin couvre correctement les volumes operationnels de base : commandes, statuts, alertes de stock, consommation des quotas, reservations et achats. Il repond donc assez bien a la question **« que se passe-t-il maintenant ? »**.

Il repond moins bien aux questions de pilotage : **« pourquoi ? », « a quel cout ? », « avec quelle qualite ? » et « que faut-il corriger ? »**. La plupart des mesures sont des comptages, rarement normalises par employe, jour ouvre, commande, branche ou capacite disponible. Les objectifs, seuils metier, comparaisons budget/reel et analyses de cause sont presque absents.

### Evaluation globale

| Axe                        | Note | Conclusion                                                                     |
| -------------------------- | ---: | ------------------------------------------------------------------------------ |
| Couverture operationnelle  | 7/10 | Bons volumes et alertes de premier niveau.                                     |
| Pertinence manageriale     | 5/10 | Trop de volumes, peu de ratios de productivite, qualite et cout.               |
| Fiabilite semantique       | 4/10 | Incoherences de formule et de perimetre, surtout sur le SLA et les periodes.   |
| Actionnabilite             | 5/10 | Stock et commandes sont actionnables ; les vues executives le sont moins.      |
| Qualite des visualisations | 5/10 | Une tendance utile, mais beaucoup de cartes et tableaux sans analyse visuelle. |
| Pilotage financier         | 4/10 | Etats comptables utiles, synthese finance conceptuellement fragile.            |

**Verdict :** conserver le socle, corriger d'abord les definitions et les scopes, puis enrichir avec des indicateurs de service, de cout, de capacite et de prevision. Ajouter davantage de graphiques avant de stabiliser les definitions amplifierait les erreurs au lieu d'ameliorer le pilotage.

## 2. Anomalies critiques de mesure

### P0 - Le SLA du dashboard est mathematiquement incorrect

Le rapport SLA simple definit actuellement :

- `onTime` = toutes les commandes au statut `DELIVERED`, meme livrees apres l'echeance ;
- `late` = commandes non livrees dont l'echeance est depassee ;
- `complianceRate` = commandes livrees / toutes les commandes creees pendant la periode.

Ce calcul ne mesure donc pas la conformite SLA. Une livraison en retard est classee « a l'heure », tandis qu'une commande encore dans son delai diminue le taux. A l'inverse, la vue executive utilise correctement `deliveredAt <= slaDeadline`, mais seulement parmi les commandes livrees. Deux ecrans affichent ainsi le meme concept avec deux definitions differentes.

**Definition cible recommandee :**

`SLA respecte = commandes cloturees dans le delai / commandes cloturees eligibles`

Afficher separement :

- taux SLA des commandes terminees ;
- commandes ouvertes deja en retard ;
- commandes ouvertes a risque dans les 15/30 prochaines minutes ;
- retard median et P90, plutot que la seule moyenne.

### P0 - Le filtre branche n'agit pas sur le SLA

Le dashboard et la page Rapports construisent un scope contenant `branchId`, mais l'endpoint et le service SLA n'acceptent que societe et dates. Un manager qui selectionne une branche voit donc les commandes de cette branche et le SLA de toute la societe. La comparaison est trompeuse et peut conduire a une mauvaise evaluation d'equipe.

### P0 - Les periodes melangent date de creation et date de realisation

Les commandes, SLA, reservations et achats sont filtres par `createdAt`. Pour une analyse d'activite, ce choix n'est pas toujours le bon :

- SLA et temps de livraison : cohorte par creation possible, mais il faut attendre sa maturite ou expliciter « commandes creees pendant la periode » ;
- livraisons du jour : filtrer par `deliveredAt`, pas par `createdAt` ;
- reservations : analyser le creneau `startTime`, pas la date de saisie ;
- depense achat : utiliser date d'envoi, de reception ou de facture selon le KPI, pas la creation du brouillon.

### P0 - La carte « revenu des contrats actifs » n'est pas un revenu de periode

La synthese Finance additionne le montant integral de tous les contrats actifs non expires. Le filtre mois/annee n'est pas applique a cette carte. Cette somme est une **valeur contractuelle active**, pas un chiffre d'affaires du mois. Elle est affichee a cote de depenses periodiques, de dettes instantanees et de soldes de tresorerie : aucune marge exploitable ne peut etre deduite de cet ensemble.

Renommer en « valeur des contrats actifs » ou, de preference, calculer le chiffre d'affaires reconnu/facture/encaisse sur la periode.

## 3. Evaluation detaillee des indicateurs existants

Legende : **A conserver**, **A corriger**, **A completer**, **Secondaire**.

### Dashboard operationnel

| Element actuel                  | Pertinence | Evaluation                   | Decision metier servie                    | Recommandation                                                                            |
| ------------------------------- | ---------- | ---------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Total commandes                 | Forte      | A conserver                  | Dimensionner la charge.                   | Afficher commandes par jour ouvre et ecart vs prevision.                                  |
| En attente                      | Forte      | A corriger                   | Detecter un backlog.                      | Utiliser le stock actuel, independant de la periode de creation ; ajouter age median/P90. |
| Livrees                         | Forte      | A corriger                   | Mesurer le debit de sortie.               | Compter par `deliveredAt`; ajouter taux de completion.                                    |
| Taux SLA                        | Tres forte | A corriger en priorite       | Piloter la qualite de service.            | Formule unique, cible configurable, n eligible et retard P90.                             |
| Consommation moyenne des quotas | Moyenne    | A corriger                   | Anticiper saturation et calibrer l'offre. | Utiliser un ratio pondere `somme utilise / somme plafond`; distinguer periodes actives.   |
| Tendance commandes + SLA        | Forte      | A conserver apres correction | Relier charge et qualite.                 | Deux axes explicitement etiquetes, objectif SLA, granularite adaptee et comparaison N-1.  |
| Commandes par statut            | Forte      | A completer                  | Localiser le goulot.                      | Preferer un entonnoir ou barres empilees a 100 %, avec temps passe par etape.             |
| Alertes stock                   | Tres forte | A conserver                  | Declencher reapprovisionnement/transfert. | Dedoublonner rupture/sous-seuil/critique et afficher jours de couverture.                 |
| Dernieres commandes             | Forte      | A conserver                  | Agir sur les cas recents.                 | Trier d'abord les commandes a risque SLA, puis les plus recentes.                         |

**Point de vigilance :** le libelle « aujourd'hui » reste utilise pour des periodes semaine, mois, annee ou personnalisees. Les titres doivent reprendre la periode active.

### Vue executive

| Element actuel                  | Pertinence          | Evaluation  | Recommandation                                                                                                                          |
| ------------------------------- | ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre de societes              | Moyenne             | Secondaire  | Afficher societes actives et evolution nette ; sinon c'est une metrique de taille, pas de performance.                                  |
| Nombre de branches              | Faible a moyenne    | Secondaire  | Associer couverture, charge moyenne et branches sans activite.                                                                          |
| Employes clients                | Moyenne             | A completer | Distinguer inscrits, actifs 30 jours et taux d'adoption.                                                                                |
| Livrees / en attente / rejetees | Forte               | A completer | Ajouter les taux et les motifs de rejet ; une baisse du backlog est positive, une hausse ne l'est pas.                                  |
| Temps moyen de livraison        | Forte               | A corriger  | Afficher mediane et P90, puis decomposer attente, preparation, pret-a-livrer et livraison.                                              |
| Valeur du stock                 | Forte finance/stock | A corriger  | Preciser methode de valorisation et couverture du cout ; exclure ou signaler les couts inconnus.                                        |
| Ruptures                        | Tres forte          | A completer | Ajouter taux de rupture, duree, commandes impactees et produits critiques.                                                              |
| Depense achats                  | Forte               | A corriger  | Separer engage, receptionne et facture ; inclure taxes/frais/remises si necessaire.                                                     |
| Top societes                    | Moyenne             | A corriger  | Remplacer « top volume » seul par volume, cout de service, SLA, utilisateurs actifs et tendance.                                        |
| Top produits                    | Moyenne             | A corriger  | Le calcul compte actuellement les lignes de commande, pas les unites. Afficher quantite, commandes distinctes, cout et taux de rupture. |

Les deltas ont aussi besoin d'une semantique directionnelle. Une hausse des rejets, du backlog, du temps de livraison ou des depenses n'est pas une amelioration. Le composant de variation ne doit pas assimiler automatiquement « hausse » a « positif ».

### Rapport Commandes et SLA

Le total, la repartition par statut et la repartition par priorite sont pertinents, mais les tags seuls rendent les comparaisons difficiles. Des barres empilees et des taux faciliteraient la lecture entre branches et periodes.

Indicateurs a ajouter :

- taux de validation, de rejet et de livraison ;
- motifs de rejet et de rupture ;
- backlog par tranche d'age ;
- temps median/P90 par etape et priorite ;
- commandes par heure et jour de semaine ;
- taux de reouverture/incident si le workflow le permet.

### Rapport Quotas

Le rapport est directement lie au modele economique et a l'equite de service. La liste des employes proches du plafond est actionnable.

Limites : la moyenne actuelle donne le meme poids a un quota de 1 unite et a un quota de 100 unites ; les quotas historiques ou futurs peuvent entrer dans la mesure ; le seuil fixe de 80 % ignore la proximite de fin de periode. Atteindre 90 % le dernier jour peut etre normal, mais le premier jour signale une anomalie.

Formules recommandees :

- utilisation ponderee = `somme usedQuantity / somme maxQuantity` ;
- vitesse de consommation = part consommee / part de periode ecoulee ;
- taux d'epuisement = quotas arrives a 100 % / quotas actifs ;
- quantite refusee pour cause de quota ;
- quotas non utilises en fin de periode, utiles pour recalibrer les dotations.

### Rapport Stock

Les articles sous seuil, ruptures et valeur de stock sont pertinents. Le detail produit/branche/emplacement est utile aux responsables stock.

Limites : « total articles » compte des lignes d'inventaire, pas des references uniques ; les trois alertes peuvent compter la meme ligne ; la valeur est `quantite x cout unitaire produit`, avec cout inconnu traite comme zero. La valeur affichee peut donc etre sous-estimee sans avertissement et ne reflete pas necessairement le cout moyen pondere des receptions.

Indicateurs prioritaires a ajouter :

- jours de couverture et date estimee de rupture ;
- rotation et stock dormant ;
- taux de disponibilite catalogue ;
- valeur avec cout connu vs valeur non valorisee ;
- ecart inventaire theorique/reel et taux de perte ;
- delai moyen de reapprovisionnement ;
- taux de service des transferts entre zones.

### Rapport Salles de reunion

Total des reservations, annulations, duree moyenne et salle la plus reservee donnent une vue d'activite, mais pas une vue d'utilisation de capacite. La periode repose sur la date de creation de la reservation, ce qui fausse l'occupation reelle.

KPI cible principal :

`Taux d'occupation = minutes reservees confirmees / minutes disponibles`

A completer par taux de no-show, annulation tardive, participants/capacite, heures de pointe, delai de reservation, utilisation des packages et cout/consommation de service par reunion. La « salle la plus reservee » doit etre accompagnee du nombre de reservations et des heures occupees.

### Rapport Achats

La depense totale et les ventilations fournisseur/produit sont pertinentes pour comprendre ou part le budget. Les filtres sont adaptes.

Limites : le montant correspond a la quantite commandee au cout unitaire sur les bons envoyes ou recus. Il s'agit davantage d'un **montant engage hors taxes/frais/remises** que d'une depense comptable. La date utilisee est la creation du bon. Additionner les quantites de produits d'unites differentes dans la vue fournisseur n'a pas de sens metier.

A ajouter : prix moyen par unite et son evolution, ecart de prix vs contrat/precedent achat, delai fournisseur, taux de livraison complete et a l'heure, ecart commande/reception, dependance fournisseur, achats urgents et economie realisee.

### Rapport Activite utilisateurs

Le classement des « top employes » par nombre de commandes risque d'encourager la surconsommation et n'est pas une mesure de performance d'un employe client. Il est acceptable comme analyse de demande, sous un libelle neutre tel que « principaux utilisateurs » et avec protection de la confidentialite.

La repartition par branche est utile, mais doit etre normalisee par effectif actif et jours ouvres. Ajouter taux d'adoption, utilisateurs actifs, commandes par utilisateur actif et frequence de re-commande.

### Libre-service VIP

Les taches ouvertes et emplacements sous seuil sont tres actionnables pour l'exploitation. Ils doivent etre completes par anciennete des taches, taux de respect du delai de reapprovisionnement, temps moyen de resolution, recurrence par emplacement et disponibilite des produits VIP.

### Finance

| Element actuel             | Evaluation               | Motif                                                                                                                                                |
| -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Valeur des contrats actifs | A renommer/recalculer    | Ce n'est pas un revenu de periode.                                                                                                                   |
| Depenses totales           | A conserver avec reserve | Correctes pour la periode, mais peuvent exclure les salaires selon le droit du lecteur : deux utilisateurs peuvent donc voir un « total » different. |
| Dettes restantes           | A completer              | Ajouter echeancier, dettes echues et anciennete.                                                                                                     |
| Solde total des comptes    | A corriger               | Additionner banque, caisse et autres comptes peut masquer les restrictions et doubles comptages ; distinguer tresorerie disponible.                  |
| Masse salariale            | A completer              | Ajouter ratio sur CA et tendance, en conservant les permissions sensibles.                                                                           |

La synthese cible devrait montrer chiffre d'affaires reconnu, marge brute, resultat operationnel, tresorerie disponible, depenses vs budget, creances/dettes echues et prevision de tresorerie. Chaque carte doit partager le meme perimetre temporel ou etre explicitement marquee « au [date] ».

### Comptabilite

Balance generale, grand livre, bilan et compte de resultat sont indispensables et pertinents. Ce sont des etats financiers, pas des KPI operationnels. Ils gagneraient a afficher :

- controle visible `total debit = total credit` ;
- comparaison N-1 et budget ;
- marge brute, marge operationnelle et ratio de charges ;
- date de derniere cloture et statut des periodes ;
- export PDF/Excel avec devise et perimetre ;
- signe et presentation comptables coherents selon le type de compte.

## 4. Portefeuille KPI cible

### Niveau Direction

1. Taux SLA livre a l'heure, objectif et ecart.
2. Volume de commandes et taux de completion.
3. Cout moyen par commande et par societe.
4. Marge par contrat/societe, lorsque la facturation sera disponible.
5. Taux de disponibilite produit.
6. Satisfaction ou taux d'incidents/reclamations.
7. Taux d'adoption des employes clients.
8. Depenses achats vs budget.

### Niveau Operations

1. Backlog actuel et age median/P90.
2. Commandes en retard et a risque dans les 30 minutes.
3. Temps median/P90 par etape.
4. Charge horaire prevue vs capacite equipe.
5. Ruptures impactant le catalogue ou une commande.
6. Taux de preparation correcte et incidents de livraison.

### Niveau Stock et Achats

1. Jours de couverture par produit/zone.
2. Taux de rupture et duree moyenne.
3. Rotation, stock dormant et pertes.
4. Valeur de stock avec taux de couverture des couts.
5. Livraison fournisseur complete et a l'heure.
6. Variation de prix d'achat et ecart commande/reception.

### Niveau Client et Quotas

1. Utilisateurs actifs / employes eligibles.
2. Commandes par utilisateur actif.
3. Utilisation ponderee des quotas.
4. Taux d'epuisement et refus lies aux quotas.
5. Consommation par branche, normalisee par effectif.
6. SLA et disponibilite par societe cliente.

### Niveau Salles

1. Taux d'occupation des heures disponibles.
2. Taux d'annulation et de no-show.
3. Utilisation capacitaire participants/places.
4. Heures de pointe et saturation.
5. Taux d'attachement et cout des packages.

## 5. Principes de visualisation recommandes

- **Cartes KPI :** reserver aux mesures avec objectif, comparaison et action possible. Toujours afficher unite, periode, scope, valeur precedente et sens favorable.
- **Series temporelles :** volumes, SLA, temps, couts, ruptures et occupation. Ajouter ligne d'objectif et comparaison precedente.
- **Barres empilees :** statuts, priorites, causes de rejet, repartition des couts.
- **Heatmaps :** commandes par heure/jour, occupation des salles et ruptures par zone.
- **Box plots ou percentiles :** delais ; une moyenne seule masque les longues attentes.
- **Tableaux :** conserver pour le diagnostic et le passage a l'action, avec tri, seuil et lien vers l'objet.
- **Jauges circulaires :** eviter pour le SLA sauf objectif explicite ; une carte avec tendance et cible utilise mieux l'espace.
- **Top 10 :** toujours afficher le denominateur, la part du total et une mesure de qualite/cout, pas seulement un rang de volume.

## 6. Gouvernance des metriques

Chaque KPI doit posseder une fiche de reference contenant :

| Champ              | Exemple SLA                                                    |
| ------------------ | -------------------------------------------------------------- |
| Nom                | Taux de livraison dans le SLA                                  |
| Objectif           | Mesurer le respect de l'engagement operationnel interne.       |
| Formule            | livrees avec `deliveredAt <= slaDeadline` / livrees eligibles  |
| Numerateur         | Commandes livrees a temps.                                     |
| Denominateur       | Commandes livrees avec echeance valide.                        |
| Date d'attribution | Date de livraison ou cohorte de creation explicitement nommee. |
| Exclusions         | Rejetees, annulees, test, echeance absente.                    |
| Dimensions         | Societe, branche, priorite, produit, heure, equipe.            |
| Frequence          | Temps reel operationnel, cloture quotidienne analytique.       |
| Objectif/seuil     | Configure par niveau SLA, pas code en dur.                     |
| Proprietaire       | Responsable Operations.                                        |

Les valeurs sans donnees ne doivent pas devenir automatiquement 100 %. Afficher « non calculable » avec `n = 0`. Toutes les dates doivent utiliser une convention claire de fuseau et une borne de fin exclusive (`from <= date < to`) pour eviter les pertes en fin de jour.

## 7. Feuille de route priorisee

### Phase 1 - Fiabiliser

1. Unifier la formule SLA et appliquer le scope branche.
2. Corriger les dates d'attribution des livraisons, reservations et achats.
3. Renommer/recalculer le revenu des contrats actifs.
4. Distinguer flux de periode et instantanes « a date ».
5. Corriger les deltas favorables/defavorables et les libelles dependants de la periode.
6. Documenter numerateur, denominateur, exclusions et fuseau de chaque KPI.

### Phase 2 - Rendre actionnable

1. Ajouter backlog age, commandes en retard/a risque et temps par etape.
2. Ajouter jours de couverture, disponibilite catalogue et couts non valorises.
3. Ajouter occupation des salles et heatmap horaire.
4. Normaliser activite et quotas par effectif, capacite et jours ouvres.
5. Ajouter objectifs configurables et navigation depuis chaque anomalie.

### Phase 3 - Piloter la rentabilite

1. Relier commandes, consommations, achats, contrats et comptabilite.
2. Calculer cout par commande, societe, produit et service de reunion.
3. Mettre en place budget/reel et previsions de stock/tresorerie.
4. Ajouter marge par client des que facturation et allocation des couts sont stabilisees.

## 8. Conclusion

Les KPI actuels sont globalement pertinents comme **instrument de surveillance operationnelle**, mais insuffisants et parfois dangereux comme **instrument d'evaluation de performance**. La priorite n'est pas d'ajouter des cartes : elle est d'etablir une definition unique et auditable du SLA, du temps, des periodes, de la depense, du revenu et de la valeur de stock.

Une fois cette couche fiable, Tarhib disposera d'un socle solide pour passer de la description des volumes au pilotage de la qualite, de la capacite et de la rentabilite.

## 9. Etat d'implementation au 9 aout 2026

Les trois phases ont ete appliquees au perimetre couvert par les donnees actuelles :

- SLA unifie sur les livraisons terminees, scope branche applique et absence d'echantillon affichee comme non calculable ;
- demandes attribuees a `createdAt`, SLA a `deliveredAt`, salles a `startTime` et achats a `sentAt` ;
- quotas actifs et moyenne ponderee ;
- commandes ouvertes en retard, a risque sous 30 minutes, mediane et P90 de livraison ;
- occupation des salles, minutes reservees et disponibles ;
- couverture de valorisation et quantites sans cout ;
- taux de realisation et cout d'achat par commande livree dans la vue executive ;
- deltas colores selon le sens metier et libelles du dashboard adaptes a la periode ;
- « revenu des contrats actifs » remplace visuellement par « valeur des contrats actifs a date ».

Les sources auparavant manquantes sont maintenant modelisees dans le module `performance-management` : factures, paiements, echeancier de reconnaissance du revenu, budgets versionnes, couts figes par commande, feedback, presence/no-show et snapshots de prevision. La console Web Admin **Gestion de la performance** permet de les administrer.

La facturation produit desormais un PDF apres emission. Chaque document est genere dans la langue active (`ar` ou `en`), conserve avec une version de modele et une empreinte SHA-256, puis reutilise sans recalcul afin de garantir que la piece telechargee reste identique. Les brouillons ne peuvent pas etre figes en PDF. La police arabe sous licence est chargee par `PDF_FONT_AR_PATH` et n'est pas redistribuee dans le depot.

La fiabilite des marges depend toutefois de la saisie des couts de main-d'oeuvre, livraison et frais indirects. Le cout produit peut etre calcule depuis les lignes de commande et les couts catalogue ; il reste nul lorsqu'un produit n'est pas valorise. Les previsions utilisent volontairement un modele explicable `weighted-average-v1` avec bornes basse/haute. Elles constituent une base operationnelle, pas encore un modele IA auto-entraine.
