package com.xyl.launcher.vehicle.hvac.providers

import com.xyl.launcher.vehicle.hvac.BlowMode
import com.xyl.launcher.vehicle.hvac.HvacController
import com.xyl.launcher.vehicle.hvac.HvacFunctionIds
import com.xyl.launcher.vehicle.hvac.HvacState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Mock HVAC —— 把状态保存在内存里，UI 操作能"生效"但不影响真车。
 * 用于模拟器和开发期，没接真车也能调 UI。
 */
class MockHvacController : HvacController {
    override val name = "Mock"

    private val _state = MutableStateFlow(HvacState(power = true, fanSpeed = 3))
    override val state: StateFlow<HvacState> = _state.asStateFlow()

    override suspend fun setPower(on: Boolean): Boolean {
        _state.value = _state.value.copy(power = on)
        return true
    }

    override suspend fun setFanSpeed(level: Int): Boolean {
        if (!_state.value.power) return false
        _state.value = _state.value.copy(fanSpeed = level.coerceIn(0, 9))
        return true
    }

    override suspend fun setTemperature(zone: Int, celsius: Float): Boolean {
        if (!_state.value.power) return false
        val clamped = celsius.coerceIn(16f, 32f)
        val s = _state.value
        _state.value = when (zone) {
            HvacFunctionIds.ZONE_LEFT -> {
                if (s.syncMode) s.copy(tempLeft = clamped, tempRight = clamped)
                else s.copy(tempLeft = clamped)
            }
            HvacFunctionIds.ZONE_RIGHT -> {
                if (s.syncMode) s.copy(tempLeft = clamped, tempRight = clamped)
                else s.copy(tempRight = clamped)
            }
            else -> return false
        }
        return true
    }

    override suspend fun setTemperatureSyncMode(enabled: Boolean): Boolean {
        val s = _state.value
        _state.value = if (enabled) s.copy(syncMode = true, tempRight = s.tempLeft)
                       else s.copy(syncMode = false)
        return true
    }

    override suspend fun setInnerCirculation(): Boolean {
        _state.value = _state.value.copy(innerCirculation = !_state.value.innerCirculation)
        return true
    }

    override suspend fun setSeatHeating(zone: Int, level: Int): Boolean {
        val lv = level.coerceIn(0, 3)
        val s = _state.value
        _state.value = when (zone) {
            HvacFunctionIds.ZONE_LEFT -> s.copy(seatHeatLeft = lv)
            HvacFunctionIds.ZONE_RIGHT -> s.copy(seatHeatRight = lv)
            else -> return false
        }
        return true
    }

    override suspend fun setAirConditioner(on: Boolean): Boolean {
        if (!_state.value.power && on) return false
        _state.value = _state.value.copy(acOn = on)
        return true
    }

    override suspend fun setAutoMode(on: Boolean): Boolean {
        if (!_state.value.power && on) return false
        _state.value = _state.value.copy(
            autoMode = on,
            // 进入 AUTO 时模拟一档常用风量
            fanSpeed = if (on && _state.value.fanSpeed == 0) 3 else _state.value.fanSpeed,
        )
        return true
    }

    override suspend fun setDefrostFront(on: Boolean): Boolean {
        _state.value = _state.value.copy(defrostFront = on)
        return true
    }

    override suspend fun setDefrostRear(on: Boolean): Boolean {
        _state.value = _state.value.copy(defrostRear = on)
        return true
    }

    override suspend fun setSeatVentilation(zone: Int, level: Int): Boolean {
        val lv = level.coerceIn(0, 3)
        val s = _state.value
        _state.value = when (zone) {
            HvacFunctionIds.ZONE_LEFT -> s.copy(seatVentLeft = lv)
            HvacFunctionIds.ZONE_RIGHT -> s.copy(seatVentRight = lv)
            else -> return false
        }
        return true
    }

    override suspend fun setBlowMode(mode: BlowMode): Boolean {
        _state.value = _state.value.copy(blowMode = mode)
        return true
    }
}
