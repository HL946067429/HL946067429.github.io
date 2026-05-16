package com.xyl.launcher.media

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.util.Log
import com.xyl.launcher.App

/**
 * 没有实际处理通知 —— 仅作为 [android.media.session.MediaSessionManager] 的
 * "听众资格证书"：用户在系统设置授予本服务"通知访问权限"后，App 才能调
 * `MediaSessionManager.getActiveSessions(componentName)`。
 */
class MediaNotificationListener : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "通知监听已连接 → 可以读取媒体会话")
        App.instance.mediaRepository.onListenerEnabled(
            ComponentName(this, MediaNotificationListener::class.java)
        )
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "通知监听断开")
        App.instance.mediaRepository.onListenerDisabled()
    }

    companion object {
        private const val TAG = "MediaListener"
    }
}
