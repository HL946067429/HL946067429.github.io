package com.xyl.launcher.vehicle

/**
 * 21 个车控信号 ID — 来源于小八 HUD 配置文件 hud_default_init_config.json。
 * 每个 Provider 实现都要把这些 ID 映射到对应车机系统的实际接口。
 */
enum class VehicleSignal {
    SPEED,
    SPEED_UNIT,
    RPM,
    GEAR,
    FUEL,
    BATTERY,
    MOTOR_SPEED_FRONT,
    MOTOR_SPEED_REAR,
    OUTER_TEMP,
    TURN_SIGNAL_LEFT,
    TURN_SIGNAL_RIGHT,
    LANE_INFO,
    NAVIGATION_TEXT,
    NAVIGATION_ICON,
    TRAFFIC_LIGHT,
    CRUISE_TRAFFIC_LIGHT,
    MUSIC_COVER,
    MUSIC_TITLE_ARTIST,
    LYRICS,
    TIME,
}

enum class SpeedUnit { KMH, MPH }

enum class Gear { P, R, N, D, S, L, UNKNOWN }
