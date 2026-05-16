package com.xyl.launcher.vehicle.providers

import com.xyl.launcher.vehicle.Gear
import com.xyl.launcher.vehicle.SpeedUnit
import com.xyl.launcher.vehicle.VehicleDataProvider
import com.xyl.launcher.vehicle.VehicleState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * 模拟数据 Provider —— 开发/调试用，不依赖任何车机环境。
 * 模拟器和电脑上跑都是这个，确保 UI 开发不被车机阻塞。
 */
class MockVehicleProvider : VehicleDataProvider {
    override val name = "Mock"

    private val _state = MutableStateFlow(VehicleState.EMPTY)
    override val state: StateFlow<VehicleState> = _state.asStateFlow()

    private val _available = MutableStateFlow(false)
    override val available: StateFlow<Boolean> = _available.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var job: Job? = null

    override suspend fun connect(): Boolean {
        _available.value = true
        job?.cancel()
        job = scope.launch {
            var t = 0.0
            while (true) {
                t += 0.05
                _state.value = VehicleState(
                    speed = (40f + 30f * sin(t).toFloat()).coerceAtLeast(0f),
                    speedUnit = SpeedUnit.KMH,
                    rpm = (1500 + (700 * cos(t)).toInt()).coerceAtLeast(0),
                    gear = Gear.D,
                    fuelPercent = 0.65f,
                    batteryPercent = 0.82f,
                    motorSpeedFront = (2000 + Random.nextInt(-200, 200)),
                    motorSpeedRear = (1800 + Random.nextInt(-200, 200)),
                    outerTempCelsius = 22.5f,
                    turnSignalLeft = (t % 6.0) in 1.0..2.0,
                    turnSignalRight = (t % 6.0) in 4.0..5.0,
                )
                delay(500)
            }
        }
        return true
    }

    override fun disconnect() {
        job?.cancel()
        _available.value = false
    }
}
