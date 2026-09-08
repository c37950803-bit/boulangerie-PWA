/**
 * @file main.js
 * @description Orchestrateur principal de la PWA Boulangerie.
 * Coordonne le cycle de vie de l'application, l'écran d'accueil style console/Android,
 * les dialogues interactifs, le moteur de jeu fidèle aux règles d'origine,
 * et la persistance locale 100% hors-ligne.
 */

import { BoulangerieEngine } from './game-engine.js';
import { TerminalUI } from './ui-terminal.js';
import {
  aUneSauvegarde,
  chargerPartie,
  sauvegarderPartie,
  supprimerSauvegarde,
  obtenirMeilleursScores,
  reinitialiserTout
} from './persistence.js';

class ApplicationBoulangerie {
  constructor() {
    this.engine = new BoulangerieEngine();
    this.ui = null;
    this.deferredPrompt = null;
    this.partieEnCours = false;
  }

  /**
   * Initialise l'application, enregistre le Service Worker et affiche l'écran d'accueil.
   */
  async demarrer() {
    this._enregistrerServiceWorker();
    this._initialiserGestionnaireInstallationPWA();

    // Initialisation de l'interface utilisateur
    this.ui = new TerminalUI({
      onPlay: () => this._surClicJouer(),
      onViewScores: () => this._surVoirScores(),
      onResetAll: () => this._surReinitialiserTout(),
      onPauseMenu: () => this._surOuvrirMenuPause(),
      onInstallPwa: () => this.installerPWA(),

      // 5 Actions de jeu épurées (le statut est désormais affiché en direct en permanence)
      fabriquer: () => this.actionFabriquer(),
      vendre: () => this.actionVendre(),
      acheter: () => this.actionAcheter(),
      banque: () => this.actionBanque(),
      finJournee: () => this.actionFinJournee()
    });

    // Afficher l'écran d'accueil console dès le lancement
    this._rafraichirEcranAccueil();
  }

  /**
   * Rafraîchit les infos de l'écran d'accueil (sauvegarde existante ou non).
   * @private
   */
  _rafraichirEcranAccueil() {
    let sauvegarde = null;
    if (aUneSauvegarde()) {
      sauvegarde = chargerPartie();
    }
    this.ui.afficherAccueil(sauvegarde);
  }

  /**
   * Clic sur "JOUER" depuis l'écran d'accueil.
   * @private
   */
  async _surClicJouer() {
    if (aUneSauvegarde()) {
      const sauvegarde = chargerPartie();
      if (sauvegarde) {
        const choix = await this.ui.afficherDialogueDemarrage(sauvegarde);
        if (choix === 'charger') {
          this.engine.chargerDepuisDonnees(sauvegarde);
          await this._lancerPartie(true);
          return;
        } else if (choix === 'nouveau') {
          await this._creerNouvellePartie();
          return;
        } else {
          // Annulé, reste sur l'accueil
          return;
        }
      }
    }

    // Aucune sauvegarde existante : création immédiate
    await this._creerNouvellePartie();
  }

  /**
   * Crée une nouvelle boulangerie avec invite de nom tactile robuste.
   * @private
   */
  async _creerNouvellePartie() {
    const nomChoisi = await this.ui.afficherDialogueNomBoulangerie();
    this.engine = new BoulangerieEngine(nomChoisi);
    supprimerSauvegarde();
    await this._lancerPartie(false);
  }

