package com.xyl.launcher.ui.components

import android.content.ComponentName
import android.content.Intent
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val TextSec = Color(0xB3FFFFFF)

/**
 * 360 全景影像入口 —— 调起 ECARX 全景服务 com.ecarx.pas.avmservice。
 *
 * 实现方式（基于小八字符串提示）：
 *   - 优先尝试: com.ecarx.intent.action.CONTROL_BOARD_OPEN
 *   - 备选: 直接 Intent 启动 com.ecarx.parking 或 com.ecarx.pas.avm
 *
 * 模拟器上必然失败（没装那些 App），真车上才能启动。
 */
@Composable
fun Parking360Card(modifier: Modifier = Modifier) {
    val context = LocalContext.current

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Color(0x1AFFFFFF))
            .clickable {
                launchParking360(context)
            }
            .padding(20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text("360 全景", fontSize = 14.sp, color = TextSec)
            Text(
                "一键启动环视影像",
                fontSize = 12.sp, color = Color(0x99FFFFFF),
            )
        }
        Text("⟲", fontSize = 32.sp, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

private fun launchParking360(context: android.content.Context) {
    // 优先尝试 ECARX 标准 Intent
    val candidates = listOf<() -> Intent>(
        { Intent("com.ecarx.intent.action.CONTROL_BOARD_OPEN").apply { putExtra("function", "avm") } },
        { Intent(Intent.ACTION_VIEW).setPackage("com.ecarx.parking") },
        { Intent(Intent.ACTION_VIEW).setPackage("com.ecarx.pas.avm") },
        { Intent().setComponent(ComponentName("com.ecarx.parking", "com.ecarx.parking.MainActivity")) },
    )
    for (factory in candidates) {
        try {
            val i = factory().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(i)
            return
        } catch (_: Throwable) {}
    }
    // 全部失败 —— 模拟器上正常，真车有问题时会到这
    android.widget.Toast.makeText(
        context, "360 全景服务未找到（真车上才可用）", android.widget.Toast.LENGTH_SHORT
    ).show()
}
