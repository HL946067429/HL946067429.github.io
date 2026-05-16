package com.xyl.launcher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.vehicle.seatmemory.SeatMemoryState

private val TextSec = Color(0xB3FFFFFF)
private val Accent = Color(0xFF4A9EFF)
private val Save = Color(0xFF7AE582)

@Composable
fun SeatMemoryCard(
    available: Boolean,
    state: SeatMemoryState,
    safeMode: Boolean,
    drivingLockout: Boolean,
    onSave: (Int) -> Unit,
    onRestore: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val enabled = available && !safeMode && !drivingLockout
    var mode by remember { mutableStateOf(Mode.RESTORE) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Color(0x1AFFFFFF))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("座椅记忆", fontSize = 14.sp, color = TextSec)
                Text(
                    "当前位置 ${if (state.currentPosition > 0) state.currentPosition else "—"}",
                    fontSize = 11.sp, color = TextSec,
                )
            }
            Text(
                when {
                    !available -> "车上才可用"
                    drivingLockout -> "🔒 行车中"
                    safeMode -> "🔒 安全模式"
                    else -> "✓ 已连接"
                },
                fontSize = 11.sp,
                color = when {
                    drivingLockout || safeMode -> Color(0xFFFFB347)
                    available -> Color(0xFF7AE582)
                    else -> Color(0x99FFFFFF)
                },
            )
        }

        // 模式切换：恢复 / 保存
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ModeChip("恢复", mode == Mode.RESTORE, Accent) { mode = Mode.RESTORE }
            ModeChip("保存", mode == Mode.SAVE, Save) { mode = Mode.SAVE }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            (1..3).forEach { pos ->
                val isCurrent = state.currentPosition == pos
                val isSaved = pos in state.savedPositions
                val accent = if (mode == Mode.SAVE) Save else Accent
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isCurrent) accent else Color(0x33FFFFFF))
                        .clickable(enabled = enabled) {
                            if (mode == Mode.SAVE) onSave(pos) else onRestore(pos)
                        }
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "位置 $pos", fontSize = 14.sp,
                            fontWeight = FontWeight.Medium, color = Color.White,
                        )
                        if (isSaved) {
                            Text("● 已存", fontSize = 9.sp, color = Color.White.copy(alpha = 0.7f))
                        }
                    }
                }
            }
        }
    }
}

private enum class Mode { SAVE, RESTORE }

@Composable
private fun ModeChip(text: String, selected: Boolean, color: Color, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) color else Color(0x22FFFFFF))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp),
    ) { Text(text, fontSize = 12.sp, color = Color.White) }
}
