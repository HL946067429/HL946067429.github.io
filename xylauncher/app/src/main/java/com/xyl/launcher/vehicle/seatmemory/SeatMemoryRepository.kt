package com.xyl.launcher.vehicle.seatmemory

import android.content.Context
import android.util.Log
import com.xyl.launcher.App
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SeatMemoryState(
    val currentPosition: Int = 0,    // 0 = 无激活，1-3 = 已激活位置
    val savedPositions: Set<Int> = emptySet(),
)

/**
 * 主驾座椅记忆控制器。
 *
 * 已确认 ECARX 功能 ID：`0x2D437800 (759169280)` —— 来自小八
 * `HvacController.saveSeatPosition(I I)Z` 字节码常量。
 *
 * 保存模式（小八 saveSeatPosition）:
 *   setFunctionValue(0x2D437800, zone, 1)   // saveStart
 *   setFunctionValue(0x2D437800, zone, 0)   // saveEnd
 *
 * 恢复模式（小八 restoreSeatPosition）:
 *   小八用 buildSeatRestorePropertyOrder() 返回 ID 数组按顺序试，
 *   星越 L 的 propertyId 暂未公开，先用占位。
 *
 * zone 取值: 1 = 主驾，4 = 副驾。
 *
 * 全部走 safeMode 闸。
 */
class SeatMemoryRepository(private val appContext: Context) {

    private val _state = MutableStateFlow(SeatMemoryState())
    val state: StateFlow<SeatMemoryState> = _state.asStateFlow()

    private val _available = MutableStateFlow(false)
    val available: StateFlow<Boolean> = _available.asStateFlow()

    private var iCarFunction: Any? = null

    fun bind(car: Any?) {
        iCarFunction = car?.let {
            runCatching {
                it.javaClass.getMethod("getICarFunction").invoke(it)
            }.getOrNull()
        }
        _available.value = iCarFunction != null
    }

    /** 保存当前座椅位置到指定记忆位 (1-3) */
    fun savePosition(position: Int, zone: Int = ZONE_DRIVER): Boolean {
        if (position !in 1..3) return false
        if (App.instance.settings.current.value.safeMode) {
            Log.w(TAG, "安全模式开启，拦截 savePosition($position)")
            _state.value = _state.value.copy(
                savedPositions = _state.value.savedPositions + position,
                currentPosition = position,
            )
            return true   // Mock 状态更新
        }
        val func = iCarFunction ?: return false
        return try {
            val method = func.javaClass.getMethod(
                "setFunctionValue",
                Int::class.javaPrimitiveType,
                Int::class.javaPrimitiveType,
                Int::class.javaPrimitiveType,
            )
            // 小八的双调用模式
            method.invoke(func, FUNC_ID_SAVE, zone, 1)   // saveStart
            method.invoke(func, FUNC_ID_SAVE, zone, 0)   // saveEnd
            _state.value = _state.value.copy(
                savedPositions = _state.value.savedPositions + position,
                currentPosition = position,
            )
            true
        } catch (t: Throwable) {
            Log.e(TAG, "savePosition($position) 失败", t)
            false
        }
    }

    /** 恢复座椅到指定记忆位 (1-3) */
    fun restorePosition(position: Int, zone: Int = ZONE_DRIVER): Boolean {
        if (position !in 1..3) return false
        if (App.instance.settings.current.value.safeMode) {
            Log.w(TAG, "安全模式开启，拦截 restorePosition($position)")
            _state.value = _state.value.copy(currentPosition = position)
            return true
        }
        // TODO: 实际 ECARX 恢复调用待确认（needs buildSeatRestorePropertyOrder 等效路径）
        _state.value = _state.value.copy(currentPosition = position)
        return true
    }

    companion object {
        private const val TAG = "SeatMemory"
        const val FUNC_ID_SAVE = 0x2D437800    // 来自小八字节码
        const val ZONE_DRIVER = 1
        const val ZONE_PASSENGER = 4
    }
}
