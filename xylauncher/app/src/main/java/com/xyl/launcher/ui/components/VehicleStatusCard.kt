package com.xyl.launcher.ui.components

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.vehicle.Gear
import com.xyl.launcher.vehicle.VehicleState

@Composable
fun VehicleStatusCard(
    state: VehicleState,
    providerName: String,
    available: Boolean,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Color(0x1AFFFFFF))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("车辆状态", fontSize = 14.sp, color = Color(0xB3FFFFFF))
            Text(
                if (available) providerName else "—",
                fontSize = 12.sp,
                color = if (available) Color(0xFF7AE582) else Color(0x99FFFFFF),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            BigStat(label = "车速", value = state.speed?.toInt()?.toString() ?: "—", unit = "km/h")
            BigStat(label = "转速", value = state.rpm?.toString() ?: "—", unit = "rpm")
            BigStat(label = "档位", value = gearLabel(state.gear), unit = "")
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SmallStat(label = "油量", value = state.fuelPercent?.let { "${(it * 100).toInt()}%" } ?: "—")
            SmallStat(label = "电量", value = state.batteryPercent?.let { "${(it * 100).toInt()}%" } ?: "—")
            SmallStat(label = "车外", value = state.outerTempCelsius?.let { "${"%.1f".format(it)}℃" } ?: "—")
            SmallStat(
                label = "转向",
                value = when {
                    state.turnSignalLeft -> "← L"
                    state.turnSignalRight -> "R →"
                    else -> "—"
                }
            )
        }
    }
}

@Composable
private fun BigStat(label: String, value: String, unit: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 12.sp, color = Color(0x99FFFFFF))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, fontSize = 32.sp, fontWeight = FontWeight.Medium, color = Color.White)
            if (unit.isNotEmpty()) {
                Text(" $unit", fontSize = 12.sp, color = Color(0xB3FFFFFF))
            }
        }
    }
}

@Composable
private fun SmallStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = Color(0x99FFFFFF))
        Text(value, fontSize = 16.sp, color = Color.White)
    }
}

private fun gearLabel(g: Gear) = when (g) {
    Gear.P -> "P"; Gear.R -> "R"; Gear.N -> "N"
    Gear.D -> "D"; Gear.S -> "S"; Gear.L -> "L"
    Gear.UNKNOWN -> "—"
}
