package com.xyl.launcher.vehicle.hvac.providers

import android.content.Context
import android.util.Log
import com.xyl.launcher.App
import com.xyl.launcher.vehicle.hvac.BlowMode
import com.xyl.launcher.vehicle.hvac.HvacController
import com.xyl.launcher.vehicle.hvac.HvacFunctionIds
import com.xyl.launcher.vehicle.hvac.HvacState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * ECARX HVAC 实现 —— 调用 com.ecarx.xui.adaptapi.car.* 全部用反射。
 *
 * 实现来自逆向小八 [HvacReflectionController]：
 *
 *   1. 初始化:
 *        Car = Class.forName("com.ecarx.xui.adaptapi.car.Car").create(context)
 *        ICarFunction = Car.getICarFunction()
 *
 *   2. 设值（3 参 int）:
 *        ICarFunction.setFunctionValue(int funcId, int valueA, int valueB)
 *
 *   3. 设浮点（如温度）:
 *        ICarFunction.setCustomizeFunctionValue(int funcId, int zone, float celsius)
 *
 *   4. 读值:
 *        ICarFunction.getFunctionValue(int funcId, int subId): Object  (Integer 装箱)
 *
 * 当前状态：底层调用搭好，本地 [state] 在 set* 调用后乐观更新。
 * TODO: 注册 IFunctionValueWatcher 监听硬件回写。
 */
class EcarxHvacController(private val context: Context) : HvacController {
    override val name = "ECARX HVAC"

    private val _state = MutableStateFlow(HvacState.OFF)
    override val state: StateFlow<HvacState> = _state.asStateFlow()

    private var carInstance: Any? = null
    private var iCarFunction: Any? = null

    private val setFunctionValueMethod by lazy {
        iCarFunction?.javaClass?.getMethod(
            "setFunctionValue", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType,
            Int::class.javaPrimitiveType
        )
    }
    private val setCustomizeFunctionValueMethod by lazy {
        iCarFunction?.javaClass?.getMethod(
            "setCustomizeFunctionValue", Int::class.javaPrimitiveType,
            Int::class.javaPrimitiveType, Float::class.javaPrimitiveType
        )
    }

    fun init(): Boolean {
        return try {
            val carCls = Class.forName("com.ecarx.xui.adaptapi.car.Car")
            val car = carCls.getMethod("create", Context::class.java).invoke(null, context)
                ?: return false
            val func = car.javaClass.getMethod("getICarFunction").invoke(car) ?: return false
            carInstance = car
            iCarFunction = func
            Log.i(TAG, "ECARX HVAC 初始化成功")
            true
        } catch (t: Throwable) {
            Log.w(TAG, "ECARX HVAC 初始化失败: ${t.message}")
            false
        }
    }

    private fun setIntValue(funcId: Int, valueA: Int, valueB: Int): Boolean {
        if (isSafeModeOn()) {
            Log.w(TAG, "安全模式开启，拦截 setFunctionValue(0x${funcId.toString(16)})")
            return false
        }
        val func = iCarFunction ?: return false
        return try {
            setFunctionValueMethod?.invoke(func, funcId, valueA, valueB)
            true
        } catch (t: Throwable) {
            Log.e(TAG, "setFunctionValue(0x${funcId.toString(16)}) 失败", t)
            false
        }
    }

    private fun setFloatValue(funcId: Int, zone: Int, value: Float): Boolean {
        if (isSafeModeOn()) {
            Log.w(TAG, "安全模式开启，拦截 setCustomizeFunctionValue(0x${funcId.toString(16)})")
            return false
        }
        val func = iCarFunction ?: return false
        return try {
            setCustomizeFunctionValueMethod?.invoke(func, funcId, zone, value)
            true
        } catch (t: Throwable) {
            Log.e(TAG, "setCustomizeFunctionValue(0x${funcId.toString(16)}, $zone) 失败", t)
            false
        }
    }

    private fun isSafeModeOn(): Boolean = runCatching {
        App.instance.settings.current.value.safeMode
    }.getOrDefault(true)  // 取不到时默认安全

    override suspend fun setPower(on: Boolean): Boolean {
        val ok = setIntValue(HvacFunctionIds.POWER, HvacFunctionIds.PLACEHOLDER_VALUE, if (on) 1 else 0)
        if (ok) _state.value = _state.value.copy(power = on)
        return ok
    }

    override suspend fun setFanSpeed(level: Int): Boolean {
        val lv = level.coerceIn(0, 9)
        val ok = setIntValue(HvacFunctionIds.FAN_SPEED_MANUAL_BASE + lv, HvacFunctionIds.PLACEHOLDER_VALUE, lv)
        if (ok) _state.value = _state.value.copy(fanSpeed = lv)
        return ok
    }

