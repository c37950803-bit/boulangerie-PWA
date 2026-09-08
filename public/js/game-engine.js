/**
 * @file game-engine.js
 * @description Moteur d'état pur pour le jeu de gestion de boulangerie.
 * Encapsule toutes les règles de gestion, les ressources, les transitions de jour/cycle
 * et la validation des actions.
 * CONFORMITÉ STRICTE : AUCUNE manipulation du DOM n'est autorisée dans ce fichier.
 */

import {
  RECETTE_FOURNEE,
  PACK_INGREDIENTS,
  calculerFraisBancaires,
  executerVente,
  vieillirPains,
  randomInt
} from './economy.js';

import {
  tirerEvenementAleatoire,
  appliquerEvenement
} from './events.js';

import {
  sauvegarderPartie,
  chargerPartie,
  supprimerSauvegarde,
  enregistrerScore,
  obtenirMeilleursScores
} from './persistence.js';

/**
 * Classe représentant le moteur de jeu de la boulangerie.
 */
export class BoulangerieEngine {
  /**
   * Initialise une nouvelle partie de boulangerie avec les valeurs par défaut officielles.
   * @param {string} [nom="Boulangerie Emma"] - Nom de la boulangerie.
   */
  constructor(nom = "Boulangerie Emma") {
    this.nom = (nom && nom.trim().length > 0) ? nom.trim() : "Boulangerie Emma";
    
    // Ressources financières initiales (1000€ en liquide, 0€ en banque)
    this.argent = 1000;
    this.argentBanque = 0;
    
    // Cycle et progression temporelle (cycle 1, jour 1, 5 actions)
    this.cycle = 1;
    this.jour = 1;
    this.actionsRestantes = 5;
    
    // Inventaire de départ officiel
    this.inventaire = {
      farine: 50, // kg
      levure: 10, // kg
      sel: 5,     // kg
      eau: 50     // litres / kg
    };
    
    // Stocks de pain classés par tranche d'âge
    this.painsParAge = {
      0: 0, // Frais (produit le jour-même)
      1: 0, // 1 jour (vendable à prix moyen)
      2: 0, // 2 jours (vendable à prix réduit)
      3: 0  // 3+ jours (durs / détruits)
    };
    
    // Paramètres variables quotidiens
    this.clientsMaxJour = randomInt(50, 100);
    this.painsVendusAujourdhui = 0;
    this.evenementJour = null;
    this.fourEnPanne = false;
    this.promotionIngredients = false;
  }

  /**
   * Restaure l'état d'une partie depuis un objet de données désérialisé.
   * @param {Object} donnees - Données issues de la persistance.
   */
  chargerDepuisDonnees(donnees) {
    this.nom = donnees.nom || "Boulangerie Emma";
    this.argent = Number(donnees.argent) || 0;
    this.argentBanque = Number(donnees.argentBanque) || 0;
    this.jour = Number(donnees.jour) || 1;
    this.cycle = Number(donnees.cycle) || 1;
    this.actionsRestantes = Number(donnees.actionsRestantes) || 0;
    this.inventaire = { ...donnees.inventaire };
    this.painsParAge = { ...donnees.painsParAge };
    this.clientsMaxJour = Number(donnees.clientsMaxJour) || 50;
    this.painsVendusAujourdhui = Number(donnees.painsVendusAujourdhui) || 0;
    this.evenementJour = donnees.evenementJour || null;
    this.fourEnPanne = Boolean(donnees.fourEnPanne);
    this.promotionIngredients = Boolean(donnees.promotionIngredients);
  }

  /**
   * Démarre un nouveau jour de commerce : tire une nouvelle affluence de clients.
   * La clientèle et son évolution sont affichées dans le tableau de bord.
   * @returns {string[]} Messages textuels générés.
   */
  initialiserNouveauJour() {
    this.clientsMaxJour = randomInt(50, 100);
    this.painsVendusAujourdhui = 0;
    return [];
  }

