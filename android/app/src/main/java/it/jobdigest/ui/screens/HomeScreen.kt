package it.jobdigest.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import it.jobdigest.data.JobItem
import it.jobdigest.ui.theme.Amber300
import it.jobdigest.ui.theme.Blue100
import it.jobdigest.ui.theme.Blue400
import it.jobdigest.ui.theme.Blue500
import it.jobdigest.ui.theme.Emerald400
import it.jobdigest.ui.theme.Navy800
import it.jobdigest.ui.theme.Slate500
import it.jobdigest.ui.theme.Slate700
import it.jobdigest.viewmodel.MainViewModel
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: MainViewModel,
    onOpenSettings: () -> Unit,
    onOpenJob: (String) -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.error) {
        uiState.error?.let { snackbarHostState.showSnackbar(it) }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Job Digest IT")
                        uiState.run?.let { run ->
                            Text(
                                text = formatRunMeta(run.runAt, run.totalRanked, run.minScore),
                                style = MaterialTheme.typography.labelMedium,
                                color = Slate500,
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Aggiorna")
                    }
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Impostazioni")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Navy800,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = Blue400)
            }
            return@Scaffold
        }

        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    FiltersSection(
                        query = uiState.filters.query,
                        minScore = uiState.filters.minScore,
                        emailOnly = uiState.filters.emailOnly,
                        sources = uiState.run?.jobs.orEmpty().map { it.source }.distinct().sorted(),
                        selectedSource = uiState.filters.source,
                        onQueryChange = viewModel::updateQuery,
                        onMinScoreChange = viewModel::updateMinScore,
                        onSourceChange = viewModel::updateSource,
                        onEmailOnlyToggle = viewModel::toggleEmailOnly,
                    )
                }

                item {
                    Text(
                        text = "${uiState.filteredJobs.size} annunci",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }

                if (uiState.filteredJobs.isEmpty()) {
                    item {
                        Text(
                            text = "Nessun annuncio corrisponde ai filtri.",
                            color = Slate500,
                            modifier = Modifier.padding(vertical = 24.dp),
                        )
                    }
                } else {
                    items(uiState.filteredJobs, key = { it.id }) { job ->
                        JobCard(job = job, onClick = { onOpenJob(job.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun FiltersSection(
    query: String,
    minScore: Int,
    emailOnly: Boolean,
    sources: List<String>,
    selectedSource: String,
    onQueryChange: (String) -> Unit,
    onMinScoreChange: (Int) -> Unit,
    onSourceChange: (String) -> Unit,
    onEmailOnlyToggle: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Cerca") },
            placeholder = { Text("Titolo, azienda, skill…") },
            singleLine = true,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = minScore.toString(),
                onValueChange = { value ->
                    value.toIntOrNull()?.let(onMinScoreChange)
                },
                modifier = Modifier.weight(1f),
                label = { Text("Score min") },
                singleLine = true,
            )
            FilterChip(
                selected = emailOnly,
                onClick = onEmailOnlyToggle,
                label = { Text("Solo email") },
            )
        }

        if (sources.isNotEmpty()) {
            SourceChips(
                sources = sources,
                selectedSource = selectedSource,
                onSourceChange = onSourceChange,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SourceChips(
    sources: List<String>,
    selectedSource: String,
    onSourceChange: (String) -> Unit,
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(
            selected = selectedSource.isBlank(),
            onClick = { onSourceChange("") },
            label = { Text("Tutte") },
        )
        sources.forEach { source ->
            FilterChip(
                selected = selectedSource == source,
                onClick = { onSourceChange(source) },
                label = { Text(source) },
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JobCard(job: JobItem, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Navy800)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ScoreBadge(score = job.score)
            Text(text = job.source.uppercase(), style = MaterialTheme.typography.labelMedium, color = Slate500)
        }

        Text(
            text = if (job.highlightTags.isNotEmpty()) "⭐ ${job.title}" else job.title,
            style = MaterialTheme.typography.titleMedium,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        Text(
            text = listOfNotNull(job.company, job.location, formatSalary(job)).joinToString(" · "),
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        if (job.highlightTags.isNotEmpty()) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                job.highlightTags.take(4).forEach { tag ->
                    TagChip(text = "⭐ $tag", container = Amber300.copy(alpha = 0.18f), content = Amber300)
                }
            }
        }

        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (job.inEmail) {
                TagChip(text = "In email", container = Emerald400.copy(alpha = 0.18f), content = Emerald400)
            }
            if (job.alreadySent) {
                TagChip(text = "Già inviato", container = Slate700, content = Slate500)
            }
        }
    }
}

@Composable
private fun ScoreBadge(score: Int) {
    Box(
        modifier = Modifier
            .background(Blue500.copy(alpha = 0.22f), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text = "$score%", color = Blue100, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun TagChip(text: String, container: androidx.compose.ui.graphics.Color, content: androidx.compose.ui.graphics.Color) {
    Text(
        text = text,
        modifier = Modifier
            .background(container, RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
        style = MaterialTheme.typography.labelMedium,
        color = content,
    )
}

private fun formatRunMeta(runAt: String, totalRanked: Int, minScore: Int): String {
    val formatted = runCatching {
        val formatter = DateTimeFormatter.ofPattern("EEE d MMM yyyy, HH:mm", Locale.ITALY)
        Instant.parse(runAt).atZone(ZoneId.systemDefault()).format(formatter)
    }.getOrDefault(runAt)
    return "$formatted · $totalRanked annunci sopra $minScore%"
}

private fun formatSalary(job: JobItem): String? {
    if (job.salaryMin == null && job.salaryMax == null) return null
    if (job.salaryMin != null && job.salaryMax != null) {
        return "€${job.salaryMin} – €${job.salaryMax}/anno"
    }
    if (job.salaryMin != null) return "da €${job.salaryMin}/anno"
    return "fino a €${job.salaryMax}/anno"
}
