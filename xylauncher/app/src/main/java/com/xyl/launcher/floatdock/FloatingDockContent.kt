package com.xyl.launcher.floatdock

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.App
import com.xyl.launcher.multidisplay.DisplaySwitcher
import com.xyl.launcher.vehicle.hud.HudMode

/**
 * 浮动 Dock 的内容：竖排 5 个按钮，可展开成横向工具栏。
 * 折叠时只占很小空间（一个圆形按钮），点开后展开。
 */
@Composable
fun FloatingDockContent(onClose: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }

    Box {
        if (expanded) {
            ExpandedPanel(onCollapse = { expanded = false }, onClose = onClose)
        } else {
            CollapsedHandle(onExpand = { expanded = true })
        }
    }
}

@Composable
private fun CollapsedHandle(onExpand: () -> Unit) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(Color(0xCC4A9EFF))
            .clickable(onClick = onExpand),
        contentAlignment = Alignment.Center,
    ) {
        Text("⋮", fontSize = 24.sp, color = Color.White)
    }
}

@Composable
private fun ExpandedPanel(onCollapse: () -> Unit, onClose: () -> Unit) {
    val app = App.instance
    val context = LocalContext.current
    val hudCurrent by app.hudModeRepository.current.collectAsState()
    val hudAvailable by app.hudModeRepository.available.collectAsState()

    Column(
        modifier = Modifier
            .width(64.dp)
            .clip(RoundedCornerShape(32.dp))
            .background(Color(0xE0000000))
            .padding(vertical = 12.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DockBtn("⌃", "收起") { onCollapse() }
        DockBtn(
            label = "📺",
            sub = "投屏",
            enabled = !App.instance.settings.current.value.safeMode,
        ) {
            // 简化：投到 displayId 1（多数车机副驾屏）
            // 真实交互应弹屏幕选择菜单 —— 后续完善
            DisplaySwitcher.launchToDisplay(
                context,
                packageName = guessForegroundApp(context),
                displayId = 1,
            )
        }
        DockBtn("🌗", "AR-HUD", enabled = hudAvailable) {
            val next = nextHudMode(hudCurrent)
            app.hudModeRepository.setMode(next)
        }
        DockBtn("🏠", "桌面") {
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (intent != null) {
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            }
        }
        DockBtn("✕", "关闭") { onClose() }
    }
}

@Composable
private fun DockBtn(
    label: String,
    sub: String? = null,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(if (enabled) Color(0x33FFFFFF) else Color(0x11FFFFFF))
            .clickable(enabled = enabled, onClick = onClick),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(label, fontSize = 18.sp, color = Color.White)
        if (sub != null) {
            Text(sub, fontSize = 8.sp, color = Color(0xB3FFFFFF))
        }
    }
}

private fun nextHudMode(current: HudMode?): HudMode {
    val order = HudMode.COMMON_ORDER
    val idx = order.indexOf(current ?: order[0])
    return order[(idx + 1) % order.size]
}

private fun guessForegroundApp(context: android.content.Context): String {
    // 简化：返回本 App 包名（实际应该用 UsageStats 或 AccessibilityService 拿前台 App）
    return context.packageName
}
