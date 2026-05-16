package com.xyl.launcher.vehicle.fuel

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.math.sin

data class FuelState(
    val instantConsumptionL100km: Float? = null,
    val avgConsumptionL100km: Float? = null,
    val rangeKm: Int? = null,
    val totalDistanceKm: Int? = null,
    val available: Boolean = false,
) {
    companion object { val EMPTY = FuelState() }
}

/**
 * 油耗 / 续航 Repository。
 * 数据通过 SignalManager 订阅 —— 具体 ID 回车上 frida 抓。
 * 当前 Mock。
 */
class FuelConsumptionRepository(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val _state = MutableStateFlow(FuelState.EMPTY)
    val state: StateFlow<FuelState> = _state.asStateFlow()
    private val _providerName = MutableStateFlow("Mock")
    val providerName: StateFlow<String> = _providerName.asStateFlow()

    fun start(carSignalInstance: Any?) {
        if (carSignalInstance == null) {
            startMock()
            return
        }
        // TODO: 回车上确认信号 ID 后接入真实数据
        startMock()
    }

    private fun startMock() {
        scope.launch {
            var t = 0.0
            while (true) {
                t += 0.05
                _state.value = FuelState(
                    instantConsumptionL100km = 7.5f + sin(t).toFloat() * 1.2f,
                    avgConsumptionL100km = 8.2f,
                    rangeKm = (520 + sin(t * 0.3).toInt() * 30),
                    totalDistanceKm = 12480,
                    available = true,
                )
                delay(2000)
            }
        }
    }
}
