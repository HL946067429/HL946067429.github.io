package com.xyl.launcher.hud

import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.WindowManager
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.xyl.launcher.ui.HudOverlayContent

/**
 * HUD 悬浮窗 Service ——仿小八 [HudWindowService] 的实现。
 *
 * 工作流程：
 *   1. 通过 SYSTEM_ALERT_WINDOW 权限注入一个全屏悬浮窗
 *   2. 悬浮窗根 View 是 ComposeView，挂载 [HudOverlayContent]
 *   3. 关键点：ComposeView 需要 Lifecycle/SavedState/ViewModelStore 三个 owner，
 *      Service 自己实现这三个接口提供给它
 *
 * 启动: startService(Intent(ACTION_TOGGLE))
 *   - 不在显示状态 → 显示
 *   - 已在显示 → 关闭
 */
class HudOverlayService : Service(),
    LifecycleOwner,
    SavedStateRegistryOwner,
    ViewModelStoreOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateController = SavedStateRegistryController.create(this)
    private val store = ViewModelStore()

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry get() = savedStateController.savedStateRegistry
    override val viewModelStore: ViewModelStore get() = store

    private lateinit var wm: WindowManager
    private var overlayView: ComposeView? = null

    override fun onCreate() {
        super.onCreate()
        savedStateController.performAttach()
        savedStateController.performRestore(null)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_TOGGLE -> toggle()
            ACTION_SHOW -> if (overlayView == null) show()
            ACTION_HIDE -> if (overlayView != null) hide()
            else -> toggle()
        }
        return START_NOT_STICKY
    }

    private fun toggle() {
        if (overlayView == null) show() else hide()
    }

    private fun show() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "没有 SYSTEM_ALERT_WINDOW 权限，无法显示悬浮窗")
            stopSelf()
            return
        }

        val cv = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@HudOverlayService)
            setViewTreeSavedStateRegistryOwner(this@HudOverlayService)
            setViewTreeViewModelStoreOwner(this@HudOverlayService)
            setContent { HudOverlayContent() }
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= 26)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        )

        try {
            wm.addView(cv, params)
            overlayView = cv
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
            Log.i(TAG, "HUD 悬浮窗已显示")
        } catch (t: Throwable) {
            Log.e(TAG, "addView 失败", t)
            stopSelf()
        }
    }

    private fun hide() {
        overlayView?.let { v ->
            runCatching { wm.removeView(v) }
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
            overlayView = null
            Log.i(TAG, "HUD 悬浮窗已隐藏")
        }
    }

    override fun onDestroy() {
        hide()
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        store.clear()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "HudOverlay"
        const val ACTION_TOGGLE = "com.xyl.launcher.hud.TOGGLE"
        const val ACTION_SHOW = "com.xyl.launcher.hud.SHOW"
        const val ACTION_HIDE = "com.xyl.launcher.hud.HIDE"
    }
}
