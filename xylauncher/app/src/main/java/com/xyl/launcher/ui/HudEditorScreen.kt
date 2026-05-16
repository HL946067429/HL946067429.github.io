package com.xyl.launcher.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.App
import com.xyl.launcher.hud.Align as HudAlign
import com.xyl.launcher.hud.HudConfig
import com.xyl.launcher.hud.HudElement
import com.xyl.launcher.hud.HudElementType
import com.xyl.launcher.vehicle.Gear
import com.xyl.launcher.vehicle.VehicleState

private val Accent = Color(0xFF4A9EFF)
private val TextSec = Color(0xB3FFFFFF)
private val PanelBg = Color(0x1AFFFFFF)

@Composable
fun HudEditorScreen(onBack: () -> Unit) {
    val app = App.instance
    val cfg by app.hudRepository.config.collectAsState()
    val vehicle by app.vehicleRepository.state.collectAsState()
    var selectedId by remember { mutableStateOf<String?>(null) }
    var dirty by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { app.hudRepository.load() }

    fun mutate(transform: (HudElement) -> HudElement, filter: (HudElement) -> Boolean) {
        val current = app.hudRepository.config.value
        val newElements = current.elements.map { if (filter(it)) transform(it) else it }
        app.hudRepository.update(current.copy(elements = newElements))
        dirty = true
    }

    fun mutateElement(id: String, transform: (HudElement) -> HudElement) {
        mutate(transform) { it.id == id }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // 顶部工具条
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("HUD 编辑器", fontSize = 18.sp, color = Color.White, fontWeight = FontWeight.Medium)
                    Text(
                        "${cfg.elements.size} 个元素 · ${if (dirty) "未保存修改" else "已同步"}",
                        fontSize = 11.sp, color = TextSec,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ToolBtn("重置", Color(0x33FF6B35)) {
                        app.hudRepository.resetToDefault()
                        selectedId = null
                        dirty = false
                    }
                    ToolBtn("保存", Color(0xFF7AE582)) {
                        app.hudRepository.save()
                        dirty = false
                    }
                    ToolBtn("返回", Color(0x33FFFFFF), onClick = onBack)
                }
            }

            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // 左：编辑画布
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center,
                ) {
                    EditorCanvas(
                        cfg = cfg,
                        vehicle = vehicle,
                        selectedId = selectedId,
                        onSelect = { selectedId = it },
                        onMove = { id, newX, newY ->
                            mutateElement(id) { it.copy(x = newX, y = newY) }
                        },
                    )
                }
                // 右：属性面板
                Column(
                    modifier = Modifier
                        .width(240.dp)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(16.dp))
                        .background(PanelBg)
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    val selected = cfg.elements.find { it.id == selectedId }
                    if (selected == null) {
                        Text("点击画布上的元素或下方列表选中", fontSize = 12.sp, color = TextSec)
                    } else {
                        PropertyPanel(
                            element = selected,
                            onChange = { newEl -> mutateElement(selected.id) { newEl } },
                        )
                    }
                    Text("所有元素", fontSize = 11.sp, color = TextSec, modifier = Modifier.padding(top = 8.dp))
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        items(cfg.elements, key = { it.id }) { el ->
                            ElementRow(
                                el = el,
                                selected = el.id == selectedId,
                                onTap = { selectedId = el.id },
                                onToggleVisible = {
                                    mutateElement(el.id) { it.copy(visible = !it.visible) }
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ToolBtn(label: String, bg: Color, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(bg)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp),
    ) { Text(label, fontSize = 12.sp, color = Color.White) }
}

@Composable
private fun EditorCanvas(
    cfg: HudConfig,
    vehicle: VehicleState,
    selectedId: String?,
    onSelect: (String) -> Unit,
    onMove: (id: String, x: Float, y: Float) -> Unit,
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF050505)),
    ) {
        val canvasW = maxWidth
        val canvasH = maxHeight
        val density = LocalDensity.current
        val canvasWidthPx = with(density) { canvasW.toPx() }
        val canvasHeightPx = with(density) { canvasH.toPx() }
        val scale = canvasWidthPx / 1200f / density.density * 1.2f

        cfg.elements.forEach { el ->
            EditableElement(
                el = el,
                state = vehicle,
                canvasW = canvasW,
                canvasH = canvasH,
                scale = scale,
                selected = el.id == selectedId,
                onTap = { onSelect(el.id) },
                onDrag = { dxPx, dyPx ->
                    val app = App.instance
                    val current = app.hudRepository.config.value.elements.find { it.id == el.id }
                        ?: return@EditableElement
                    val newX = (current.x + dxPx / canvasWidthPx)
                        .coerceIn(0f, (1f - current.width).coerceAtLeast(0f))
                    val newY = (current.y + dyPx / canvasHeightPx)
                        .coerceIn(0f, (1f - current.height).coerceAtLeast(0f))
                    onMove(el.id, newX, newY)
                },
            )
        }
    }
}

