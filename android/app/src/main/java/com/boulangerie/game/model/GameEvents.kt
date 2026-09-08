package com.boulangerie.game.model

import kotlin.random.Random

data class GameEvent(
    val id: String,
    val name: String,
    val description: String,
    val logMessage: String,
    val isMorningEvent: Boolean = true
)

object EventManager {

    private val allEvents = listOf(
        GameEvent(
            id = "panne_four",
            name = "Panne de four",
            description = "Votre four est en panne - impossible de fabriquer du pain aujourd'hui.",
            logMessage = "🚨 Votre four est tombé en panne ! Impossible de fabriquer du pain aujourd'hui."
        ),
        GameEvent(
            id = "promotion_fournisseur",
            name = "Promotion du meunier",
            description = "Promotion exceptionnelle : -50% sur l'achat d'ingrédients !",
            logMessage = "🎉 Le meunier vous offre une promotion de -50% sur les ingrédients aujourd'hui !"
        ),
        GameEvent(
            id = "clients_riches",
            name = "Touristes gourmets",
            description = "Une délégation de touristes achète vos pains au double du prix normal !",
            logMessage = "💎 Des touristes fortunés visitent la ville : les prix de vente sont doublés !"
        ),
        GameEvent(
            id = "fete_village",
            name = "Fête du village",
            description = "La fête du village bat son plein : +50% sur le prix de tous vos pains !",
            logMessage = "🎪 C'est la fête du village ! Les prix de vente sont augmentés de 50% !"
        ),
        GameEvent(
            id = "greve_boulangers",
            name = "Grève et manifestation",
            description = "Une manifestation limite les achats à la moitié des stocks disponibles.",
            logMessage = "📢 Grève générale : les clients n'achètent que la moitié de vos pains disponibles !"
        ),
        GameEvent(
            id = "journee_pluvieuse",
            name = "Pluie torrentielle",
            description = "La météo maussade réduit de 1€ le prix de vente unitaire des pains.",
            logMessage = "🌧️ Pluie torrentielle : les clients négocient et le prix baisse de 1€ par pain."
        )
    )

    fun rollDailyEvent(): GameEvent? {
        // 40% de chance d'événement chaque matin
        if (Random.nextInt(100) < 40) {
            return allEvents.random()
        }
        return null
    }

    fun rollClientAffluence(): Int {
        return Random.nextInt(50, 101) // 50 à 100 clients par jour
    }
}
