package com.boulangerie.game.view

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.boulangerie.game.R
import com.boulangerie.game.contract.BoulangerieContract

data class TerminalEntry(
    val text: String,
    val type: BoulangerieContract.LogType = BoulangerieContract.LogType.NORMAL
)

class TerminalLogAdapter : RecyclerView.Adapter<TerminalLogAdapter.LogViewHolder>() {

    private val logs = mutableListOf<TerminalEntry>()

    fun addLog(entry: TerminalEntry) {
        logs.add(entry)
        notifyItemInserted(logs.size - 1)
    }

    fun clear() {
        logs.clear()
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_terminal_log, parent, false)
        return LogViewHolder(view)
    }

    override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
        holder.bind(logs[position])
    }

    override fun getItemCount(): Int = logs.size

    class LogViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvLog: TextView = itemView.findViewById(R.id.tvLogText)

        fun bind(entry: TerminalEntry) {
            tvLog.text = entry.text
            when (entry.type) {
                BoulangerieContract.LogType.COMMAND -> tvLog.setTextColor(Color.parseColor("#38BDF8"))
                BoulangerieContract.LogType.SUCCESS -> tvLog.setTextColor(Color.parseColor("#4ADE80"))
                BoulangerieContract.LogType.WARNING -> tvLog.setTextColor(Color.parseColor("#FBBF24"))
                BoulangerieContract.LogType.ERROR -> tvLog.setTextColor(Color.parseColor("#F87171"))
                BoulangerieContract.LogType.EVENT -> tvLog.setTextColor(Color.parseColor("#C084FC"))
                else -> tvLog.setTextColor(Color.parseColor("#D4D4D8"))
            }
        }
    }
}