  /**
   * Déclenche l'événement aléatoire du jour parmi les 12 disponibles.
   * Met à jour les drapeaux d'état (panne de four, promotion, hold-up, etc.).
   * @returns {{ nomEvenement: string, logs: string[] }} Résultat de l'événement.
   */
  declencherEvenementDuJour() {
    this.fourEnPanne = false;
    this.promotionIngredients = false;

    const nomEvenement = tirerEvenementAleatoire();
    this.evenementJour = nomEvenement;

    const resultat = appliquerEvenement(nomEvenement, {
      argent: this.argent,
      argentBanque: this.argentBanque,
      inventaire: this.inventaire,
      painsParAge: this.painsParAge
    });

    // Application des mutations
    if (resultat.modifications.argentSet !== null) {
      this.argent = resultat.modifications.argentSet;
    } else {
      this.argent = Math.max(0, this.argent + resultat.modifications.argentDelta);
    }

    if (resultat.modifications.fourEnPanne) {
      this.fourEnPanne = true;
    }

    if (resultat.modifications.promotionIngredients) {
      this.promotionIngredients = true;
    }

    if (resultat.modifications.viderPains) {
      this.painsParAge[0] = 0;
      this.painsParAge[1] = 0;
      this.painsParAge[2] = 0;
      this.painsParAge[3] = 0;
    }

    const deltaInv = resultat.modifications.inventaireDelta;
    this.inventaire.farine += deltaInv.farine;
    this.inventaire.levure += deltaInv.levure;
    this.inventaire.sel += deltaInv.sel;
    this.inventaire.eau += deltaInv.eau;

    return {
      nomEvenement,
      logs: resultat.logs
    };
  }

  /**
   * Fabrique une fournée de 30 pains frais si les ingrédients et le four le permettent.
   * Consomme une action UNIQUEMENT en cas de succès (règle validée par l'utilisateur).
   * 
   * @returns {{ succes: boolean, logs: string[] }} Résultat de l'opération.
   */
  fabriquerPain() {
    if (this.actionsRestantes <= 0) {
      return { succes: false, logs: ["❌ Aucune action restante pour aujourd'hui !"] };
    }

    if (this.fourEnPanne) {
      return {
        succes: false,
        logs: ["❌ Le four est en panne! Impossible de fabriquer du pain aujourd'hui!"]
      };
    }

    const aAssez = (
      this.inventaire.farine >= RECETTE_FOURNEE.farine &&
      this.inventaire.levure >= RECETTE_FOURNEE.levure &&
      this.inventaire.sel >= RECETTE_FOURNEE.sel &&
      this.inventaire.eau >= RECETTE_FOURNEE.eau
    );

    if (!aAssez) {
      return {
        succes: false,
        logs: ["❌ Pas assez d'ingrédients!"]
      };
    }

    // Déduction des ingrédients
    this.inventaire.farine -= RECETTE_FOURNEE.farine;
    this.inventaire.levure -= RECETTE_FOURNEE.levure;
    this.inventaire.sel -= RECETTE_FOURNEE.sel;
    this.inventaire.eau -= RECETTE_FOURNEE.eau;

    // Ajout de 30 pains frais (âge 0)
    this.painsParAge[0] += RECETTE_FOURNEE.production;

    // Décompte de l'action réussie
    this.actionsRestantes -= 1;

    return {
      succes: true,
      logs: ["🥖 30 Pains frais fabriqués avec succès!"]
    };
  }

  /**
   * Écoule l'ensemble du stock vendable auprès de la clientèle restante du jour.
   * Consomme une action UNIQUEMENT en cas de succès.
   * 
   * @returns {{ succes: boolean, logs: string[] }} Détail des ventes.
   */
  vendre() {
    if (this.actionsRestantes <= 0) {
      return { succes: false, logs: ["❌ Aucune action restante pour aujourd'hui !"] };
    }

    const resultatVente = executerVente(
      this.painsParAge,
      this.clientsMaxJour,
      this.painsVendusAujourdhui,
      { nomEvenement: this.evenementJour }
    );

    if (!resultatVente.succes) {
      return {
        succes: false,
        logs: [`❌ ${resultatVente.messageErreur}`]
      };
    }

    // Mise à jour de l'état
    this.painsParAge = resultatVente.nouveauxStocks;
    this.painsVendusAujourdhui = resultatVente.nouveauPainsVendusAujourdhui;
    this.argent += resultatVente.recetteTotale;

    // Décompte de l'action réussie
    this.actionsRestantes -= 1;

    return {
      succes: true,
      logs: resultatVente.logsLignes,
      argentGagne: resultatVente.recetteTotale
    };
  }

