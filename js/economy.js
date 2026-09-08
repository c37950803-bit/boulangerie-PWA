/**
 * @file economy.js
 * @description Module économique pur du jeu de gestion de boulangerie.
 * Centralise les règles financières, les recettes de panification, les calculs de prix,
 * le vieillissement des stocks et la tarification bancaire.
 * Ce module est totalement indépendant du DOM et de l'interface utilisateur.
 */

/**
 * Recette officielle pour une fournée standard de 30 pains de 500g.
 * Basée sur un taux d'hydratation de 50% (5L d'eau pour 10kg de farine).
 */
export const RECETTE_FOURNEE = Object.freeze({
  farine: 10, // kg
  levure: 2,  // kg
  sel: 1,     // kg
  eau: 5,     // L / kg
  production: 30 // Pains frais créés
});

/**
 * Pack de réapprovisionnement d'ingrédients vendu par le fournisseur.
 */
export const PACK_INGREDIENTS = Object.freeze({
  farine: 25, // kg
  levure: 5,  // kg
  sel: 3,     // kg
  eau: 20,    // L / kg
  coutStandard: 20, // €
  coutPromotion: 10 // € (-50% lors de l'événement promotion_ingredients)
});

/**
 * Taux des frais de versement bancaire (10%).
 */
export const FRAIS_BANQUE_TAUX = 0.10;

/**
 * Génère un entier pseudo-aléatoire compris entre min et max inclus.
 * @param {number} min - Valeur minimale possible.
 * @param {number} max - Valeur maximale possible.
 * @returns {number} Nombre entier aléatoire.
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calcule les frais bancaires pour un dépôt donné.
 * Règle stricte : 10% arrondis à l'entier supérieur (ceil), ce qui garantit
 * un minimum de 1€ de frais dès le premier euro déposé.
 * 
 * @param {number} montant - Montant en euros que le joueur souhaite déposer.
 * @returns {{ frais: number, montantNet: number }} Détail des frais et du crédit net.
 */
export function calculerFraisBancaires(montant) {
  if (typeof montant !== 'number' || montant <= 0) {
    return { frais: 0, montantNet: 0 };
  }
  const frais = Math.ceil(montant * FRAIS_BANQUE_TAUX);
  const montantNet = Math.max(0, montant - frais);
  return { frais, montantNet };
}

/**
 * Calcule le prix de vente d'un pain selon son âge et les modificateurs de l'événement du jour.
 * 
 * Barème de base original :
 * - Pain 2 jours : 2€ fixe
 * - Pain 1 jour : 3€ à 4€ aléatoire
 * - Pain frais (0 jour) : 4€ à 6€ aléatoire
 * 
 * Modificateurs d'événements appliqués :
 * - Multiplicateur de prix (ex: x2.0 pour clients_riches, x1.5 pour fete_village)
 * - Bonus ou malus direct (ex: -1€ pour journee_pluvieuse)
 * - Plancher absolu de 1€ par pain (max(1, prix_calcule))
 * 
 * @param {number} age - Âge du pain (0 = frais, 1 = 1 jour, 2 = 2 jours).
 * @param {Object} modificateurs - Facteurs d'ajustement du jour.
 * @param {number} [modificateurs.multiplicateur=1.0] - Facteur multiplicatif (1.0, 1.5, 2.0).
 * @param {number} [modificateurs.bonusPrix=0] - Bonus ou malus en euros (-1, 0, etc.).
 * @returns {number} Prix de vente final en euros pour ce pain individuel.
 */
export function calculerPrixPain(age, { multiplicateur = 1.0, bonusPrix = 0 } = {}) {
  let prixBase = 2;

  if (age === 0) {
    // Pain frais : valeur maximale
    prixBase = randomInt(4, 6);
  } else if (age === 1) {
    // Pain d'hier : valeur intermédiaire
    prixBase = randomInt(3, 4);
  } else if (age === 2) {
    // Pain de deux jours : tarif réduit garanti
    prixBase = 2;
  }

  // Application stricte de la formule du code Python :
  // max(1, int(prix_base * multiplicateur_prix) + bonus_prix)
  const prixAjuste = Math.floor(prixBase * multiplicateur) + bonusPrix;
  return Math.max(1, prixAjuste);
}

/**
 * Exécute l'algorithme complet de vente des pains pour l'action unique du jour.
 * 
 * Règles et priorités respectées :
 * 1. Priorité aux pains les plus anciens (âge 2 d'abord, puis 1, puis frais 0) pour limiter les pertes.
 * 2. Plafond fixé par le nombre de clients encore disponibles aujourd'hui.
 * 3. En cas de grève des boulangers, la capacité d'achat est réduite à la moitié du stock vendable.
 *    (Avec le choix 'meilleur Math' validé par l'utilisateur : Math.ceil(total / 2)).
 * 
 * @param {Object<number, number>} painsParAge - Dictionnaire des stocks { 0: nb, 1: nb, 2: nb, 3: nb }.
 * @param {number} clientsMaxJour - Capacité totale de clients pour la journée.
 * @param {number} painsVendusAujourdhui - Nombre de pains déjà vendus aujourd'hui.
 * @param {Object} [optionsEvenement={}] - Effets actifs aujourd'hui.
 * @returns {Object} Résultat de la vente avec gains, nouveaux stocks et logs détaillés.
 */
