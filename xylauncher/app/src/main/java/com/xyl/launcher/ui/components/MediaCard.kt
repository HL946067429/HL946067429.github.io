package com.xyl.launcher.ui.components

import android.content.Intent
import android.provider.Settings
import android.widget.ImageView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.media.MediaRepository
import com.xyl.launcher.media.MediaState

private val CardBg = Color(0x1AFFFFFF)
private val ChipBg = Color(0x33FFFFFF)
private val Accent = Color(0xFF4A9EFF)
private val TextSec = Color(0xB3FFFFFF)

@Composable
fun MediaCard(
    state: MediaState,
    hasAccess: Boolean,
    repo: MediaRepository,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(CardBg)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text("正在播放", fontSize = 14.sp, color = TextSec)

        when {
            !hasAccess -> NeedAccessRow(onClick = {
                context.startActivity(
                    Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            })
            !state.available -> Text("没有正在播放的媒体", fontSize = 13.sp, color = TextSec)
            else -> PlayingRow(state, repo)
        }
    }
}

@Composable
private fun NeedAccessRow(onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(ChipBg)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(modifier = Modifier.padding(end = 12.dp)) {
            Text("需要通知访问权限", fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Medium)
            Text("点击前往系统设置中授权", fontSize = 11.sp, color = TextSec)
        }
        Text("授权 →", fontSize = 13.sp, color = Accent)
    }
}

@Composable
private fun PlayingRow(state: MediaState, repo: MediaRepository) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Artwork(state)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                state.title ?: "未知歌曲",
                fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Medium,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(
                state.artist ?: "未知艺术家",
                fontSize = 12.sp, color = TextSec,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(
                state.packageName ?: "",
                fontSize = 10.sp, color = Color(0x66FFFFFF),
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        Controls(state, repo)
    }
}

@Composable
private fun Artwork(state: MediaState) {
    val art = state.artwork
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(ChipBg),
        contentAlignment = Alignment.Center,
    ) {
        if (art != null) {
            Image(
                bitmap = art.asImageBitmap(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(72.dp),
            )
        } else {
            Text("♪", fontSize = 28.sp, color = TextSec)
        }
    }
}

@Composable
private fun Controls(state: MediaState, repo: MediaRepository) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
        ControlBtn("⏮", small = true) { repo.previous() }
        ControlBtn(if (state.isPlaying) "⏸" else "▶", small = false) { repo.playPause() }
        ControlBtn("⏭", small = true) { repo.next() }
    }
}

@Composable
private fun ControlBtn(text: String, small: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(if (small) 40.dp else 52.dp)
            .clip(CircleShape)
            .background(if (small) ChipBg else Accent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, fontSize = if (small) 18.sp else 22.sp, color = Color.White)
    }
}
