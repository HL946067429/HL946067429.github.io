package com.xyl.launcher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import com.xyl.launcher.vehicle.tire.TireData
import com.xyl.launcher.vehicle.tire.TirePressureState
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val Normal = Color(0xFF7AE582)
private val Warn = Color(0xFFFF6B35)
private val TextSec = Color(0xB3FFFFFF)

@Composable
fun TirePressureCard(
    state: TirePressureState,
    providerName: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Color(0x1AFFFFFF))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("胎压监测", fontSize = 14.sp, color = TextSec)
                Text(
                    if (state.isAbnormal) "⚠ 胎压异常" else "✓ 胎压正常",
                    fontSize = 12.sp,
                    color = if (state.isAbnormal) Warn else Normal,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(providerName, fontSize = 11.sp, color = TextSec)
                if (state.updateTimeMs > 0) {
                    Text(
                        SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                            .format(Date(state.updateTimeMs)),
                        fontSize = 10.sp, color = Color(0x66FFFFFF),
                    )
                }
            }
        }

        // 车形示意（左前、右前 / 车身 / 左后、右后）
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TireBlock("左前", state.frontLeft, modifier = Modifier.weight(1f))
            CarBodyMid()
            TireBlock("右前", state.frontRight, modifier = Modifier.weight(1f))
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TireBlock("左后", state.rearLeft, modifier = Modifier.weight(1f))
            CarBodyMid()
            TireBlock("右后", state.rearRight, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun TireBlock(label: String, data: TireData, modifier: Modifier = Modifier) {
    val abnormal = data.pressureKpa?.let { it < 200f || it > 280f } ?: false
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (abnormal) Color(0x33FF6B35) else Color(0x22FFFFFF)
            )
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(label, fontSize = 11.sp, color = TextSec)
        Text(
            data.pressureKpa?.let { "${it.toInt()} kPa" } ?: "—",
            fontSize = 20.sp, color = Color.White, fontWeight = FontWeight.Medium,
        )
        Text(
            data.tempCelsius?.let { "${"%.0f".format(it)}℃" } ?: "—",
            fontSize = 11.sp, color = TextSec,
        )
    }
}

@Composable
private fun CarBodyMid() {
    Box(
        modifier = Modifier
            .size(40.dp, 60.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0x11FFFFFF)),
    )
}
