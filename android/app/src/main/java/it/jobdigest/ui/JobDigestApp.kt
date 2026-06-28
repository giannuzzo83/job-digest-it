package it.jobdigest.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import it.jobdigest.ui.screens.DetailScreen
import it.jobdigest.ui.screens.HomeScreen
import it.jobdigest.ui.screens.SettingsScreen
import it.jobdigest.ui.theme.JobDigestTheme
import it.jobdigest.ui.theme.Navy900
import it.jobdigest.viewmodel.MainViewModel
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

object Routes {
    const val Home = "home"
    const val Settings = "settings"
    const val Detail = "detail/{jobId}"

    fun detail(jobId: String): String {
        val encoded = URLEncoder.encode(jobId, StandardCharsets.UTF_8.toString())
        return "detail/$encoded"
    }
}

@Composable
fun JobDigestApp(viewModel: MainViewModel = viewModel()) {
    val navController = rememberNavController()

    JobDigestTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = Navy900) {
            NavHost(navController = navController, startDestination = Routes.Home) {
                composable(Routes.Home) {
                    HomeScreen(
                        viewModel = viewModel,
                        onOpenSettings = { navController.navigate(Routes.Settings) },
                        onOpenJob = { jobId -> navController.navigate(Routes.detail(jobId)) },
                    )
                }
                composable(Routes.Settings) {
                    SettingsScreen(
                        viewModel = viewModel,
                        onBack = { navController.popBackStack() },
                    )
                }
                composable(
                    route = Routes.Detail,
                    arguments = listOf(navArgument("jobId") { type = NavType.StringType }),
                ) { entry ->
                    val jobId = entry.arguments?.getString("jobId").orEmpty()
                    DetailScreen(
                        viewModel = viewModel,
                        jobId = jobId,
                        onBack = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}
