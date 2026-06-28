package it.jobdigest.data

data class DigestRunSummary(
    val id: Long,
    val runAt: String,
    val minScore: Int,
    val totalRaw: Int,
    val totalRanked: Int,
)

data class DigestRun(
    val id: Long,
    val runAt: String,
    val minScore: Int,
    val totalRaw: Int,
    val totalRanked: Int,
    val jobs: List<JobItem>,
)

data class JobItem(
    val id: String,
    val source: String,
    val title: String,
    val company: String,
    val location: String,
    val url: String,
    val description: String,
    val score: Int,
    val reasons: List<String>,
    val highlightTags: List<String>,
    val inEmail: Boolean,
    val alreadySent: Boolean,
    val salaryMin: Int? = null,
    val salaryMax: Int? = null,
    val postedAt: String? = null,
)

data class AppSettings(
    val serverUrl: String = "http://192.168.1.100:3847",
    val token: String = "",
)
