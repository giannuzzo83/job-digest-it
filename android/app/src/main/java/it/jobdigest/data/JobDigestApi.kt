package it.jobdigest.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class JobDigestApi(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build(),
) {
    suspend fun fetchLatest(settings: AppSettings): DigestRun = withContext(Dispatchers.IO) {
        getJson(settings, "/api/digest/latest").let(::parseDigestRun)
    }

    suspend fun fetchRun(settings: AppSettings, runId: Long): DigestRun = withContext(Dispatchers.IO) {
        getJson(settings, "/api/digest/runs/$runId").let(::parseDigestRun)
    }

    suspend fun fetchRuns(settings: AppSettings): List<DigestRunSummary> = withContext(Dispatchers.IO) {
        val json = getJson(settings, "/api/digest/runs")
        val runs = json.getJSONArray("runs")
        buildList {
            for (i in 0 until runs.length()) {
                add(parseRunSummary(runs.getJSONObject(i)))
            }
        }
    }

    private fun getJson(settings: AppSettings, path: String): JSONObject {
        val base = settings.serverUrl.trimEnd('/')
        val token = settings.token.trim()
        val url = buildString {
            append(base)
            append(path)
            if (token.isNotEmpty()) {
                append(if (path.contains('?')) '&' else '?')
                append("token=")
                append(token)
            }
        }

        val requestBuilder = Request.Builder().url(url).get()
        if (token.isNotEmpty()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        client.newCall(requestBuilder.build()).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val message = runCatching { JSONObject(body).optString("error") }
                    .getOrNull()
                    ?.takeIf { it.isNotBlank() }
                    ?: "Errore HTTP ${response.code}"
                throw ApiException(message)
            }
            return JSONObject(body)
        }
    }

    private fun parseRunSummary(json: JSONObject) = DigestRunSummary(
        id = json.getLong("id"),
        runAt = json.getString("runAt"),
        minScore = json.getInt("minScore"),
        totalRaw = json.getInt("totalRaw"),
        totalRanked = json.getInt("totalRanked"),
    )

    private fun parseDigestRun(json: JSONObject) = DigestRun(
        id = json.getLong("id"),
        runAt = json.getString("runAt"),
        minScore = json.getInt("minScore"),
        totalRaw = json.getInt("totalRaw"),
        totalRanked = json.getInt("totalRanked"),
        jobs = json.getJSONArray("jobs").toJobList(),
    )

    private fun JSONArray.toJobList(): List<JobItem> = buildList {
        for (i in 0 until length()) {
            add(parseJobItem(getJSONObject(i)))
        }
    }

    private fun parseJobItem(json: JSONObject) = JobItem(
        id = json.getString("id"),
        source = json.optString("source", ""),
        title = json.optString("title", ""),
        company = json.optString("company", ""),
        location = json.optString("location", ""),
        url = json.optString("url", ""),
        description = json.optString("description", ""),
        score = json.optInt("score", 0),
        reasons = json.optJSONArray("reasons").toStringList(),
        highlightTags = json.optJSONArray("highlightTags").toStringList(),
        inEmail = json.optBoolean("inEmail", false),
        alreadySent = json.optBoolean("alreadySent", false),
        salaryMin = json.optIntOrNull("salaryMin"),
        salaryMax = json.optIntOrNull("salaryMax"),
        postedAt = json.optString("postedAt").takeIf { it.isNotBlank() },
    )

    private fun JSONArray?.toStringList(): List<String> {
        if (this == null) return emptyList()
        return buildList {
            for (i in 0 until length()) {
                add(getString(i))
            }
        }
    }

    private fun JSONObject.optIntOrNull(key: String): Int? {
        if (!has(key) || isNull(key)) return null
        return optInt(key)
    }
}

class ApiException(message: String) : Exception(message)
