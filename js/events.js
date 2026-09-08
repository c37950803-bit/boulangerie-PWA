/**
 * @file events.js
 * @description Définition et résolution des 12 événements aléatoires quotidiens.
 * Reproduit fidèlement la logique et les messages textuels du jeu de gestion de boulangerie original.
 * Module pur sans accès DOM.
 */

/**
 * Liste exhaustive des 12 événements aléatoires équiprobables du jeu.
 */
export const LISTE_EVENEMENTS = Object.freeze([
  "jour_ordinaire",
  "attaque_pigeons",
  "clients_riches",
  "hold_up",
  "critique_culinaire",
  "panne_four",
  "livraison_gratuite",
  "fete_village",
  "greve_boulangers",
  "inspecteur_sanitaire",
  "promotion_ingredients",
  "journee_pluvieuse"
]);

/**
 * Métadonnées descriptives de chaque événement (titre, icône, description).
 */
export const DETAILS_EVENEMENTS = Object.freeze({
  jour_ordinaire: {
    icone: "☀️",
    titre: "Jour ordinaire",
    description: "Rien de spécial aujourd'hui."
  },
  attaque_pigeons: {
    icone: "🐦",
    titre: "Attaque de pigeons !",
    description: "Les pigeons ont pillé tous vos stocks de pain !"
  },
  clients_riches: {
    icone: "💎",
    titre: "Clients riches !",
    description: "Des clients fortunés sont en ville - ils paient le double !"
  },
  hold_up: {
    icone: "🔫",
    titre: "Hold-up !",
    description: "Des bandits attaquent votre boulangerie !"
  },
  critique_culinaire: {
    icone: "⭐",
    titre: "Critique culinaire !",
    description: "Un critique a adoré votre pain ! Bonus de 100€."
  },
  panne_four: {
    icone: "🔧",
    titre: "Panne de four !",
    description: "Votre four est en panne - impossible de fabriquer du pain aujourd'hui."
  },
  livraison_gratuite: {
    icone: "🎁",
    titre: "Livraison gratuite !",
    description: "Un fournisseur vous offre des ingrédients !"
  },
  fete_village: {
    icone: "🎊",
    titre: "Fête du village !",
    description: "C'est la fête ! Les prix de vente sont augmentés de 50%."
  },
  greve_boulangers: {
    icone: "✊",
    titre: "Grève des boulangers !",
    description: "Les clients boycottent - ils n'achètent que la moitié des pains."
  },
  inspecteur_sanitaire: {
    icone: "👮",
    titre: "Inspecteur sanitaire !",
    description: "Contrôle surprise ! Amende de 50€."
  },
  promotion_ingredients: {
    icone: "🏷️",
    titre: "Promotion ingrédients !",
    description: "Le fournisseur fait -50% aujourd'hui sur les packs d'ingrédients !"
  },
  journee_pluvieuse: {
    icone: "🌧️",
    titre: "Journée pluvieuse !",
    description: "Peu de clients - les prix de vente baissent de 1€."
  }
});

/**
 * Tire au sort un événement parmi les 12 avec équiprobabilité stricte (1/12 de chance chacun).
 * @returns {string} Identifiant de l'événement tiré.
 */
export function tirerEvenementAleatoire() {
  const index = Math.floor(Math.random() * LISTE_EVENEMENTS.length);
  return LISTE_EVENEMENTS[index];
}

/**
 * Applique les conséquences immédiates d'un événement sur l'état du jeu.
 * Génère les lignes de texte exactes conformes au terminal Python de référence.
 * 
 * @param {string} nomEvenement - Nom de l'événement à déclencher.
 * @param {Object} etat - Snapshot de l'état actuel de la boulangerie.
 * @param {number} etat.argent - Argent liquide actuel.
 * @param {number} etat.argentBanque - Argent placé en banque.
 * @param {Object} etat.inventaire - Quantités d'ingrédients.
 * @param {Object} etat.painsParAge - Stocks de pain par tranche d'âge.
 * @returns {Object} Modifications apportées et liste ordonnée des messages à afficher.
 */
