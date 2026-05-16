package com.xyl.launcher.vehicle

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 单例 Repository — UI 通过它订阅车辆数据，不直接接触 Provider。
 * 这样以后切换 Provider（Mock ↔ ECARX）UI 完全无感。
 */
class VehicleRepository(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _state = MutableStateFlow(VehicleState.EMPTY)
    val state: StateFlow<VehicleState> = _state.asStateFlow()

    private val _providerName = MutableStateFlow("")
    val providerName: StateFlow<String> = _providerName.asStateFlow()

    private val _available = MutableStateFlow(false)
    val available: StateFlow<Boolean> = _available.asStateFlow()

    private val _carInstance = MutableStateFlow<Any?>(null)
    /** ECARX ICar 实例（如果当前 Provider 是 ECARX 且连接成功），Mock 时为 null */
    val carInstance: StateFlow<Any?> = _carInstance.asStateFlow()

    private var provider: VehicleDataProvider? = null

    fun start() {
        scope.launch {
            val p = ProviderFactory.detect(appContext)
            provider = p
            _providerName.value = p.name
            _carInstance.value = p.getCarInstance()

            launch { p.state.collect { _state.value = it } }
            launch { p.available.collect { _available.value = it } }
        }
    }

    fun stop() {
        provider?.disconnect()
        provider = null
    }
}
