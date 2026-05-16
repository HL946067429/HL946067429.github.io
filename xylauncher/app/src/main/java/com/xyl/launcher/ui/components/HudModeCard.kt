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
import com.xyl.launcher.vehicle.hud.HudMode

@Composable
fun HudModeCard(
    available: Boolean,
    current: HudMode?,
    safeMode: Boolean,
    drivingLockout: Boolean,
    onSelect: (HudMode) -> Unit,
    onRefresh: () -> Unit,
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
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text("AR-HUD 模式", fontSize = 14.sp, color = Color(0xB3FFFFFF))
                if (available && current != null) {
                    Text(
                        "当前: ${current.displayName}",
                        fontSize = 11.sp, color = Color(0xFF7AE582),
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                val statusText = when {
                    !available -> "车上才可用"
                    drivingLockout -> "🔒 行车中"
                    safeMode -> "🔒 安全模式"
                    else -> "✓ 已连接"
                }
                Text(
                    statusText,
                    fontSize = 11.sp,
                    color = when {
                        drivingLockout || safeMode -> Color(0xFFFFB347)
                        available -> Color(0xFF7AE582)
                        else -> Color(0x99FFFFFF)
                    },
                )
                if (available) {
                    Text(
                        "  刷新",
                        fontSize = 12.sp, color = Color(0xFF4A9EFF),
                        modifier = Modifier
                            .clickable(onClick = onRefresh)
                            .padding(horizontal = 6.dp),
                    )
                }
            }
        }

        // 常用顺序：AR / SR / 导航 / 极简
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            HudMode.COMMON_ORDER.forEach { mode ->
                val isCurrent = current == mode
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (isCurrent) Color(0xFF4A9EFF)
                            else Color(0x33FFFFFF)
                        )
                        .clickable(enabled = enabled) { onSelect(mode) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            mode.displayName,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.White,
                        )
                        if (isCurrent) {
                            Text("●", fontSize = 8.sp, color = Color.White)
                        }
                    }
                }
            }
        }

        Text(
            "通过 ECarXCarVfhudManager 切换原车 AR-HUD 显示内容；按常用度排序",
            fontSize = 11.sp, color = Color(0x99FFFFFF),
        )
    }
}
