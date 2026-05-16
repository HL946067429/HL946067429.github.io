package com.xyl.launcher.multidisplay

data class DisplayInfo(
    val displayId: Int,
    val name: String,
    val width: Int,
    val height: Int,
    /** 是否疑似 HUD 显示器（基于名称启发） */
    val isHudCandidate: Boolean,
    /** 是否疑似副驾屏 */
    val isPassengerCandidate: Boolean,
)
