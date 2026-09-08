package com.boulangerie.game.model

import kotlin.math.ceil

/**
 * Modèle métier complet (Repository / State Holder) pour la simulation de boulangerie.
 */
class BoulangerieModel(initialName: String = "Boulangerie Emma") {

    var state: BoulangerieState = BoulangerieState(bakeryName = initialName)
        private set

    fun resetGame(name: String) {
        state = BoulangerieState(
            bakeryName = name.ifBlank { "Boulangerie Emma" },
            cycle = 1,
            day = 1,
            actionsLeft = 5,
            cash = 1000,
            bank = 0,
            inventory = IngredientInventory(flour = 50, yeast = 10, salt = 5, water = 50),
            breadStocks = BreadStocks(),
            maxClientsToday = EventManager.rollClientAffluence(),
            breadsSoldToday = 0
        )
    }

    fun startNewDay(): List<String> {
        val newClients = EventManager.rollClientAffluence()
        val dailyEvent = EventManager.rollDailyEvent()

        state = state.copy(
            actionsLeft = 5,
            maxClientsToday = newClients,
            breadsSoldToday = 0,
            isOvenBroken = dailyEvent?.id == "panne_four",
            isPromotionActive = dailyEvent?.id == "promotion_fournisseur",
            activeEvent = dailyEvent?.id
        )

        return if (dailyEvent != null) {
            listOf(dailyEvent.logMessage)
        } else {
            emptyList()
        }
    }

    fun bakeBread(): ActionResult {
        if (state.actionsLeft <= 0) {
            return ActionResult(false, listOf("❌ Aucune action restante pour aujourd'hui !"))
        }
        if (state.isOvenBroken) {
            return ActionResult(false, listOf("❌ Le four est en panne ! Impossible de fabriquer du pain aujourd'hui !"))
        }

        val inv = state.inventory
        if (inv.flour < 10 || inv.yeast < 2 || inv.salt < 1 || inv.water < 10) {
            return ActionResult(false, listOf("❌ Ingrédients insuffisants pour lancer une fournée !"))
        }

        val updatedInventory = inv.copy(
            flour = inv.flour - 10,
            yeast = inv.yeast - 2,
            salt = inv.salt - 1,
            water = inv.water - 10
        )

        val updatedStocks = state.breadStocks.copy(
            fresh = state.breadStocks.fresh + EconomyEngine.BAKE_PRODUCTION
        )

        state = state.copy(
            inventory = updatedInventory,
            breadStocks = updatedStocks,
            actionsLeft = state.actionsLeft - 1
        )

        return ActionResult(
            success = true,
            messages = listOf("🥖 Fournée cuite avec succès (+30 pains frais)")
        )
    }

    fun sellBread(): ActionResult {
        if (state.actionsLeft <= 0) {
            return ActionResult(false, listOf("❌ Aucune action restante pour aujourd'hui !"))
        }

        val sale = EconomyEngine.executeSale(
            currentStocks = state.breadStocks,
            maxClients = state.maxClientsToday,
            breadsSoldToday = state.breadsSoldToday,
            activeEvent = state.activeEvent
        )

        if (!sale.success) {
            return ActionResult(false, listOf("❌ ${sale.errorMessage}"))
        }

        state = state.copy(
            breadStocks = sale.newStocks,
            breadsSoldToday = sale.newBreadsSoldToday,
            cash = state.cash + sale.totalRevenue,
            actionsLeft = state.actionsLeft - 1
        )

        return ActionResult(
            success = true,
            messages = sale.logMessages,
            moneyEarned = sale.totalRevenue
        )
    }

    fun buyIngredients(): ActionResult {
        if (state.actionsLeft <= 0) {
            return ActionResult(false, listOf("❌ Aucune action restante pour aujourd'hui !"))
        }

        val cost = if (state.isPromotionActive) {
            EconomyEngine.INGREDIENT_PACK_PROMO_COST
        } else {
            EconomyEngine.INGREDIENT_PACK_COST
        }

        if (state.cash < cost) {
            return ActionResult(false, listOf("❌ Pas assez d'argent liquide !"))
        }

        val inv = state.inventory
        val updatedInventory = inv.copy(
            flour = inv.flour + 50,
            yeast = inv.yeast + 10,
            salt = inv.salt + 5,
            water = inv.water + 50
        )

        state = state.copy(
            cash = state.cash - cost,
            inventory = updatedInventory,
            actionsLeft = state.actionsLeft - 1
        )

        val msg = if (state.isPromotionActive) {
            "📦 Ingrédients achetés en promotion (-${cost}€)"
        } else {
            "📦 Ingrédients achetés (-${cost}€)"
        }

        return ActionResult(success = true, messages = listOf(msg))
    }

    fun depositToBank(amount: Int): ActionResult {
        if (state.actionsLeft <= 0) {
            return ActionResult(false, listOf("❌ Aucune action restante pour aujourd'hui !"))
        }
        if (amount <= 0 || amount > state.cash) {
            return ActionResult(false, listOf("❌ Montant invalide pour le dépôt !"))
        }

        val fee = ceil(amount * 0.10).toInt()
        val netDeposit = amount - fee

        state = state.copy(
            cash = state.cash - amount,
            bank = state.bank + netDeposit,
            actionsLeft = state.actionsLeft - 1
        )

        return ActionResult(
            success = true,
            messages = listOf("🏦 Dépôt en banque : ${netDeposit}€ déposés (frais : ${fee}€)")
        )
    }

    data class DayTransition(
        val isCycleEnd: Boolean,
        val logs: List<String>
    )

    fun endDay(): DayTransition {
        val aging = EconomyEngine.ageBreads(state.breadStocks)
        val logs = mutableListOf<String>()

        if (aging.discardedBreads > 0) {
            val label = if (aging.discardedBreads > 1) {
                "${aging.discardedBreads} pains durs jetés (périmés)"
            } else {
                "${aging.discardedBreads} pain dur jeté (périmé)"
            }
            logs.add("🗑️ $label")
        }

        val nextDay = state.day + 1
        return if (nextDay > 7) {
            state = state.copy(
                breadStocks = aging.newStocks,
                actionsLeft = 0
            )
            DayTransition(isCycleEnd = true, logs = logs)
        } else {
            state = state.copy(
                day = nextDay,
                breadStocks = aging.newStocks
            )
            val morningLogs = startNewDay()
            logs.addAll(morningLogs)
            DayTransition(isCycleEnd = false, logs = logs)
        }
    }

    fun startNewCycle() {
        state = state.copy(
            cycle = state.cycle + 1,
            day = 1
        )
        startNewDay()
    }

    fun getCycleReport(): CycleReport {
        val total = state.cash + state.bank
        val score = total * state.cycle
        return CycleReport(
            cycle = state.cycle,
            cash = state.cash,
            bank = state.bank,
            totalWealth = total,
            score = score
        )
    }
}
