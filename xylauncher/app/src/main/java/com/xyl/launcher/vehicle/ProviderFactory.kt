package com.xyl.launcher.vehicle

import android.content.Context
import com.xyl.launcher.vehicle.providers.EcarxVehicleProvider
import com.xyl.launcher.vehicle.providers.MockVehicleProvider

object ProviderFactory {

    /**
     * 探测当前设备能用的最佳 Provider：
     *   1. 优先 ECARX（吉利星越 L / 银河 OS）
     *   2. 失败回落到 Mock（模拟器 / 开发环境 / 不支持的设备）
     *
     * 未来扩展点：检测领克车机 → FlymeAutoProvider，
     *           检测 AOSP Auto → AndroidCarProvider，等等。
     */
    suspend fun detect(context: Context): VehicleDataProvider {
        val ecarx = EcarxVehicleProvider(context)
        if (ecarx.connect()) return ecarx

        val mock = MockVehicleProvider()
        mock.connect()
        return mock
    }
}
