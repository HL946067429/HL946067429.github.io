package com.xyl.launcher.vehicle.hvac

/**
 * ECARX HVAC ICarFunction 功能 ID 常量表
 *
 * 全部来自逆向小八 v2.6.5 dex 的 [HvacController] 字节码常量。
 * 这些 ID 由 ECARX ICarFunction.setFunctionValue / setCustomizeFunctionValue
 * 调用使用。
 *
 * ID 段规律：
 *   0x10010xxx —— 电源类
 *   0x10070xxx —— 温度
 *   0x10090xxx —— 座椅功能
 *   0x100c0xxx —— 风量 / 循环
 */
object HvacFunctionIds {
    /** 总开关 setFunctionValue(POWER, MIN_INT, on?1:0) */
    const val POWER = 0x10010800

    /** 温度设置 setCustomizeFunctionValue(TEMP_SET, zone, celsius_float) */
    const val TEMP_SET = 0x10070000
    const val TEMP_SET_FALLBACK = 0x10070001

    /** 温度左右同步 setFunctionValue(TEMP_SYNC_MODE, MIN_INT, on?1:0) */
    const val TEMP_SYNC_MODE = 0x10070400

    /** 内循环 setCirculation(CIRCULATION_INNER) */
    const val CIRCULATION_INNER = 0x100c0001

    /** 风量手动档基址，level 0-9: BASE + level */
    const val FAN_SPEED_MANUAL_BASE = 0x100c0c00

    /** 座椅加热左：BASE + level (level 1-3) */
    const val SEAT_HEAT_LEFT_BASE = 0x10090000

    /** 座椅加热右（具体偏移待车上确认） */
    const val SEAT_HEAT_RIGHT_BASE = 0x10090100

    /** 温度档位区域 ID */
    const val ZONE_LEFT = 1
    const val ZONE_RIGHT = 4

    /** 调用 setFunctionValue 时第二个参数的常用占位值 */
    const val PLACEHOLDER_VALUE = Int.MIN_VALUE

    /* ──────────────────────────────────────────────────────────────
     *  以下 funcId 未在小八 v2.6.5 dex 中直接出现（小八 UI 没暴露），
     *  按 0x10xx0xxx 段规律给的"合理推测"占位。
     *  上车后必须用 frida hook ICarFunction.setFunctionValue 验证。
     *  EcarxHvacController 会在底层调用失败时返回 false，UI 不会
     *  错误更新本地状态，所以现阶段挂错号也不会"挂错车"。
     * ────────────────────────────────────────────────────────────── */

    /** A/C 压缩机开关。推测在电源段附近。 */
    const val AC_COMPRESSOR = 0x10010100

    /** AUTO 自动空调模式。推测在电源段附近。 */
    const val AUTO_MODE = 0x10010200

    /** 前挡风除霜（DEFROST）。推测自成段。 */
    const val DEFROST_FRONT = 0x10020000

    /** 后窗除霜 / 后视镜加热。 */
    const val DEFROST_REAR = 0x10020100

    /** 座椅通风左基址，level 0-3: BASE + level。与座椅加热 0x10090000 段平行。 */
    const val SEAT_VENT_LEFT_BASE = 0x10090400

    /** 座椅通风右基址。 */
    const val SEAT_VENT_RIGHT_BASE = 0x10090500

    /** 出风方向（BLOW_MODE）基址，BlowMode.raw 偏移：BASE + raw。 */
    const val BLOW_MODE_BASE = 0x100c0800
}
