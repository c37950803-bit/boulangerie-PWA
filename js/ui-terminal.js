/**
 * @file ui-terminal.js
 * @description Rendu et expérience utilisateur terminal & console haut de gamme pour la PWA Boulangerie.
 * Intègre :
 * - Un écran d'accueil façon jeu console / APK native (Jouer, Scores, Règles du jeu, Crédits, Recommencer à zéro).
 * - Une transition fluide vers l'écran de jeu avec bouton Menu / Pause & Sauvegarde.
 * - Une animation élégante de machine à écrire avec retour sonore mécanique et possibilité de passer (skip) instantanément.
 * - Un affichage d'inventaire automatique en temps réel à chaque action sans encombrement.
 * - Des contrôles et dialogues robustes contre les erreurs de saisie.
 */

export class TerminalUI {
  /**
   * Initialise l'interface, les écrans, les écouteurs et le synthétiseur audio Web Audio API.
   * @param {Object} callbacks - Fonctions de rappel vers l'orchestrateur de jeu.
   */
  constructor(callbacks = {}) {
    this.callbacks = callbacks;

    // Références des écrans principaux
    this.screenContainer = document.getElementById('terminal-screen');
    this.homeScreen = document.getElementById('home-screen');
    this.gameScreen = document.getElementById('game-screen');

    // Éléments de l'écran d'accueil
    this.homeSaveIndicator = document.getElementById('home-save-indicator');
    this.homePlaySubtext = document.getElementById('home-play-subtext');
    this.homeBtnPlay = document.getElementById('home-btn-play');
    this.homeBtnScores = document.getElementById('home-btn-scores');
    this.homeBtnRules = document.getElementById('home-btn-rules');
    this.homeBtnCredits = document.getElementById('home-btn-credits');
    this.homeBtnResetAll = document.getElementById('home-btn-reset-all');
    this.homeToggleSound = document.getElementById('home-toggle-sound');
    this.homeToggleScanlines = document.getElementById('home-toggle-scanlines');

    // Éléments de l'écran de jeu
    this.btnInGameMenu = document.getElementById('btn-in-game-menu');
    this.inGameTitleText = document.getElementById('in-game-title-text');
    this.bodyLog = document.getElementById('terminal-body');

    // Références du HUD et de l'inventaire en direct
    this.hudCycle = document.getElementById('hud-cycle');
    this.hudJour = document.getElementById('hud-jour');
    this.hudActionsCount = document.getElementById('hud-actions-count');
    this.hudActionPips = document.getElementById('hud-action-pips');
    this.hudArgent = document.getElementById('hud-argent');
    this.hudBanque = document.getElementById('hud-banque');
    this.hudClientsText = document.getElementById('hud-clients-text');
    this.hudClientsBar = document.getElementById('hud-clients-bar');

    // Stocks et Pains par fraîcheur
    this.hudBread0 = document.getElementById('hud-bread-0');
    this.hudBread1 = document.getElementById('hud-bread-1');
    this.hudBread2 = document.getElementById('hud-bread-2');
    this.hudBread3 = document.getElementById('hud-bread-3');
    this.hudSlot3 = document.getElementById('hud-slot-3');

    // Ingrédients
    this.hudFarine = document.getElementById('hud-farine');
    this.hudLevure = document.getElementById('hud-levure');
    this.hudSel = document.getElementById('hud-sel');
    this.hudEau = document.getElementById('hud-eau');
    this.hudBakeReadiness = document.getElementById('hud-bake-readiness');

    // Événements
    this.hudEventBar = document.getElementById('hud-event-bar');
    this.hudEventText = document.getElementById('hud-event-text');

    // Sous-textes dynamiques des boutons d'action
    this.subtextFabriquer = document.getElementById('subtext-fabriquer');
    this.subtextVendre = document.getElementById('subtext-vendre');
    this.subtextAcheter = document.getElementById('subtext-acheter');

    // Panneaux d'actions
    this.dockStandard = document.getElementById('dock-standard-actions');
    this.dockDynamic = document.getElementById('dock-dynamic-container');

    // Boutons de la barre supérieure en jeu
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.btnToggleScanlines = document.getElementById('btn-toggle-scanlines');
    this.pwaBanner = document.getElementById('pwa-install-banner');
    this.btnInstallPwa = document.getElementById('btn-install-pwa');

    // Boutons d'action standards épurés (5 actions ciblées)
    this.actionButtons = {
      fabriquer: document.getElementById('btn-act-fabriquer'),
      vendre: document.getElementById('btn-act-vendre'),
      acheter: document.getElementById('btn-act-acheter'),
      banque: document.getElementById('btn-act-banque'),
      finJournee: document.getElementById('btn-act-fin-journee')
    };

    // État du son et AudioContext passif
    this.soundEnabled = localStorage.getItem('boulangerie_sound') !== 'false';
    this.audioCtx = null;

    // File d'attente d'affichage et animation machine à écrire
    this.queue = [];
    this.isPrinting = false;
    this.skipPrinting = false;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._initialiserAudio();
    this._attacherEcouteurs();
  }

  /* ══════════════════════════════════════════════════════════════════════
     GESTION DU SON ET SYNTHÉTISEUR WEB AUDIO RÉTRO
     ══════════════════════════════════════════════════════════════════════ */

  _initialiserAudio() {
    this._mettreAJourBoutonSon();

    const basculerSon = () => {
      this.soundEnabled = !this.soundEnabled;
      localStorage.setItem('boulangerie_sound', this.soundEnabled ? 'true' : 'false');
      this._mettreAJourBoutonSon();
      if (this.soundEnabled) {
        this.jouerSon('click');
      }
    };

    this.btnToggleSound?.addEventListener('click', basculerSon);
    this.homeToggleSound?.addEventListener('click', basculerSon);
  }

  _mettreAJourBoutonSon() {
    const texte = this.soundEnabled ? '🔊 Audio: ON' : '🔈 Audio: OFF';
    if (this.btnToggleSound) {
      this.btnToggleSound.textContent = texte;
      this.btnToggleSound.classList.toggle('active', this.soundEnabled);
    }
    if (this.homeToggleSound) {
      this.homeToggleSound.textContent = texte;
      this.homeToggleSound.classList.toggle('active', this.soundEnabled);
    }
  }

