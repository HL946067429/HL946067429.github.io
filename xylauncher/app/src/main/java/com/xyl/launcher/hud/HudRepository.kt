package com.xyl.launcher.hud

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

class HudRepository(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _config = MutableStateFlow(HudConfig())
    val config: StateFlow<HudConfig> = _config.asStateFlow()

    private val userFile: File
        get() = File(appContext.filesDir, USER_FILE_NAME)

    fun load() {
        scope.launch {
            // 1. 优先读用户编辑保存的
            if (userFile.exists()) {
                runCatching {
                    val text = userFile.readText()
                    _config.value = HudConfigParser.parse(text)
                    Log.i(TAG, "已加载用户 HUD 配置")
                    return@launch
                }.onFailure { Log.w(TAG, "用户配置解析失败，回落默认", it) }
            }
            // 2. 回落到 raw 默认
            runCatching {
                val resId = appContext.resources.getIdentifier("hud_default", "raw", appContext.packageName)
                if (resId == 0) return@runCatching
                val text = appContext.resources.openRawResource(resId).bufferedReader().use { it.readText() }
                _config.value = HudConfigParser.parse(text)
            }
        }
    }

    /** 内存即时更新（编辑器拖动时用，每帧调用） */
    fun update(newConfig: HudConfig) {
        _config.value = newConfig
    }

    /** 持久化到 filesDir/hud_user_config.json（保存按钮触发） */
    fun save() {
        val snapshot = _config.value
        scope.launch {
            runCatching {
                userFile.writeText(HudConfigParser.toJson(snapshot))
                Log.i(TAG, "HUD 配置已保存到 ${userFile.absolutePath}")
            }.onFailure { Log.e(TAG, "HUD 保存失败", it) }
        }
    }

    /** 清空用户配置，重新加载默认 */
    fun resetToDefault() {
        scope.launch {
            runCatching { if (userFile.exists()) userFile.delete() }
            load()
        }
    }

    companion object {
        private const val TAG = "HudRepo"
        private const val USER_FILE_NAME = "hud_user_config.json"
    }
}
