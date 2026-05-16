package com.xyl.launcher.vehicle.hud

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * AR-HUD 模式 Repository。
 *
 * 接通方式：[bind] 接受 ECARX ICar 实例。
 *   - null（模拟器/Mock Provider） → available = false
 *   - 真车（EcarxVehicleProvider 连上后）→ 自动 init VfhudController
 *
 * 通常通过 [com.xyl.launcher.vehicle.VehicleRepository.carInstance] StateFlow
 * 自动接通——见 [com.xyl.launcher.App].
 */
class HudModeRepository(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var controller: EcarxVfhudController? = null

    private val _current = MutableStateFlow<HudMode?>(null)
    val current: StateFlow<HudMode?> = _current.asStateFlow()

    private val _available = MutableStateFlow(false)
    val available: StateFlow<Boolean> = _available.asStateFlow()

    /** 接收 ICar 实例。null = 解绑（变 Mock 状态） */
    fun bind(carInstance: Any?) {
        scope.launch {
            controller = null
            _available.value = false
            _current.value = null

            if (carInstance == null) return@launch

            val c = EcarxVfhudController(appContext)
            if (c.init(carInstance)) {
                controller = c
                _available.value = true
                launch { c.currentMode.collect { _current.value = it } }
            }
        }
    }

    fun setMode(mode: HudMode): Boolean = controller?.setMode(mode) ?: false

    /** 主动从硬件读当前模式（可定时调用） */
    fun refresh() {
        scope.launch { controller?.refreshCurrentMode() }
    }
}