  /**
   * Achète un pack d'ingrédients auprès du meunier.
   * Coûte 20€ en temps normal, ou 10€ en cas de promotion active.
   * Consomme une action UNIQUEMENT en cas de succès.
   * 
   * @returns {{ succes: boolean, logs: string[] }} Résultat de l'achat.
   */
  acheterIngredients() {
    if (this.actionsRestantes <= 0) {
      return { succes: false, logs: ["❌ Aucune action restante pour aujourd'hui !"] };
    }

    let cout = PACK_INGREDIENTS.coutStandard;
    const logs = [];

    if (this.promotionIngredients) {
      cout = PACK_INGREDIENTS.coutPromotion;
    }

    if (this.argent < cout) {
      logs.push("❌ Pas assez d'argent !");
      return { succes: false, logs };
    }

    // Paiement et livraison
    this.argent -= cout;
    this.inventaire.farine += PACK_INGREDIENTS.farine;
    this.inventaire.levure += PACK_INGREDIENTS.levure;
    this.inventaire.sel += PACK_INGREDIENTS.sel;
    this.inventaire.eau += PACK_INGREDIENTS.eau;

    if (this.promotionIngredients) {
      logs.push(`📦 Ingrédients achetés en promotion (-${cout}€)`);
    } else {
      logs.push(`📦 Ingrédients achetés (-${cout}€)`);
    }
    this.actionsRestantes -= 1;

    return { succes: true, logs };
  }

  /**
   * Dépose une partie de l'argent liquide à la banque sécurisée.
   * Applique 10% de frais bancaires arrondis au supérieur (Math.ceil).
   * Protège contre le hold-up. Consomme une action UNIQUEMENT si le dépôt est validé.
   * 
   * @param {number} montant - Montant brut à transférer.
   * @returns {{ succes: boolean, logs: string[] }} Compte-rendu du versement.
   */
  mettreArgentBanque(montant) {
    if (this.actionsRestantes <= 0) {
      return { succes: false, logs: ["❌ Aucune action restante pour aujourd'hui !"] };
    }

    if (this.argent <= 0) {
      return { succes: false, logs: ["❌ Vous n'avez pas d'argent à déposer!"] };
    }

    if (typeof montant !== 'number' || isNaN(montant) || montant <= 0) {
      return { succes: false, logs: ["❌ Opération annulée"] };
    }

    if (montant > this.argent) {
      return { succes: false, logs: ["❌ Vous n'avez pas assez d'argent!"] };
    }

    const { frais, montantNet } = calculerFraisBancaires(montant);

    this.argent -= montant;
    this.argentBanque += montantNet;
    this.actionsRestantes -= 1;

    const logs = [
      "🏦 Dépôt effectué!",
      `   Montant déposé: ${montant}€`,
      `   Frais bancaires (10%): ${frais}€`,
      `   Ajouté en banque: ${montantNet}€`,
      `   💰 Argent liquide restant: ${this.argent}€`,
      `   🏦 Total en banque: ${this.argentBanque}€`
    ];

    return { succes: true, logs };
  }

  /**
   * Termine la journée en cours : vieillit le pain, incrémente le jour et réinitialise les actions.
   * Ne consomme pas d'action (commande spéciale de passage de tour).
   * 
   * @returns {{ finCycle: boolean, logs: string[] }} Compte-rendu de la nuit.
   */
  terminerJournee() {
    const logs = ["🌙 Fin de la journée..."];

    // Vieillissement des pains (reproduction exacte du code Python original)
    const resVieillissement = vieillirPains(this.painsParAge);
    this.painsParAge = resVieillissement.nouveauxStocks;
    if (resVieillissement.painsJetes > 0) {
      const labelPainsJetes = resVieillissement.painsJetes > 1
        ? `${resVieillissement.painsJetes} pains durs jetés (périmés)`
        : `${resVieillissement.painsJetes} pain dur jeté (périmé)`;
      logs.push(`🗑️ ${labelPainsJetes}`);
    }

    this.jour += 1;
    this.actionsRestantes = 5;
    this.evenementJour = null;
    this.fourEnPanne = false;
    this.promotionIngredients = false;
    this.painsVendusAujourdhui = 0;

    const finCycle = this.jour > 7;

    if (!finCycle) {
      logs.push(`=== Début du jour ${this.jour}/7 ===`);
    }

    return { finCycle, logs };
  }

