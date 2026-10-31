package it.offtherailz.renkeiascolto

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView

// Schermata essenziale: opzioni, avvio, e cosa sta dicendo. Il resto è nel servizio.
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var status: TextView
    private lateinit var answer: TextView
    private lateinit var startButton: Button
    private lateinit var pauseButton: Button
    private lateinit var nextButton: Button
    private lateinit var options: LinearLayout
    private lateinit var batteryButton: Button

    private val levelBoxes = LinkedHashMap<String, CheckBox>()
    private val catBoxes = LinkedHashMap<String, CheckBox>()
    private lateinit var directionGroup: RadioGroup
    private lateinit var pauseGroup: RadioGroup

    private val refresher = object : Runnable {
        override fun run() {
            refresh()
            handler.postDelayed(this, 500)
        }
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun label(text: String, size: Float = 15f): TextView = TextView(this).apply {
        this.text = text
        textSize = size
        setPadding(0, dp(10), 0, dp(4))
    }

    private fun radios(vararg choices: Pair<String, String>, selected: String): RadioGroup = RadioGroup(this).apply {
        for ((value, text) in choices) {
            val r = RadioButton(this@MainActivity)
            r.text = text
            r.tag = value
            r.id = View.generateViewId()
            addView(r)
            if (value == selected) check(r.id)
        }
    }

    private fun selectedTag(g: RadioGroup): String =
        g.findViewById<RadioButton>(g.checkedRadioButtonId)?.tag as? String ?: ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        val prefs = getSharedPreferences(Prefs.FILE, Context.MODE_PRIVATE)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), dp(40))
        }
        root.addView(label("🎧 Renkei Ascolto", 22f))
        root.addView(label("La voce propone, c'è una pausa per ricordare, poi la risposta. Continua a schermo bloccato. Due note: voce nuova. Nota grave: risposta. Doppio bip: buco nella frase."))

        status = label("")
        root.addView(status)
        answer = label("", 18f)
        root.addView(answer)

        startButton = Button(this)
        startButton.setOnClickListener { if (ListenService.isRunning) send(ListenService.ACTION_STOP) else start() }
        root.addView(startButton)
        pauseButton = Button(this)
        pauseButton.setOnClickListener { send(ListenService.ACTION_TOGGLE) }
        root.addView(pauseButton)
        nextButton = Button(this)
        nextButton.text = "⏭ Avanti"
        nextButton.setOnClickListener { send(ListenService.ACTION_NEXT) }
        root.addView(nextButton)

        options = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        options.addView(label("Livelli (le prove d'esame sono sempre N4)"))
        val levels = prefs.getStringSet(Prefs.LEVELS, setOf("N4")) ?: setOf("N4")
        for (l in listOf("N5", "N4")) {
            val c = CheckBox(this)
            c.text = l
            c.isChecked = l in levels
            levelBoxes[l] = c
            options.addView(c)
        }
        options.addView(label("Cosa ascoltare"))
        val cats = prefs.getStringSet(Prefs.CATS, BLOCKS.map { it.cat }.toSet()) ?: BLOCKS.map { it.cat }.toSet()
        for (b in BLOCKS) {
            val c = CheckBox(this)
            c.text = b.title
            c.isChecked = b.cat in cats
            catBoxes[b.cat] = c
            options.addView(c)
        }
        options.addView(label("Direzione di frasi e parole"))
        directionGroup = radios(
            "alterna" to "Alterna a ogni blocco",
            "jp-it" to "Giapponese → italiano",
            "it-jp" to "Italiano → giapponese",
            selected = prefs.getString(Prefs.DIRECTION, "alterna") ?: "alterna"
        )
        options.addView(directionGroup)
        options.addView(label("Pausa per ricordare"))
        pauseGroup = radios(
            "breve" to "Breve",
            "media" to "Media",
            "lunga" to "Lunga",
            selected = prefs.getString(Prefs.PAUSE, "media") ?: "media"
        )
        options.addView(pauseGroup)

        val reset = Button(this)
        reset.text = "↺ Ricomincia da capo"
        reset.setOnClickListener {
            prefs.edit().remove(Prefs.SEEN).apply()
            ListenService.progress = ""
            refresh()
        }
        options.addView(reset)
        val voices = Button(this)
        voices.text = "Voci del telefono"
        voices.setOnClickListener { startActivity(Intent("com.android.settings.TTS_SETTINGS")) }
        options.addView(voices)
        root.addView(options)

        batteryButton = Button(this)
        batteryButton.text = "Non fermarla col risparmio batteria"
        batteryButton.setOnClickListener {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        }
        root.addView(batteryButton)

        setContentView(ScrollView(this).apply { addView(root) })
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun onResume() {
        super.onResume()
        handler.post(refresher)
    }

    override fun onPause() {
        handler.removeCallbacks(refresher)
        super.onPause()
    }

    private fun start() {
        val levels = levelBoxes.filterValues { it.isChecked }.keys
        val cats = catBoxes.filterValues { it.isChecked }.keys
        getSharedPreferences(Prefs.FILE, Context.MODE_PRIVATE).edit()
            .putStringSet(Prefs.LEVELS, HashSet(levels))
            .putStringSet(Prefs.CATS, HashSet(cats))
            .putString(Prefs.DIRECTION, selectedTag(directionGroup))
            .putString(Prefs.PAUSE, selectedTag(pauseGroup))
            .apply()
        ListenService.problem = ""
        startForegroundService(Intent(this, ListenService::class.java).setAction(ListenService.ACTION_START))
    }

    private fun send(action: String) {
        startForegroundService(Intent(this, ListenService::class.java).setAction(action))
    }

    private fun refresh() {
        val running = ListenService.isRunning
        startButton.text = if (running) "⏹ Ferma" else "▶ Inizia"
        pauseButton.text = if (ListenService.isPaused) "▶ Riprendi" else "⏸ Pausa"
        pauseButton.visibility = if (running) View.VISIBLE else View.GONE
        nextButton.visibility = if (running) View.VISIBLE else View.GONE
        options.visibility = if (running) View.GONE else View.VISIBLE
        val ignoring = getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)
        batteryButton.visibility = if (ignoring) View.GONE else View.VISIBLE
        status.text = when {
            ListenService.problem.isNotEmpty() -> ListenService.problem
            running -> "${ListenService.title}  ·  ${ListenService.progress}"
            else -> ""
        }
        answer.text = if (running) ListenService.answerText else ""
    }
}
