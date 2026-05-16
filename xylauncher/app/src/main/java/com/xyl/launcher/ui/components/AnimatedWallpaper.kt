package com.xyl.launcher.ui.components

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.util.Calendar
import kotlin.math.cos
import kotlin.math.sin

/**
 * 主入口：根据 [imageUri] 选择
 *   - 用户自选图片壁纸（异步采样解码，最大 2048 像素）→ [Image]
 *   - 否则动态渐变 → [AnimatedGradientWallpaper]
 *
 * 图片解码失败 / 还没加载完 → 回落到动态渐变，所以视觉上永远有底色。
 */
@Composable
fun AnimatedWallpaper(modifier: Modifier = Modifier, imageUri: String? = null) {
    if (imageUri.isNullOrEmpty()) {
        AnimatedGradientWallpaper(modifier)
        return
    }
    val context = LocalContext.current
    var bitmap by remember(imageUri) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(imageUri) {
        bitmap = withContext(Dispatchers.IO) {
            runCatching { decodeSampledImage(context, Uri.parse(imageUri)) }.getOrNull()
        }
    }
    Box(modifier = modifier.fillMaxSize()) {
        // 底层：失败/加载中也有背景兜底
        AnimatedGradientWallpaper(Modifier.fillMaxSize())
        bitmap?.let { bmp ->
            Image(
                bitmap = bmp,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }
    }
}

/** 采样解码：先读 bounds 再选 inSampleSize，目标 ≤2048 像素，避免大图 OOM。 */
private fun decodeSampledImage(context: android.content.Context, uri: Uri): ImageBitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, bounds)
    }
    val w = bounds.outWidth
    val h = bounds.outHeight
    if (w <= 0 || h <= 0) return null
    var sample = 1
    while (w / sample > 2048 || h / sample > 2048) sample *= 2

    val real = BitmapFactory.Options().apply { inSampleSize = sample }
    val bmp = context.contentResolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, real)
    } ?: return null
    return bmp.asImageBitmap()
}

/**
 * 动态壁纸：按时间分 4 色调，渐变方向沿椭圆缓慢旋转。
 */
@Composable
fun AnimatedGradientWallpaper(modifier: Modifier = Modifier) {

    var minuteOfDay by remember { mutableIntStateOf(currentMinuteOfDay()) }
    LaunchedEffect(Unit) {
        while (true) {
            minuteOfDay = currentMinuteOfDay()
            delay(5 * 60_000L)
        }
    }
    val palette by remember {
        derivedStateOf { paletteForMinute(minuteOfDay) }
    }

    val transition = rememberInfiniteTransition(label = "wallpaper")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 120_000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "wallpaper-phase",
    )

    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val cx = w * 0.5f
        val cy = h * 0.5f

        val angle = phase * 2f * Math.PI.toFloat()
        val rx = w * 0.4f
        val ry = h * 0.6f
        val startX = cx + rx * cos(angle)
        val startY = cy + ry * sin(angle)
        val endX = cx - rx * cos(angle)
        val endY = cy - ry * sin(angle)

        drawRect(
            brush = Brush.linearGradient(
                colors = listOf(palette.top, palette.middle, palette.bottom),
                start = Offset(startX, startY),
                end = Offset(endX, endY),
            )
        )
        drawRect(
            brush = Brush.radialGradient(
                colors = listOf(palette.accentA.copy(alpha = 0.35f), Color.Transparent),
                center = Offset(w * 0.25f, h * 0.15f),
                radius = w * 0.55f,
            )
        )
        drawRect(
            brush = Brush.radialGradient(
                colors = listOf(Color.Transparent, palette.accentB.copy(alpha = 0.55f)),
                center = Offset(w * 0.85f, h * 0.95f),
                radius = w * 0.7f,
            )
        )
    }
}

/* ─── 色调表 ─── */

private data class WallpaperPalette(
    val top: Color, val middle: Color, val bottom: Color,
    val accentA: Color, val accentB: Color,
)

private val DAWN = WallpaperPalette(
    Color(0xFF1E1A3A), Color(0xFF4A2D5C), Color(0xFFC85A4A),
    Color(0xFFFFB088), Color(0xFF1A1530),
)
private val DAY = WallpaperPalette(
    Color(0xFF0F2147), Color(0xFF1F3D6F), Color(0xFF3A6FA8),
    Color(0xFF6BA0E0), Color(0xFF050B1F),
)
private val DUSK = WallpaperPalette(
    Color(0xFF1A1530), Color(0xFF5B2D4F), Color(0xFFD05A2D),
    Color(0xFFFF7B3A), Color(0xFF1A0A1F),
)
private val NIGHT = WallpaperPalette(
    Color(0xFF030814), Color(0xFF0A1530), Color(0xFF152545),
    Color(0xFF2A3A6F), Color(0xFF000000),
)

private fun paletteForMinute(min: Int): WallpaperPalette = when {
    min < 300  -> NIGHT
    min < 480  -> lerpPalette(NIGHT, DAWN, (min - 300) / 180f)
    min < 600  -> lerpPalette(DAWN, DAY, (min - 480) / 120f)
    min < 1020 -> DAY
    min < 1140 -> lerpPalette(DAY, DUSK, (min - 1020) / 120f)
    min < 1200 -> DUSK
    min < 1320 -> lerpPalette(DUSK, NIGHT, (min - 1200) / 120f)
    else       -> NIGHT
}

private fun lerpPalette(a: WallpaperPalette, b: WallpaperPalette, t: Float): WallpaperPalette {
    val k = t.coerceIn(0f, 1f)
    return WallpaperPalette(
        top = lerpColor(a.top, b.top, k),
        middle = lerpColor(a.middle, b.middle, k),
        bottom = lerpColor(a.bottom, b.bottom, k),
        accentA = lerpColor(a.accentA, b.accentA, k),
        accentB = lerpColor(a.accentB, b.accentB, k),
    )
}

private fun lerpColor(a: Color, b: Color, t: Float): Color = Color(
    red = a.red + (b.red - a.red) * t,
    green = a.green + (b.green - a.green) * t,
    blue = a.blue + (b.blue - a.blue) * t,
    alpha = a.alpha + (b.alpha - a.alpha) * t,
)

private fun currentMinuteOfDay(): Int {
    val c = Calendar.getInstance()
    return c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE)
}
