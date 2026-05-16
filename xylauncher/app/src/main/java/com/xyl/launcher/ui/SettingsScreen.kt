package com.xyl.launcher.ui

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.App
import com.xyl.launcher.settings.AppSettingsSnapshot
import com.xyl.launcher.settings.LayoutPrefs
import com.xyl.launcher.settings.ProviderMode
import kotlinx.coroutines.launch

private val SectionBg = Color(0x1AFFFFFF)
private val Accent = Color(0xFF4A9EFF)
private val TextSec = Color(0xB3FFFFFF)

private val WALLPAPER_PRESETS = listOf(
    0xFF0A0E1A.toInt(),
    0xFF1A1A2E.toInt(),
    0xFF16213E.toInt(),
    0xFF0F3460.toInt(),
    0xFF2D1B69.toInt(),
    0xFF000000.toInt(),
)

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val app = App.instance
    val settings by app.settings.snapshot.collectAsState(initial = AppSettingsSnapshot())
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    // SAF 图片选择器 —— 选完拿持久化 URI 读权限存到 DataStore
    val pickWallpaper = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri, Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }
            scope.launch { app.settings.setWallpaperUri(uri.toString()) }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(settings.wallpaperColor))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("设置", fontSize = 24.sp, color = Color.White, fontWeight = FontWeight.Medium)
                Box(
                    modifier = Modifier
                        .clip(CircleShape).background(Color(0x33FFFFFF))
                        .clickable(onClick = onBack)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                ) { Text("返回", fontSize = 13.sp, color = Color.White) }
            }

            // 🔒 安全模式 —— 装到车上前必看
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        if (settings.safeMode) Color(0x1A7AE582) else Color(0x33FF6B35)
                    )
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.padding(end = 12.dp)) {
                        Text(
                            if (settings.safeMode) "🔒 安全模式：开启" else "⚠ 安全模式：关闭",
                            fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Medium,
                        )
                        Text(
                            if (settings.safeMode)
                                "所有会动到车的写操作（HVAC、AR-HUD、副驾投屏）已禁用。装到车上 0 风险。"
                            else
                                "已允许写操作生效。仅在车停稳、确认可安全测试时关闭。",
                            fontSize = 11.sp, color = Color(0xCCFFFFFF),
                        )
                    }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (settings.safeMode) Accent else Color(0x66000000))
                            .clickable {
                                scope.launch { app.settings.setSafeMode(!settings.safeMode) }
                            }
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                    ) {
                        Text(
                            if (settings.safeMode) "开" else "关",
                            fontSize = 13.sp, color = Color.White,
                        )
                    }
                }
            }

            // 壁纸
            Section("壁纸") {
                // 图片壁纸 —— 优先级最高
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        if (settings.wallpaperUri.isNotEmpty()) "✓ 已设置图片壁纸"
                        else "未设置图片，正在用动态渐变",
                        fontSize = 12.sp, color = TextSec,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(Accent)
                                .clickable { pickWallpaper.launch(arrayOf("image/*")) }
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                        ) {
                            Text(
                                if (settings.wallpaperUri.isEmpty()) "选择图片"
                                else "换一张图片",
                                fontSize = 13.sp, color = Color.White,
                            )
                        }
                        if (settings.wallpaperUri.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Color(0x33FFFFFF))
                                    .clickable {
                                        scope.launch { app.settings.setWallpaperUri("") }
                                    }
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                            ) {
                                Text("清除", fontSize = 13.sp, color = Color.White)
                            }
                        }
                    }
                }

                // 备用：纯色（仅当不用图片+动态渐变时影响 SettingsScreen 自身背景）
                Text(
                    "设置页背景色",
                    fontSize = 12.sp, color = TextSec,
                    modifier = Modifier.padding(top = 12.dp),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    WALLPAPER_PRESETS.forEach { color ->
                        val selected = color == settings.wallpaperColor
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(Color(color))
                                .clickable { scope.launch { app.settings.setWallpaperColor(color) } },
                            contentAlignment = Alignment.Center,
                        ) {
                            if (selected) Text("✓", fontSize = 22.sp, color = Color.White)
                        }
                    }
                }
            }

            // Provider 强制切换
            Section("车控 Provider") {
                Text("当前: ${settings.providerMode.name}", fontSize = 12.sp, color = TextSec)
                Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ProviderMode.values().forEach { mode ->
                        Chip(
                            text = mode.name,
                            selected = mode == settings.providerMode,
                            onClick = { scope.launch { app.settings.setProviderMode(mode) } },
                        )
                    }
                }
                Text(
                    "AUTO=自动探测；MOCK=强制假数据；ECARX=强制车控（不在车上会失败）",
                    fontSize = 11.sp, color = TextSec, modifier = Modifier.padding(top = 8.dp),
                )
            }

            // 布局
            Section("桌面卡片") {
                val l = settings.layout
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Toggle("AR-HUD 模式切换", l.showHudMode) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showHudMode = v)) }
                    }
                    Toggle("多屏检测", l.showDisplays) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showDisplays = v)) }
                    }
                    Toggle("胎压监测", l.showTirePressure) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showTirePressure = v)) }
                    }
                    Toggle("油耗续航", l.showFuelConsumption) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showFuelConsumption = v)) }
                    }
                    Toggle("驾驶模式", l.showDriveMode) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showDriveMode = v)) }
                    }
                    Toggle("座椅记忆", l.showSeatMemory) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showSeatMemory = v)) }
                    }
                    Toggle("天气", l.showWeather) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showWeather = v)) }
                    }
                    Toggle("快捷工具", l.showQuickTools) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showQuickTools = v)) }
                    }
                    Toggle("蓝牙音频", l.showBluetoothAudio) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showBluetoothAudio = v)) }
                    }
                    Toggle("360 全景", l.showParking360) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showParking360 = v)) }
                    }
                    Toggle("车辆状态", l.showVehicle) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showVehicle = v)) }
                    }
                    Toggle("正在播放", l.showMedia) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showMedia = v)) }
                    }
                    Toggle("空调 HVAC", l.showHvac) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showHvac = v)) }
                    }
                    Toggle("行车记录仪", l.showDashCam) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showDashCam = v)) }
                    }
                    Toggle("HUD 预览入口", l.showHud) { v ->
                        scope.launch { app.settings.setLayout(l.copy(showHud = v)) }
                    }
                }
            }

            // DashCam
            Section("行车记录仪") {
                Text("源目录: ${settings.dashCamSourceDir}", fontSize = 12.sp, color = TextSec)
                Text(
                    "TODO: 加目录选择器、云存储目标配置",
                    fontSize = 11.sp, color = TextSec, modifier = Modifier.padding(top = 4.dp),
                )
                Toggle(
                    "启用云上传 (未实现)",
                    settings.dashCamUploadEnabled,
                ) { v ->
                    scope.launch { app.settings.setDashCam(settings.dashCamSourceDir, v) }
                }
            }

            // 关于
            Section("关于") {
                Text("XYLauncher v0.1", fontSize = 14.sp, color = Color.White)
                Text("吉利星越 L 自研桌面 (银河 OS)", fontSize = 12.sp, color = TextSec)
                Text(
                    "源码: D:\\workspace\\os",
                    fontSize = 11.sp, color = TextSec, modifier = Modifier.padding(top = 8.dp),
                )
                Text(
                    "ECARX API: 详见 docs/ECARX_API_NOTES.md",
                    fontSize = 11.sp, color = TextSec,
                )
            }
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SectionBg)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(title, fontSize = 13.sp, color = TextSec)
        content()
    }
}

@Composable
private fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) Accent else Color(0x33FFFFFF))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Text(text, fontSize = 13.sp, color = Color.White)
    }
}

@Composable
private fun Toggle(text: String, value: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onChange(!value) }
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text, fontSize = 14.sp, color = Color.White)
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(if (value) Accent else Color(0x33FFFFFF))
                .padding(horizontal = 12.dp, vertical = 4.dp),
        ) {
            Text(if (value) "开" else "关", fontSize = 12.sp, color = Color.White)
        }
    }
}
