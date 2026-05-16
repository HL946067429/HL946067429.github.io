package com.xyl.launcher.vehicle.hvac

/**
 * 一键空调场景。按一下把多个参数同时调到最优。
 *
 * 场景配置故意做得"激进"，相当于人在车里冷得抖时会做的事：
 * 全关循环、风速拉满、温度推到边界、出风方向选最有效的角度。
 * 用户不喜欢就用普通按键微调。
 */
enum class HvacScene(val label: String, val icon: String) {
    QUICK_COOL("急速制冷", "❄"),
    QUICK_HEAT("急速制热", "🔥"),
    COMFORT("舒适", "✨"),
    VENT("通风", "💨"),
    DEFOG("除雾", "☔"),
    OFF("全关", "⏻"),
}
