package com.boulangerie.game.view

import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.LayoutInflater
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.boulangerie.game.R
import com.boulangerie.game.contract.BoulangerieContract
import com.boulangerie.game.model.BoulangerieState
import com.boulangerie.game.model.CycleReport
import com.boulangerie.game.presenter.BoulangeriePresenter

/**
 * Vue principale Android en Kotlin respectant l'architecture MVP.
 * Implémente BoulangerieContract.View et délègue les interactions au Presenter.
 */
class MainActivity : AppCompatActivity(), BoulangerieContract.View {

    private lateinit var presenter: BoulangerieContract.Presenter

    // HUD Views
    private lateinit var tvBakeryName: TextView
    private lateinit var tvCycleDay: TextView
    private lateinit var tvActionsCount: TextView
    private lateinit var tvCash: TextView
    private lateinit var tvBank: TextView
    private lateinit var tvClientsCount: TextView
    private lateinit var pbClients: ProgressBar

    // Bread Stock Views
    private lateinit var tvBreadFresh: TextView
    private lateinit var tvBreadDay1: TextView
    private lateinit var tvBreadDay2: TextView
    private lateinit var tvBakeReadyBadge: TextView

    // Inventory Views
    private lateinit var tvFlour: TextView
    private lateinit var tvYeast: TextView
    private lateinit var tvSalt: TextView
    private lateinit var tvWater: TextView

    // Action Buttons & Subtexts
    private lateinit var btnBake: Button
    private lateinit var btnSell: Button
    private lateinit var btnBuy: Button
    private lateinit var btnBank: Button
    private lateinit var btnEndDay: Button

    // Terminal
    private lateinit var rvTerminal: RecyclerView
    private val terminalAdapter = TerminalLogAdapter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        setupListeners()