export function appliquerEvenement(nomEvenement, etat) {
  const modifications = {
    argentDelta: 0,
    argentSet: null,
    fourEnPanne: false,
    promotionIngredients: false,
    inventaireDelta: { farine: 0, levure: 0, sel: 0, eau: 0 },
    viderPains: false
  };

  const logs = [];
  logs.push("==================================================");
  logs.push("🎲 ÉVÉNEMENT DU JOUR 🎲");
  logs.push("==================================================");

  switch (nomEvenement) {
    case "jour_ordinaire":
      logs.push("☀️ Jour ordinaire - Rien de spécial aujourd'hui");
      break;

    case "attaque_pigeons":
      logs.push("🐦 ATTAQUE DE PIGEONS !");
      logs.push("Les pigeons ont pillé tous vos stocks de pain !");
      modifications.viderPains = true;
      break;

    case "clients_riches":
      logs.push("💎 CLIENTS RICHES !");
      logs.push("Des clients fortunés sont en ville - ils paient le double !");
      // Les prix doublés seront calculés lors de l'action de vente
      break;

    case "hold_up":
      logs.push("🔫 HOLD UP !");
      if (etat.argent > 0) {
        logs.push(`Des bandits ont volé tout votre argent liquide (${etat.argent}€) !`);
        if (etat.argentBanque > 0) {
          logs.push(`🏦 Heureusement, vos ${etat.argentBanque}€ en banque sont en sécurité !`);
        }
        modifications.argentSet = 0;
      } else {
        logs.push("Des bandits tentent de vous voler mais vous n'avez pas d'argent liquide !");
        if (etat.argentBanque > 0) {
          logs.push(`🏦 Vos ${etat.argentBanque}€ en banque sont en sécurité !`);
        }
      }
      break;

    case "critique_culinaire":
      logs.push("⭐ CRITIQUE CULINAIRE !");
      logs.push("Un critique a adoré votre pain ! Bonus de 100€");
      modifications.argentDelta = +100;
      break;

    case "panne_four":
      logs.push("🔧 PANNE DE FOUR !");
      logs.push("Votre four est en panne - impossible de fabriquer du pain aujourd'hui");
      modifications.fourEnPanne = true;
      break;

    case "livraison_gratuite":
      logs.push("🎁 LIVRAISON GRATUITE !");
      logs.push("Un fournisseur vous offre des ingrédients !");
      modifications.inventaireDelta = {
        farine: 25,
        levure: 5,
        sel: 3,
        eau: 20
      };
      break;

    case "fete_village":
      logs.push("🎊 FÊTE DU VILLAGE !");
      logs.push("C'est la fête ! Les prix de vente sont augmentés de 50%");
      // Le bonus +50% est pris en compte lors de l'action de vente
      break;

    case "greve_boulangers":
      logs.push("✊ GRÈVE DES BOULANGERS !");
      logs.push("Les clients boycottent - ils n'achètent que la moitié des pains");
      // La limite de vente divisée par deux est gérée lors de la vente
      break;

    case "inspecteur_sanitaire":
      logs.push("👮 INSPECTEUR SANITAIRE !");
      logs.push("Contrôle surprise ! Amende de 50€");
      // Plancher à 0€ si le solde est inférieur à 50€
      const amendeReelle = Math.min(etat.argent, 50);
      modifications.argentDelta = -amendeReelle;
      break;

    case "promotion_ingredients":
      logs.push("🏷️ PROMOTION SUR LES INGRÉDIENTS !");
      logs.push("Le fournisseur fait -50% aujourd'hui !");
      modifications.promotionIngredients = true;
      break;

    case "journee_pluvieuse":
      logs.push("🌧️ JOURNÉE PLUVIEUSE !");
      logs.push("Peu de clients - les prix de vente baissent de 1€");
      // Le malus de 1€ est appliqué lors de la vente
      break;

    default:
      logs.push("☀️ Jour ordinaire - Rien de spécial aujourd'hui");
      break;
  }

  logs.push("==================================================");

  return {
    nomEvenement,
    modifications,
    logs
  };
}