export function executerVente(painsParAge, clientsMaxJour, painsVendusAujourdhui, optionsEvenement = {}) {
  const stockCopie = {
    0: Number(painsParAge[0]) || 0,
    1: Number(painsParAge[1]) || 0,
    2: Number(painsParAge[2]) || 0,
    3: Number(painsParAge[3]) || 0
  };

  const totalPainsVendables = stockCopie[0] + stockCopie[1] + stockCopie[2];
  const clientsRestants = clientsMaxJour - painsVendusAujourdhui;

  // Cas impossible : aucun pain vendable en stock
  if (totalPainsVendables <= 0) {
    return {
      succes: false,
      messageErreur: "Plus de pain vendable en stock !",
      painsVendusTotal: 0,
      recetteTotale: 0,
      nouveauxStocks: stockCopie,
      nouveauPainsVendusAujourdhui: painsVendusAujourdhui,
      logsLignes: []
    };
  }

  // Cas impossible : plus aucun client disponible pour cette journée
  if (clientsRestants <= 0) {
    return {
      succes: false,
      messageErreur: "Plus de clients aujourd'hui !",
      painsVendusTotal: 0,
      recetteTotale: 0,
      nouveauxStocks: stockCopie,
      nouveauPainsVendusAujourdhui: painsVendusAujourdhui,
      logsLignes: []
    };
  }

  // Extraction des modificateurs d'événements
  let multiplicateurPrix = 1.0;
  let bonusPrix = 0;
  let venteReduite = false;

  const evenement = optionsEvenement.nomEvenement || null;
  if (evenement === "clients_riches") {
    multiplicateurPrix = 2.0;
  } else if (evenement === "fete_village") {
    multiplicateurPrix = 1.5;
  } else if (evenement === "journee_pluvieuse") {
    bonusPrix = -1;
  } else if (evenement === "greve_boulangers") {
    venteReduite = true;
  }

  // Calcul du plafond de vente (meilleur Math : Math.ceil pour préserver au moins 1 pain en cas de grève)
  const plafondStock = venteReduite ? Math.ceil(totalPainsVendables / 2) : totalPainsVendables;
  const limiteVente = Math.min(clientsRestants, plafondStock);

  let painsVendusTotal = 0;
  let recetteTotale = 0;
  const logsLignes = [];

  const modifs = { multiplicateur: multiplicateurPrix, bonusPrix };

  // Phase 1 : Vente des pains de 2 jours en premier (les plus urgents à écouler)
  while (stockCopie[2] > 0 && painsVendusTotal < limiteVente) {
    const prix = calculerPrixPain(2, modifs);
    recetteTotale += prix;
    stockCopie[2] -= 1;
    painsVendusTotal += 1;
  }

  // Phase 2 : Vente des pains de 1 jour ensuite
  while (stockCopie[1] > 0 && painsVendusTotal < limiteVente) {
    const prix = calculerPrixPain(1, modifs);
    recetteTotale += prix;
    stockCopie[1] -= 1;
    painsVendusTotal += 1;
  }

  // Phase 3 : Vente des pains frais (0 jour) en dernier (meilleure valeur marchande)
  while (stockCopie[0] > 0 && painsVendusTotal < limiteVente) {
    const prix = calculerPrixPain(0, modifs);
    recetteTotale += prix;
    stockCopie[0] -= 1;
    painsVendusTotal += 1;
  }

  const nouveauPainsVendusAujourdhui = painsVendusAujourdhui + painsVendusTotal;
  const clientsFinauxRestants = Math.max(0, clientsMaxJour - nouveauPainsVendusAujourdhui);

  // Message direct adapté dynamiquement au singulier et au pluriel
  const painTexte = painsVendusTotal > 1 ? `${painsVendusTotal} pains vendus` : `${painsVendusTotal} pain vendu`;
  const clientsTexte = clientsFinauxRestants <= 1
    ? `Client restant : ${clientsFinauxRestants}/${clientsMaxJour}`
    : `Clients restants : ${clientsFinauxRestants}/${clientsMaxJour}`;

  logsLignes.push(`✅ ${painTexte} pour un total de ${recetteTotale}€ ! ${clientsTexte}`);

  if (venteReduite && (stockCopie[0] > 0 || stockCopie[1] > 0 || stockCopie[2] > 0)) {
    logsLignes.push("⚠️ Vente limitée par la grève des boulangers !");
  }

  return {
    succes: true,
    painsVendusTotal,
    recetteTotale,
    nouveauxStocks: stockCopie,
    nouveauPainsVendusAujourdhui,
    logsLignes
  };
}

/**
 * Fait vieillir tous les stocks de pain d'un jour lors du passage à la nuit.
 * 
 * Reproduction exacte du comportement original Python (conformément au choix utilisateur #1) :
 * - Capture la valeur initiale de l'âge 3 (qui vaut 0 en flux normal)
 * - Déplace : 2 -> 3, 1 -> 2, 0 -> 1, et remet 0 à zéro
 * - Si pains_jetes > 0, affiche le message
 * - Force ensuite le niveau 3 à zéro
 * 
 * @param {Object<number, number>} painsParAge - Stocks de pains actuels { 0, 1, 2, 3 }.
 * @returns {{ nouveauxStocks: Object<number, number>, painsJetes: number }} Stocks après vieillissement.
 */
export function vieillirPains(painsParAge) {
  const nouveauxStocks = {
    0: Number(painsParAge[0]) || 0,
    1: Number(painsParAge[1]) || 0,
    2: Number(painsParAge[2]) || 0,
    3: Number(painsParAge[3]) || 0
  };

  // Reproduction exacte de la logique originale main.py :
  const painsJetes = nouveauxStocks[3];

  nouveauxStocks[3] = nouveauxStocks[2];
  nouveauxStocks[2] = nouveauxStocks[1];
  nouveauxStocks[1] = nouveauxStocks[0];
  nouveauxStocks[0] = 0;

  // Réinitialisation de la catégorie 3
  nouveauxStocks[3] = 0;

  return {
    nouveauxStocks,
    painsJetes
  };
}
