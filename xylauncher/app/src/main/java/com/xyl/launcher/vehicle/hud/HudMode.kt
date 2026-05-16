package com.xyl.launcher.vehicle.hud

/**
 * 吉利 AR-HUD 的 4 个内置显示模式。
 *
 * **权威映射来自小八 me.<clinit> 静态初始化的 me.D 列表**：
 *   me.D = listOf(Pair(2,"AR"), Pair(1,"SR"), Pair(0,"导航"), Pair(3,"极简"))
 */
enum class HudMode(val value: Int, val displayName: String) {
    NAVIGATION(0, "导航"),
    SR(1, "SR"),
    AR(2, "AR"),
    MINIMAL(3, "极简");

    companion object {
        fun fromValue(v: Int): HudMode? = values().firstOrNull { it.value == v }

        /** 常用模式排序（小八 D 列表顺序：AR 在前） */
        val COMMON_ORDER: List<HudMode> = listOf(AR, SR, NAVIGATION, MINIMAL)
    }
}
