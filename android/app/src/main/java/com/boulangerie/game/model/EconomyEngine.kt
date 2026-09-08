package com.boulangerie.game.model

import kotlin.math.ceil
import kotlin.random.Random

/**
 * Moteur économique pur (logique métier) de la boulangerie en Kotlin.
 */
object EconomyEngine {

    const val INGREDIENT_PACK_COST = 20
    const val INGREDIENT_PACK_PROMO_COST = 10
    const val BAKE_PRODUCTION = 30

    fun calculateBreadPrice(age: Int, event: String?): Int {
        val basePrice = when (age) {
            0 -> Random.nextInt(4, 7) // 4€ à 6€
            1 -> Random.nextInt(3, 5) // 3€ à 4€
            2 -> 2                    // 2€
            else -> 0
        }

        var multiplier = 1.0
        var priceBonus = 0

        when (event) {
            "clients_riches" -> multiplier = 2.0
            "fete_village" -> multiplier = 1.5
            "journee_pluvieuse" -> priceBonus = -1
        }

        val calculated = (basePrice * multiplier).toInt() + priceBonus
        return calculated.coerceAtLeast(1)
    }

    data class SaleResult(
        val success: Boolean,
        val errorMessage: String? = null,
        val breadsSold: Int = 0,
        val totalRevenue: Int = 0,
        val newStocks: BreadStocks,
        val newBreadsSoldToday: Int,
        val logMessages: List<String> = emptyList()
    )

    fun executeSale(
        currentStocks: BreadStocks,
        maxClients: Int,
        breadsSoldToday: Int,
        activeEvent: String?
    ): SaleResult {
        val sellableTotal = currentStocks.fresh + currentStocks.day1 + currentStocks.day2
        val clientsRemaining = (maxClients - breadsSoldToday).coerceAtLeast(0)

        if (sellableTotal <= 0) {
            return SaleResult(
                success = false,
                errorMessage = "Plus de pain vendable en stock !",
                newStocks = currentStocks,
                newBreadsSoldToday = breadsSoldToday
            )
        }

        if (clientsRemaining <= 0) {
            return SaleResult(
                success = false,
                errorMessage = "Plus de clients aujourd'hui !",
                newStocks = currentStocks,
                newBreadsSoldToday = breadsSoldToday
            )
        }

        val isStrike = activeEvent == "greve_boulangers"
        val stockCap = if (isStrike) ceil(sellableTotal / 2.0).toInt() else sellableTotal
        val saleLimit = minOf(clientsRemaining, stockCap)

        var soldTotal = 0
        var totalRevenue = 0

        var fresh = currentStocks.fresh
        var day1 = currentStocks.day1
        var day2 = currentStocks.day2

        // Phase 1 : Pains de 2 jours
        while (day2 > 0 && soldTotal < saleLimit) {
            totalRevenue += calculateBreadPrice(2, activeEvent)
            day2 -= 1
            soldTotal += 1
        }

        // Phase 2 : Pains de 1 jour
        while (day1 > 0 && soldTotal < saleLimit) {
            totalRevenue += calculateBreadPrice(1, activeEvent)
            day1 -= 1
            soldTotal += 1
        }

        // Phase 3 : Pains frais (0 jour)
        while (fresh > 0 && soldTotal < saleLimit) {
            totalRevenue += calculateBreadPrice(0, activeEvent)
            fresh -= 1
            soldTotal += 1
        }

        val updatedBreadsSoldToday = breadsSoldToday + soldTotal
        val finalClientsRemaining = (maxClients - updatedBreadsSoldToday).coerceAtLeast(0)

        // Formulation avec accord automatique singulier/pluriel
        val breadText = if (soldTotal > 1) "$soldTotal pains vendus" else "$soldTotal pain vendu"
        val clientText = if (finalClientsRemaining <= 1) {
            "Client restant : $finalClientsRemaining/$maxClients"
        } else {
            "Clients restants : $finalClientsRemaining/$maxClients"
        }

        val logs = mutableListOf("✅ $breadText pour un total de ${totalRevenue}€ ! $clientText")
        if (isStrike && (fresh > 0 || day1 > 0 || day2 > 0)) {
            logs.add("⚠️ Vente limitée par la grève des boulangers !")
        }

        return SaleResult(
            success = true,
            breadsSold = soldTotal,
            totalRevenue = totalRevenue,
            newStocks = currentStocks.copy(fresh = fresh, day1 = day1, day2 = day2),
            newBreadsSoldToday = updatedBreadsSoldToday,
            logMessages = logs
        )
    }

    data class AgingResult(
        val newStocks: BreadStocks,
        val discardedBreads: Int
    )

    fun ageBreads(stocks: BreadStocks): AgingResult {
        val discarded = stocks.day2 // Les pains de 2j passent à 3j (périmés et jetés)
        val aged = BreadStocks(
            fresh = 0,
            day1 = stocks.fresh,
            day2 = stocks.day1,
            spoiled = discarded
        )
        return AgingResult(aged, discarded)
    }
}