@Composable
private fun EditableElement(
    el: HudElement,
    state: VehicleState,
    canvasW: Dp,
    canvasH: Dp,
    scale: Float,
    selected: Boolean,
    onTap: () -> Unit,
    onDrag: (dxPx: Float, dyPx: Float) -> Unit,
) {
    val x = canvasW * el.x
    val y = canvasH * el.y
    val w = canvasW * el.width.coerceAtLeast(0.04f)
    val h = canvasH * el.height.coerceAtLeast(0.04f)
    val color = androidColorToCompose(el.textColor)

    Box(
        modifier = Modifier
            .offset(x, y)
            .size(w, h)
            .alpha(if (el.visible) el.alpha else 0.25f)
            .border(
                width = if (selected) 2.dp else 1.dp,
                color = if (selected) Accent else Color(0x33FFFFFF),
                shape = RoundedCornerShape(4.dp),
            )
            .clickable(onClick = onTap)
            .pointerInput(el.id) {
                detectDragGestures(
                    onDragStart = { onTap() },
                    onDrag = { change, drag ->
                        change.consume()
                        onDrag(drag.x, drag.y)
                    }
                )
            },
        contentAlignment = composeAlignment(el.horizontalAlign, el.verticalAlign),
    ) {
        when (el.type) {
            HudElementType.TEXT, HudElementType.CUSTOM_VIEW, HudElementType.UNKNOWN -> {
                val text = displayPreviewText(el, state)
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
                Text(
                    text = iconPreviewSymbol(el),
                    fontSize = (el.textSize * el.iconScale * scale).coerceAtLeast(8f).sp,
                    color = color,
                )
            }
            HudElementType.IMAGE -> {
                Box(
                    modifier = Modifier
                        .size(w, h)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0x33FFFFFF)),
                    contentAlignment = Alignment.Center,
                ) { Text("♪", fontSize = 14.sp, color = Color.White) }
            }
        }
    }
}

@Composable
private fun PropertyPanel(element: HudElement, onChange: (HudElement) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(element.name.ifEmpty { element.id }, fontSize = 14.sp, color = Color.White, fontWeight = FontWeight.Medium)
        Text("${element.type.name} · ${element.dataSource.ifEmpty { "static" }}",
            fontSize = 10.sp, color = TextSec)

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("可见", fontSize = 11.sp, color = TextSec, modifier = Modifier.padding(end = 8.dp))
            ToggleSmall(element.visible) { onChange(element.copy(visible = !element.visible)) }
        }

        Text("文字大小 ${element.textSize}", fontSize = 11.sp, color = TextSec)
        Slider(
            value = element.textSize.toFloat(),
            onValueChange = { onChange(element.copy(textSize = it.toInt().coerceIn(8, 200))) },
            valueRange = 8f..200f,
            colors = SliderDefaults.colors(thumbColor = Accent, activeTrackColor = Accent),
        )

        Text("透明度 ${"%.2f".format(element.alpha)}", fontSize = 11.sp, color = TextSec)
        Slider(
            value = element.alpha,
            onValueChange = { onChange(element.copy(alpha = it.coerceIn(0f, 1f))) },
            valueRange = 0f..1f,
            colors = SliderDefaults.colors(thumbColor = Accent, activeTrackColor = Accent),
        )

        Text(
            "位置 X ${"%.3f".format(element.x)} · Y ${"%.3f".format(element.y)}",
            fontSize = 10.sp, color = TextSec,
        )
    }
}

