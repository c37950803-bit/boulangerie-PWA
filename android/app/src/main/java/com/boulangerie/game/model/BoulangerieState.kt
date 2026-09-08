package com.boulangerie.game.model

/**
 * Représentation immuable de l'état du jeu.
 */
data class BoulangerieState(
    val bakeryName: String = "Boulangerie Emma",
    val cycle: Int = 1,
    val day: Int = 1,
    val actionsLeft: Int = 5,
    val cash: Int = 1000,
    val bank: Int = 0,
    val inventory: IngredientInventory = IngredientInventory(),
    val breadStocks: BreadStocks = BreadStocks(),
    val maxClientsToday: Int = 50,
    val breadsSoldToday: Int = 0,
    val isOvenBroken: Boolean = false,
    val isPromotionActive: Boolean = false,
    val activeEvent: String? = null
) {
    val totalWealth: Int get() = cash + bank
    val clientsRemaining: Int get() = (maxClientsToday - breadsSoldToday).coerceAtLeast(0)
    val totalSellableBreads: Int get() = breadStocks.fresh + breadStocks.day1 + breadStocks.day2
    val possibleBakeBatches: Int get() = inventory.calculatePossibleBatches()
}

data class IngredientInventory(
    val flour: Int = 50,
    val yeast: Int = 10,
    val salt: Int = 5,
    val water: Int = 50
) {
    fun calculatePossibleBatches(): Int {
        val f = flour / 10
        val y = yeast / 2
        val s = salt / 1
        val w = water / 10
        return minOf(f, y, s, w).coerceAtLeast(0)
    }
}

data class BreadStocks(
    val fresh: Int = 0,   // 0 jour
    val day1: Int = 0,    // 1 jour
    val day2: Int = 0,    // 2 jours
    val spoiled: Int = 0  // 3+ jours (jeté)
)

data class CycleReport(
    val cycle: Int,
    val cash: Int,
    val bank: Int,
    val totalWealth: Int,
    val score: Int
)

data class ActionResult(
    val success: Boolean,
    val messages: List<String> = emptyList(),
    val moneyEarned: Int = 0
)