  /**
   * Lance l'écran de jeu, initialise la machine à écrire et déroule la journée.
   * @param {boolean} estReprise
   * @private
   */
  async _lancerPartie(estReprise = false) {
    this.partieEnCours = true;
    this.ui.afficherJeu(this.engine.nom);
    this.ui.effacer();
    this.ui.setControlesActifs(false);

    if (estReprise) {
      await this.ui.print([
        "╔═══════════════════════════════════════════════╗",
        `║  🥖  ${this.engine.nom.toUpperCase().padEnd(38, ' ')}  ║`,
        "║  Simulation & Gestion Artisanale de Fournil   ║",
        "╚═══════════════════════════════════════════════╝",
        "",
        `✅ Partie reprise : Cycle ${this.engine.cycle}, Jour ${this.engine.jour}/7`,
        `💶 Caisse : ${this.engine.argent}€ • 🏦 Banque : ${this.engine.argentBanque}€`,
        `🎯 ${this.engine.actionsRestantes <= 1 ? "Action restante aujourd'hui" : "Actions restantes aujourd'hui"} : ${this.engine.actionsRestantes}/5`,
        ""
      ]);
      this.ui.mettreAJourHUD(this.engine);
      this.ui.setControlesActifs(true);
    } else {
      await this.ui.print([
        "╔═══════════════════════════════════════════════╗",
        `║  🥖  ${this.engine.nom.toUpperCase().padEnd(38, ' ')}  ║`,
        "║  Bienvenue au fournil !                       ║",
        "╚═══════════════════════════════════════════════╝",
        "",
        "🎯 Votre objectif : Bâtir le fournil le plus rentable en 7 jours.",
        "📦 Votre inventaire en haut se met à jour automatiquement à chaque geste.",
        ""
      ]);

      await this._commencerNouveauJour();
    }
  }

  /**
   * Ouvre la modale des scores.
   * @private
   */
  _surVoirScores() {
    const topScores = obtenirMeilleursScores();
    this.ui.afficherDialogueScores(topScores);
  }

  /**
   * Réinitialise totalement les données (sauvegarde et scores) avec confirmation.
   * @private
   */
  async _surReinitialiserTout() {
    const confirmer = await this.ui.afficherDialogueConfirmation({
      titre: "⚠️ RECOMMENCER TOUT À ZÉRO",
      description: `
        <p>Cette action va supprimer définitivement :</p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Votre partie en cours et son état sauvegardé.</li>
          <li>L'ensemble des records et du classement des scores.</li>
        </ul>
        <p>Êtes-vous certain de vouloir tout réinitialiser ?</p>
      `,
      danger: true,
      boutonTexte: "Tout effacer"
    });

    if (confirmer) {
      reinitialiserTout();
      this.engine = new BoulangerieEngine();
      this.partieEnCours = false;
      this._rafraichirEcranAccueil();
      this.ui.jouerSon('success');
    }
  }

  /**
   * Ouvre le menu de pause en cours de partie.
   * @private
   */
  async _surOuvrirMenuPause() {
    if (!this.partieEnCours) return;

    // Sauvegarde automatique de l'état
    this._sauvegarderEtatCourant();

    const info = {
      nom: this.engine.nom,
      cycle: this.engine.cycle,
      jour: this.engine.jour,
      argent: this.engine.argent,
      argentBanque: this.engine.argentBanque
    };

    const action = await this.ui.afficherMenuPause(info);

    if (action === 'quitter') {
      this._sauvegarderEtatCourant();
      this.partieEnCours = false;
      this._rafraichirEcranAccueil();
    } else if (action === 'regles') {
      this.ui.afficherDialogueRegles();
    } else if (action === 'recommencer') {
      const confirmation = await this.ui.afficherDialogueConfirmation({
        titre: "🔄 RECOMMENCER UNE NOUVELLE PARTIE",
        description: "Voulez-vous abandonner cette partie et en recommencer une nouvelle à zéro ?",
        danger: true,
        boutonTexte: "Recommencer"
      });
      if (confirmation) {
        supprimerSauvegarde();
        await this._creerNouvellePartie();
      }
    }
  }

  /**
   * Sauvegarde rapide de l'état courant.
   * @private
   */
  _sauvegarderEtatCourant() {
    sauvegarderPartie({
      nom: this.engine.nom,
      argent: this.engine.argent,
      argentBanque: this.engine.argentBanque,
      jour: this.engine.jour,
      cycle: this.engine.cycle,
      actionsRestantes: this.engine.actionsRestantes,
      inventaire: this.engine.inventaire,
      painsParAge: this.engine.painsParAge,
      clientsMaxJour: this.engine.clientsMaxJour,
      painsVendusAujourdhui: this.engine.painsVendusAujourdhui,
      evenementJour: this.engine.evenementJour,
      fourEnPanne: this.engine.fourEnPanne,
      promotionIngredients: this.engine.promotionIngredients
    });
  }

