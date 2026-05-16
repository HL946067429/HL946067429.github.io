package com.xyl.launcher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.dashcam.DashCamState

@Composable
fun DashCamCard(
    state: DashCamState,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Color(0x1AFFFFFF))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("行车记录仪", fontSize = 14.sp, color = Color(0xB3FFFFFF))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (state.watching) "监视中" else "未连接",
                    fontSize = 11.sp,
                    color = if (state.watching) Color(0xFF7AE582) else Color(0x99FFFFFF),
                )
                Text(
                    "  刷新",
                    fontSize = 12.sp, color = Color(0xFF4A9EFF),
                    modifier = Modifier.clickable(onClick = onRefresh)
                        .padding(horizontal = 6.dp),
                )
            }
        }

        Text(state.sourceDir.ifEmpty { "—" }, fontSize = 11.sp, color = Color(0x99FFFFFF))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Stat("文件", state.totalFiles.toString())
            Stat("占用", "${state.totalSizeMb} MB")
            Stat("待传", state.pendingUpload.toString())
        }

        if (state.recentFiles.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("最近 5 个：", fontSize = 11.sp, color = Color(0x99FFFFFF))
                state.recentFiles.forEach {
                    Text(it, fontSize = 11.sp, color = Color(0xCCFFFFFF))
                }
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = Color(0x99FFFFFF))
        Text(value, fontSize = 18.sp, color = Color.White)
    }
}
