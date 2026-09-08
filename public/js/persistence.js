/**
 * @file persistence.js
 * @description Module de gestion de la persistance locale (équivalents sauvegarde.json et scores.txt).
 * Utilise l'API Web Storage (localStorage) du navigateur pour permettre la reprise d'une partie
 * en cours et la consultation du classement des meilleurs scores.
 * Module pur sans manipulation directe du DOM.
 */

const CLE_SAUVEGARDE = 'boulangerie_sauvegarde_v1';
const CLE_SCORES = 'boulangerie_scores_v1';

/**
 * Scores initiaux pré-remplis issus du fichier scores.txt original.
 */
const SCORES_PAR_DEFAUT = [
  "Boulangerie Papa: 2537€",
  "2025-10-22 20:48 | Boulangerie Zoe: 368€"
];

/**
 * Sauvegarde l'état complet de la boulangerie dans le localStorage.
 * La structure reproduit strictement le format JSON du jeu Python original.
 * 
 * @param {Object} etat - Données complètes de la partie en cours.
 * @returns {boolean} True si la sauvegarde a réussi, false sinon.
 */
export function sauvegarderPartie(etat) {
  try {
    const donneesJSON = JSON.stringify({
      nom: etat.nom,
      argent: etat.argent,
      argent_banque: etat.argentBanque,
      jour: etat.jour,
      cycle: etat.cycle || 1,
      actions_restantes: etat.actionsRestantes,
      inventaire: { ...etat.inventaire },
      pains_par_age: {
        0: Number(etat.painsParAge[0]) || 0,
        1: Number(etat.painsParAge[1]) || 0,
        2: Number(etat.painsParAge[2]) || 0,
        3: Number(etat.painsParAge[3]) || 0
      },
      clients_max_jour: etat.clientsMaxJour,
      pains_vendus_aujourd_hui: etat.painsVendusAujourdhui,
      evenement_jour: etat.evenementJour,
      four_en_panne: Boolean(etat.fourEnPanne),
      promotion_ingredients: Boolean(etat.promotionIngredients)
    }, null, 2);

    localStorage.setItem(CLE_SAUVEGARDE, donneesJSON);
    return true;
  } catch (erreur) {
    console.error("[Persistence] Échec lors de la sauvegarde :", erreur);
    return false;
  }
}

/**
 * Vérifie si une partie sauvegardée existe actuellement dans le stockage.
 * @returns {boolean} True si une sauvegarde valide est présente.
 */
