package com.xyl.launcher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.vehicle.hvac.BlowMode
import com.xyl.launcher.vehicle.hvac.HvacFunctionIds
import com.xyl.launcher.vehicle.hvac.HvacRepository
import com.xyl.launcher.vehicle.hvac.HvacScene
import com.xyl.launcher.vehicle.hvac.HvacState
import kotlinx.coroutines.launch

private val CardBg = Color(0x1AFFFFFF)
private val Active = Color(0xFF4A9EFF)
private val InactiveBg = Color(0x33FFFFFF)
private val TextSec = Color(0xB3FFFFFF)

@Composable
fun HvacCard(
    state: HvacState,
    providerName: String,
    repo: HvacRepository,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(CardBg)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // 标题行
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("空调 HVAC", fontSize = 14.sp, color = TextSec)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(providerName, fontSize = 11.sp, color = TextSec)
                PowerToggle(state.power) { scope.launch { repo.setPower(!state.power) } }
            }
        }

        // 场景预设 —— 一键到位
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            HvacScene.values().forEach { scene ->
                SceneChip(
                    scene = scene,
                    modifier = Modifier.weight(1f),
                    onClick = { scope.launch { repo.applyScene(scene) } },
                )
            }
        }

        if (state.power) {
            // 温度行
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TempBlock(
                    label = "驾驶位",
                    value = state.tempLeft,
                    modifier = Modifier.weight(1f),
                    onDec = { scope.launch { repo.setTemperature(HvacFunctionIds.ZONE_LEFT, state.tempLeft - 0.5f) } },
                    onInc = { scope.launch { repo.setTemperature(HvacFunctionIds.ZONE_LEFT, state.tempLeft + 0.5f) } },
                )
                SyncToggle(state.syncMode) { scope.launch { repo.setTemperatureSyncMode(!state.syncMode) } }
                TempBlock(
                    label = "副驾位",
                    value = state.tempRight,
                    modifier = Modifier.weight(1f),
                    onDec = { scope.launch { repo.setTemperature(HvacFunctionIds.ZONE_RIGHT, state.tempRight - 0.5f) } },
                    onInc = { scope.launch { repo.setTemperature(HvacFunctionIds.ZONE_RIGHT, state.tempRight + 0.5f) } },
                )
            }

            // 风量行
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("风量  ${state.fanSpeed}/9", fontSize = 12.sp, color = TextSec)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    for (i in 0..9) {
                        FanLevelChip(
                            level = i,
                            active = i <= state.fanSpeed,
                            modifier = Modifier.weight(1f),
                            onClick = { scope.launch { repo.setFanSpeed(i) } },
                        )
                    }
                }
            }

            // 座椅加热 + 内循环
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                SeatComfortBlock(
                    label = "主驾座椅",
                    heatLevel = state.seatHeatLeft,
                    ventLevel = state.seatVentLeft,
                    modifier = Modifier.weight(1f),
                    onHeat = { scope.launch { repo.setSeatHeating(HvacFunctionIds.ZONE_LEFT, (state.seatHeatLeft + 1) % 4) } },
                    onVent = { scope.launch { repo.setSeatVentilation(HvacFunctionIds.ZONE_LEFT, (state.seatVentLeft + 1) % 4) } },
                )
                SeatComfortBlock(
                    label = "副驾座椅",
                    heatLevel = state.seatHeatRight,
                    ventLevel = state.seatVentRight,
                    modifier = Modifier.weight(1f),
                    onHeat = { scope.launch { repo.setSeatHeating(HvacFunctionIds.ZONE_RIGHT, (state.seatHeatRight + 1) % 4) } },
                    onVent = { scope.launch { repo.setSeatVentilation(HvacFunctionIds.ZONE_RIGHT, (state.seatVentRight + 1) % 4) } },
                )
                CircleBlock(
                    label = if (state.innerCirculation) "内循环" else "外循环",
                    active = state.innerCirculation,
                    modifier = Modifier.weight(1f),
                    onClick = { scope.launch { repo.setInnerCirculation() } },
                )
            }

            // AC / AUTO / 除霜
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ToggleChip(
                    label = "A/C",
                    active = state.acOn,
                    modifier = Modifier.weight(1f),
                    onClick = { scope.launch { repo.setAirConditioner(!state.acOn) } },
                )
                ToggleChip(
                    label = "AUTO",
                    active = state.autoMode,
                    modifier = Modifier.weight(1f),
                    onClick = { scope.launch { repo.setAutoMode(!state.autoMode) } },
                )
                ToggleChip(
                    label = "前除霜",
                    active = state.defrostFront,
                    modifier = Modifier.weight(1f),
                    onClick = { scope.launch { repo.setDefrostFront(!state.defrostFront) } },
                )
                ToggleChip(
                    label = "后除霜",
                    active = state.defrostRear,
                    modifier = Modifier.weight(1f),
                    onClick = { scope.launch { repo.setDefrostRear(!state.defrostRear) } },
                )
            }

            // 出风方向
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("出风方向", fontSize = 12.sp, color = TextSec)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    BlowMode.values().forEach { mode ->
                        BlowModeChip(
                            mode = mode,
                            active = state.blowMode == mode,
                            modifier = Modifier.weight(1f),
                            onClick = { scope.launch { repo.setBlowMode(mode) } },
                        )
                    }
                }
            }
        } else {
            Text("已关闭，点击开关启动", fontSize = 13.sp, color = TextSec)
        }
    }
}

