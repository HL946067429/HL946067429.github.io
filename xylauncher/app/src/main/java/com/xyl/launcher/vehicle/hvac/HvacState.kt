package com.xyl.launcher.vehicle.hvac

/**
 * 出风方向。Mode 值与 ECARX BLOW_MODE_BASE 偏移对齐：
 *   0 = 自动 / 默认
 *   1 = 吹脸
 *   2 = 吹脚
 *   3 = 脸 + 脚
 *   4 = 除霜模式（脚 + 挡风）
 */
enum class BlowMode(val raw: Int, val label: String) {
    AUTO(0, "自动"),
    FACE(1, "脸"),
    FOOT(2, "脚"),
    FACE_FOOT(3, "脸+脚"),
    DEFROST(4, "除霜");

    companion object {
        fun fromRaw(raw: Int): BlowMode = values().firstOrNull { it.raw == raw } ?: AUTO
    }
}

data class HvacState(
    val power: Boolean = false,
    val fanSpeed: Int = 0,           // 0-9, 0=关闭
    val tempLeft: Float = 22f,        // 摄氏度
    val tempRight: Float = 22f,
    val syncMode: Boolean = true,
    val innerCirculation: Boolean = true,
    val seatHeatLeft: Int = 0,        // 0-3
    val seatHeatRight: Int = 0,
    val acOn: Boolean = false,        // A/C 压缩机
    val autoMode: Boolean = false,    // AUTO 自动空调
    val defrostFront: Boolean = false,
    val defrostRear: Boolean = false,
    val seatVentLeft: Int = 0,        // 0-3 座椅通风
    val seatVentRight: Int = 0,
    val blowMode: BlowMode = BlowMode.AUTO,
) {
    companion object {
        val OFF = HvacState()
    }
}