        presenter = BoulangeriePresenter()
        presenter.attachView(this)
        presenter.onStartNewGame("Boulangerie Emma")
    }

    override fun onDestroy() {
        presenter.detachView()
        super.onDestroy()
    }

    private fun initViews() {
        tvBakeryName = findViewById(R.id.tvBakeryName)
        tvCycleDay = findViewById(R.id.tvCycleDay)
        tvActionsCount = findViewById(R.id.tvActionsCount)
        tvCash = findViewById(R.id.tvCash)
        tvBank = findViewById(R.id.tvBank)
        tvClientsCount = findViewById(R.id.tvClientsCount)
        pbClients = findViewById(R.id.pbClients)

        tvBreadFresh = findViewById(R.id.tvBreadFresh)
        tvBreadDay1 = findViewById(R.id.tvBreadDay1)
        tvBreadDay2 = findViewById(R.id.tvBreadDay2)
        tvBakeReadyBadge = findViewById(R.id.tvBakeReadyBadge)

        tvFlour = findViewById(R.id.tvFlour)
        tvYeast = findViewById(R.id.tvYeast)
        tvSalt = findViewById(R.id.tvSalt)
        tvWater = findViewById(R.id.tvWater)

        btnBake = findViewById(R.id.btnBake)
        btnSell = findViewById(R.id.btnSell)
        btnBuy = findViewById(R.id.btnBuy)
        btnBank = findViewById(R.id.btnBank)
        btnEndDay = findViewById(R.id.btnEndDay)

        rvTerminal = findViewById(R.id.rvTerminal)
        rvTerminal.layoutManager = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        rvTerminal.adapter = terminalAdapter
    }

    private fun setupListeners() {
        btnBake.setOnClickListener { presenter.onBakeBreadClicked() }
        btnSell.setOnClickListener { presenter.onSellBreadClicked() }
        btnBuy.setOnClickListener { presenter.onBuyIngredientsClicked() }
        btnBank.setOnClickListener { presenter.onBankDepositRequested() }
        btnEndDay.setOnClickListener { presenter.onEndDayClicked() }
    }

    override fun updateHUD(state: BoulangerieState) {
        tvBakeryName.text = state.bakeryName
        tvCycleDay.text = "Cycle ${state.cycle} • Jour ${state.day}/7"
        tvActionsCount.text = "${state.actionsLeft}/5"
        tvCash.text = "${state.cash}€"
        tvBank.text = "${state.bank}€"

        val clientsRemaining = state.clientsRemaining
        val clientLabel = if (clientsRemaining <= 1) "$clientsRemaining restant" else "$clientsRemaining restants"
        tvClientsCount.text = "${state.breadsSoldToday} / ${state.maxClientsToday} ($clientLabel)"
        pbClients.max = state.maxClientsToday
        pbClients.progress = state.breadsSoldToday

        tvBreadFresh.text = state.breadStocks.fresh.toString()
        tvBreadDay1.text = state.breadStocks.day1.toString()
        tvBreadDay2.text = state.breadStocks.day2.toString()

        val batches = state.possibleBakeBatches
        if (state.isOvenBroken) {
            tvBakeReadyBadge.text = "🚨 Four en panne !"
        } else if (batches > 0) {
            val label = if (batches > 1) "$batches fournées prêtes" else "$batches fournée prête"
            tvBakeReadyBadge.text = "🥖 $label (+${batches * 30} pains)"
        } else {
            tvBakeReadyBadge.text = "⚠️ Ingrédients insuffisants"
        }

        tvFlour.text = "${state.inventory.flour} kg"
        tvYeast.text = "${state.inventory.yeast} kg"
        tvSalt.text = "${state.inventory.salt} kg"
        tvWater.text = "${state.inventory.water} L"
    }

    override fun printTerminal(message: String, type: BoulangerieContract.LogType) {
        terminalAdapter.addLog(TerminalEntry(message, type))
        rvTerminal.scrollToPosition(terminalAdapter.itemCount - 1)
    }

    override fun printTerminalLines(lines: List<String>, type: BoulangerieContract.LogType) {
        lines.forEach { printTerminal(it, type) }
    }

    override fun showBankDialog(currentCash: Int) {
        val input = EditText(this).apply {
            hint = "Montant en euros (max: $currentCash€)"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
        }

        AlertDialog.Builder(this)
            .setTitle("🏦 Coffre de la Banque (Frais 10%)")
            .setMessage("Protégez vos liquidités contre les aléas et vols.")
            .setView(input)
            .setPositiveButton("Déposer") { _, _ ->
                val amount = input.text.toString().toIntOrNull() ?: 0
                presenter.onConfirmBankDeposit(amount)
            }
            .setNegativeButton("Annuler", null)
            .show()
    }

    override fun showEndCycleDialog(report: CycleReport) {
        AlertDialog.Builder(this)
            .setTitle("🏆 Bilan du Cycle ${report.cycle}")
            .setMessage("Trésorerie totale : ${report.totalWealth}€\nScore final : ${report.score} pts")
            .setPositiveButton("Continuer (Cycle ${report.cycle + 1})") { _, _ ->
                presenter.onContinueNewCycle()
            }
            .setNegativeButton("Quitter & Sauvegarder") { _, _ ->
                presenter.onEndGameAndSaveScore()
            }
            .setCancelable(false)
            .show()
    }

    override fun showRulesDialog() {
        AlertDialog.Builder(this)
            .setTitle("📜 Guide du Maître Boulanger")
            .setMessage("1. Vous disposez de 5 actions par jour.\n2. Cuisez des fournées de 30 pains.\n3. Vendez au meilleur prix avant qu'ils ne durcissent !")
            .setPositiveButton("Compris", null)
            .show()
    }

    override fun playSound(sound: BoulangerieContract.SoundEffect) {
        // Déclenchement audio natif Android (SoundPool ou MediaPlayer)
    }

    override fun triggerHapticFeedback() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator.vibrate(
                VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE)
            )
        } else {
            @Suppress("DEPRECATION")
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            vibrator.vibrate(15)
        }
    }

    override fun setControlsEnabled(enabled: Boolean) {
        btnBake.isEnabled = enabled
        btnSell.isEnabled = enabled
        btnBuy.isEnabled = enabled
        btnBank.isEnabled = enabled
        btnEndDay.isEnabled = enabled
    }
}