  /**
   * Enregistre le Service Worker pour le support 100% hors-ligne de la PWA.
   * @private
   */
  _enregistrerServiceWorker() {
    if ('serviceWorker' in navigator) {
      // Purger immédiatement les anciens caches obsolètes (v1)
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            if (name === 'boulangerie-pwa-v1') {
              caches.delete(name);
            }
          });
        });
      }

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((reg) => {
            console.log('[PWA] Service Worker enregistré avec succès sur le scope :', reg.scope);
            // Vérifier et forcer la mise à jour immédiate
            reg.update();
          })
          .catch((err) => {
            console.warn('[PWA] Échec enregistrement Service Worker :', err);
          });
      });
    }
  }

  /**
   * Capture l'événement d'installation PWA (Android / Desktop Chrome).
   * @private
   */
  _initialiserGestionnaireInstallationPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.ui?.afficherBannierePwa();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.ui?.masquerBannierePwa();
      console.log('[PWA] Application installée avec succès !');
    });
  }

  /**
   * Déclenche la boîte d'installation native de la PWA au clic utilisateur.
   */
  async installerPWA() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`[PWA] Choix d'installation : ${outcome}`);
    this.deferredPrompt = null;
    this.ui?.masquerBannierePwa();
  }

  /**
   * Déroule le début d'une nouvelle journée (tirage clients et événement aléatoire).
   * @private
   */
  async _commencerNouveauJour() {
    this.ui.setControlesActifs(false);

    // Initialisation de la clientèle du jour (suivie en temps réel dans le tableau de bord)
    this.engine.initialiserNouveauJour();

    // Déclenchement de l'événement aléatoire quotidien
    const resEvenement = this.engine.declencherEvenementDuJour();
    await this.ui.print(resEvenement.logs);

    this.ui.mettreAJourHUD(this.engine);
    this._sauvegarderEtatCourant();
    this.ui.setControlesActifs(true);
  }

  /* ══════════════════════════════════════════════════════════════════════
     5 ACTIONS DU FOURNIL (RÉALISÉES ET DÉCOMPTÉES UNIQUEMENT EN CAS DE SUCCÈS)
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Action 1 : Fabriquer du pain (+30 pains si ingrédients suffisants).
   */
  async actionFabriquer() {
    if (!this.partieEnCours) return;
    this.ui.setControlesActifs(false);
    await this.ui.print("> Fabriquer du pain", "cmd");

    const resultat = this.engine.fabriquerPain();
    if (resultat.succes) {
      this.ui.jouerSon('success');
    } else {
      this.ui.jouerSon('error');
    }
    await this.ui.print(resultat.logs);

    this.ui.mettreAJourHUD(this.engine);
    this._sauvegarderEtatCourant();
    this.ui.setControlesActifs(true);

    if (this.engine.actionsRestantes <= 0) {
      await this._gererFinJournee();
    }
  }

  /**
   * Action 2 : Vendre les pains disponibles selon la clientèle restante.
   */
  async actionVendre() {
    if (!this.partieEnCours) return;
    this.ui.setControlesActifs(false);

    const resultat = this.engine.vendre();
    if (resultat.argentGagne > 0) {
      this.ui.jouerSon('cash');
    } else {
      this.ui.jouerSon('error');
    }
    await this.ui.print(resultat.logs);

    this.ui.mettreAJourHUD(this.engine);
    this._sauvegarderEtatCourant();
    this.ui.setControlesActifs(true);

    if (this.engine.actionsRestantes <= 0) {
      await this._gererFinJournee();
    }
  }

  /**
   * Action 3 : Acheter un pack d'ingrédients (+50 farine, +10 levure, +5 sel, +50 eau).
   */
  async actionAcheter() {
    if (!this.partieEnCours) return;
    this.ui.setControlesActifs(false);
    await this.ui.print("> Acheter des ingrédients", "cmd");

    const resultat = this.engine.acheterIngredients();
    if (resultat.succes) {
      this.ui.jouerSon('success');
    } else {
      this.ui.jouerSon('error');
    }
    await this.ui.print(resultat.logs);

    this.ui.mettreAJourHUD(this.engine);
    this._sauvegarderEtatCourant();
    this.ui.setControlesActifs(true);

    if (this.engine.actionsRestantes <= 0) {
      await this._gererFinJournee();
    }
  }

  /**
   * Action 4 : Déposer de l'argent à la banque (frais 10% arrondis au supérieur).
   */
  async actionBanque() {
    if (!this.partieEnCours) return;
    if (this.engine.argent <= 0) {
      await this.ui.print("> Mettre l'argent en banque", "cmd");
      await this.ui.print("❌ Vous n'avez pas d'argent liquide à déposer !");
      this.ui.jouerSon('error');
      return;
    }

    const montant = await this.ui.afficherDialogueBanque(this.engine.argent);
    if (montant === null || montant <= 0) {
      await this.ui.print("> Dépôt bancaire annulé.", "cmd");
      return;
    }

    this.ui.setControlesActifs(false);
    await this.ui.print(`> Mettre l'argent en banque (${montant}€)`, "cmd");

    const resultat = this.engine.mettreArgentBanque(montant);
    await this.ui.print(resultat.logs);

    this.ui.mettreAJourHUD(this.engine);
    this._sauvegarderEtatCourant();
    this.ui.setControlesActifs(true);

    if (this.engine.actionsRestantes <= 0) {
      await this._gererFinJournee();
    }
  }

  /**
   * Action 5 : Clôturer manuellement la journée.
   */
  async actionFinJournee() {
    if (!this.partieEnCours) return;
    await this.ui.print("> Terminer la journée", "cmd");
    await this._gererFinJournee();
  }

  /**
   * Procédure de clôture de la journée (vieillissement des pains et passage au jour suivant ou fin de cycle).
   * @private
   */
  async _gererFinJournee() {
    this.ui.setControlesActifs(false);

    const transition = this.engine.terminerJournee();
    await this.ui.print(transition.logs);
    this.ui.mettreAJourHUD(this.engine);

    if (transition.finCycle) {
      // Clôture du cycle de 7 jours
      await this._gererFinCycle();
    } else {
      // Démarrage du jour suivant
      await this._commencerNouveauJour();
    }

    this.ui.setControlesActifs(true);
  }

  /**
   * Bilan du cycle de 7 jours et choix de continuer ou clore la partie.
   * @private
   */
  async _gererFinCycle() {
    const bilan = this.engine.obtenirBilanCycle();

    await this.ui.print([
      "",
      "==================================================",
      `🎮 Fin du cycle ${bilan.cycle} !`,
      `💶 Argent liquide: ${bilan.argentLiquide}€`,
      `🏦 Argent en banque: ${bilan.argentBanque}€`,
      `💰 Total trésorerie: ${bilan.argentTotal}€`,
      `📊 Score final: ${bilan.scoreFinal}€`,
      "==================================================",
      ""
    ]);

    const continuer = await this.ui.afficherDialogueFinCycle(bilan);

    if (continuer) {
      const logsNouveauCycle = this.engine.demarrerNouveauCycle();
      await this.ui.print(logsNouveauCycle);
      this._sauvegarderEtatCourant();
      await this._commencerNouveauJour();
    } else {
      // Clôture définitive et enregistrement du score
      const { scoreLigne } = this.engine.clorePartieEtEnregistrerScore();
      await this.ui.print([
        `✅ Score sauvegardé : ${scoreLigne}`,
        "🗑️ Sauvegarde locale purgée.",
        ""
      ]);

      // Affichage du tableau d'honneur
      const topScores = obtenirMeilleursScores();
      this.ui.afficherDialogueScores(topScores);

      this.partieEnCours = false;
      this._rafraichirEcranAccueil();
    }
  }
}

// Démarrage robuste de l'application (support DOMContentLoaded et chargement immédiat/iframe)
function lancerApplication() {
  // Purger immédiatement tout ancien cache persistant résiduel
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name !== 'boulangerie-pwa-v2.2') {
          console.log('[App] Purge immédiate du cache résiduel :', name);
          caches.delete(name);
        }
      });
    });
  }

  const app = new ApplicationBoulangerie();
  app.demarrer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', lancerApplication);
} else {
  // Déjà interactif ou complet (ex: contexte iframe AI Studio ou navigation différée)
  lancerApplication();
}