@Composable
private fun PowerToggle(on: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .padding(start = 12.dp)
            .clip(CircleShape)
            .background(if (on) Active else InactiveBg)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Text(if (on) "ON" else "OFF", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun TempBlock(
    label: String,
    value: Float,
    modifier: Modifier = Modifier,
    onDec: () -> Unit,
    onInc: () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(InactiveBg)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(label, fontSize = 11.sp, color = TextSec)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            CircleBtn("－", onDec)
            Text("${"%.1f".format(value)}°", fontSize = 26.sp, color = Color.White, fontWeight = FontWeight.Medium)
            CircleBtn("＋", onInc)
        }
    }
}

@Composable
private fun CircleBtn(text: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(Color(0x44FFFFFF))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, fontSize = 18.sp, color = Color.White)
    }
}

@Composable
private fun SyncToggle(on: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(if (on) Active else InactiveBg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text("⇄", fontSize = 22.sp, color = Color.White)
    }
}

@Composable
private fun FanLevelChip(level: Int, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (active) Active else InactiveBg)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(level.toString(), fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium)
    }
}

/**
 * 座椅舒适块：上半部分点击循环加热档，下半部分点击循环通风档。
 * 加热档亮橘色，通风档亮蓝色，互不冲突（车自身两路独立电路）。
 */
@Composable
private fun SeatComfortBlock(
    label: String,
    heatLevel: Int,
    ventLevel: Int,
    modifier: Modifier = Modifier,
    onHeat: () -> Unit,
    onVent: () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(InactiveBg)
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(label, fontSize = 11.sp, color = TextSec)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            SeatLevelChip(
                icon = "♨",
                level = heatLevel,
                activeColor = Color(0xFFFF6B35),
                modifier = Modifier.weight(1f),
                onClick = onHeat,
            )
            SeatLevelChip(
                icon = "❄",
                level = ventLevel,
                activeColor = Color(0xFF4AB4FF),
                modifier = Modifier.weight(1f),
                onClick = onVent,
            )
        }
    }
}

@Composable
private fun SeatLevelChip(
    icon: String,
    level: Int,
    activeColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val active = level > 0
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (active) activeColor.copy(alpha = 0.6f) else Color(0x22FFFFFF))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Text(icon, fontSize = 13.sp, color = Color.White)
        Text(
            "  $level",
            fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun ToggleChip(
    label: String,
    active: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (active) Active else InactiveBg)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun SceneChip(
    scene: HvacScene,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(InactiveBg)
            .clickable(onClick = onClick)
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(scene.icon, fontSize = 16.sp)
        Text(scene.label, fontSize = 10.sp, color = Color.White)
    }
}

@Composable
private fun BlowModeChip(
    mode: BlowMode,
    active: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (active) Active else InactiveBg)
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(mode.label, fontSize = 11.sp, color = Color.White)
    }
}

@Composable
private fun CircleBlock(label: String, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (active) Active else InactiveBg)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text("循环", fontSize = 11.sp, color = TextSec)
        Text(label, fontSize = 14.sp, color = Color.White)
    }
}