    override suspend fun setTemperature(zone: Int, celsius: Float): Boolean {
        val c = celsius.coerceIn(16f, 32f)
        var ok = setFloatValue(HvacFunctionIds.TEMP_SET, zone, c)
        if (!ok && zone == HvacFunctionIds.ZONE_RIGHT) {
            ok = setFloatValue(HvacFunctionIds.TEMP_SET_FALLBACK, zone, c)
        }
        if (ok) {
            val s = _state.value
            _state.value = when (zone) {
                HvacFunctionIds.ZONE_LEFT ->
                    if (s.syncMode) s.copy(tempLeft = c, tempRight = c) else s.copy(tempLeft = c)
                HvacFunctionIds.ZONE_RIGHT ->
                    if (s.syncMode) s.copy(tempLeft = c, tempRight = c) else s.copy(tempRight = c)
                else -> s
            }
        }
        return ok
    }

    override suspend fun setTemperatureSyncMode(enabled: Boolean): Boolean {
        val ok = setIntValue(HvacFunctionIds.TEMP_SYNC_MODE, HvacFunctionIds.PLACEHOLDER_VALUE, if (enabled) 1 else 0)
        if (ok) _state.value = _state.value.copy(syncMode = enabled)
        return ok
    }

    override suspend fun setInnerCirculation(): Boolean {
        val current = _state.value.innerCirculation
        val ok = setIntValue(HvacFunctionIds.CIRCULATION_INNER, HvacFunctionIds.PLACEHOLDER_VALUE, if (current) 0 else 1)
        if (ok) _state.value = _state.value.copy(innerCirculation = !current)
        return ok
    }

    override suspend fun setSeatHeating(zone: Int, level: Int): Boolean {
        val lv = level.coerceIn(0, 3)
        val base = if (zone == HvacFunctionIds.ZONE_LEFT) HvacFunctionIds.SEAT_HEAT_LEFT_BASE
                   else HvacFunctionIds.SEAT_HEAT_RIGHT_BASE
        val ok = setIntValue(base + lv, lv, base + lv)
        if (ok) {
            _state.value = if (zone == HvacFunctionIds.ZONE_LEFT) _state.value.copy(seatHeatLeft = lv)
                           else _state.value.copy(seatHeatRight = lv)
        }
        return ok
    }

    override suspend fun setAirConditioner(on: Boolean): Boolean {
        val ok = setIntValue(HvacFunctionIds.AC_COMPRESSOR, HvacFunctionIds.PLACEHOLDER_VALUE, if (on) 1 else 0)
        if (ok) _state.value = _state.value.copy(acOn = on)
        return ok
    }

    override suspend fun setAutoMode(on: Boolean): Boolean {
        val ok = setIntValue(HvacFunctionIds.AUTO_MODE, HvacFunctionIds.PLACEHOLDER_VALUE, if (on) 1 else 0)
        if (ok) _state.value = _state.value.copy(autoMode = on)
        return ok
    }

    override suspend fun setDefrostFront(on: Boolean): Boolean {
        val ok = setIntValue(HvacFunctionIds.DEFROST_FRONT, HvacFunctionIds.PLACEHOLDER_VALUE, if (on) 1 else 0)
        if (ok) _state.value = _state.value.copy(defrostFront = on)
        return ok
    }

    override suspend fun setDefrostRear(on: Boolean): Boolean {
        val ok = setIntValue(HvacFunctionIds.DEFROST_REAR, HvacFunctionIds.PLACEHOLDER_VALUE, if (on) 1 else 0)
        if (ok) _state.value = _state.value.copy(defrostRear = on)
        return ok
    }

    override suspend fun setSeatVentilation(zone: Int, level: Int): Boolean {
        val lv = level.coerceIn(0, 3)
        val base = if (zone == HvacFunctionIds.ZONE_LEFT) HvacFunctionIds.SEAT_VENT_LEFT_BASE
                   else HvacFunctionIds.SEAT_VENT_RIGHT_BASE
        val ok = setIntValue(base + lv, lv, base + lv)
        if (ok) {
            _state.value = if (zone == HvacFunctionIds.ZONE_LEFT) _state.value.copy(seatVentLeft = lv)
                           else _state.value.copy(seatVentRight = lv)
        }
        return ok
    }

    override suspend fun setBlowMode(mode: BlowMode): Boolean {
        val ok = setIntValue(HvacFunctionIds.BLOW_MODE_BASE + mode.raw, HvacFunctionIds.PLACEHOLDER_VALUE, mode.raw)
        if (ok) _state.value = _state.value.copy(blowMode = mode)
        return ok
    }

    companion object {
        private const val TAG = "EcarxHvac"
    }
}
