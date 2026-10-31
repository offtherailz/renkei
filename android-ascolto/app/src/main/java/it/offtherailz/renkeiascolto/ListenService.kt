package it.offtherailz.renkeiascolto

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.PI
import kotlin.math.min
import kotlin.math.sin

// Come Google Maps: servizio in primo piano che parla con la sintesi del telefono,
// quindi continua a schermo bloccato. Pausa e avanti da notifica, blocco schermo e cuffie.
class ListenService : Service() {
    companion object {
        const val ACTION_START = "start"
        const val ACTION_TOGGLE = "toggle"
        const val ACTION_NEXT = "next"
        const val ACTION_STOP = "stop"
        private const val CHANNEL = "ascolto"
        private const val NOTIFICATION_ID = 1

        // Stato letto dalla schermata principale.
        @Volatile var isRunning = false
        @Volatile var isPaused = false
        @Volatile var title = ""
        @Volatile var answerText = ""
        @Volatile var progress = ""
        @Volatile var problem = ""
    }

    private var tts: TextToSpeech? = null
    private val ttsReady = CountDownLatch(1)
    @Volatile private var ttsOk = false
    @Volatile private var speechDone: CountDownLatch? = null

    @Volatile private var running = false
    @Volatile private var paused = false
    @Volatile private var skip = false
    private var pausedByFocus = false
    private var worker: Thread? = null

    private lateinit var session: MediaSession
    private var wakeLock: PowerManager.WakeLock? = null
    private var focusRequest: AudioFocusRequest? = null

