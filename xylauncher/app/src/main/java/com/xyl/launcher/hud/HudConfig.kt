package com.xyl.launcher.hud

/**
 * HUD 配置数据模型 —— 兼容小八桌面的 hud_default_init_config.json 格式。
 *
 * 坐标和尺寸都是 0-1 浮点比例（适配任意分辨率）。
 * 我们的 res/raw/hud_default.json 直接照搬小八出厂默认布局：
 *   中间竖列：车道信息 / 导航图标 / 车速 / 单位 / 档位
 *   左下角：歌词、歌名、油量、电量
 *   右下角：导航红绿灯、车外温度、转速、电机转速
 */
data class HudConfig(
    val version: Int = 2,
    val elements: List<HudElement> = emptyList(),
    val autoStartHud: Boolean = false,
    val snowMode: Boolean = false,
)

data class HudElement(
    val id: String,
    val name: String,
    val type: HudElementType,
    val dataSource: String,
    val staticText: String = "",
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val textSize: Int = 24,
    val textColor: Int = -1,
    val textBold: Boolean = false,
    val iconScale: Float = 1f,
    val horizontalAlign: Align = Align.CENTER,
    val verticalAlign: Align = Align.CENTER,
    val visible: Boolean = true,
    val alpha: Float = 1f,
)

enum class HudElementType { TEXT, ICON, IMAGE, CUSTOM_VIEW, UNKNOWN }
enum class Align { LEFT, CENTER, RIGHT, TOP, BOTTOM }
