package com.boulangerie.game.contract

import com.boulangerie.game.model.BoulangerieState
import com.boulangerie.game.model.CycleReport

/**
 * Contrat d'architecture MVP (Model-View-Presenter) pour l'application Boulangerie.
 * Découple totalement la logique métier du rendu UI Android.
 */
interface BoulangerieContract {

    /**
     * Interface View : définit les capacités d'affichage de l'UI (Activity / Fragment).
     */
    interface View {
        fun updateHUD(state: BoulangerieState)
        fun printTerminal(message: String, type: LogType = LogType.NORMAL)
        fun printTerminalLines(lines: List<String>, type: LogType = LogType.NORMAL)
        fun showBankDialog(currentCash: Int)
        fun showEndCycleDialog(report: CycleReport)
        fun showRulesDialog()
        fun playSound(sound: SoundEffect)
        fun triggerHapticFeedback()
        fun setControlsEnabled(enabled: Boolean)
    }

    /**
     * Interface Presenter : traite les actions utilisateur et pilote le Model et la View.
     */
    interface Presenter {
        fun attachView(view: View)
        fun detachView()
        fun onStartNewGame(bakeryName: String)
        fun onResumeSavedGame()
        fun onBakeBreadClicked()
        fun onSellBreadClicked()
        fun onBuyIngredientsClicked()
        fun onBankDepositRequested()
        fun onConfirmBankDeposit(amount: Int)
        fun onEndDayClicked()
        fun onContinueNewCycle()
        fun onEndGameAndSaveScore()
    }

    enum class LogType {
        NORMAL,
        COMMAND,
        SUCCESS,
        WARNING,
        ERROR,
        EVENT
    }

    enum class SoundEffect {
        CLICK,
        SUCCESS,
        CASH,
        ERROR,
        MORNING,
        NIGHT
    }
}