    private val audioAttributes: AudioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Ascolto", NotificationManager.IMPORTANCE_LOW))
        session = MediaSession(this, "renkei-ascolto")
        session.setCallback(object : MediaSession.Callback() {
            override fun onPlay() = setPaused(false)
            override fun onPause() = setPaused(true)
            override fun onSkipToNext() = next()
            override fun onStop() = stopAll()
        })
        session.isActive = true
        tts = TextToSpeech(this) { status ->
            ttsOk = status == TextToSpeech.SUCCESS
            if (ttsOk) {
                tts?.setAudioAttributes(audioAttributes)
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) { speechDone?.countDown() }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) { speechDone?.countDown() }
                    override fun onError(utteranceId: String?, errorCode: Int) { speechDone?.countDown() }
                    override fun onStop(utteranceId: String?, interrupted: Boolean) { speechDone?.countDown() }
                })
            }
            ttsReady.countDown()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Android chiede la notifica subito dopo l'avvio del servizio.
        goForeground()
        when (intent?.action) {
            ACTION_START -> start()
            ACTION_TOGGLE -> if (running) setPaused(!paused) else stopAll()
            ACTION_NEXT -> if (running) next() else stopAll()
            else -> stopAll()
        }
        return START_NOT_STICKY
    }

    private fun goForeground() {
        val n = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIFICATION_ID, n)
        }
    }

    private fun start() {
        if (running) return
        running = true
        paused = false
        skip = false
        isRunning = true
        isPaused = false
        problem = ""
        val power = getSystemService(PowerManager::class.java)
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "renkei:ascolto").apply { acquire(12 * 60 * 60 * 1000L) }
        requestFocus()
        updateSession()
        worker = Thread({ runLoop() }, "ascolto").also { it.start() }
    }

    private fun requestFocus() {
        val am = getSystemService(AudioManager::class.java)
        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(audioAttributes)
            .setOnAudioFocusChangeListener { change ->
                when (change) {
                    AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                        if (!paused) {
                            pausedByFocus = change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT
                            setPaused(true)
                        }
                    }
                    AudioManager.AUDIOFOCUS_GAIN -> {
                        if (pausedByFocus) {
                            pausedByFocus = false
                            setPaused(false)
                        }
                    }
                }
            }
            .build()
        focusRequest = req
        am.requestAudioFocus(req)
    }

    private fun setPaused(value: Boolean) {
        if (!running || paused == value) return
        paused = value
        isPaused = value
        if (value) tts?.stop()
        updateSession()
        refreshNotification()
    }

    private fun next() {
        if (!running) return
        skip = true
        tts?.stop()
    }

    private fun stopAll() {
        running = false
        isRunning = false
        isPaused = false
        tts?.stop()
        focusRequest?.let { getSystemService(AudioManager::class.java).abandonAudioFocusRequest(it) }
        wakeLock?.takeIf { it.isHeld }?.release()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        running = false
        isRunning = false
        tts?.shutdown()
        session.release()
        wakeLock?.takeIf { it.isHeld }?.release()
        super.onDestroy()
    }

    private val alive: Boolean get() = running && !paused && !skip

    private fun runLoop() {
        ttsReady.await(20, TimeUnit.SECONDS)
        val engine = tts
        if (!ttsOk || engine == null) {
            fail("Sintesi vocale non disponibile su questo telefono.")
            return
        }
        val noJa = engine.isLanguageAvailable(Locale.JAPAN) < TextToSpeech.LANG_AVAILABLE
        val noIt = engine.isLanguageAvailable(Locale.ITALY) < TextToSpeech.LANG_AVAILABLE
        if (noJa || noIt) {
            val mancanti = listOfNotNull(if (noJa) "giapponese" else null, if (noIt) "italiano" else null).joinToString(" e ")
            fail("Manca la voce $mancanti: scaricala nelle impostazioni di sintesi vocale.")
            return
        }
        val prefs = getSharedPreferences(Prefs.FILE, Context.MODE_PRIVATE)
        val levels = prefs.getStringSet(Prefs.LEVELS, setOf("N4")) ?: setOf("N4")
        val cats = prefs.getStringSet(Prefs.CATS, BLOCKS.map { it.cat }.toSet()) ?: BLOCKS.map { it.cat }.toSet()
        val direction = prefs.getString(Prefs.DIRECTION, "alterna") ?: "alterna"
        val scale = recallScale(prefs.getString(Prefs.PAUSE, "media") ?: "media")
        val all = Catalog.load(this)
        val seen = HashSet(prefs.getStringSet(Prefs.SEEN, emptySet()) ?: emptySet())
        val total = all.count { (it.level == "*" || it.level in levels) && it.cat in cats }
        if (total == 0) {
            fail("Nessuna voce con queste opzioni.")
            return
        }
        var queue = buildQueue(all, levels, cats, seen, direction)
        var pos = 0
        val poolKeys = all.filter { (it.level == "*" || it.level in levels) && it.cat in cats }.map { it.key }
        while (running) {
            if (pos >= queue.size) {
                if (poolKeys.all { it in seen }) {
                    seen.removeAll(poolKeys.toSet())
                    prefs.edit().putStringSet(Prefs.SEEN, HashSet(seen)).apply()
                    say("Hai ascoltato tutto. Ricomincio da capo.", Locale.ITALY, 1f, 1f)
                }
                queue = buildQueue(all, levels, cats, seen, direction)
                pos = 0
            }
            val item = queue[pos]
            progress = "${poolKeys.count { it in seen }} / $total"
            title = BLOCKS.firstOrNull { it.cat == item.cat }?.title ?: item.cat
            answerText = ""
            refreshNotification()
            val done = playItem(item, scale)
            if (!running) return
            if (skip) {
                skip = false
                pos++
                continue
            }
            if (!done) {
                while (running && paused) Thread.sleep(200)
                continue
            }
            seen.add(item.key)
            prefs.edit().putStringSet(Prefs.SEEN, HashSet(seen)).apply()
            pos++
        }
    }

    private fun fail(message: String) {
        problem = message
        android.os.Handler(mainLooper).post { stopAll() }
    }

    private fun playItem(item: Item, scale: Float): Boolean {
        cue(listOf(880.0 to 0.0, 1175.0 to 0.14), 550)
        item.intro?.let {
            if (alive) say(it, Locale.ITALY, 1f, 1f)
            pauseFor(600)
        }
        val hasRecall = item.steps.any { it.t == "r" }
        if (!hasRecall) reveal(item)
        for (step in item.steps) {
            if (!alive) return false
            when (step.t) {
                "j" -> say(step.x, Locale.JAPAN, step.rate, pitchOf(step.voice))
                "i" -> say(step.x, Locale.ITALY, 1f, 1f)
                "w" -> pauseFor(step.ms)
                "r" -> {
                    pauseFor((step.ms * scale).toLong())
                    if (alive) {
                        reveal(item)
                        cue(listOf(440.0 to 0.0), 350)
                    }
                }
                "b" -> cue(listOf(1320.0 to 0.0, 1320.0 to 0.12), 700)
                "c" -> cue(listOf(784.0 to 0.0, 1047.0 to 0.2), 850)
            }
        }
        pauseFor(900)
        return alive
    }

    private fun reveal(item: Item) {
        answerText = if (item.written == item.it) item.written else "${item.written}\n${item.it}"
        refreshNotification()
    }

    // Una voce per ruolo, con l'altezza: il narratore più alto, l'uomo più basso.
    private fun pitchOf(voice: String): Float = when (voice) {
        "M" -> 0.8f
        "N" -> 1.15f
        else -> 1f
    }

    private fun say(text: String, locale: Locale, rate: Float, pitch: Float) {
        val engine = tts ?: return
        val latch = CountDownLatch(1)
        speechDone = latch
        engine.setLanguage(locale)
        engine.setSpeechRate(rate)
        engine.setPitch(pitch)
        val params = Bundle()
        if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, params, System.nanoTime().toString()) != TextToSpeech.SUCCESS) return
        latch.await(60, TimeUnit.SECONDS)
    }

    // Attesa interrompibile: pausa o «avanti» la chiudono subito.
    private fun pauseFor(ms: Long) {
        val end = System.currentTimeMillis() + ms
        while (alive && System.currentTimeMillis() < end) {
            Thread.sleep(min(100L, end - System.currentTimeMillis()).coerceAtLeast(1L))
        }
    }

    private fun cue(notes: List<Pair<Double, Double>>, waitMs: Long) {
        try {
            val rate = 22050
            val noteSeconds = 0.22
            val seconds = notes.maxOf { it.second } + noteSeconds
            val pcm = ShortArray((seconds * rate).toInt())
            for ((freq, at) in notes) {
                val from = (at * rate).toInt()
                val count = (noteSeconds * rate).toInt()
                for (i in 0 until count) {
                    if (from + i >= pcm.size) break
                    val t = i.toDouble() / rate
                    val envelope = min(1.0, t / 0.015) * (1.0 - i.toDouble() / count)
                    val sample = sin(2 * PI * freq * t) * envelope * 0.25
                    pcm[from + i] = (pcm[from + i] + sample * Short.MAX_VALUE).toInt().coerceIn(-32768, 32767).toShort()
                }
            }
            val track = AudioTrack.Builder()
                .setAudioAttributes(audioAttributes)
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(rate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(pcm.size * 2)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()
            track.write(pcm, 0, pcm.size)
            track.play()
            Thread.sleep(waitMs)
            track.stop()
            track.release()
        } catch (e: Exception) {
            // niente segnali: la voce va comunque
        }
    }

    private fun updateSession() {
        val state = if (paused) PlaybackState.STATE_PAUSED else PlaybackState.STATE_PLAYING
        session.setPlaybackState(
            PlaybackState.Builder()
                .setActions(
                    PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
                        PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_STOP
                )
                .setState(state, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1f)
                .build()
        )
    }

    private fun refreshNotification() {
        session.setMetadata(
            MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title.ifEmpty { "Renkei Ascolto" })
                .putString(MediaMetadata.METADATA_KEY_ARTIST, answerText.ifEmpty { progress })
                .build()
        )
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, buildNotification())
    }

    private fun action(icon: Int, label: String, verb: String): Notification.Action {
        val pi = PendingIntent.getService(
            this, verb.hashCode(), Intent(this, ListenService::class.java).setAction(verb),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return Notification.Action.Builder(Icon.createWithResource(this, icon), label, pi).build()
    }

    private fun buildNotification(): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title.ifEmpty { "Renkei Ascolto" })
            .setContentText(answerText.ifEmpty { progress })
            .setContentIntent(open)
            .setOngoing(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(
                if (paused) action(android.R.drawable.ic_media_play, "Riprendi", ACTION_TOGGLE)
                else action(android.R.drawable.ic_media_pause, "Pausa", ACTION_TOGGLE)
            )
            .addAction(action(android.R.drawable.ic_media_next, "Avanti", ACTION_NEXT))
            .addAction(action(android.R.drawable.ic_menu_close_clear_cancel, "Ferma", ACTION_STOP))
            .setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1, 2))
            .build()
    }
}