@Composable
private fun ElementRow(
    el: HudElement,
    selected: Boolean,
    onTap: () -> Unit,
    onToggleVisible: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(if (selected) Color(0x33FFFFFF) else Color.Transparent)
            .clickable(onClick = onTap)
            .padding(horizontal = 6.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            el.name.ifEmpty { el.id }.take(14),
            fontSize = 11.sp,
            color = if (el.visible) Color.White else Color(0x66FFFFFF),
        )
        Box(
            modifier = Modifier
                .size(28.dp, 16.dp)
                .clip(CircleShape)
                .background(if (el.visible) Accent else Color(0x33FFFFFF))
                .clickable(onClick = onToggleVisible),
            contentAlignment = Alignment.Center,
        ) {
            Text(if (el.visible) "✓" else "·", fontSize = 9.sp, color = Color.White)
        }
    }
}

@Composable
private fun ToggleSmall(on: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(36.dp, 18.dp)
            .clip(CircleShape)
            .background(if (on) Accent else Color(0x33FFFFFF))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(if (on) "开" else "关", fontSize = 10.sp, color = Color.White)
    }
}

/* ── 预览数据：跟 HudPreviewScreen 同源；这里只用一份精简版 ── */

private fun displayPreviewText(el: HudElement, state: VehicleState): String = when (el.dataSource) {
    "speed" -> state.speed?.toInt()?.toString() ?: "0"
    "speed_unit" -> "km/h"
    "rpm" -> state.rpm?.toString()?.let { "$it rpm" } ?: "1800 rpm"
    "gear" -> when (state.gear) {
        Gear.P -> "P"; Gear.R -> "R"; Gear.N -> "N"
        Gear.D -> "D"; Gear.S -> "S"; Gear.L -> "L"
        Gear.UNKNOWN -> "D"
    }
    "fuel" -> state.fuelPercent?.let { "⛽ ${(it * 100).toInt()}%" } ?: "⛽ 65%"
    "battery" -> state.batteryPercent?.let { "🔋 ${(it * 100).toInt()}%" } ?: "🔋 80%"
    "outer_temp" -> state.outerTempCelsius?.let { "${"%.0f".format(it)}℃" } ?: "26℃"
    "motor_speed_front" -> "前 1200"
    "motor_speed_rear" -> "后 1200"
    "navigation_text" -> "直行 500m"
    "traffic_light" -> "🟢 23s"
    "time" -> java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        .format(java.util.Date())
    "music_title_artist" -> "♪ 当前曲目"
    "lyrics" -> "歌词预览…"
    "" -> el.staticText.ifEmpty { el.name.ifEmpty { el.id } }
    else -> el.staticText.ifEmpty { el.dataSource }
}

private fun iconPreviewSymbol(el: HudElement): String = when (el.dataSource) {
    "turn_signal_left" -> "◀"
    "turn_signal_right" -> "▶"
    "navigation_icon" -> "↑"
    else -> "●"
}

private fun composeAlignment(h: HudAlign, v: HudAlign): Alignment {
    val ha = when (h) { HudAlign.LEFT -> -1f; HudAlign.RIGHT -> 1f; else -> 0f }
    val va = when (v) { HudAlign.TOP -> -1f; HudAlign.BOTTOM -> 1f; else -> 0f }
    return BiasAlignment(ha, va)
}

private fun androidColorToCompose(c: Int): Color {
    val a = ((c shr 24) and 0xff) / 255f
    val r = ((c shr 16) and 0xff) / 255f
    val g = ((c shr 8) and 0xff) / 255f
    val b = (c and 0xff) / 255f
    return Color(red = r, green = g, blue = b, alpha = if (a == 0f) 1f else a)
}
