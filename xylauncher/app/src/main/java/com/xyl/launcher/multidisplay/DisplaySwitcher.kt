package com.xyl.launcher.multidisplay

import android.app.ActivityOptions
import android.content.Context
import android.content.Intent
import android.hardware.display.DisplayManager
import android.util.DisplayMetrics
import android.util.Log
import com.xyl.launcher.App

/**
 * 多屏投射 —— 复刻小八 `Ld3/b;->a(Context, String, Integer)` 飞屏机制。
 *
 * 核心：ActivityOptions.setLaunchDisplayId(displayId) 把 Activity 启动到指定屏幕。
 *
 * 在普通 Android 上需要系统权限（INTERNAL_SYSTEM_WINDOW 或类似）；
 * 在银河 OS 上桌面 App 通常有白名单放权可直接调用。
 */
object DisplaySwitcher {

    private const val TAG = "DisplaySwitcher"

    fun listDisplays(context: Context): List<DisplayInfo> {
        val dm = context.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager
            ?: return emptyList()
        return dm.displays.map { display ->
            val metrics = DisplayMetrics().also { display.getRealMetrics(it) }
            val name = display.name ?: ""
            DisplayInfo(
                displayId = display.displayId,
                name = name,
                width = metrics.widthPixels,
                height = metrics.heightPixels,
                isHudCandidate = name.contains("hud", ignoreCase = true) ||
                                 name.contains("ar", ignoreCase = true),
                isPassengerCandidate = name.contains("passenger", ignoreCase = true) ||
                                       name.contains("psd", ignoreCase = true) ||
                                       name.contains("副驾"),
            )
        }
    }

    /**
     * 把指定 App 启动到指定显示屏。
     * 返回 false 表示找不到 App 或系统拒绝（权限不足）。
     */
    fun launchToDisplay(context: Context, packageName: String, displayId: Int): Boolean {
        // 主屏 displayId=0 永远可投（不算"动到车"）；副驾 / HUD 走安全模式闸
        if (displayId != 0 && App.instance.settings.current.value.safeMode) {
            Log.w(TAG, "安全模式开启，拦截 launchToDisplay($displayId)")
            return false
        }

        val pm = context.packageManager
        val intent = pm.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        } ?: run {
            Log.w(TAG, "App $packageName 找不到 launch intent")
            return false
        }

        val options = ActivityOptions.makeBasic()

        // setLaunchDisplayId 是 @SystemApi，正常情况需要反射
        val ok1 = runCatching {
            ActivityOptions::class.java
                .getMethod("setLaunchDisplayId", Int::class.javaPrimitiveType)
                .invoke(options, displayId)
        }.isSuccess

        // setLaunchWindowingMode(5)  5 = WINDOWING_MODE_FREEFORM，让 App 自由窗口模式（仿小八）
        runCatching {
            ActivityOptions::class.java
                .getDeclaredMethod("setLaunchWindowingMode", Int::class.javaPrimitiveType)
                .apply { isAccessible = true }
                .invoke(options, 5)
        }

        return try {
            context.startActivity(intent, options.toBundle())
            Log.i(TAG, "已启动 $packageName → display $displayId (setLaunchDisplayId=$ok1)")
            true
        } catch (t: Throwable) {
            Log.e(TAG, "startActivity 失败: ${t.message}")
            false
        }
    }
}
