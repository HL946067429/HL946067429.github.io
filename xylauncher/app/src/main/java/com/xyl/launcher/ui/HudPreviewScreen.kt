package com.xyl.launcher.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.App
import com.xyl.launcher.hud.Align as HudAlign
import com.xyl.launcher.hud.HudElement
import com.xyl.launcher.hud.HudElementType
import com.xyl.launcher.vehicle.Gear
import com.xyl.launcher.vehicle.VehicleState

@Composable
fun HudPreviewScreen(onBack: () -> Unit, onOpenEditor: () -> Unit = {}) {
    val app = App.instance
    val cfg by app.hudRepository.config.collectAsState()
    val vehicle by app.vehicleRepository.state.collectAsState()

    LaunchedEffect(Unit) { app.hudRepository.load() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("HUD 预览", fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Medium)
                    Text(
                        "${cfg.elements.size} 个元素 · 复刻小八出厂布局",
                        fontSize = 12.sp, color = Color(0xB3FFFFFF),
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape).background(Color(0xFF4A9EFF))
                            .clickable(onClick = onOpenEditor)
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    ) { Text("编辑", fontSize = 13.sp, color = Color.White) }
                    Box(
                        modifier = Modifier
                            .clip(CircleShape).background(Color(0x33FFFFFF))
                            .clickable(onClick = onBack)
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    ) { Text("返回", fontSize = 13.sp, color = Color.White) }
                }
            }

            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF050505))
            ) {
                val canvasW = maxWidth
                val canvasH = maxHeight
                // 小八 HUD 配置原始设计基于约 1200px 宽，textSize 72 是"大字"
                // 我们的预览宽度 (dp) / 1200 = scale；最终 sp = textSize * scale * 1.2 视觉补偿
                val density = LocalDensity.current
                val canvasWidthPx = with(density) { canvasW.toPx() }
                val scale = canvasWidthPx / 1200f / density.density * 1.2f

                cfg.elements.filter { it.visible }.forEach { el ->
                    HudElementView(el, vehicle, canvasW, canvasH, scale)
                }
            }

            Text(
                "实时数据来自当前车辆 Provider · 布局源 res/raw/hud_default.json",
                fontSize = 11.sp, color = Color(0x99FFFFFF),
            )
        }
    }
}

@Composable
private fun HudElementView(
    el: HudElement, state: VehicleState,
    canvasW: Dp, canvasH: Dp, scale: Float,
) {
    val x = canvasW * el.x
    val y = canvasH * el.y
    val w = canvasW * el.width
    val h = canvasH * el.height
    val color = androidColorToCompose(el.textColor)

    Box(
        modifier = Modifier
            .offset(x, y)
            .size(w, h)
            .alpha(el.alpha),
        contentAlignment = composeAlignment(el.horizontalAlign, el.verticalAlign),
    ) {
        when (el.type) {
            HudElementType.TEXT, HudElementType.CUSTOM_VIEW, HudElementType.UNKNOWN -> {
                val text = displayText(el, state)
                if (text.isNotEmpty()) {
                    Text(
                        text = text,
                        fontSize = (el.textSize * scale).coerceAtLeast(8f).sp,
                        color = color,
                        fontWeight = if (el.textBold) FontWeight.Bold else FontWeight.Normal,
                        maxLines = 2,
                    )
                }
            }
            HudElementType.ICON -> {
                val symbol = iconSymbol(el, state)
                val active = isIconActive(el, state)
                if (symbol.isNotEmpty()) {
                    Text(
                        text = symbol,
                        fontSize = (el.textSize * el.iconScale * scale).coerceAtLeast(8f).sp,
                        color = if (active) color else color.copy(alpha = 0.25f),
                    )
                }
            }
            HudElementType.IMAGE -> {
                // 音乐封面占位（实际需要从 MediaRepository 读 bitmap）
                Box(
                    modifier = Modifier
                        .size(w, h)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0x33FFFFFF)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("♪", fontSize = (el.textSize * scale).coerceAtLeast(10f).sp, color = Color.White)
                }
            }
        }
    }
}

private fun displayText(el: HudElement, state: VehicleState): String = when (el.dataSource) {
    "speed" -> state.speed?.toInt()?.toString() ?: "0"
    "speed_unit" -> "km/h"
    "rpm" -> state.rpm?.toString()?.let { "$it rpm" } ?: "-"
    "gear" -> when (state.gear) {
        Gear.P -> "P"; Gear.R -> "R"; Gear.N -> "N"
        Gear.D -> "D"; Gear.S -> "S"; Gear.L -> "L"
        Gear.UNKNOWN -> "-"
    }
    "fuel" -> state.fuelPercent?.let { "⛽ ${(it * 100).toInt()}%" } ?: "-"
    "battery" -> state.batteryPercent?.let { "🔋 ${(it * 100).toInt()}%" } ?: "-"
    "outer_temp" -> state.outerTempCelsius?.let { "${"%.0f".format(it)}℃" } ?: "-"
    "motor_speed_front" -> state.motorSpeedFront?.toString()?.let { "前 $it" } ?: "前 -"
    "motor_speed_rear" -> state.motorSpeedRear?.toString()?.let { "后 $it" } ?: "后 -"
    "navigation_text" -> "直行 500m"   // mock；将来从高德广播读
    "lane_info" -> ""                   // 占位（实际是图形）
    "traffic_light" -> "🟢 23s"
    "cruise_traffic_light" -> ""
    "time" -> java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        .format(java.util.Date())
    "music_title_artist" -> "♪ 未播放"
    "lyrics" -> ""
    "" -> el.staticText
    else -> el.staticText.ifEmpty { "-" }
}

private fun iconSymbol(el: HudElement, @Suppress("UNUSED_PARAMETER") state: VehicleState): String = when (el.dataSource) {
    "turn_signal_left" -> "◀"
    "turn_signal_right" -> "▶"
    "navigation_icon" -> "↑"
    else -> ""
}

private fun isIconActive(el: HudElement, state: VehicleState): Boolean = when (el.dataSource) {
    "turn_signal_left" -> state.turnSignalLeft
    "turn_signal_right" -> state.turnSignalRight
    "navigation_icon" -> true
    else -> true
}

private fun composeAlignment(h: HudAlign, v: HudAlign): Alignment {
    val ha = when (h) { HudAlign.LEFT -> -1f; HudAlign.RIGHT -> 1f; else -> 0f }
    val va = when (v) { HudAlign.TOP -> -1f; HudAlign.BOTTOM -> 1f; else -> 0f }
    return BiasAlignment(ha, va)
}

/** Android 整型颜色（ARGB signed int）→ Compose Color */
private fun androidColorToCompose(c: Int): Color {
    val a = ((c shr 24) and 0xff) / 255f
    val r = ((c shr 16) and 0xff) / 255f
    val g = ((c shr 8) and 0xff) / 255f
    val b = (c and 0xff) / 255f
    return Color(red = r, green = g, blue = b, alpha = if (a == 0f) 1f else a)
}
