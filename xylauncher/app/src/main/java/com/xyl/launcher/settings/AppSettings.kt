package com.xyl.launcher.settings

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

private val Context.dataStore by preferencesDataStore(name = "xyl_settings")

enum class ProviderMode { AUTO, MOCK, ECARX }

data class LayoutPrefs(
    val showVehicle: Boolean = true,
    val showMedia: Boolean = true,
    val showHvac: Boolean = true,
    val showDashCam: Boolean = false,
    val showHud: Boolean = false,
    val showGauge: Boolean = true,
    val showHudMode: Boolean = true,
    val showDisplays: Boolean = true,
    val showTirePressure: Boolean = true,
    val showFuelConsumption: Boolean = true,
    val showDriveMode: Boolean = true,
    val showSeatMemory: Boolean = true,
    val showWeather: Boolean = true,
    val showQuickTools: Boolean = true,
    val showBluetoothAudio: Boolean = true,
    val showParking360: Boolean = true,
)

data class AppSettingsSnapshot(
    val wallpaperColor: Int = 0xFF0A0E1A.toInt(),
    val providerMode: ProviderMode = ProviderMode.AUTO,
    val layout: LayoutPrefs = LayoutPrefs(),
    val dashCamSourceDir: String = "/sdcard/DCIM/dvr",
    val dashCamUploadEnabled: Boolean = false,
    /**
     * 安全模式：所有"会动到车"的写操作全部禁用（HVAC、HUD 模式、飞屏等）。
     * 默认开启 —— 装到车上首次使用时是 0 风险的。
     * 用户在车停稳后到设置里手动关掉，才允许真控制。
     */
    val safeMode: Boolean = true,
    /**
     * 首页 4 岛的显示顺序，用枚举 name 的 CSV 字符串持久化。
     * 比如 "QUICK,NAV,MEDIA,APPS"。
     * 解析容错：未知/缺失项忽略，再用默认序补齐。
     */
    val islandOrder: String = "QUICK,NAV,MEDIA,APPS",
    /** 车况页左列卡片顺序 */
    val carLeftCardOrder: String = "VEHICLE_STATUS,HUD_MODE",
    /** 车况页右列卡片顺序 */
    val carRightCardOrder: String = "TIRE_PRESSURE,FUEL",
    /** 舒适页右列卡片顺序 */
    val comfortRightCardOrder: String = "DRIVE_MODE,SEAT_MEMORY,BLUETOOTH",
    /** 自定义壁纸图片 URI，留空表示用动态渐变 */
    val wallpaperUri: String = "",
)

object SettingsKeys {
    val WALLPAPER_COLOR = intPreferencesKey("wallpaper_color")
    val PROVIDER_MODE = stringPreferencesKey("provider_mode")
    val SHOW_VEHICLE = booleanPreferencesKey("show_vehicle")
    val SHOW_MEDIA = booleanPreferencesKey("show_media")
    val SHOW_HVAC = booleanPreferencesKey("show_hvac")
    val SHOW_DASHCAM = booleanPreferencesKey("show_dashcam")
    val SHOW_HUD = booleanPreferencesKey("show_hud")
    val SHOW_GAUGE = booleanPreferencesKey("show_gauge")
    val SHOW_HUD_MODE = booleanPreferencesKey("show_hud_mode")
    val SHOW_DISPLAYS = booleanPreferencesKey("show_displays")
    val SHOW_TIRE_PRESSURE = booleanPreferencesKey("show_tire_pressure")
    val SHOW_FUEL = booleanPreferencesKey("show_fuel")
    val SHOW_DRIVE_MODE = booleanPreferencesKey("show_drive_mode")
    val SHOW_SEAT_MEMORY = booleanPreferencesKey("show_seat_memory")
    val SHOW_WEATHER = booleanPreferencesKey("show_weather")
    val SHOW_QUICK_TOOLS = booleanPreferencesKey("show_quick_tools")
    val SHOW_BLUETOOTH = booleanPreferencesKey("show_bluetooth")
    val SHOW_PARKING_360 = booleanPreferencesKey("show_parking_360")
    val DASHCAM_DIR = stringPreferencesKey("dashcam_dir")
    val DASHCAM_UPLOAD = booleanPreferencesKey("dashcam_upload")
    val SAFE_MODE = booleanPreferencesKey("safe_mode")
    val ISLAND_ORDER = stringPreferencesKey("island_order")
    val CAR_LEFT_CARD_ORDER = stringPreferencesKey("car_left_card_order")
    val CAR_RIGHT_CARD_ORDER = stringPreferencesKey("car_right_card_order")
    val COMFORT_RIGHT_CARD_ORDER = stringPreferencesKey("comfort_right_card_order")
    val WALLPAPER_URI = stringPreferencesKey("wallpaper_uri")
}

class AppSettings(private val context: Context) {

