package com.xyl.launcher.vehicle.hvac

import android.content.Context
import com.xyl.launcher.vehicle.hvac.providers.EcarxHvacController
import com.xyl.launcher.vehicle.hvac.providers.MockHvacController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HvacRepository(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _state = MutableStateFlow(HvacState.OFF)
    val state: StateFlow<HvacState> = _state.asStateFlow()

    private val _providerName = MutableStateFlow("")
    val providerName: StateFlow<String> = _providerName.asStateFlow()

    private var controller: HvacController = MockHvacController()

    fun start() {
        scope.launch {
            val ecarx = EcarxHvacController(appContext)
            controller = if (ecarx.init()) ecarx else MockHvacController()
            _providerName.value = controller.name
            launch { controller.state.collect { _state.value = it } }
        }
    }

    suspend fun setPower(on: Boolean) = controller.setPower(on)
    suspend fun setFanSpeed(level: Int) = controller.setFanSpeed(level)
    suspend fun setTemperature(zone: Int, celsius: Float) = controller.setTemperature(zone, celsius)
    suspend fun setTemperatureSyncMode(enabled: Boolean) = controller.setTemperatureSyncMode(enabled)
    suspend fun setInnerCirculation() = controller.setInnerCirculation()
    suspend fun setSeatHeating(zone: Int, level: Int) = controller.setSeatHeating(zone, level)

    suspend fun setAirConditioner(on: Boolean) = controller.setAirConditioner(on)
    suspend fun setAutoMode(on: Boolean) = controller.setAutoMode(on)
    suspend fun setDefrostFront(on: Boolean) = controller.setDefrostFront(on)
    suspend fun setDefrostRear(on: Boolean) = controller.setDefrostRear(on)
    suspend fun setSeatVentilation(zone: Int, level: Int) = controller.setSeatVentilation(zone, level)
    suspend fun setBlowMode(mode: BlowMode) = controller.setBlowMode(mode)

    /**
     * 应用一键场景。按场景编排顺序调多个 set*。
     *
     * 顺序原则：
     *   1. 先开 power（不开后续没意义）
     *   2. 关 AUTO（自动模式会盖掉手动设置）
     *   3. 设静态参数：温度、A/C、除雾、循环、出风方向
     *   4. 最后拉风量（避免风量先到位再换循环时有过渡感）
     */
    suspend fun applyScene(scene: HvacScene) {
        when (scene) {
            HvacScene.OFF -> {
                controller.setSeatHeating(HvacFunctionIds.ZONE_LEFT, 0)
                controller.setSeatHeating(HvacFunctionIds.ZONE_RIGHT, 0)
                controller.setSeatVentilation(HvacFunctionIds.ZONE_LEFT, 0)
                controller.setSeatVentilation(HvacFunctionIds.ZONE_RIGHT, 0)
                controller.setDefrostFront(false)
                controller.setDefrostRear(false)
                controller.setAutoMode(false)
                controller.setAirConditioner(false)
                controller.setPower(false)
            }
            HvacScene.QUICK_COOL -> {
                controller.setPower(true)
                controller.setAutoMode(false)
                controller.setAirConditioner(true)
                controller.setTemperatureSyncMode(true)
                controller.setTemperature(HvacFunctionIds.ZONE_LEFT, 18f)
                ensureInner(true)
                controller.setBlowMode(BlowMode.FACE)
                controller.setSeatHeating(HvacFunctionIds.ZONE_LEFT, 0)
                controller.setSeatHeating(HvacFunctionIds.ZONE_RIGHT, 0)
                controller.setSeatVentilation(HvacFunctionIds.ZONE_LEFT, 3)
                controller.setSeatVentilation(HvacFunctionIds.ZONE_RIGHT, 3)
                controller.setFanSpeed(9)
            }
            HvacScene.QUICK_HEAT -> {
                controller.setPower(true)
                controller.setAutoMode(false)
                controller.setAirConditioner(false)
                controller.setTemperatureSyncMode(true)
                controller.setTemperature(HvacFunctionIds.ZONE_LEFT, 28f)
                ensureInner(true)
                controller.setBlowMode(BlowMode.FOOT)
                controller.setDefrostRear(true)
                controller.setSeatVentilation(HvacFunctionIds.ZONE_LEFT, 0)
                controller.setSeatVentilation(HvacFunctionIds.ZONE_RIGHT, 0)
                controller.setSeatHeating(HvacFunctionIds.ZONE_LEFT, 2)
                controller.setSeatHeating(HvacFunctionIds.ZONE_RIGHT, 2)
                controller.setFanSpeed(7)
            }
            HvacScene.COMFORT -> {
                controller.setPower(true)
                controller.setAirConditioner(true)
                controller.setTemperatureSyncMode(true)
                controller.setTemperature(HvacFunctionIds.ZONE_LEFT, 22f)
                controller.setBlowMode(BlowMode.AUTO)
                controller.setDefrostFront(false)
                controller.setDefrostRear(false)
                controller.setAutoMode(true)
            }
            HvacScene.VENT -> {
                controller.setPower(true)
                controller.setAutoMode(false)
                controller.setAirConditioner(false)
                ensureInner(false)
                controller.setBlowMode(BlowMode.FACE)
                controller.setFanSpeed(6)
            }
            HvacScene.DEFOG -> {
                controller.setPower(true)
                controller.setAutoMode(false)
                controller.setAirConditioner(true)
                controller.setTemperatureSyncMode(true)
                controller.setTemperature(HvacFunctionIds.ZONE_LEFT, 24f)
                ensureInner(false)
                controller.setBlowMode(BlowMode.DEFROST)
                controller.setDefrostFront(true)
                controller.setDefrostRear(true)
                controller.setFanSpeed(8)
            }
        }
    }

    private suspend fun ensureInner(target: Boolean) {
        if (state.value.innerCirculation != target) controller.setInnerCirculation()
    }
}
