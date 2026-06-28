package it.jobdigest.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import it.jobdigest.ui.theme.Navy800
import it.jobdigest.ui.theme.Slate500
import it.jobdigest.viewmodel.MainViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: MainViewModel,
    onBack: () -> Unit,
) {
    val settings by viewModel.settings.collectAsState()
    var serverUrl by remember(settings.serverUrl) { mutableStateOf(settings.serverUrl) }
    var token by remember(settings.token) { mutableStateOf(settings.token) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Impostazioni") },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                text = "Collega l'app al server Job Digest IT sul tuo PC (stessa rete Wi‑Fi).",
                style = MaterialTheme.typography.bodyMedium,
                color = Slate500,
            )

            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("URL server") },
                placeholder = { Text("http://192.168.1.100:3847") },
                singleLine = true,
            )

            OutlinedTextField(
                value = token,
                onValueChange = { token = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Token (opzionale)") },
                placeholder = { Text("Se hai WEB_TOKEN in .env") },
                singleLine = true,
            )

            Text(
                text = "Sul PC: npm run digest:dry && npm run web\nTrova l'IP con ipconfig (Windows) o ip a (Linux/Mac).",
                style = MaterialTheme.typography.bodyMedium,
                color = Slate500,
            )

            Button(
                onClick = { viewModel.saveSettings(serverUrl, token) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Salva e ricarica annunci")
            }
        }
    }
}
