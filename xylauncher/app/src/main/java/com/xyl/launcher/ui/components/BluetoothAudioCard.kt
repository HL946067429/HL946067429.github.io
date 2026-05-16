package com.xyl.launcher.ui.components

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.provider.Settings
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val TextSec = Color(0xB3FFFFFF)
private val Accent = Color(0xFF4A9EFF)

@Composable
fun BluetoothAudioCard(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var info by remember { mutableStateOf<AudioInfo?>(null) }

    LaunchedEffect(Unit) { info = probeAudio(context) }

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
            Text("音频输出", fontSize = 14.sp, color = TextSec)
            Text(
                "蓝牙设置",
                fontSize = 12.sp, color = Accent,
                modifier = Modifier
                    .clickable {
                        context.startActivity(
                            Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                    }
                    .padding(horizontal = 6.dp),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth()
                .clickable { info = probeAudio(context) }
                .padding(top = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text("当前输出", fontSize = 11.sp, color = TextSec)
                Text(info?.output ?: "—", fontSize = 16.sp, color = Color.White)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("音量", fontSize = 11.sp, color = TextSec)
                Text(info?.volumeText ?: "—", fontSize = 16.sp, color = Color.White)
            }
        }
    }
}

private data class AudioInfo(val output: String, val volumeText: String)

private fun probeAudio(context: Context): AudioInfo {
    val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val output = when {
        am.isBluetoothA2dpOn -> "蓝牙音频"
        am.isWiredHeadsetOn -> "有线耳机"
        am.isSpeakerphoneOn -> "外放"
        else -> "默认输出"
    }
    val cur = am.getStreamVolume(AudioManager.STREAM_MUSIC)
    val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    return AudioInfo(output, "$cur / $max")
}
