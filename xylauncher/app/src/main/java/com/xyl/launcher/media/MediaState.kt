package com.xyl.launcher.media

import android.graphics.Bitmap

data class MediaState(
    val available: Boolean = false,
    val packageName: String? = null,
    val title: String? = null,
    val artist: String? = null,
    val album: String? = null,
    val artwork: Bitmap? = null,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0,
    val durationMs: Long = 0,
) {
    companion object {
        val NONE = MediaState()
    }
}
