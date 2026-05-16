package com.xyl.launcher.vehicle.tire

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.math.sin
import kotlin.random.Random

/**
 * 胎压 Repository。
 *
 * 数据流程：
 *   - 模拟器 / 无车环境：Mock 假数据驱动（4 轮压力 220-250 kPa 浮动）
 *   - 真车上：将来接 CarSignalManager 订阅 4 + 4 = 8 个胎压信号
 *     （信号 ID 需要回车上 frida 抓 onSignalChanged 拿到）
 *
 * 信号 ID 候选猜测（ECARX 胎压在 0x21xxxxxx 段，待确认）:
 *   FL_PRESSURE, FL_TEMP, FR_PRESSURE, FR_TEMP,
 *   RL_PRESSURE, RL_TEMP, RR_PRESSURE, RR_TEMP
 */
class TirePressureRepository(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _state = MutableStateFlow(TirePressureState.EMPTY)
    val state: StateFlow<TirePressureState> = _state.asStateFlow()

    private val _providerName = MutableStateFlow("Mock")
    val providerName: StateFlow<String> = _providerName.asStateFlow()

    fun start(carSignalInstance: Any?) {
        if (carSignalInstance != null && tryBindReal(carSignalInstance)) {
            _providerName.value = "ECARX"
            Log.i(TAG, "胎压：接入 ECARX 真实信号")
        } else {
            _providerName.value = "Mock"
            startMock()
            Log.i(TAG, "胎压：使用 Mock 数据")
        }
    }

    private fun tryBindReal(carSignalInstance: Any): Boolean {
        // TODO: 回车上确定 ECARX 胎压信号 ID 后实现
        // 大概结构:
        //   signalManager.registerCallback(filter, callbackProxy)
        //   filter.add(FL_PRESSURE_ID), ...
        //   在回调里更新 _state.value
        return false
    }

    private fun startMock() {
        scope.launch {
            var t = 0.0
            val baseFL = 240f
            val baseFR = 238f
            val baseRL = 235f
            val baseRR = 236f
            while (true) {
                t += 0.02
                val noise = { (sin(t).toFloat() * 3f + Random.nextFloat() * 2f - 1f) }
                _state.value = TirePressureState(
                    frontLeft = TireData(baseFL + noise(), 24f + sin(t).toFloat() * 2),
                    frontRight = TireData(baseFR + noise(), 24f + sin(t).toFloat() * 2),
                    rearLeft = TireData(baseRL + noise(), 23f + sin(t).toFloat() * 2),
                    rearRight = TireData(baseRR + noise(), 23f + sin(t).toFloat() * 2),
                    updateTimeMs = System.currentTimeMillis(),
                )
                delay(3000)
            }
        }
    }

    companion object {
        private const val TAG = "TireRepo"
    }
}
