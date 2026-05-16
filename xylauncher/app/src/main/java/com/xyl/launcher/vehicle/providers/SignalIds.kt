package com.xyl.launcher.vehicle.providers

import com.xyl.launcher.vehicle.Gear
import com.xyl.launcher.vehicle.SpeedUnit
import com.xyl.launcher.vehicle.VehicleState

/**
 * ECARX `ecarx.car.hardware.signal` 信号 ID 表。
 *
 * 来源：逆向小八 launcher dex 得到的样本 ID（h1.p() + PassengerScreenKeepOnService.a()）。
 * 完整 21 个 dataSource 的映射要等回车上用 frida hook CarSignalEventCallback 抓全。
 *
 * 命名规则：在已知 ID 旁边写 TODO 标识对应哪个 dataSource。
 */
object SignalIds {

    // 已知样本（暂未确认对应哪个具体信号）
    const val UNKNOWN_1 = 0x21400009         // 557873481, 来自 h1.p() filter
    const val UNKNOWN_2 = 0x2140000A         // 557873482, 来自 h1.p() filter

    // ⚠️ 注意：0x20284800 (PSD_KEEP_ON) 是**写功能 ID**（副驾屏常亮），
    // 不是供 SignalManager 监听的信号 ID，绝不能放进 SignalFilter.add()。
    // 之前误放过这里，已移除。这种 ID 在 EcarxVehicleProvider 写操作时调用，
    // 不在监听列表里。

    // TODO: 回车上抓取后填入真实 ID
    const val SPEED: Int = -1                // 车速
    const val RPM: Int = -1                  // 转速
    const val GEAR: Int = -1                 // 档位
    const val FUEL: Int = -1                 // 油量
    const val BATTERY: Int = -1              // 电量
    const val MOTOR_SPEED_FRONT: Int = -1    // 前电机转速
    const val MOTOR_SPEED_REAR: Int = -1     // 后电机转速
    const val OUTER_TEMP: Int = -1           // 车外温度
    const val TURN_SIGNAL_LEFT: Int = -1     // 左转向灯
    const val TURN_SIGNAL_RIGHT: Int = -1    // 右转向灯

    /**
     * 真正用于 SignalFilter.add() 的 ID 列表 —— 必须是"读信号"型 ID，
     * 不能混入"写功能"型 ID。
     */
    fun allKnown(): List<Int> = listOf(
        // 暂时不注册 UNKNOWN_1/2 —— 我们没确认它们是真的"信号 ID"
        // 等回车上 frida 抓 onSignalChanged 拿到真实 ID 列表再填进来
        SPEED, RPM, GEAR, FUEL, BATTERY,
        MOTOR_SPEED_FRONT, MOTOR_SPEED_REAR,
        OUTER_TEMP, TURN_SIGNAL_LEFT, TURN_SIGNAL_RIGHT,
    ).filter { it >= 0 }

    /**
     * 把信号 ID + 值转成 [VehicleState] 的更新函数。
     * 返回 null = 不认识的信号，调用方应忽略。
     */
    fun toUpdate(signalId: Int, value: Any?): ((VehicleState) -> VehicleState)? = when (signalId) {
        SPEED -> { st -> st.copy(speed = (value as? Number)?.toFloat()) }
        RPM -> { st -> st.copy(rpm = (value as? Number)?.toInt()) }
        GEAR -> { st -> st.copy(gear = parseGear(value)) }
        FUEL -> { st -> st.copy(fuelPercent = (value as? Number)?.toFloat()?.let { it / 100f }) }
        BATTERY -> { st -> st.copy(batteryPercent = (value as? Number)?.toFloat()?.let { it / 100f }) }
        MOTOR_SPEED_FRONT -> { st -> st.copy(motorSpeedFront = (value as? Number)?.toInt()) }
        MOTOR_SPEED_REAR -> { st -> st.copy(motorSpeedRear = (value as? Number)?.toInt()) }
        OUTER_TEMP -> { st -> st.copy(outerTempCelsius = (value as? Number)?.toFloat()) }
        TURN_SIGNAL_LEFT -> { st -> st.copy(turnSignalLeft = parseBool(value)) }
        TURN_SIGNAL_RIGHT -> { st -> st.copy(turnSignalRight = parseBool(value)) }
        else -> null
    }

    private fun parseGear(value: Any?): Gear = when ((value as? Number)?.toInt() ?: -1) {
        0 -> Gear.P
        1 -> Gear.R
        2 -> Gear.N
        3 -> Gear.D
        4 -> Gear.S
        5 -> Gear.L
        else -> Gear.UNKNOWN
    }

    private fun parseBool(value: Any?): Boolean = when (value) {
        is Boolean -> value
        is Number -> value.toInt() != 0
        else -> false
    }
}
