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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.multidisplay.DisplayInfo
import com.xyl.launcher.multidisplay.DisplaySwitcher

private val CardBg = Color(0x1AFFFFFF)
private val Accent = Color(0xFF4A9EFF)
private val TextSec = Color(0xB3FFFFFF)

@Composable
fun DisplayChooserCard(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var displays by remember { mutableStateOf<List<DisplayInfo>>(emptyList()) }

    LaunchedEffect(Unit) {
        displays = DisplaySwitcher.listDisplays(context)
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(CardBg)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("多屏 (${displays.size})", fontSize = 14.sp, color = TextSec)
            Text(
                "刷新",
                fontSize = 12.sp, color = Accent,
                modifier = Modifier
                    .clickable { displays = DisplaySwitcher.listDisplays(context) }
                    .padding(horizontal = 6.dp),
            )
        }

        displays.forEach { d ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0x22FFFFFF))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.padding(end = 12.dp)) {
                    Row {
                        Text(
                            "Display ${d.displayId}",
                            fontSize = 14.sp, color = Color.White, fontWeight = FontWeight.Medium,
                        )
                        Text("  ${d.name}", fontSize = 12.sp, color = TextSec)
                    }
                    Text("${d.width} × ${d.height}", fontSize = 11.sp, color = TextSec)
                }
                val tag = when {
                    d.isHudCandidate -> "HUD ⭐"
                    d.isPassengerCandidate -> "副驾 ⭐"
                    d.displayId == 0 -> "主屏"
                    else -> "外部"
                }
                Text(tag, fontSize = 11.sp, color = Accent)
            }
        }

        if (displays.size == 1) {
            Text(
                "只检测到 1 个屏幕 —— 这是主中控屏。上车后会看到副驾屏 / AR-HUD",
                fontSize = 11.sp, color = TextSec,
            )
        }
    }
}
