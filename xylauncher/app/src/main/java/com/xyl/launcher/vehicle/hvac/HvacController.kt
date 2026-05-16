package com.xyl.launcher.vehicle.hvac

import kotlinx.coroutines.flow.StateFlow

/**
 * HVAC 控制接口。
 *
 * 设计原则：所有 set* 返回 Boolean 表示底层是否成功。
 * 调用者不必关心走的是 ECARX、Geely OneOS 还是 Mock。
 */
interface HvacController {

    val name: String
    val state: StateFlow<HvacState>

    suspend fun setPower(on: Boolean): Boolean
    suspend fun setFanSpeed(level: Int): Boolean
    suspend fun setTemperature(zone: Int, celsius: Float): Boolean
    suspend fun setTemperatureSyncMode(enabled: Boolean): Boolean
    suspend fun setInnerCirculation(): Boolean
    suspend fun setSeatHeating(zone: Int, level: Int): Boolean

    suspend fun setAirConditioner(on: Boolean): Boolean
    suspend fun setAutoMode(on: Boolean): Boolean
    suspend fun setDefrostFront(on: Boolean): Boolean
    suspend fun setDefrostRear(on: Boolean): Boolean
    suspend fun setSeatVentilation(zone: Int, level: Int): Boolean
    suspend fun setBlowMode(mode: BlowMode): Boolean
}
