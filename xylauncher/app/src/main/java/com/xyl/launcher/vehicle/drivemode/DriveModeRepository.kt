package com.xyl.launcher.vehicle.drivemode

import android.content.Context
import android.util.Log
import com.xyl.launcher.App
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class DriveMode(val value: Int, val displayName: String) {
    COMFORT(0, "舒适"),
    ECO(1, "经济"),
    SPORT(2, "运动"),
    SNOW(3, "雪地");

    companion object {
        fun fromValue(v: Int): DriveMode? = values().firstOrNull { it.value == v }
    }
}

/**
 * 驾驶模式切换。
 * 小八的 `switchDriveMode(I)Z` 内部走 IUserProfile 路径（跟 HUD 模式同套机制）。
 * 具体 funcId 待回车上 frida 抓 IProfile.setProfileFuncValue 调用确认。
 *
 * 写操作过 safeMode 闸。
 */
class DriveModeRepository(private val appContext: Context) {

    private val _current = MutableStateFlow(DriveMode.COMFORT)
    val current: StateFlow<DriveMode> = _current.asStateFlow()

    private val _available = MutableStateFlow(false)
    val available: StateFlow<Boolean> = _available.asStateFlow()

    private var carInstance: Any? = null

    fun bind(car: Any?) {
        carInstance = car
        _available.value = car != null
    }

    fun setMode(mode: DriveMode): Boolean {
        if (!_available.value) {
            _current.value = mode  // 即使没车也允许本地切换（仅 UI 反馈，Mock 行为）
            return true
        }
        if (App.instance.settings.current.value.safeMode) {
            Log.w(TAG, "安全模式开启，拦截 setMode(${mode.displayName})")
            return false
        }
        // TODO: 真实 ECARX 调用（待 funcId 确认）
        // val ok = invokeProfileFunc(DRIVE_MODE_FUNC_ID, mode.value)
        _current.value = mode
        return true
    }

    companion object {
        private const val TAG = "DriveMode"
        // TODO: 0x?????? -- 待确认
        const val DRIVE_MODE_FUNC_ID = -1
    }
}
