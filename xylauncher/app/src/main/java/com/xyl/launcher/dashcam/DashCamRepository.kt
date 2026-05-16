package com.xyl.launcher.dashcam

import android.content.Context
import android.os.FileObserver
import android.util.Log
import com.xyl.launcher.settings.AppSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.io.File

data class DashCamState(
    val watching: Boolean = false,
    val sourceDir: String = "",
    val recentFiles: List<String> = emptyList(),
    val totalFiles: Int = 0,
    val totalSizeMb: Long = 0,
    val lastSync: Long = 0,
    val pendingUpload: Int = 0,
)

/**
 * 行车记录仪文件监视 + 同步骨架。
 *
 * v0.1 工作流程：
 *   1. 从 [AppSettings] 读 sourceDir（默认 /sdcard/DCIM/dvr，回车上 adb 探测后再调）
 *   2. 列目录里所有 mp4
 *   3. 注册 [FileObserver] 监视 CREATE / CLOSE_WRITE
 *   4. 新文件出现 → 加入待上传队列
 *   5. 实际上传逻辑放在 [DashCamSyncWorker]（TODO）
 *
 * v0.1 还不做：
 *   - 上传到云（需要选择目标：OSS / WebDAV / 自建 HTTP）
 *   - WorkManager 调度（断网重试）
 *   - 上传完后删除本地
 */
class DashCamRepository(
    private val appContext: Context,
    private val settings: AppSettings,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _state = MutableStateFlow(DashCamState())
    val state: StateFlow<DashCamState> = _state.asStateFlow()

    private var fileObserver: FileObserver? = null

    fun start() {
        scope.launch {
            settings.snapshot.map { it.dashCamSourceDir }.distinctUntilChanged().collect { dir ->
                rebind(dir)
            }
        }
    }

    private fun rebind(dir: String) {
        fileObserver?.stopWatching()
        fileObserver = null

        val src = File(dir)
        if (!src.exists() || !src.isDirectory) {
            _state.value = DashCamState(watching = false, sourceDir = dir)
            Log.w(TAG, "目录不存在: $dir")
            return
        }

        scanDir(src)
        observe(src)
    }

    private fun scanDir(src: File) {
        val mp4s = src.listFiles { _, name -> name.endsWith(".mp4", ignoreCase = true) }?.toList()
            ?: emptyList()
        val sizeMb = mp4s.sumOf { it.length() } / 1024 / 1024
        _state.value = _state.value.copy(
            watching = true,
            sourceDir = src.absolutePath,
            recentFiles = mp4s.sortedByDescending { it.lastModified() }
                .take(5).map { it.name },
            totalFiles = mp4s.size,
            totalSizeMb = sizeMb,
        )
        Log.i(TAG, "扫描 ${src.absolutePath}: ${mp4s.size} 个 mp4, ${sizeMb} MB")
    }

    @Suppress("DEPRECATION")
    private fun observe(src: File) {
        fileObserver = object : FileObserver(src.absolutePath, CREATE or CLOSE_WRITE) {
            override fun onEvent(event: Int, path: String?) {
                if (path?.endsWith(".mp4", ignoreCase = true) != true) return
                Log.d(TAG, "新文件: $path event=$event")
                scope.launch { scanDir(src) }
                // TODO: 入队上传
            }
        }.also { it.startWatching() }
    }

    fun forceRescan() {
        scope.launch {
            val s = _state.value
            if (s.sourceDir.isNotEmpty()) scanDir(File(s.sourceDir))
        }
    }

    companion object {
        private const val TAG = "DashCamRepo"
    }
}