  _creerAudioContextSiBesoin() {
    if (!this.audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) {
        this.audioCtx = new AudioClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Joue un son rétro synthétisé (clic, pièce, alerte, succès).
   * @param {'click'|'success'|'error'|'cash'} type
   */
  jouerSon(type = 'click') {
    if (!this.soundEnabled) return;

    try {
      this._creerAudioContextSiBesoin();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.035);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.start(now);
        osc.stop(now + 0.035);
      } else if (type === 'success' || type === 'cash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // Do5
        osc.frequency.setValueAtTime(659.25, now + 0.06); // Mi5
        osc.frequency.setValueAtTime(783.99, now + 0.12); // Sol5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.setValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      }
    } catch {
      // Ignorer si la politique du navigateur restreint la lecture
    }
  }

  /**
   * Bruitage mécanique très discret de frappe machine à écrire.
   */
  jouerSonTypewriter() {
    if (!this.soundEnabled) return;
    try {
      this._creerAudioContextSiBesoin();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const freqAleatoire = 820 + (Math.random() * 180 - 90);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqAleatoire, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.014);

      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

      osc.start(now);
      osc.stop(now + 0.014);
    } catch {}
  }

  /**
   * Retour haptique tactile Android si supporté.
   * @param {number} ms
   */
  vibrer(ms = 12) {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     ÉCOUTEURS D'ÉVÉNEMENTS & NAVIGATION ENTRE ÉCRANS
     ══════════════════════════════════════════════════════════════════════ */

  _attacherEcouteurs() {
    // Boutons de l'écran d'accueil
    this.homeBtnPlay?.addEventListener('click', () => {
      this.jouerSon('click');
      this.vibrer(16);
      if (this.callbacks.onPlay) this.callbacks.onPlay();
    });

    this.homeBtnScores?.addEventListener('click', () => {
      this.jouerSon('click');
      this.vibrer(10);
      if (this.callbacks.onViewScores) this.callbacks.onViewScores();
    });

    this.homeBtnRules?.addEventListener('click', () => {
      this.jouerSon('click');
      this.vibrer(10);
      this.afficherDialogueRegles();
    });

    this.homeBtnCredits?.addEventListener('click', () => {
      this.jouerSon('click');
      this.vibrer(10);
      this.afficherDialogueCredits();
    });

    this.homeBtnResetAll?.addEventListener('click', () => {
      this.jouerSon('click');
      this.vibrer(18);
      if (this.callbacks.onResetAll) this.callbacks.onResetAll();
    });

    // Bascules Scanlines CRT
    const basculerCRT = () => {
      this.screenContainer.classList.toggle('no-scanlines');
      const actif = !this.screenContainer.classList.contains('no-scanlines');
      const texte = actif ? '📺 CRT: ON' : '📺 CRT: OFF';
      if (this.btnToggleScanlines) this.btnToggleScanlines.textContent = texte;
      if (this.homeToggleScanlines) this.homeToggleScanlines.textContent = texte;
      this.jouerSon('click');
      this.vibrer(8);
    };

    this.btnToggleScanlines?.addEventListener('click', basculerCRT);
    this.homeToggleScanlines?.addEventListener('click', basculerCRT);

    // Bouton Menu / Pause en jeu
    this.btnInGameMenu?.addEventListener('click', () => {
      this.jouerSon('click');
      this.vibrer(12);
      if (this.callbacks.onPauseMenu) this.callbacks.onPauseMenu();
    });

    // Taper sur le terminal passe immédiatement l'animation de frappe
    this.bodyLog?.addEventListener('click', () => {
      this.skipPrinting = true;
    });

    // PWA install banner
    this.btnInstallPwa?.addEventListener('click', () => {
      if (this.callbacks.onInstallPwa) this.callbacks.onInstallPwa();
    });

    // Écouteurs sur les 5 boutons d'action du dock
    Object.entries(this.actionButtons).forEach(([cle, btn]) => {
      btn?.addEventListener('click', () => {
        this.jouerSon('click');
        this.vibrer(14);
        if (this.callbacks[cle]) {
          this.callbacks[cle]();
        }
      });
    });

    // Raccourcis clavier 1 à 5 en jeu
    window.addEventListener('keydown', (e) => {
      if (document.querySelector('.game-modal-overlay') || e.target.tagName === 'INPUT') return;
      if (this.gameScreen.style.display !== 'none') {
        switch (e.key) {
          case '1': this._declencherTouche('fabriquer'); break;
          case '2': this._declencherTouche('vendre'); break;
          case '3': this._declencherTouche('acheter'); break;
          case '4': this._declencherTouche('banque'); break;
          case '5': this._declencherTouche('finJournee'); break;
          case 'Escape':
          case 'p':
          case 'P':
            if (this.callbacks.onPauseMenu) this.callbacks.onPauseMenu();
            break;
        }
      } else {
        // Raccourcis sur l'écran d'accueil
        if (e.key === 'Enter' || e.key === ' ') {
          this.homeBtnPlay?.click();
        }
      }
    });
  }

  _declencherTouche(nom) {
    const btn = this.actionButtons[nom];
    if (btn && !btn.disabled) {
      btn.click();
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     COMMUTATION DES VUES ÉCRAN ACCUEIL / JEU
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Bascule vers l'écran d'accueil style console de jeu.
   * @param {Object|null} sauvegardeInfo
   */
  afficherAccueil(sauvegardeInfo = null) {
    this.gameScreen.style.display = 'none';
    this.homeScreen.style.display = 'flex';

    if (sauvegardeInfo) {
      this.homeSaveIndicator.className = 'home-save-indicator has-save';
      this.homeSaveIndicator.innerHTML = `
        <span>💾 Sauvegarde : <strong>${sauvegardeInfo.nom}</strong> (C${sauvegardeInfo.cycle} • J${sauvegardeInfo.jour}/7 • ${sauvegardeInfo.argent + sauvegardeInfo.argentBanque}€)</span>
      `;
      if (this.homePlaySubtext) {
        this.homePlaySubtext.textContent = `Reprendre ${sauvegardeInfo.nom} (C${sauvegardeInfo.cycle} • J${sauvegardeInfo.jour})`;
      }
    } else {
      this.homeSaveIndicator.className = 'home-save-indicator';
      this.homeSaveIndicator.innerHTML = `<span>✨ Prêt pour une nouvelle aventure artisanale !</span>`;
      if (this.homePlaySubtext) {
        this.homePlaySubtext.textContent = 'Commencer une nouvelle boulangerie';
      }
    }
  }

  /**
   * Bascule vers l'écran de jeu du terminal.
   * @param {string} [nomBoulangerie=""]
   */
  afficherJeu(nomBoulangerie = "") {
    this.homeScreen.style.display = 'none';
    this.gameScreen.style.display = 'flex';
    if (this.inGameTitleText && nomBoulangerie) {
      this.inGameTitleText.textContent = `🥖 ${nomBoulangerie.toUpperCase()}`;
    }
    this.defilerBas();
  }

  /* ══════════════════════════════════════════════════════════════════════
     TABLEAU DE BORD & INVENTAIRE TEMPS RÉEL (HUD AUTOMATIQUE)
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Met à jour le HUD et l'inventaire en direct à chaque action du joueur.
   * Remplace définitivement le besoin d'un bouton de statut manuel.
   * @param {Object} etat - État du moteur de jeu.
   */
  mettreAJourHUD(etat) {
    if (this.hudCycle) this.hudCycle.textContent = `Cycle ${etat.cycle}`;
    if (this.hudJour) this.hudJour.textContent = `Jour ${etat.jour} / 7`;

    // 1. Diodes LEDs des actions restantes
    if (this.hudActionsCount) this.hudActionsCount.textContent = `${etat.actionsRestantes}/5`;
    if (this.hudActionPips) {
      const pips = this.hudActionPips.querySelectorAll('.pip');
      pips.forEach((pip, index) => {
        pip.classList.toggle('filled', index < etat.actionsRestantes);
      });
    }

    // 2. Trésorerie
    if (this.hudArgent) this.hudArgent.textContent = `${etat.argent}€`;
    if (this.hudBanque) this.hudBanque.textContent = `${etat.argentBanque}€`;

    // 3. Jauge d'affluence des clients
    const clientsRestants = Math.max(0, etat.clientsMaxJour - etat.painsVendusAujourdhui);
    if (this.hudClientsText) {
      const txtClientRestant = clientsRestants <= 1 ? `${clientsRestants} restant` : `${clientsRestants} restants`;
      this.hudClientsText.textContent = `${etat.painsVendusAujourdhui} / ${etat.clientsMaxJour} (${txtClientRestant})`;
    }
    if (this.hudClientsBar) {
      const pct = Math.min(100, Math.round((etat.painsVendusAujourdhui / (etat.clientsMaxJour || 1)) * 100));
      this.hudClientsBar.style.width = `${pct}%`;
    }

    // 4. Étagères à pain par fraîcheur
    const p0 = etat.painsParAge[0] || 0;
    const p1 = etat.painsParAge[1] || 0;
    const p2 = etat.painsParAge[2] || 0;
    const p3 = etat.painsParAge[3] || 0;

    if (this.hudBread0) this.hudBread0.textContent = p0;
    if (this.hudBread1) this.hudBread1.textContent = p1;
    if (this.hudBread2) this.hudBread2.textContent = p2;
    if (this.hudBread3) this.hudBread3.textContent = p3;
    if (this.hudSlot3) {
      this.hudSlot3.style.display = p3 > 0 ? 'flex' : 'none';
    }

    // 5. Ingrédients du garde-manger
    const f = etat.inventaire.farine ?? 0;
    const l = etat.inventaire.levure ?? 0;
    const s = etat.inventaire.sel ?? 0;
    const e = etat.inventaire.eau ?? 0;

    if (this.hudFarine) this.hudFarine.textContent = `${f}kg`;
    if (this.hudLevure) this.hudLevure.textContent = `${l}kg`;
    if (this.hudSel) this.hudSel.textContent = `${s}kg`;
    if (this.hudEau) this.hudEau.textContent = `${e}L`;

    // 6. Calcul automatique des fournées réalisables
    const fourniesPossibles = Math.min(
      Math.floor(f / 10),
      Math.floor(l / 2),
      Math.floor(s / 1),
      Math.floor(e / 5)
    );

    if (this.hudBakeReadiness) {
      if (etat.fourEnPanne) {
        this.hudBakeReadiness.className = 'shelf-badge danger';
        this.hudBakeReadiness.textContent = '🚨 Four en panne !';
      } else if (fourniesPossibles > 0) {
        this.hudBakeReadiness.className = 'shelf-badge';
        const txtFournees = fourniesPossibles > 1 ? `${fourniesPossibles} fournées prêtes` : `${fourniesPossibles} fournée prête`;
        const totalPainsFournees = fourniesPossibles * 30;
        const txtTotalPains = totalPainsFournees > 1 ? `+${totalPainsFournees} pains` : `+${totalPainsFournees} pain`;
        this.hudBakeReadiness.textContent = `🥖 ${txtFournees} (${txtTotalPains})`;
      } else {
        this.hudBakeReadiness.className = 'shelf-badge warning';
        this.hudBakeReadiness.textContent = '⚠️ Ingrédients insuffisants';
      }
    }

    // 7. Sous-textes dynamiques des boutons d'action
    if (this.subtextFabriquer) {
      if (etat.fourEnPanne) {
        this.subtextFabriquer.textContent = 'Four en panne ! (Réparation demain)';
        this.subtextFabriquer.style.color = 'var(--text-danger)';
      } else if (fourniesPossibles > 0) {
        const txtPretes = fourniesPossibles > 1 ? `${fourniesPossibles} prêtes` : `${fourniesPossibles} prête`;
        this.subtextFabriquer.textContent = `+30 pains frais (${txtPretes})`;
        this.subtextFabriquer.style.color = 'var(--text-amber)';
      } else {
        this.subtextFabriquer.textContent = 'Stock ingrédient insuffisant';
        this.subtextFabriquer.style.color = 'var(--text-dim)';
      }
    }

    const painsVendables = p0 + p1 + p2;

    if (this.subtextVendre) {
      if (clientsRestants === 0) {
        this.subtextVendre.textContent = 'Plus de client aujourd\'hui (0 restant)';
      } else if (painsVendables === 0) {
        this.subtextVendre.textContent = '0 pain en réserve à vendre';
      } else {
        const txtPain = painsVendables > 1 ? `${painsVendables} pains disp.` : `${painsVendables} pain disp.`;
        const txtClient = clientsRestants > 1 ? `${clientsRestants} clients` : `${clientsRestants} client`;
        this.subtextVendre.textContent = `${txtPain} (${txtClient})`;
      }
    }

    if (this.subtextAcheter) {
      if (etat.promotionIngredients) {
        this.subtextAcheter.textContent = '🔥 PROMO FOURNISSEUR : 10€ (-50%)';
        this.subtextAcheter.style.color = 'var(--text-success)';
      } else {
        this.subtextAcheter.textContent = 'Pack complet (20€)';
        this.subtextAcheter.style.color = 'var(--text-dim)';
      }
    }

    // 8. Barre d'alerte événement du jour
    if (this.hudEventBar && this.hudEventText) {
      if (etat.evenementJour && etat.evenementJour !== 'jour_ordinaire') {
        this.hudEventBar.style.display = 'flex';
        this.hudEventBar.className = 'event-alert-bar';

        if (etat.evenementJour === 'four_en_panne' || etat.evenementJour === 'bandits' || etat.evenementJour === 'greve_boulangers') {
          this.hudEventBar.classList.add('warning');
        } else if (etat.evenementJour === 'critique_gastronomique' || etat.evenementJour === 'promotion_fournisseur' || etat.evenementJour === 'festival_pain') {
          this.hudEventBar.classList.add('positive');
        }

        const nomFormate = etat.evenementJour.replace(/_/g, ' ').toUpperCase();
        this.hudEventText.textContent = `🎲 ÉVÉNEMENT DU JOUR : ${nomFormate}`;
      } else {
        this.hudEventBar.style.display = 'none';
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     ANIMATION MACHINE À ÉCRIRE ÉLÉGANTE AVEC SKIP TACTILE
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Imprime des lignes textuelles avec effet de machine à écrire fluide et élégant.
   * @param {string|string[]} lignes - Une ligne ou une collection de lignes textuelles.
   * @param {string} [classeCss=""] - Classe stylistique (command, error, success, warning).
   * @returns {Promise<void>}
   */
  async print(lignes, classeCss = "") {
    const tableau = Array.isArray(lignes) ? lignes : [lignes];
    for (const item of tableau) {
      this.queue.push({ texte: item, classeCss });
    }

    if (this.isPrinting) return;
    this.isPrinting = true;

    while (this.queue.length > 0) {
      const ligneObj = this.queue.shift();
      await this._imprimerLigneMachineAEcrire(ligneObj.texte, ligneObj.classeCss);
    }

    this.isPrinting = false;
    this.skipPrinting = false;
    this.defilerBas();
  }

  /**
   * Rendu dynamique lettre par lettre avec curseur phosphore et clics mécaniques.
   * @private
   */
  async _imprimerLigneMachineAEcrire(texteBrut, classeCss = "") {
    const el = document.createElement('div');
    el.className = `log-line ${classeCss}`;

    let texte = texteBrut || "";
    if (texte.startsWith('>')) {
      el.classList.add('cmd');
      texte = texte.substring(1).trim();
    } else if (texte.startsWith('===') || texte.startsWith('╔') || texte.startsWith('║') || texte.startsWith('╚')) {
      el.classList.add('banner');
    } else if (texte.startsWith('❌')) {
      el.classList.add('error');
    } else if (texte.startsWith('✅') || texte.startsWith('💰')) {
      el.classList.add('success');
    } else if (texte.startsWith('⚠️') || texte.startsWith('🌧️') || texte.startsWith('🔥')) {
      el.classList.add('warning');
    }

    this.bodyLog.appendChild(el);

    // Si pas de texte, ou préférence d'animation réduite, ou skip manuel
    if (!texte || this.prefersReducedMotion || this.skipPrinting) {
      el.textContent = texte;
      this.defilerBas();
      return;
    }

    const spanTexte = document.createElement('span');
    const spanCurseur = document.createElement('span');
    spanCurseur.className = 'typewriter-caret';
    spanCurseur.textContent = '█';

    el.appendChild(spanTexte);
    el.appendChild(spanCurseur);

    const longueur = texte.length;
    let index = 0;
    // Vitesse adaptée selon la longueur : agréable et jamais trop lente
    const chunkSize = longueur > 70 ? 3 : (longueur > 35 ? 2 : 1);
    const delaiMs = 12;
    let tickAudio = 0;

    while (index < longueur) {
      if (this.skipPrinting) {
        spanTexte.textContent = texte;
        break;
      }

      index = Math.min(longueur, index + chunkSize);
      spanTexte.textContent = texte.substring(0, index);

      tickAudio++;
      if (tickAudio % 2 === 0) {
        this.jouerSonTypewriter();
      }

      this.defilerBas();
      await new Promise((r) => setTimeout(r, delaiMs));
    }

    spanCurseur.remove();
    this.defilerBas();
  }

  defilerBas() {
    requestAnimationFrame(() => {
      if (this.bodyLog) {
        this.bodyLog.scrollTop = this.bodyLog.scrollHeight;
      }
    });
  }

  effacer() {
    if (this.bodyLog) {
      this.bodyLog.innerHTML = '';
    }
  }

  setControlesActifs(actif) {
    Object.values(this.actionButtons).forEach((btn) => {
      if (btn) {
        btn.disabled = !actif;
        btn.classList.toggle('disabled', !actif);
      }
    });
  }

  afficherBannierePwa() {
    if (this.pwaBanner) this.pwaBanner.style.display = 'flex';
  }

  masquerBannierePwa() {
    if (this.pwaBanner) this.pwaBanner.style.display = 'none';
  }

  /* ══════════════════════════════════════════════════════════════════════
     MODALES : RÈGLES DU JEU, SCORES, CRÉDITS & PAUSE
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Affiche la modale des règles complètes du jeu.
   */
  afficherDialogueRegles() {
    const overlay = document.createElement('div');
    overlay.className = 'game-modal-overlay';

    overlay.innerHTML = `
      <div class="game-modal-sheet" role="dialog" aria-labelledby="modal-rules-title">
        <div class="game-modal-header">
          <span id="modal-rules-title" class="modal-title">📖 MANUEL & RÈGLES DU FOURNIL</span>
          <button class="modal-close-btn">✕ Fermer</button>
        </div>
        <div class="game-modal-body">
          <div class="modal-rule-section">
            <span class="rule-sec-title">🎯 BUT DU JEU & CADRE TEMPOREL</span>
            <ul class="rule-list">
              <li>Vous gérez une boulangerie artisanale sur un cycle de <strong>7 jours</strong>.</li>
              <li>Chaque jour, vous disposez de <strong>5 actions tactiques</strong> (symbolisées par les diodes LEDs).</li>
              <li>Le score final est déterminé par votre <strong>trésorerie nette</strong> (Caisse liquide + Banque - 1000€ de capital de départ).</li>
            </ul>
          </div>

          <div class="modal-rule-section">
            <span class="rule-sec-title">🥖 LA RECETTE DE PANIFICATION</span>
            <ul class="rule-list">
              <li>Chaque fournée produit exactement <strong>30 pains frais</strong>.</li>
              <li>Ingrédients nécessaires : <strong>10kg farine</strong>, <strong>2kg levure</strong>, <strong>1kg sel</strong>, <strong>5L eau</strong>.</li>
              <li>Votre inventaire et vos fournées possibles sont indiqués <strong>automatiquement</strong> sur l'étagère en direct.</li>
            </ul>
          </div>

          <div class="modal-rule-section">
            <span class="rule-sec-title">📉 LA FRAÎCHEUR DES PAINS (PRIX DÉGRESSIF)</span>
            <ul class="rule-list">
              <li><strong>0 jour (Frais)</strong> : Vendu à <strong>2,00€</strong> l'unité.</li>
              <li><strong>1 jour (Veille)</strong> : Vendu à <strong>1,50€</strong> l'unité.</li>
              <li><strong>2 jours (Avant-veille)</strong> : Vendu à <strong>1,00€</strong> l'unité.</li>
              <li><strong>3 jours (Dur)</strong> : Invendable ! Jeté aux poubelles à la fin de la journée.</li>
            </ul>
          </div>

          <div class="modal-rule-section">
            <span class="rule-sec-title">👥 CLIENTÈLE & MARCHÉ</span>
            <ul class="rule-list">
              <li>L'action <em>Vendre</em> écoule votre stock vendable auprès des clients du jour.</li>
              <li>Le nombre de clients varie chaque jour selon la météo et les événements (soleil, pluie, touristes, critique gastronomique).</li>
            </ul>
          </div>

          <div class="modal-rule-section">
            <span class="rule-sec-title">🏦 SÉCURITÉ BANCAIRE</span>
            <ul class="rule-list">
              <li>L'argent en caisse liquide peut être dérobé lors de hold-up imprévus !</li>
              <li>Déposer en banque sécurise vos fonds, moyennant <strong>10% de frais de gestion</strong>.</li>
            </ul>
          </div>

          <div class="modal-rule-section">
            <span class="rule-sec-title">⚡ ÉVÉNEMENTS DU JOUR</span>
            <ul class="rule-list">
              <li>Chaque matin, un événement aléatoire survient : panne de four, promotion fournisseur (-50%), festival du pain, grève des boulangers, pluie battante, etc.</li>
            </ul>
          </div>
        </div>
        <div class="modal-actions-bar">
          <button class="dock-ctrl-btn primary modal-confirm-btn">Compris !</button>
        </div>
      </div>
    `;

    this.screenContainer.appendChild(overlay);

    const fermer = () => {
      this.jouerSon('click');
      overlay.remove();
    };

    overlay.querySelector('.modal-close-btn')?.addEventListener('click', fermer);
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', fermer);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fermer();
    });
  }

  /**
   * Affiche la modale des crédits.
   */
  afficherDialogueCredits() {
    const overlay = document.createElement('div');
    overlay.className = 'game-modal-overlay';

    overlay.innerHTML = `
      <div class="game-modal-sheet" role="dialog" aria-labelledby="modal-credits-title">
        <div class="game-modal-header">
          <span id="modal-credits-title" class="modal-title">✨ CRÉDITS DU JEU</span>
          <button class="modal-close-btn">✕</button>
        </div>
        <div class="game-modal-body" style="text-align: center; gap: 14px;">
          <div style="font-size: 2rem;">🥖</div>
          <div>
            <strong style="font-size: 1.1rem; color: var(--text-amber-glow);">BOULANGERIE ARTISANALE</strong><br/>
            <span style="color: var(--text-dim); font-size: 0.78rem;">Simulation de Gestion Rétro PWA v2.0</span>
          </div>
          <div class="modal-rule-section" style="text-align: left;">
            <p><strong>Conception & Règles :</strong> Adaptation fidèle du moteur d'origine Python de gestion de fournil.</p>
            <p><strong>Expérience Utilisateur :</strong> Interface native Android-like, châssis CRT ambre, machine à écrire réactive et retour haptique.</p>
            <p><strong>Moteur Sonore :</strong> Synthétiseur d'oscillateurs temps réel via Web Audio API.</p>
            <p><strong>Persistance :</strong> Stockage 100% hors-ligne via Web Storage et Service Worker PWA.</p>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-dimmer);">
            Fait avec passion pour les amoureux du bon pain et de l'arcade vintage.
          </div>
        </div>
        <div class="modal-actions-bar">
          <button class="dock-ctrl-btn primary modal-confirm-btn">Fermer</button>
        </div>
      </div>
    `;

    this.screenContainer.appendChild(overlay);

    const fermer = () => {
      this.jouerSon('click');
      overlay.remove();
    };

    overlay.querySelector('.modal-close-btn')?.addEventListener('click', fermer);
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', fermer);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fermer();
    });
  }

  /**
   * Modale de confirmation réutilisable et robuste.
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  afficherDialogueConfirmation({ titre, description, danger = false, boutonTexte = "Confirmer" }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'game-modal-overlay';

      overlay.innerHTML = `
        <div class="game-modal-sheet" style="max-width: 440px;" role="alertdialog">
          <div class="game-modal-header">
            <span class="modal-title">${titre}</span>
            <button class="modal-close-btn">✕</button>
          </div>
          <div class="game-modal-body">
            <div class="${danger ? 'danger-box' : 'modal-rule-section'}">
              ${description}
            </div>
          </div>
          <div class="modal-actions-bar">
            <button id="btn-conf-annuler" class="dock-ctrl-btn">Annuler</button>
            <button id="btn-conf-valider" class="dock-ctrl-btn ${danger ? '' : 'primary'}" style="${danger ? 'background: #ef4444; color: #fff; border-color: #f87171;' : ''}">
              ${boutonTexte}
            </button>
          </div>
        </div>
      `;

      this.screenContainer.appendChild(overlay);

      const cloturer = (res) => {
        this.jouerSon('click');
        overlay.remove();
        resolve(res);
      };

      overlay.querySelector('#btn-conf-annuler')?.addEventListener('click', () => cloturer(false));
      overlay.querySelector('.modal-close-btn')?.addEventListener('click', () => cloturer(false));
      overlay.querySelector('#btn-conf-valider')?.addEventListener('click', () => cloturer(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cloturer(false);
      });
    });
  }

  /**
   * Menu Pause en cours de partie (Sauvegarder & Quitter, Continuer, Règles, Recommencer).
   * @param {Object} sauvegardeInfo
   * @returns {Promise<'continuer'|'quitter'|'recommencer'|'regles'>}
   */
  afficherMenuPause(sauvegardeInfo) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'game-modal-overlay';

      overlay.innerHTML = `
        <div class="game-modal-sheet" style="max-width: 460px;">
          <div class="game-modal-header">
            <span class="modal-title">⏸️ MENU DE PAUSE</span>
            <button class="modal-close-btn">✕</button>
          </div>
          <div class="game-modal-body">
            <div class="home-save-indicator has-save" style="width: 100%; justify-content: center;">
              💾 Sauvegarde synchronisée : Cycle ${sauvegardeInfo.cycle} • Jour ${sauvegardeInfo.jour}/7 • ${sauvegardeInfo.argent + sauvegardeInfo.argentBanque}€
            </div>

            <div class="home-menu-grid" style="margin-top: 6px;">
              <button id="pause-btn-resume" class="home-menu-btn play-btn">
                <div class="menu-btn-icon">▶</div>
                <div class="menu-btn-text">
                  <span class="menu-btn-title">REPRENDRE LA PARTIE</span>
                  <span class="menu-btn-subtitle">Poursuivre la journée en cours</span>
                </div>
              </button>

              <button id="pause-btn-save-quit" class="home-menu-btn">
                <div class="menu-btn-icon">💾</div>
                <div class="menu-btn-text">
                  <span class="menu-btn-title">SAUVEGARDER & QUITTER</span>
                  <span class="menu-btn-subtitle">Retourner au menu principal d'accueil</span>
                </div>
              </button>

              <button id="pause-btn-rules" class="home-menu-btn">
                <div class="menu-btn-icon">📖</div>
                <div class="menu-btn-text">
                  <span class="menu-btn-title">RÈGLES DU JEU</span>
                  <span class="menu-btn-subtitle">Consulter les tarifs & ingrédients</span>
                </div>
              </button>

              <button id="pause-btn-restart" class="home-menu-btn reset-btn">
                <div class="menu-btn-icon">🔄</div>
                <div class="menu-btn-text">
                  <span class="menu-btn-title">RECOMMENCER À ZÉRO</span>
                  <span class="menu-btn-subtitle">Abandonner et relancer une nouvelle partie</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      `;

      this.screenContainer.appendChild(overlay);

      const cloturer = (action) => {
        this.jouerSon('click');
        overlay.remove();
        resolve(action);
      };

      overlay.querySelector('#pause-btn-resume')?.addEventListener('click', () => cloturer('continuer'));
      overlay.querySelector('.modal-close-btn')?.addEventListener('click', () => cloturer('continuer'));
      overlay.querySelector('#pause-btn-save-quit')?.addEventListener('click', () => cloturer('quitter'));
      overlay.querySelector('#pause-btn-rules')?.addEventListener('click', () => cloturer('regles'));
      overlay.querySelector('#pause-btn-restart')?.addEventListener('click', () => cloturer('recommencer'));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cloturer('continuer');
      });
    });
  }

  /**
   * Modale du classement des scores.
   * @param {Array<{ ligne: string, score: number }>} scores
   */
  afficherDialogueScores(scores) {
    const overlay = document.createElement('div');
    overlay.className = 'game-modal-overlay';

    let scoresHTML = '';
    if (!scores || scores.length === 0) {
      scoresHTML = '<div style="color: var(--text-dim); text-align: center; padding: 24px;">Aucun score enregistré pour le moment.<br/>Terminez un cycle de 7 jours pour figurer ici !</div>';
    } else {
      scoresHTML = scores.map((s, idx) => {
        const medaille = idx === 0 ? '🥇 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : `#${idx + 1}`));
        return `
          <div class="score-item">
            <span class="score-rank-badge">${medaille}</span>
            <span class="score-item-text">${s.ligne}</span>
            <span class="score-item-val">+${s.score}€</span>
          </div>
        `;
      }).join('');
    }

    overlay.innerHTML = `
      <div class="game-modal-sheet" style="max-width: 520px;">
        <div class="game-modal-header">
          <span class="modal-title">🏆 TABLEAU D'HONNEUR DES BOULANGERS</span>
          <button class="modal-close-btn">✕</button>
        </div>
        <div class="game-modal-body">
          <div class="scores-scrollable">
            ${scoresHTML}
          </div>
        </div>
        <div class="modal-actions-bar">
          <button class="dock-ctrl-btn primary modal-confirm-btn">Fermer</button>
        </div>
      </div>
    `;

    this.screenContainer.appendChild(overlay);

    const fermer = () => {
      this.jouerSon('click');
      overlay.remove();
    };

    overlay.querySelector('.modal-close-btn')?.addEventListener('click', fermer);
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', fermer);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fermer();
    });
  }

  /**
   * Invite tactile de choix de partie au clic sur JOUER (si sauvegarde active).
   * @param {Object} sauvegardeInfo
   * @returns {Promise<'charger'|'nouveau'|'annuler'>}
   */
  afficherDialogueDemarrage(sauvegardeInfo) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'game-modal-overlay';

      overlay.innerHTML = `
        <div class="game-modal-sheet" style="max-width: 480px;">
          <div class="game-modal-header">
            <span class="modal-title">🎮 CHOIX DE LA PARTIE</span>
            <button class="modal-close-btn">✕</button>
          </div>
          <div class="game-modal-body">
            <div class="home-save-indicator has-save" style="width: 100%; justify-content: center;">
              💾 Sauvegarde trouvée : ${sauvegardeInfo.nom} (C${sauvegardeInfo.cycle} • J${sauvegardeInfo.jour}/7 • ${sauvegardeInfo.argent + sauvegardeInfo.argentBanque}€)
            </div>

            <div class="home-menu-grid" style="margin-top: 8px;">
              <button id="start-btn-load" class="home-menu-btn play-btn">
                <div class="menu-btn-icon">💾</div>
                <div class="menu-btn-text">
                  <span class="menu-btn-title">REPRENDRE LA PARTIE</span>
                  <span class="menu-btn-subtitle">Continuer le cycle ${sauvegardeInfo.cycle} au jour ${sauvegardeInfo.jour}</span>
                </div>
              </button>

              <button id="start-btn-new" class="home-menu-btn">
                <div class="menu-btn-icon">✨</div>
                <div class="menu-btn-text">
                  <span class="menu-btn-title">NOUVELLE AVENTURE</span>
                  <span class="menu-btn-subtitle">Créer un nouveau fournil à neuf</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      `;

      this.screenContainer.appendChild(overlay);

      const cloturer = (choix) => {
        this.jouerSon('click');
        overlay.remove();
        resolve(choix);
      };

      overlay.querySelector('#start-btn-load')?.addEventListener('click', () => cloturer('charger'));
      overlay.querySelector('#start-btn-new')?.addEventListener('click', () => cloturer('nouveau'));
      overlay.querySelector('.modal-close-btn')?.addEventListener('click', () => cloturer('annuler'));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cloturer('annuler');
      });
    });
  }

  /**
   * Invite tactile robuste de saisie ou choix du nom de la boulangerie.
   * @returns {Promise<string>}
   */
  afficherDialogueNomBoulangerie() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'game-modal-overlay';

      overlay.innerHTML = `
        <div class="game-modal-sheet" style="max-width: 480px;">
          <div class="game-modal-header">
            <span class="modal-title">🥖 NOM DE VOTRE FOURNIL</span>
          </div>
          <div class="game-modal-body">
            <p style="color: var(--text-dim); font-size: 0.8rem;">
              Donnez un nom mémorable à votre établissement avant d'allumer le four :
            </p>

            <div class="bank-input-row" style="margin-top: 4px;">
              <input type="text" id="input-bakery-name" class="bank-stepper-input" 
                     value="Boulangerie Emma" placeholder="Boulangerie Emma" maxlength="28" autocomplete="off" />
            </div>

            <div class="prompt-choices-row" style="margin-top: 8px;">
              <button class="bank-chip" data-nom="Boulangerie Emma">Emma</button>
              <button class="bank-chip" data-nom="Le Fournil Doré">Le Fournil Doré</button>
              <button class="bank-chip" data-nom="L'Épi Croustillant">L'Épi Croustillant</button>
              <button class="bank-chip" data-nom="Atelier du Pain">Atelier du Pain</button>
            </div>
          </div>
          <div class="modal-actions-bar">
            <button id="btn-valider-nom" class="dock-ctrl-btn primary" style="min-width: 140px;">
              🥖 Ouvrir le fournil
            </button>
          </div>
        </div>
      `;

      this.screenContainer.appendChild(overlay);

      const input = overlay.querySelector('#input-bakery-name');
      setTimeout(() => input?.focus(), 100);

      const valider = (valeur) => {
        let nomPropre = (valeur || "").trim().replace(/[<>]/g, '');
        if (!nomPropre) nomPropre = "Boulangerie Emma";
        if (nomPropre.length > 28) nomPropre = nomPropre.substring(0, 28);
        this.jouerSon('success');
        overlay.remove();
        resolve(nomPropre);
      };

      overlay.querySelector('#btn-valider-nom')?.addEventListener('click', () => valider(input?.value));
      overlay.querySelectorAll('.bank-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          valider(chip.dataset.nom);
        });
      });
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') valider(input.value);
      });
    });
  }

  /**
   * Ouvre le clavier bancaire tactile intégré et robuste avec simulation des 10% en direct.
   * @param {number} argentLiquide
   * @returns {Promise<number|null>}
   */
  afficherDialogueBanque(argentLiquide) {
    return new Promise((resolve) => {
      this.dockStandard.style.display = 'none';
      this.dockDynamic.style.display = 'block';

      const maxDispo = Math.max(0, Math.floor(argentLiquide));

      this.dockDynamic.innerHTML = `
        <div class="dock-mode-container">
          <div class="dock-mode-header">
            <span>🏦 Dépôt à la Banque (Frais 10% arrondis)</span>
            <span style="color: var(--text-dim);">Caisse : <strong>${maxDispo}€</strong></span>
          </div>

          <div class="bank-chips-row">
            <button class="bank-chip" data-pct="0.25">25%</button>
            <button class="bank-chip" data-pct="0.50">50%</button>
            <button class="bank-chip" data-pct="0.75">75%</button>
            <button class="bank-chip" data-pct="1.00">Tout (Max)</button>
          </div>

          <div class="bank-input-row">
            <button id="btn-bank-minus" class="dock-ctrl-btn" style="min-width: 44px;" aria-label="Moins 50 euros">-50€</button>
            <input type="number" id="input-bank-amount" class="bank-stepper-input" 
                   min="1" max="${maxDispo}" value="${Math.min(100, maxDispo)}" />
            <button id="btn-bank-plus" class="dock-ctrl-btn" style="min-width: 44px;" aria-label="Plus 50 euros">+50€</button>
          </div>

          <div id="bank-calc-preview" class="bank-summary-box">
            Calcul en direct...
          </div>

          <div class="bank-actions-row">
            <button id="btn-bank-annuler" class="dock-ctrl-btn">Annuler</button>
            <button id="btn-bank-valider" class="dock-ctrl-btn primary">Confirmer le dépôt</button>
          </div>
        </div>
      `;

      const input = document.getElementById('input-bank-amount');
      const preview = document.getElementById('bank-calc-preview');

      const calculer = () => {
        let val = parseInt(input.value, 10);
        if (isNaN(val) || val <= 0) {
          preview.innerHTML = `<span style="color: var(--text-dim);">Saisissez un montant valide supérieur à 0€</span>`;
          return;
        }
        if (val > maxDispo) {
          preview.innerHTML = `<span style="color: var(--text-danger);">Fonds insuffisants en caisse (disponible : ${maxDispo}€)</span>`;
          return;
        }

        const frais = Math.ceil(val * 0.1);
        const net = Math.max(0, val - frais);
        const reste = maxDispo - val;

        preview.innerHTML = `
          <div style="display: flex; justify-content: space-between;">
            <span>Frais bancaires (10%) : <strong style="color: var(--text-amber);">${frais}€</strong></span>
            <span>Crédité en banque : <strong style="color: var(--text-success);">+${net}€</strong></span>
          </div>
          <div style="color: var(--text-dim); font-size: 0.72rem;">
            Argent liquide restant dans la caisse : ${reste}€
          </div>
        `;
      };

      input.addEventListener('input', calculer);
      calculer();

      // Puces de pourcentage
      this.dockDynamic.querySelectorAll('.bank-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          this.jouerSon('click');
          const pct = parseFloat(chip.dataset.pct);
          input.value = Math.max(1, Math.min(maxDispo, Math.floor(maxDispo * pct)));
          calculer();
        });
      });

      // Steppers + / -
      document.getElementById('btn-bank-minus')?.addEventListener('click', () => {
        this.jouerSon('click');
        let v = parseInt(input.value, 10) || 0;
        input.value = Math.max(1, v - 50);
        calculer();
      });

      document.getElementById('btn-bank-plus')?.addEventListener('click', () => {
        this.jouerSon('click');
        let v = parseInt(input.value, 10) || 0;
        input.value = Math.min(maxDispo, v + 50);
        calculer();
      });

      const fermer = (res) => {
        this.dockDynamic.style.display = 'none';
        this.dockStandard.style.display = 'grid';
        resolve(res);
      };

      document.getElementById('btn-bank-annuler')?.addEventListener('click', () => {
        this.jouerSon('click');
        fermer(null);
      });

      document.getElementById('btn-bank-valider')?.addEventListener('click', () => {
        let montant = parseInt(input.value, 10);
        if (isNaN(montant) || montant <= 0 || montant > maxDispo) {
          this.jouerSon('error');
          fermer(null);
        } else {
          this.jouerSon('cash');
          this.vibrer(20);
          fermer(montant);
        }
      });
    });
  }

  /**
   * Dialogue de fin de cycle (7 jours terminés).
   * @param {Object} bilan
   * @returns {Promise<boolean>}
   */
  afficherDialogueFinCycle(bilan) {
    return new Promise((resolve) => {
      this.dockStandard.style.display = 'none';
      this.dockDynamic.style.display = 'block';

      this.dockDynamic.innerHTML = `
        <div class="dock-mode-container">
          <div class="dock-mode-header">
            <span>🎮 Bilan du Cycle ${bilan.cycle} (7 jours accomplis)</span>
            <span style="color: var(--text-success); font-weight: 800;">Score: +${bilan.scoreFinal}€</span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim); line-height: 1.4;">
            Liquide: ${bilan.argentLiquide}€ • Banque: ${bilan.argentBanque}€ • Trésorerie: ${bilan.argentTotal}€.<br/>
            Souhaitez-vous continuer pour un nouveau cycle de 7 jours en conservant toutes vos ressources ?
          </div>
          <div class="prompt-choices-row" style="margin-top: 6px;">
            <button id="btn-cycle-stop" class="prompt-choice-btn">
              🏁 Terminer et enregistrer mon score
            </button>
            <button id="btn-cycle-continue" class="prompt-choice-btn highlight">
              🚀 Continuer le Cycle ${bilan.cycle + 1}
            </button>
          </div>
        </div>
      `;

      const cloturer = (continuer) => {
        this.jouerSon('click');
        this.vibrer(15);
        this.dockDynamic.style.display = 'none';
        this.dockStandard.style.display = 'grid';
        resolve(continuer);
      };

      document.getElementById('btn-cycle-continue')?.addEventListener('click', () => cloturer(true));
      document.getElementById('btn-cycle-stop')?.addEventListener('click', () => cloturer(false));
    });
  }
}