    val snapshot: Flow<AppSettingsSnapshot> = context.dataStore.data.map { p ->
        AppSettingsSnapshot(
            wallpaperColor = p[SettingsKeys.WALLPAPER_COLOR] ?: 0xFF0A0E1A.toInt(),
            providerMode = runCatching {
                ProviderMode.valueOf(p[SettingsKeys.PROVIDER_MODE] ?: ProviderMode.AUTO.name)
            }.getOrDefault(ProviderMode.AUTO),
            layout = LayoutPrefs(
                showVehicle = p[SettingsKeys.SHOW_VEHICLE] ?: true,
                showMedia = p[SettingsKeys.SHOW_MEDIA] ?: true,
                showHvac = p[SettingsKeys.SHOW_HVAC] ?: true,
                showDashCam = p[SettingsKeys.SHOW_DASHCAM] ?: false,
                showHud = p[SettingsKeys.SHOW_HUD] ?: false,
                showGauge = p[SettingsKeys.SHOW_GAUGE] ?: true,
                showHudMode = p[SettingsKeys.SHOW_HUD_MODE] ?: true,
                showDisplays = p[SettingsKeys.SHOW_DISPLAYS] ?: true,
                showTirePressure = p[SettingsKeys.SHOW_TIRE_PRESSURE] ?: true,
                showFuelConsumption = p[SettingsKeys.SHOW_FUEL] ?: true,
                showDriveMode = p[SettingsKeys.SHOW_DRIVE_MODE] ?: true,
                showSeatMemory = p[SettingsKeys.SHOW_SEAT_MEMORY] ?: true,
                showWeather = p[SettingsKeys.SHOW_WEATHER] ?: true,
                showQuickTools = p[SettingsKeys.SHOW_QUICK_TOOLS] ?: true,
                showBluetoothAudio = p[SettingsKeys.SHOW_BLUETOOTH] ?: true,
                showParking360 = p[SettingsKeys.SHOW_PARKING_360] ?: true,
            ),
            dashCamSourceDir = p[SettingsKeys.DASHCAM_DIR] ?: "/sdcard/DCIM/dvr",
            dashCamUploadEnabled = p[SettingsKeys.DASHCAM_UPLOAD] ?: false,
            safeMode = p[SettingsKeys.SAFE_MODE] ?: true,
            islandOrder = p[SettingsKeys.ISLAND_ORDER] ?: "QUICK,NAV,MEDIA,APPS",
            carLeftCardOrder = p[SettingsKeys.CAR_LEFT_CARD_ORDER] ?: "VEHICLE_STATUS,HUD_MODE",
            carRightCardOrder = p[SettingsKeys.CAR_RIGHT_CARD_ORDER] ?: "TIRE_PRESSURE,FUEL",
            comfortRightCardOrder = p[SettingsKeys.COMFORT_RIGHT_CARD_ORDER] ?: "DRIVE_MODE,SEAT_MEMORY,BLUETOOTH",
            wallpaperUri = p[SettingsKeys.WALLPAPER_URI] ?: "",
        )
    }

    /** 同步可读的最新快照 —— 给 Controller 在协程外读用 */
    private val _current = MutableStateFlow(AppSettingsSnapshot())
    val current: StateFlow<AppSettingsSnapshot> = _current.asStateFlow()

    init {
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            snapshot.collect { _current.value = it }
        }
    }

    suspend fun setWallpaperColor(color: Int) =
        context.dataStore.edit { it[SettingsKeys.WALLPAPER_COLOR] = color }

    suspend fun setProviderMode(mode: ProviderMode) =
        context.dataStore.edit { it[SettingsKeys.PROVIDER_MODE] = mode.name }

    suspend fun setLayout(prefs: LayoutPrefs) =
        context.dataStore.edit {
            it[SettingsKeys.SHOW_VEHICLE] = prefs.showVehicle
            it[SettingsKeys.SHOW_MEDIA] = prefs.showMedia
            it[SettingsKeys.SHOW_HVAC] = prefs.showHvac
            it[SettingsKeys.SHOW_DASHCAM] = prefs.showDashCam
            it[SettingsKeys.SHOW_HUD] = prefs.showHud
            it[SettingsKeys.SHOW_GAUGE] = prefs.showGauge
            it[SettingsKeys.SHOW_HUD_MODE] = prefs.showHudMode
            it[SettingsKeys.SHOW_DISPLAYS] = prefs.showDisplays
            it[SettingsKeys.SHOW_TIRE_PRESSURE] = prefs.showTirePressure
            it[SettingsKeys.SHOW_FUEL] = prefs.showFuelConsumption
            it[SettingsKeys.SHOW_DRIVE_MODE] = prefs.showDriveMode
            it[SettingsKeys.SHOW_SEAT_MEMORY] = prefs.showSeatMemory
            it[SettingsKeys.SHOW_WEATHER] = prefs.showWeather
            it[SettingsKeys.SHOW_QUICK_TOOLS] = prefs.showQuickTools
            it[SettingsKeys.SHOW_BLUETOOTH] = prefs.showBluetoothAudio
            it[SettingsKeys.SHOW_PARKING_360] = prefs.showParking360
        }

    suspend fun setDashCam(dir: String, uploadEnabled: Boolean) =
        context.dataStore.edit {
            it[SettingsKeys.DASHCAM_DIR] = dir
            it[SettingsKeys.DASHCAM_UPLOAD] = uploadEnabled
        }

    suspend fun setSafeMode(enabled: Boolean) =
        context.dataStore.edit { it[SettingsKeys.SAFE_MODE] = enabled }

    suspend fun setIslandOrder(csv: String) =
        context.dataStore.edit { it[SettingsKeys.ISLAND_ORDER] = csv }

    suspend fun setCarLeftCardOrder(csv: String) =
        context.dataStore.edit { it[SettingsKeys.CAR_LEFT_CARD_ORDER] = csv }

    suspend fun setCarRightCardOrder(csv: String) =
        context.dataStore.edit { it[SettingsKeys.CAR_RIGHT_CARD_ORDER] = csv }

    suspend fun setComfortRightCardOrder(csv: String) =
        context.dataStore.edit { it[SettingsKeys.COMFORT_RIGHT_CARD_ORDER] = csv }

    suspend fun setWallpaperUri(uri: String) =
        context.dataStore.edit { it[SettingsKeys.WALLPAPER_URI] = uri }
}
