package it.jobdigest.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import it.jobdigest.data.ApiException
import it.jobdigest.data.AppSettings
import it.jobdigest.data.DigestRun
import it.jobdigest.data.DigestRunSummary
import it.jobdigest.data.JobDigestApi
import it.jobdigest.data.JobItem
import it.jobdigest.data.SettingsStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FilterState(
    val query: String = "",
    val source: String = "",
    val minScore: Int = 60,
    val emailOnly: Boolean = false,
)

data class HomeUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val run: DigestRun? = null,
    val runs: List<DigestRunSummary> = emptyList(),
    val filters: FilterState = FilterState(),
    val filteredJobs: List<JobItem> = emptyList(),
    val settings: AppSettings = AppSettings(),
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val api = JobDigestApi()
    private val settingsStore = SettingsStore(application)

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val settings = settingsStore.settings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AppSettings(),
    )

    init {
        viewModelScope.launch {
            settings.collect { appSettings ->
                _uiState.update { it.copy(settings = appSettings) }
                if (_uiState.value.run == null) {
                    refresh(appSettings)
                }
            }
        }
    }

    fun refresh(settingsOverride: AppSettings? = null) {
        val currentSettings = settingsOverride ?: _uiState.value.settings
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = it.run == null,
                    isRefreshing = it.run != null,
                    error = null,
                )
            }
            try {
                val runs = api.fetchRuns(currentSettings)
                val run = api.fetchLatest(currentSettings)
                _uiState.update { state ->
                    val filters = state.filters.copy(minScore = run.minScore)
                    state.copy(
                        isLoading = false,
                        isRefreshing = false,
                        error = null,
                        run = run,
                        runs = runs,
                        filters = filters,
                        filteredJobs = applyFilters(run.jobs, filters),
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        error = (error as? ApiException)?.message ?: error.message ?: "Errore sconosciuto",
                    )
                }
            }
        }
    }

    fun selectRun(runId: Long) {
        val currentSettings = _uiState.value.settings
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null) }
            try {
                val run = api.fetchRun(currentSettings, runId)
                _uiState.update { state ->
                    val filters = state.filters.copy(minScore = run.minScore)
                    state.copy(
                        isRefreshing = false,
                        run = run,
                        filters = filters,
                        filteredJobs = applyFilters(run.jobs, filters),
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isRefreshing = false,
                        error = (error as? ApiException)?.message ?: error.message,
                    )
                }
            }
        }
    }

    fun updateQuery(query: String) = updateFilters { it.copy(query = query) }

    fun updateSource(source: String) = updateFilters { it.copy(source = source) }

    fun updateMinScore(minScore: Int) = updateFilters { it.copy(minScore = minScore) }

    fun toggleEmailOnly() = updateFilters { it.copy(emailOnly = !it.emailOnly) }

    fun saveSettings(serverUrl: String, token: String) {
        viewModelScope.launch {
            settingsStore.save(serverUrl, token)
            refresh(AppSettings(serverUrl, token))
        }
    }

    private fun updateFilters(transform: (FilterState) -> FilterState) {
        _uiState.update { state ->
            val filters = transform(state.filters)
            state.copy(
                filters = filters,
                filteredJobs = applyFilters(state.run?.jobs.orEmpty(), filters),
            )
        }
    }

    private fun applyFilters(jobs: List<JobItem>, filters: FilterState): List<JobItem> {
        val query = filters.query.trim().lowercase()
        return jobs
            .asSequence()
            .filter { it.score >= filters.minScore }
            .filter { filters.source.isBlank() || it.source == filters.source }
            .filter { !filters.emailOnly || it.inEmail }
            .filter { job ->
                if (query.isBlank()) {
                    true
                } else {
                    val blob = buildString {
                        append(job.title)
                        append(' ')
                        append(job.company)
                        append(' ')
                        append(job.location)
                        append(' ')
                        append(job.description)
                        append(' ')
                        append(job.reasons.joinToString(" "))
                    }.lowercase()
                    blob.contains(query)
                }
            }
            .sortedWith(compareByDescending<JobItem> { it.score }.thenBy { it.title })
            .toList()
    }
}
