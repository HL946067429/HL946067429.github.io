package com.xyl.launcher.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.App
import com.xyl.launcher.hud.Align as HudAlign
import com.xyl.launcher.hud.HudElement
import com.xyl.launcher.hud.HudElementType
import com.xyl.launcher.vehicle.Gear
import com.xyl.launcher.vehicle.VehicleState

/**
 * HUD 悬浮窗内容 —— 全屏渲染所有元素，背景半透明黑。
 * 通过 [HudOverlayService] 的 ComposeView 挂载。
 */
@Composable
fun HudOverlayContent() {
    val app = App.instance
    val cfg by app.hudRepository.config.collectAsState()
    val vehicle by app.vehicleRepository.state.collectAsState()

    LaunchedEffect(Unit) { app.hudRepository.load() }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xC0000000)),   // 半透明黑，便于看清白字
    ) {
        val canvasW = maxWidth
        val canvasH = maxHeight
        val density = LocalDensity.current
        val canvasWidthPx = with(density) { canvasW.toPx() }
        val scale = canvasWidthPx / 1200f / density.density * 1.2f

        cfg.elements.filter { it.visible }.forEach { el ->
            HudElement(el, vehicle, canvasW, canvasH, scale)
        }
    }
}

@Composable
private fun HudElement(
    el: HudElement, state: VehicleState,
    canvasW: Dp, canvasH: Dp, scale: Float,
) {
    val x = canvasW * el.x
    val y = canvasH * el.y
    val w = canvasW * el.width
    val h = canvasH * el.height
    val color = androidColor(el.textColor)
    val ha = when (el.horizontalAlign) {
        HudAlign.LEFT -> -1f; HudAlign.RIGHT -> 1f; else -> 0f
    }
    val va = when (el.verticalAlign) {
        HudAlign.TOP -> -1f; HudAlign.BOTTOM -> 1f; else -> 0f
    }

    Box(
        modifier = Modifier
            .offset(x, y)
            .size(w, h)
            .alpha(el.alpha),
        contentAlignment = BiasAlignment(ha, va),
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
                val sym = iconSymbol(el)
                val active = isIconActive(el, state)
                if (sym.isNotEmpty()) {
                    Text(
                        sym,
                        fontSize = (el.textSize * el.iconScale * scale).coerceAtLeast(8f).sp,
                        color = if (active) color else color.copy(alpha = 0.2f),
                    )
                }
            }
            HudElementType.IMAGE -> {
                Box(
                    modifier = Modifier.size(w, h).background(Color(0x33FFFFFF)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("♪", fontSize = (el.textSize * scale).sp, color = Color.White)
                }
            }
        }
    }
}

private fun displayText(el: HudElement, state: VehicleState): String = when (el.dataSource) {
    "speed" -> state.speed?.toInt()?.toString() ?: "0"
    "speed_unit" -> "km/h"
    "rpm" -> state.rpm?.toString() ?: "-"
    "gear" -> when (state.gear) {
        Gear.P -> "P"; Gear.R -> "R"; Gear.N -> "N"
        Gear.D -> "D"; Gear.S -> "S"; Gear.L -> "L"
        Gear.UNKNOWN -> "-"
    }
    "fuel" -> state.fuelPercent?.let { "⛽ ${(it * 100).toInt()}%" } ?: "-"
    "battery" -> state.batteryPercent?.let { "🔋 ${(it * 100).toInt()}%" } ?: "-"
    "outer_temp" -> state.outerTempCelsius?.let { "${"%.0f".format(it)}℃" } ?: "-"
    "motor_speed_front" -> state.motorSpeedFront?.toString()?.let { "前 $it" } ?: ""
    "motor_speed_rear" -> state.motorSpeedRear?.toString()?.let { "后 $it" } ?: ""
    "navigation_text" -> ""
    "lane_info" -> ""
    "traffic_light" -> ""
    "cruise_traffic_light" -> ""
    "time" -> java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        .format(java.util.Date())
    "music_title_artist" -> ""
    "lyrics" -> ""
    "" -> el.staticText
    else -> el.staticText
}

private fun iconSymbol(el: HudElement): String = when (el.dataSource) {
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

private fun androidColor(c: Int): Color {
    val a = ((c shr 24) and 0xff) / 255f
    val r = ((c shr 16) and 0xff) / 255f
    val g = ((c shr 8) and 0xff) / 255f
    val b = (c and 0xff) / 255f
    return Color(red = r, green = g, blue = b, alpha = if (a == 0f) 1f else a)
}