export function aUneSauvegarde() {
  try {
    const brut = localStorage.getItem(CLE_SAUVEGARDE);
    return brut !== null && brut.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Charge les données de la partie sauvegardée.
 * 
 * @returns {Object|null} État complet de la boulangerie ou null en cas d'absence.
 */
export function chargerPartie() {
  try {
    const brut = localStorage.getItem(CLE_SAUVEGARDE);
    if (!brut) return null;

    const data = JSON.parse(brut);
    return {
      nom: data.nom || "Boulangerie Emma",
      argent: Number(data.argent) || 0,
      argentBanque: Number(data.argent_banque) || 0,
      jour: Number(data.jour) || 1,
      cycle: Number(data.cycle) || 1,
      actionsRestantes: Number(data.actions_restantes) || 0,
      inventaire: {
        farine: Number(data.inventaire?.farine) || 0,
        levure: Number(data.inventaire?.levure) || 0,
        sel: Number(data.inventaire?.sel) || 0,
        eau: Number(data.inventaire?.eau) || 0
      },
      painsParAge: {
        0: Number(data.pains_par_age?.['0']) || 0,
        1: Number(data.pains_par_age?.['1']) || 0,
        2: Number(data.pains_par_age?.['2']) || 0,
        3: Number(data.pains_par_age?.['3']) || 0
      },
      clientsMaxJour: Number(data.clients_max_jour) || 50,
      painsVendusAujourdhui: Number(data.pains_vendus_aujourd_hui) || 0,
      evenementJour: data.evenement_jour || null,
      fourEnPanne: Boolean(data.four_en_panne),
      promotionIngredients: Boolean(data.promotion_ingredients)
    };
  } catch (erreur) {
    console.error("[Persistence] Erreur de lecture de la sauvegarde :", erreur);
    return null;
  }
}

/**
 * Supprime la sauvegarde en cours (appelé à la fin d'une partie terminée).
 */
export function supprimerSauvegarde() {
  try {
    localStorage.removeItem(CLE_SAUVEGARDE);
  } catch (erreur) {
    console.error("[Persistence] Erreur lors de la suppression de la sauvegarde :", erreur);
  }
}

/**
 * Réinitialise complètement toutes les données locales (sauvegarde et scores) pour recommencer à zéro.
 */
export function reinitialiserTout() {
  try {
    localStorage.removeItem(CLE_SAUVEGARDE);
    localStorage.removeItem(CLE_SCORES);
    return true;
  } catch (erreur) {
    console.error("[Persistence] Erreur lors de la réinitialisation totale :", erreur);
    return false;
  }
}

/**
 * Formate la date actuelle au format Python : "YYYY-MM-DD HH:mm".
 * @returns {string} Chaîne date et heure locale.
 */
function formaterDateActuelle() {
  const m = new Date();
  const annee = m.getFullYear();
  const mois = String(m.getMonth() + 1).padStart(2, '0');
  const jour = String(m.getDate()).padStart(2, '0');
  const heures = String(m.getHours()).padStart(2, '0');
  const minutes = String(m.getMinutes()).padStart(2, '0');
  return `${annee}-${mois}-${jour} ${heures}:${minutes}`;
}

/**
 * Enregistre un nouveau score à la fin d'une partie (équivalent d'un append dans scores.txt).
 * 
 * @param {string} nom - Nom de la boulangerie.
 * @param {number} cycle - Dernier cycle atteint.
 * @param {number} scoreFinal - Score calculé (argent total - 1000€).
 */
export function enregistrerScore(nom, cycle, scoreFinal) {
  try {
    const dateStr = formaterDateActuelle();
    const nouvelleLigne = `${dateStr} | ${nom} (Cycle ${cycle}): ${scoreFinal}€`;

    const lignes = chargerLignesScores();
    lignes.push(nouvelleLigne);

    localStorage.setItem(CLE_SCORES, JSON.stringify(lignes));
    return nouvelleLigne;
  } catch (erreur) {
    console.error("[Persistence] Erreur lors de l'enregistrement du score :", erreur);
    return null;
  }
}

/**
 * Récupère la liste brute des lignes de scores sauvegardées.
 * @returns {string[]} Tableau de lignes textuelles de scores.
 */
function chargerLignesScores() {
  try {
    const brut = localStorage.getItem(CLE_SCORES);
    if (!brut) {
      // Première initialisation avec les scores historiques par défaut
      localStorage.setItem(CLE_SCORES, JSON.stringify(SCORES_PAR_DEFAUT));
      return [...SCORES_PAR_DEFAUT];
    }
    const parse = JSON.parse(brut);
    return Array.isArray(parse) ? parse : [...SCORES_PAR_DEFAUT];
  } catch {
    return [...SCORES_PAR_DEFAUT];
  }
}

/**
 * Récupère et trie le classement des meilleurs scores par ordre décroissant (Top 10).
 * Reproduit scrupuleusement la logique de parsing et tri du code Python :
 * - Gestion du format moderne avec date : "YYYY-MM-DD HH:mm | Nom (Cycle X): Score€"
 * - Gestion de l'ancien format sans date : "Nom: Score€"
 * 
 * @returns {Array<{ ligne: string, score: number }>} Liste triée des meilleurs scores (max 10).
 */
export function obtenirMeilleursScores() {
  const lignes = chargerLignesScores();
  const scoresTries = [];

  for (const ligne of lignes) {
    if (!ligne || typeof ligne !== 'string') continue;
    const nettoye = ligne.trim();
    if (!nettoye) continue;

    try {
      const parties = nettoye.split('|');
      let scoreVal = 0;

      if (parties.length >= 2) {
        // Format moderne avec date
        const info = parties[1].trim();
        const morceaux = info.split(':');
        if (morceaux.length >= 2) {
          const scoreStr = morceaux[1].trim().replace('€', '').trim();
          scoreVal = parseInt(scoreStr, 10);
        }
      } else {
        // Format simple sans séparateur pipe
        const morceaux = nettoye.split(':');
        if (morceaux.length >= 2) {
          const scoreStr = morceaux[1].trim().replace('€', '').trim();
          scoreVal = parseInt(scoreStr, 10);
        }
      }

      if (!isNaN(scoreVal)) {
        scoresTries.push({ ligne: nettoye, score: scoreVal });
      }
    } catch {
      // Ignore les lignes corrompues conformément au 'except: continue' de Python
      continue;
    }
  }

  // Tri décroissant sur la valeur numérique du score
  scoresTries.sort((a, b) => b.score - a.score);

  // Top 10 uniquement
  return scoresTries.slice(0, 10);
}
