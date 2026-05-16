package com.xyl.launcher.vehicle

import kotlinx.coroutines.flow.StateFlow

/**
 * 车控数据 Provider —— 不同车机系统/SDK 各写一个实现。
 * 当前主要实现：ECARX (com.ecarx.xui.adaptapi)，对应吉利星越 L 银河 OS。
 * 未来可扩展：FlymeAuto (领克)、AndroidCar (AOSP) 等。
 */
interface VehicleDataProvider {

    val name: String

    val state: StateFlow<VehicleState>

    val available: StateFlow<Boolean>

    suspend fun connect(): Boolean

    fun disconnect()

    /**
     * 用于其他模块（如 [com.xyl.launcher.vehicle.hud.EcarxVfhudController]）
     * 拿到 ECARX `ICar` 实例做更深的反射调用。
     * 非 ECARX Provider 返回 null。
     */
    fun getCarInstance(): Any? = null
}
