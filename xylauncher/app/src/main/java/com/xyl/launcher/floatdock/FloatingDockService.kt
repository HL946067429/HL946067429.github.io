package com.xyl.launcher.floatdock

import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
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
import kotlin.math.abs

/**
 * 浮动 Dock Service —— 仿小八 FloatingDockService。
 *
 * 屏幕右边缘的可拖拽迷你浮窗，按钮组含：投屏、HUD 切换、应用快捷等。
 * 跨 App 显示，全程驻留在所有 App 之上。
 *
 * 启动：startService(ACTION_TOGGLE)
 */
class FloatingDockService : Service(),
    LifecycleOwner, SavedStateRegistryOwner, ViewModelStoreOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateController = SavedStateRegistryController.create(this)
    private val store = ViewModelStore()

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry get() = savedStateController.savedStateRegistry
    override val viewModelStore: ViewModelStore get() = store

    private lateinit var wm: WindowManager
    private var dockView: ComposeView? = null
    private var layoutParams: WindowManager.LayoutParams? = null

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
            ACTION_SHOW -> if (dockView == null) show()
            ACTION_HIDE -> hide()
            else -> toggle()
        }
        return START_STICKY
    }

    private fun toggle() = if (dockView == null) show() else hide()

    private fun show() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "没有 SYSTEM_ALERT_WINDOW 权限"); stopSelf(); return
        }

        val cv = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@FloatingDockService)
            setViewTreeSavedStateRegistryOwner(this@FloatingDockService)
            setViewTreeViewModelStoreOwner(this@FloatingDockService)
            setContent { FloatingDockContent(onClose = { hide() }) }
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= 26)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            // 默认贴右上
            val metrics = resources.displayMetrics
            x = metrics.widthPixels - (60 * metrics.density).toInt()
            y = (120 * metrics.density).toInt()
        }
        layoutParams = params

        attachDrag(cv, params)

        try {
            wm.addView(cv, params)
            dockView = cv
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
            Log.i(TAG, "浮动 Dock 已显示")
        } catch (t: Throwable) {
            Log.e(TAG, "addView 失败", t)
            stopSelf()
        }
    }

    private fun attachDrag(view: View, params: WindowManager.LayoutParams) {
        var startX = 0; var startY = 0
        var touchX = 0f; var touchY = 0f
        var moved = false
        view.setOnTouchListener { v, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> {
                    startX = params.x; startY = params.y
                    touchX = ev.rawX; touchY = ev.rawY
                    moved = false
                    false  // 不消费，让子按钮还能 click
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = ev.rawX - touchX
                    val dy = ev.rawY - touchY
                    if (abs(dx) > 16 || abs(dy) > 16) moved = true
                    if (moved) {
                        params.x = startX + dx.toInt()
                        params.y = startY + dy.toInt()
                        runCatching { wm.updateViewLayout(v, params) }
                    }
                    moved
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> moved
                else -> false
            }
        }
    }

    private fun hide() {
        dockView?.let { v ->
            runCatching { wm.removeView(v) }
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
            dockView = null
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
        private const val TAG = "FloatDock"
        const val ACTION_TOGGLE = "com.xyl.launcher.dock.TOGGLE"
        const val ACTION_SHOW = "com.xyl.launcher.dock.SHOW"
        const val ACTION_HIDE = "com.xyl.launcher.dock.HIDE"
    }
}
