package com.xyl.launcher.media

import android.content.ComponentName
import android.content.Context
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * 单例 Repository —— 通过 [MediaNotificationListener] 拿到 NotificationListener
 * 资格后，调 `MediaSessionManager.getActiveSessions(...)` 找当前活跃媒体会话，
 * 订阅状态变化。
 *
 * 用户授权流程：
 *   首次启动 → [hasNotificationAccess] 为 false →
 *   UI 显示"前往系统设置授权"按钮 → 跳到 ACTION_NOTIFICATION_LISTENER_SETTINGS
 *   → 用户勾选本 App → 系统启动 MediaNotificationListener → onListenerConnected
 *   → 调 onListenerEnabled → 开始抓 active sessions
 */
class MediaRepository(private val appContext: Context) {

    private val _state = MutableStateFlow(MediaState.NONE)
    val state: StateFlow<MediaState> = _state.asStateFlow()

    private val main = Handler(Looper.getMainLooper())
    private val mediaSessionManager =
        appContext.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager

    private var currentController: MediaController? = null
    private var listenerComponent: ComponentName? = null

    /** UI 用：是否已有通知监听权限 */
    fun hasNotificationAccess(): Boolean {
        val enabled = Settings.Secure.getString(
            appContext.contentResolver,
            "enabled_notification_listeners"
        ) ?: return false
        return enabled.contains(appContext.packageName)
    }

    fun onListenerEnabled(component: ComponentName) {
        listenerComponent = component
        try {
            mediaSessionManager.addOnActiveSessionsChangedListener(activeListener, component)
            refresh()
        } catch (t: Throwable) {
            Log.e(TAG, "添加 active session 监听失败", t)
        }
    }

    fun onListenerDisabled() {
        listenerComponent?.let {
            runCatching { mediaSessionManager.removeOnActiveSessionsChangedListener(activeListener) }
        }
        listenerComponent = null
        _state.value = MediaState.NONE
    }

    private val activeListener = MediaSessionManager.OnActiveSessionsChangedListener { controllers ->
        bindFirst(controllers)
    }

    fun refresh() {
        val comp = listenerComponent ?: return
        try {
            val controllers = mediaSessionManager.getActiveSessions(comp)
            bindFirst(controllers)
        } catch (t: Throwable) {
            Log.e(TAG, "getActiveSessions 失败", t)
        }
    }

    private fun bindFirst(controllers: List<MediaController>?) {
        val first = controllers?.firstOrNull()
        if (first?.sessionToken == currentController?.sessionToken) {
            updateFrom(currentController); return
        }
        currentController?.unregisterCallback(controllerCallback)
        currentController = first
        first?.registerCallback(controllerCallback, main)
        updateFrom(first)
    }

    private val controllerCallback = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: android.media.MediaMetadata?) { updateFrom(currentController) }
        override fun onPlaybackStateChanged(state: PlaybackState?) { updateFrom(currentController) }
        override fun onSessionDestroyed() { _state.value = MediaState.NONE; currentController = null }
    }

    private fun updateFrom(c: MediaController?) {
        if (c == null) { _state.value = MediaState.NONE; return }
        val md = c.metadata
        val pb = c.playbackState
        _state.value = MediaState(
            available = true,
            packageName = c.packageName,
            title = md?.getString(android.media.MediaMetadata.METADATA_KEY_TITLE),
            artist = md?.getString(android.media.MediaMetadata.METADATA_KEY_ARTIST),
            album = md?.getString(android.media.MediaMetadata.METADATA_KEY_ALBUM),
            artwork = md?.getBitmap(android.media.MediaMetadata.METADATA_KEY_ALBUM_ART)
                ?: md?.getBitmap(android.media.MediaMetadata.METADATA_KEY_ART),
            isPlaying = pb?.state == PlaybackState.STATE_PLAYING,
            positionMs = pb?.position ?: 0L,
            durationMs = md?.getLong(android.media.MediaMetadata.METADATA_KEY_DURATION) ?: 0L,
        )
    }

    fun playPause() {
        val c = currentController ?: return
        if (c.playbackState?.state == PlaybackState.STATE_PLAYING) c.transportControls.pause()
        else c.transportControls.play()
    }

    fun next() { currentController?.transportControls?.skipToNext() }
    fun previous() { currentController?.transportControls?.skipToPrevious() }

    companion object {
        private const val TAG = "MediaRepo"
    }
}