  /**
   * Calcule le bilan économique et le score final du cycle terminé.
   * Score = (Argent liquide + Argent en banque) - 1000€.
   * 
   * @returns {{ argentLiquide: number, argentBanque: number, argentTotal: number, scoreFinal: number, cycle: number }}
   */
  obtenirBilanCycle() {
    const argentTotal = this.argent + this.argentBanque;
    const scoreFinal = argentTotal - 1000;
    return {
      argentLiquide: this.argent,
      argentBanque: this.argentBanque,
      argentTotal,
      scoreFinal,
      cycle: this.cycle
    };
  }

  /**
   * Enchaîne sur un nouveau cycle de 7 jours en conservant l'intégralité des ressources et de l'argent.
   * @returns {string[]} Messages d'introduction du nouveau cycle.
   */
  demarrerNouveauCycle() {
    this.cycle += 1;
    this.jour = 1;
    this.actionsRestantes = 5;
    this.painsVendusAujourdhui = 0;
    this.clientsMaxJour = randomInt(50, 100);
    this.evenementJour = null;
    this.fourEnPanne = false;
    this.promotionIngredients = false;

    return [
      "🎉 Nouveau cycle commence!",
      "Vos ressources et votre argent sont conservés.",
      `Cycle ${this.cycle} - Jour 1/7`
    ];
  }

  /**
   * Termine définitivement la partie, enregistre le score dans l'historique et purge la sauvegarde.
   * @returns {{ scoreLigne: string, scoreFinal: number }}
   */
  clorePartieEtEnregistrerScore() {
    const bilan = this.obtenirBilanCycle();
    const scoreLigne = enregistrerScore(this.nom, this.cycle, bilan.scoreFinal);
    supprimerSauvegarde();
    return { scoreLigne, scoreFinal: bilan.scoreFinal };
  }

  /**
   * Génère les lignes textuelles du statut complet actuel (équivalent afficher_status()).
   * @returns {string[]} Lignes de statut pour le terminal.
   */
  genererLignesStatus() {
    const labelAction = this.actionsRestantes <= 1 ? "Action restante aujourd'hui" : "Actions restantes aujourd'hui";
    const labelClient = this.painsVendusAujourdhui <= 1 ? "Client servi" : "Clients servis";
    const lignes = [
      `=== ${this.nom} ===`,
      `🔄 Cycle: ${this.cycle}`,
      `📅 Jour: ${this.jour}/7`,
      `🎯 ${labelAction}: ${this.actionsRestantes}`,
      `💶 Argent liquide: ${this.argent}€`,
      `🏦 Argent en banque: ${this.argentBanque}€`,
      `💰 Total: ${this.argent + this.argentBanque}€`,
      `👥 ${labelClient}: ${this.painsVendusAujourdhui}/${this.clientsMaxJour}`,
      "",
      "📝 Inventaire:",
      `- farine: ${this.inventaire.farine} kg`,
      `- levure: ${this.inventaire.levure} kg`,
      `- sel: ${this.inventaire.sel} kg`,
      `- eau: ${this.inventaire.eau} L`,
      "",
      "🥖 Stock de pains:",
      `- Frais (0 jour): ${this.painsParAge[0]}`,
      `- 1 jour: ${this.painsParAge[1]}`,
      `- 2 jours: ${this.painsParAge[2]}`
    ];

    if (this.painsParAge[3] > 0) {
      lignes.push(`- Durs (à jeter): ${this.painsParAge[3]}`);
    }

    lignes.push("=======================");
    return lignes;
  }
}
