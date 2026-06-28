package it.jobdigest.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "job_digest_settings")

class SettingsStore(private val context: Context) {
    private val serverUrlKey = stringPreferencesKey("server_url")
    private val tokenKey = stringPreferencesKey("token")

    val settings: Flow<AppSettings> = context.dataStore.data.map { prefs ->
        AppSettings(
            serverUrl = prefs[serverUrlKey] ?: "http://192.168.1.100:3847",
            token = prefs[tokenKey] ?: "",
        )
    }

    suspend fun save(serverUrl: String, token: String) {
        context.dataStore.edit { prefs ->
            prefs[serverUrlKey] = serverUrl.trim()
            prefs[tokenKey] = token.trim()
        }
    }
}
