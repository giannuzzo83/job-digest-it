package it.jobdigest.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import it.jobdigest.ui.theme.Amber300
import it.jobdigest.ui.theme.Blue100
import it.jobdigest.ui.theme.Navy800
import it.jobdigest.ui.theme.Slate500
import it.jobdigest.viewmodel.MainViewModel

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun DetailScreen(
    viewModel: MainViewModel,
    jobId: String,
    onBack: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val job = uiState.run?.jobs?.find { it.id == jobId }
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dettaglio annuncio") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Indietro")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Navy800),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (job == null) {
            Text(
                text = "Annuncio non trovato.",
                modifier = Modifier.padding(padding).padding(16.dp),
                color = Slate500,
            )
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = if (job.highlightTags.isNotEmpty()) "⭐ ${job.title}" else job.title,
                style = MaterialTheme.typography.headlineMedium,
            )

            Text(
                text = buildString {
                    append(job.company)
                    append('\n')
                    append(job.location)
                    append(" · ")
                    append(job.source)
                    append(" · Match ")
                    append(job.score)
                    append('%')
                    formatSalary(job)?.let {
                        append('\n')
                        append(it)
                    }
                },
                style = MaterialTheme.typography.bodyMedium,
                color = Slate500,
            )

            if (job.highlightTags.isNotEmpty()) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    job.highlightTags.forEach { tag ->
                        DetailChip(text = "⭐ $tag", tint = Amber300)
                    }
                }
            }

            if (job.reasons.isNotEmpty()) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    job.reasons.forEach { reason ->
                        DetailChip(text = reason, tint = Blue100)
                    }
                }
            }

            Text(
                text = job.description.ifBlank { "Nessuna descrizione disponibile." },
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Navy800)
                    .padding(16.dp),
            )

            Button(
                onClick = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(job.url))
                    context.startActivity(intent)
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.OpenInNew, contentDescription = null)
                Text(
                    text = "Apri annuncio",
                    modifier = Modifier.padding(start = 8.dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun DetailChip(text: String, tint: androidx.compose.ui.graphics.Color) {
    Text(
        text = text,
        modifier = Modifier
            .background(tint.copy(alpha = 0.14f), RoundedCornerShape(999.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        style = MaterialTheme.typography.labelMedium,
        color = tint,
    )
}

private fun formatSalary(job: it.jobdigest.data.JobItem): String? {
    if (job.salaryMin == null && job.salaryMax == null) return null
    if (job.salaryMin != null && job.salaryMax != null) {
        return "€${job.salaryMin} – €${job.salaryMax}/anno"
    }
    if (job.salaryMin != null) return "da €${job.salaryMin}/anno"
    return "fino a €${job.salaryMax}/anno"
}
