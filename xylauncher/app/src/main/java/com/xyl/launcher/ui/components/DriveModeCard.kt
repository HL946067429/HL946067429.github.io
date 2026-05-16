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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.vehicle.drivemode.DriveMode

private val TextSec = Color(0xB3FFFFFF)
private val Accent = Color(0xFF4A9EFF)

@Composable
fun DriveModeCard(
    available: Boolean,
    current: DriveMode,
    safeMode: Boolean,
    drivingLockout: Boolean,
    onSelect: (DriveMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    val enabled = available && !safeMode && !drivingLockout

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
                Text("驾驶模式", fontSize = 14.sp, color = TextSec)
                Text("当前: ${current.displayName}", fontSize = 11.sp, color = Color(0xFF7AE582))
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

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            DriveMode.values().forEach { mode ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (current == mode) Accent
                            else Color(0x33FFFFFF)
                        )
                        .clickable(enabled = enabled) { onSelect(mode) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        mode.displayName, fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White,
                    )
                }
            }
        }
    }
}
