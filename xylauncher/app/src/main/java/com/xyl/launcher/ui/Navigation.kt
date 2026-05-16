package com.xyl.launcher.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.activity.compose.BackHandler

enum class Screen { HOME, APP_DRAWER, SETTINGS, HUD_PREVIEW, HUD_EDITOR }

@Composable
fun XYLNavHost() {
    var current by remember { mutableStateOf(Screen.HOME) }

    BackHandler(enabled = current != Screen.HOME) {
        current = Screen.HOME
    }

    when (current) {
        Screen.HOME -> HomeScreen(
            onOpenDrawer = { current = Screen.APP_DRAWER },
            onOpenSettings = { current = Screen.SETTINGS },
            onOpenHud = { current = Screen.HUD_PREVIEW },
        )
        Screen.APP_DRAWER -> AppDrawerScreen(onBack = { current = Screen.HOME })
        Screen.SETTINGS -> SettingsScreen(onBack = { current = Screen.HOME })
        Screen.HUD_PREVIEW -> HudPreviewScreen(
            onBack = { current = Screen.HOME },
            onOpenEditor = { current = Screen.HUD_EDITOR },
        )
        Screen.HUD_EDITOR -> HudEditorScreen(onBack = { current = Screen.HUD_PREVIEW })
    }
}
