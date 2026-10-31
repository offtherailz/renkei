package it.offtherailz.renkeiascolto

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

// Passi di una voce, come in src/lib/core/listenExam.ts (items.json è generato da lì):
// j = voce giapponese, i = voce italiana, w = attesa, r = pausa per ricordare,
// b = bip al posto del buco, c = suono d'inizio prova d'ascolto.
class Step(val t: String, val x: String, val ms: Long, val rate: Float, val voice: String)

class Item(
    val key: String,
    val cat: String,
    val level: String, // N5, N4, oppure * per le prove d'esame (sempre incluse)
    val jp: String,
    val it: String,
    val written: String,
    val steps: List<Step>,
    val alt: List<Step>?,
    val intro: String? = null
)

object Catalog {
    @Volatile private var cache: List<Item>? = null

    private fun steps(a: JSONArray): List<Step> = List(a.length()) { i ->
        val o: JSONObject = a.getJSONObject(i)
        Step(o.getString("t"), o.optString("x"), o.optLong("ms"), o.optDouble("r", 1.0).toFloat(), o.optString("v"))
    }

    fun load(ctx: Context): List<Item> {
        cache?.let { return it }
        val text = ctx.assets.open("items.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
        val a = JSONArray(text)
        val out = List(a.length()) { i ->
            val o = a.getJSONObject(i)
            Item(
                o.getString("k"), o.getString("c"), o.getString("l"), o.getString("j"), o.getString("i"), o.getString("w"),
                steps(o.getJSONArray("s")),
                if (o.has("a")) steps(o.getJSONArray("a")) else null
            )
        }
        cache = out
        return out
    }
}

class Block(val cat: String, val n: Int, val title: String)

// A blocchi annunciati, così si sa sempre cosa si sta ascoltando.
val BLOCKS = listOf(
    Block("ascolto", 4, "Prove d'ascolto"),
    Block("forme", 10, "Forme"),
    Block("grammatica", 5, "Grammatica"),
    Block("parole", 10, "Parole"),
    Block("frasi", 6, "Frasi"),
    Block("trucchi", 4, "Esempi dei punti difficili"),
    Block("lettura", 2, "Lettura")
)

object Prefs {
    const val FILE = "ascolto"
    const val SEEN = "seen"
    const val LEVELS = "levels"
    const val CATS = "cats"
    const val DIRECTION = "direction" // alterna | jp-it | it-jp
    const val PAUSE = "pause" // breve | media | lunga
}

fun recallScale(pause: String): Float = when (pause) {
    "breve" -> 0.6f
    "lunga" -> 1.6f
    else -> 1f
}

fun buildQueue(all: List<Item>, levels: Set<String>, cats: Set<String>, seen: Set<String>, direction: String): List<Item> {
    val pool = all.filter { (it.level == "*" || it.level in levels) && it.cat in cats }
    val anyTodo = pool.any { it.key !in seen }
    val queues = BLOCKS.map { b ->
        ArrayDeque(pool.filter { it.cat == b.cat && (!anyTodo || it.key !in seen) }.shuffled())
    }
    val turns = IntArray(BLOCKS.size)
    val out = ArrayList<Item>()
    while (queues.any { it.isNotEmpty() }) {
        BLOCKS.forEachIndexed { idx, b ->
            val q = queues[idx]
            val block = ArrayList<Item>()
            while (block.size < b.n && q.isNotEmpty()) block.add(q.removeFirst())
            if (block.isEmpty()) return@forEachIndexed
            val toJp = when (direction) {
                "jp-it" -> false
                "it-jp" -> true
                else -> turns[idx] % 2 == 1
            }
            turns[idx]++
            val quante = if (block.size == 1) "Una domanda." else "${block.size} domande."
            block.forEachIndexed { i, item ->
                val hasAlt = item.alt != null
                val verso = if (!hasAlt) "" else if (toJp) " Dall'italiano al giapponese." else " Dal giapponese all'italiano."
                out.add(
                    Item(
                        item.key, item.cat, item.level, item.jp, item.it, item.written,
                        if (toJp && hasAlt) item.alt!! else item.steps, null,
                        if (i == 0) "${b.title}.$verso $quante" else null
                    )
                )
            }
        }
    }
    return out
}
