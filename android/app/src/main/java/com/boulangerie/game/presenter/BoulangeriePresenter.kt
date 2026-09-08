package com.boulangerie.game.presenter

import com.boulangerie.game.contract.BoulangerieContract
import com.boulangerie.game.model.BoulangerieModel

/**
 * Presenter MVP : orchestre les événements utilisateur, manipule le Model et ordonne les mises à jour à la View.
 */
class BoulangeriePresenter(
    private val model: BoulangerieModel = BoulangerieModel()
) : BoulangerieContract.Presenter {

    private var view: BoulangerieContract.View? = null

    override fun attachView(view: BoulangerieContract.View) {
        this.view = view
        view.updateHUD(model.state)
    }

    override fun detachView() {
        this.view = null
    }

    override fun onStartNewGame(bakeryName: String) {
        model.resetGame(bakeryName)
        val morningLogs = model.startNewDay()

        view?.let { v ->
            v.updateHUD(model.state)
            v.printTerminal("🥖 Bienvenue à la ${model.state.bakeryName} !", BoulangerieContract.LogType.SUCCESS)
            v.printTerminal("🎯 5 actions disponibles pour cette première journée.")
            if (morningLogs.isNotEmpty()) {
                v.printTerminalLines(morningLogs, BoulangerieContract.LogType.EVENT)
            }
            v.playSound(BoulangerieContract.SoundEffect.MORNING)
        }
    }

    override fun onResumeSavedGame() {
        view?.let { v ->
            v.updateHUD(model.state)
            val actionText = if (model.state.actionsLeft <= 1) "Action restante" else "Actions restantes"
            v.printTerminal("✅ Partie reprise : Cycle ${model.state.cycle}, Jour ${model.state.day}/7", BoulangerieContract.LogType.SUCCESS)
            v.printTerminal("🎯 $actionText : ${model.state.actionsLeft}/5")
        }
    }

    override fun onBakeBreadClicked() {
        val result = model.bakeBread()
        view?.let { v ->
            if (result.success) {
                v.playSound(BoulangerieContract.SoundEffect.SUCCESS)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.SUCCESS)
            } else {
                v.playSound(BoulangerieContract.SoundEffect.ERROR)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.ERROR)
            }
            v.triggerHapticFeedback()
            v.updateHUD(model.state)
            checkAutoEndDay()
        }
    }

    override fun onSellBreadClicked() {
        val result = model.sellBread()
        view?.let { v ->
            if (result.success) {
                v.playSound(BoulangerieContract.SoundEffect.CASH)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.SUCCESS)
            } else {
                v.playSound(BoulangerieContract.SoundEffect.ERROR)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.ERROR)
            }
            v.triggerHapticFeedback()
            v.updateHUD(model.state)
            checkAutoEndDay()
        }
    }

    override fun onBuyIngredientsClicked() {
        val result = model.buyIngredients()
        view?.let { v ->
            if (result.success) {
                v.playSound(BoulangerieContract.SoundEffect.SUCCESS)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.SUCCESS)
            } else {
                v.playSound(BoulangerieContract.SoundEffect.ERROR)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.ERROR)
            }
            v.triggerHapticFeedback()
            v.updateHUD(model.state)
            checkAutoEndDay()
        }
    }

    override fun onBankDepositRequested() {
        if (model.state.cash <= 0) {
            view?.let { v ->
                v.playSound(BoulangerieContract.SoundEffect.ERROR)
                v.printTerminal("❌ Vous n'avez aucun argent liquide à déposer en banque !", BoulangerieContract.LogType.ERROR)
            }
            return
        }
        view?.showBankDialog(model.state.cash)
    }

    override fun onConfirmBankDeposit(amount: Int) {
        val result = model.depositToBank(amount)
        view?.let { v ->
            if (result.success) {
                v.playSound(BoulangerieContract.SoundEffect.SUCCESS)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.SUCCESS)
            } else {
                v.playSound(BoulangerieContract.SoundEffect.ERROR)
                v.printTerminalLines(result.messages, BoulangerieContract.LogType.ERROR)
            }
            v.triggerHapticFeedback()
            v.updateHUD(model.state)
            checkAutoEndDay()
        }
    }

    override fun onEndDayClicked() {
        executeDayClosure()
    }

    private fun checkAutoEndDay() {
        if (model.state.actionsLeft <= 0) {
            executeDayClosure()
        }
    }

    private fun executeDayClosure() {
        view?.let { v ->
            v.playSound(BoulangerieContract.SoundEffect.NIGHT)
            v.printTerminal("🌙 Fin de la journée ${model.state.day}...", BoulangerieContract.LogType.NORMAL)

            val transition = model.endDay()
            if (transition.logs.isNotEmpty()) {
                v.printTerminalLines(transition.logs, BoulangerieContract.LogType.NORMAL)
            }

            v.updateHUD(model.state)

            if (transition.isCycleEnd) {
                val report = model.getCycleReport()
                v.showEndCycleDialog(report)
            } else {
                v.playSound(BoulangerieContract.SoundEffect.MORNING)
            }
        }
    }

    override fun onContinueNewCycle() {
        model.startNewCycle()
        view?.let { v ->
            v.updateHUD(model.state)
            v.printTerminal("🔄 Nouveau Cycle ${model.state.cycle} engagé ! Jour 1/7", BoulangerieContract.LogType.SUCCESS)
            v.playSound(BoulangerieContract.SoundEffect.MORNING)
        }
    }

    override fun onEndGameAndSaveScore() {
        val report = model.getCycleReport()
        view?.let { v ->
            v.printTerminal("🏆 Partie clôturée ! Score final : ${report.score} pts", BoulangerieContract.LogType.SUCCESS)
        }
    }
}
