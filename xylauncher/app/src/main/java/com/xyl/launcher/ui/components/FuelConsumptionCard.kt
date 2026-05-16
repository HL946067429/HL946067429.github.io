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
import com.xyl.launcher.vehicle.fuel.FuelState

private val TextSec = Color(0xB3FFFFFF)

@Composable
fun FuelConsumptionCard(
    state: FuelState,
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
            Text("油耗 / 续航", fontSize = 14.sp, color = TextSec)
            Text(providerName, fontSize = 11.sp, color = TextSec)
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            BigStat(
                label = "瞬时油耗",
                value = state.instantConsumptionL100km?.let { "%.1f".format(it) } ?: "—",
                unit = "L/100km",
            )
            BigStat(
                label = "平均油耗",
                value = state.avgConsumptionL100km?.let { "%.1f".format(it) } ?: "—",
                unit = "L/100km",
            )
            BigStat(
                label = "续航",
                value = state.rangeKm?.toString() ?: "—",
                unit = "km",
            )
        }

        if (state.totalDistanceKm != null) {
            Text(
                "总里程 ${state.totalDistanceKm} km",
                fontSize = 11.sp, color = TextSec,
            )
        }
    }
}

@Composable
private fun BigStat(label: String, value: String, unit: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = TextSec)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, fontSize = 24.sp, color = Color.White, fontWeight = FontWeight.Medium)
        }
        Text(unit, fontSize = 10.sp, color = TextSec)
    }
}
