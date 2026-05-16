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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.weather.WeatherState
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val TextSec = Color(0xB3FFFFFF)

@Composable
fun WeatherCard(
    state: WeatherState,
    onRefresh: () -> Unit,
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
            Text("天气", fontSize = 14.sp, color = TextSec)
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (state.updateTimeMs > 0) {
                    Text(
                        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(state.updateTimeMs)),
                        fontSize = 10.sp, color = Color(0x66FFFFFF),
                    )
                }
                Text(
                    "  刷新",
                    fontSize = 12.sp, color = Color(0xFF4A9EFF),
                    modifier = Modifier.clickable(onClick = onRefresh).padding(horizontal = 6.dp),
                )
            }
        }

        if (!state.available) {
            Text("正在加载…（如失败请检查网络）", fontSize = 13.sp, color = TextSec)
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            "${state.tempCelsius ?: "—"}",
                            fontSize = 44.sp, fontWeight = FontWeight.Light, color = Color.White,
                        )
                        Text("℃", fontSize = 18.sp, color = TextSec, modifier = Modifier.padding(bottom = 8.dp))
                    }
                    Text(state.condition, fontSize = 14.sp, color = Color.White)
                    state.feelsLikeCelsius?.let {
                        Text("体感 ${it}℃", fontSize = 11.sp, color = TextSec)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(state.location, fontSize = 12.sp, color = TextSec)
                    state.humidity?.let { Text("湿度 $it%", fontSize = 11.sp, color = TextSec) }
                    state.windKph?.let { Text("风速 $it km/h", fontSize = 11.sp, color = TextSec) }
                }
            }
        }
    }
}
