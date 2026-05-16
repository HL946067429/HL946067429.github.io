package com.xyl.launcher.ui

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyl.launcher.App
import com.xyl.launcher.floatdock.FloatingDockService
import com.xyl.launcher.hud.HudOverlayService
import com.xyl.launcher.settings.AppSettingsSnapshot
import androidx.compose.foundation.gestures.Orientation
import com.xyl.launcher.ui.components.AnimatedWallpaper
import com.xyl.launcher.ui.components.BluetoothAudioCard
import com.xyl.launcher.ui.components.DashCamCard
import com.xyl.launcher.ui.components.DisplayChooserCard
import com.xyl.launcher.ui.components.DraggableCardSlot
import com.xyl.launcher.ui.components.DraggableIslandRow
import com.xyl.launcher.ui.components.DraggableLane
import com.xyl.launcher.ui.components.DriveModeCard
import com.xyl.launcher.ui.components.FuelConsumptionCard
import com.xyl.launcher.ui.components.HudModeCard
import com.xyl.launcher.ui.components.HvacCard
import com.xyl.launcher.ui.components.MediaCard
import com.xyl.launcher.ui.components.SeatMemoryCard
import com.xyl.launcher.ui.components.TirePressureCard
import com.xyl.launcher.ui.components.VehicleStatusCard
import com.xyl.launcher.ui.components.WeatherCard
import com.xyl.launcher.vehicle.VehicleState
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    onOpenDrawer: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenHud: () -> Unit,
) {
    val app = App.instance
    val settings by app.settings.snapshot.collectAsState(initial = AppSettingsSnapshot())
    val vehicleState by app.vehicleRepository.state.collectAsState()
    val vehicleProvider by app.vehicleRepository.providerName.collectAsState()
    val vehicleAvail by app.vehicleRepository.available.collectAsState()
    val hvacState by app.hvacRepository.state.collectAsState()
    val hvacProvider by app.hvacRepository.providerName.collectAsState()
    val mediaState by app.mediaRepository.state.collectAsState()
    val hasMediaAccess = remember { app.mediaRepository.hasNotificationAccess() }
    val hudModeAvail by app.hudModeRepository.available.collectAsState()
    val hudModeCurrent by app.hudModeRepository.current.collectAsState()
    val tireState by app.tireRepository.state.collectAsState()
    val tireProvider by app.tireRepository.providerName.collectAsState()
    val fuelState by app.fuelRepository.state.collectAsState()
    val fuelProvider by app.fuelRepository.providerName.collectAsState()
    val driveMode by app.driveModeRepository.current.collectAsState()
    val driveModeAvail by app.driveModeRepository.available.collectAsState()
    val seatState by app.seatMemoryRepository.state.collectAsState()
    val seatAvail by app.seatMemoryRepository.available.collectAsState()
    val weatherState by app.weatherRepository.state.collectAsState()

    LaunchedEffect(Unit) {
        app.appRepository.refresh()
        if (hasMediaAccess) app.mediaRepository.refresh()
    }

    val driving = (vehicleState.speed ?: 0f) > 5f
    val pagerState = rememberPagerState(pageCount = { 3 })

    Box(modifier = Modifier.fillMaxSize()) {
        // 主背景：用户图片优先；否则动态渐变（按时间换色调 + 缓慢漂移）
        AnimatedWallpaper(
            modifier = Modifier.fillMaxSize(),
            imageUri = settings.wallpaperUri.ifEmpty { null },
        )

        Column(modifier = Modifier.fillMaxSize()) {

            // ============ 顶部状态条（车辆遥测 + 时间 + 通讯） ============
            TopStatusStrip(vehicleState, weatherState)

            // ============ 主区横滑 Pager ============
            Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize(),
                ) { page ->
                    when (page) {
                        0 -> PageHome(
                            settings = settings,
                            weatherState = weatherState,
                            mediaState = mediaState,
                            hasMediaAccess = hasMediaAccess,
                            onOpenDrawer = onOpenDrawer,
                            onOpenSettings = onOpenSettings,
                            onOpenHud = onOpenHud,
                        )
                        1 -> PageCar(
                            settings,
                            vehicleState, vehicleProvider, vehicleAvail,
                            hudModeAvail, hudModeCurrent,
                            tireState, tireProvider,
                            fuelState, fuelProvider,
                            settings.safeMode, driving,
                        )
                        2 -> PageComfortInfo(
                            settings,
                            hvacState, hvacProvider,
                            driveMode, driveModeAvail,
                            seatState, seatAvail,
                            settings.safeMode, driving,
                        )
                    }
                }
                // 页码指示（覆盖在 Pager 底部）
                PageIndicator(
                    pageCount = 3,
                    current = pagerState.currentPage,
                    labels = listOf("首页", "车况", "舒适"),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 4.dp),
                )
            }

            // ============ 底部 HVAC 控制条 ============
            BottomHvacStrip(hvacState, app.hvacRepository)
        }
    }
}

/* ────────────────────────────────────────────────────────────
 *  顶部状态条 —— 像小八那样显示车辆遥测 + 时间 + 通讯图标
 * ──────────────────────────────────────────────────────────── */

@Composable
private fun TopStatusStrip(state: VehicleState, weather: com.xyl.launcher.weather.WeatherState) {
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1000)
        }
    }
    val timeFmt = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    val tempInner = "内 ${state.outerTempCelsius?.let { "%.1f".format(it - 2) } ?: "—"}℃"
    val tempOuter = "外 ${weather.tempCelsius?.toString() ?: state.outerTempCelsius?.toInt()?.toString() ?: "—"}℃"
    val speedStr = "${state.speed?.toInt() ?: 0}km/h"
    val rpmStr = "${state.rpm ?: 0}rpm"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // 左：车内温 / 车速 / 转速
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("🚗", fontSize = 13.sp)
            StatusText(tempInner)
            StatusText(speedStr)
            StatusText(rpmStr)
        }

        // 中：时间
        Text(
            timeFmt.format(Date(now)),
            fontSize = 22.sp,
            color = Color.White,
            fontWeight = FontWeight.Medium,
        )

        // 右：通讯图标 + 车外温
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StatusIcon("📍")
            StatusIcon("🔵")
            StatusIcon("🔇")
            StatusText(tempOuter, modifier = Modifier.padding(start = 8.dp))
        }
    }
}

@Composable
private fun StatusText(text: String, modifier: Modifier = Modifier) {
    Text(text, fontSize = 12.sp, color = Color(0xCCFFFFFF), modifier = modifier)
}

@Composable
private fun StatusIcon(icon: String) {
    Text(icon, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 4.dp))
}

/* ────────────────────────────────────────────────────────────
 *  第 1 页 —— 首页（壁纸感 + 浮层）
 * ──────────────────────────────────────────────────────────── */

@Composable
private fun PageHome(
    settings: AppSettingsSnapshot,
    weatherState: com.xyl.launcher.weather.WeatherState,
    mediaState: com.xyl.launcher.media.MediaState,
    hasMediaAccess: Boolean,
    onOpenDrawer: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenHud: () -> Unit,
) {
    val app = App.instance
    val ctx = LocalContext.current
    val canOverlay = if (Build.VERSION.SDK_INT >= 23) Settings.canDrawOverlays(ctx) else true

    Box(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        // 左上：大时钟 + 日期 + 天气
        Column(
            modifier = Modifier.align(Alignment.TopStart),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            BigClock()
            if (weatherState.available) {
                Text(
                    "${weatherState.condition}  ${weatherState.tempCelsius}℃  ${weatherState.location}",
                    fontSize = 12.sp,
                    color = Color(0xB3FFFFFF),
                )
            }
        }

        // 中下：4 块功能岛（长按拖拽重排）
        val scope = androidx.compose.runtime.rememberCoroutineScope()
        val orderedIslands = remember(settings.islandOrder) {
            parseIslandOrder(settings.islandOrder)
        }
        DraggableIslandRow(
            items = orderedIslands,
            onReorder = { newOrder ->
                scope.launch {
                    app.settings.setIslandOrder(newOrder.joinToString(",") { it.name })
                }
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
                .fillMaxWidth(),
            horizontalSpacing = 10.dp,
            keyOf = { it.name },
        ) { id, dragHandle ->
            when (id) {
                IslandId.QUICK -> FunctionIsland(
                    title = "快捷功能",
                    modifier = Modifier.fillMaxWidth(),
                    dragHandle = dragHandle,
                ) {
                    IslandIconGrid(
                        items = listOf(
                            "⏻" to "启停",
                            "📷" to "截图",
                            "🔌" to "充电",
                            "☀️" to "日间",
                            "💡" to "氛围",
                            "🧹" to "清理",
                            "🛡" to "保护",
                            "⚙" to "设置",
                        ),
                        cols = 4,
                    ) { label ->
                        when (label) {
                            "设置" -> onOpenSettings()
                            else -> {}
                        }
                    }
                }
                IslandId.NAV -> FunctionIsland(
                    title = "导航",
                    modifier = Modifier.fillMaxWidth(),
                    dragHandle = dragHandle,
                ) {
                    IslandIconGrid(
                        items = listOf(
                            "🏠" to "回家",
                            "🏢" to "公司",
                            "⭐" to "收藏",
                            "🅿" to "停车场",
                            "⛽" to "加油",
                        ),
                        cols = 5,
                    ) { /* TODO: 跳高德导航 */ }
                }
                IslandId.MEDIA -> FunctionIsland(
                    title = "正在播放",
                    modifier = Modifier.fillMaxWidth(),
                    dragHandle = dragHandle,
                ) {
                    MediaCompact(mediaState, hasMediaAccess)
                }
                IslandId.APPS -> FunctionIsland(
                    title = "应用",
                    modifier = Modifier.fillMaxWidth(),
                    dragHandle = dragHandle,
                ) {
                    IslandIconGrid(
                        items = listOf(
                            "📱" to "全部",
                            "📺" to "投屏",
                            "🌗" to "HUD",
                            "⫶" to "Dock",
                        ),
                        cols = 4,
                    ) { label ->
                        when (label) {
                            "全部" -> onOpenDrawer()
                            "HUD" -> if (canOverlay)
                                ctx.startService(Intent(ctx, HudOverlayService::class.java).apply {
                                    action = HudOverlayService.ACTION_TOGGLE
                                }) else onOpenHud()
                            "Dock" -> {
                                if (!canOverlay && Build.VERSION.SDK_INT >= 23) {
                                    ctx.startActivity(
                                        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                            Uri.parse("package:${ctx.packageName}"))
                                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    )
                                } else {
                                    ctx.startService(Intent(ctx, FloatingDockService::class.java).apply {
                                        action = FloatingDockService.ACTION_TOGGLE
                                    })
                                }
                            }
                            else -> {}
                        }
                    }
                }
            }
        }
    }
}

/** 首页 4 岛的稳定标识。新增条目时追加到最后即可（解析时容错未知值）。 */
enum class IslandId { QUICK, NAV, MEDIA, APPS }

/** 第 2、3 页可重排卡片的稳定标识。 */
enum class CardId {
    VEHICLE_STATUS, HUD_MODE,           // 车况页左列
    TIRE_PRESSURE, FUEL,                 // 车况页右列
    DRIVE_MODE, SEAT_MEMORY, BLUETOOTH,  // 舒适页右列
}

private val DEFAULT_ISLAND_ORDER = listOf(
    IslandId.QUICK, IslandId.NAV, IslandId.MEDIA, IslandId.APPS,
)

internal fun parseIslandOrder(csv: String): List<IslandId> {
    val parsed = csv.split(",")
        .mapNotNull { runCatching { IslandId.valueOf(it.trim()) }.getOrNull() }
        .distinct()
    val missing = DEFAULT_ISLAND_ORDER.filter { it !in parsed }
    return parsed + missing
}

/**
 * 解析卡片顺序 CSV，过滤掉不属于这个槽位的 CardId。
 * 未知/不属本槽的项跳过；缺失项用 [defaults] 在末尾补齐。
 */
internal fun parseCardOrder(csv: String, defaults: List<CardId>): List<CardId> {
    val allowed = defaults.toSet()
    val parsed = csv.split(",")
        .mapNotNull { runCatching { CardId.valueOf(it.trim()) }.getOrNull() }
        .filter { it in allowed }
        .distinct()
    val missing = defaults.filter { it !in parsed }
    return parsed + missing
}

@Composable
private fun BigClock() {
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) { now = System.currentTimeMillis(); delay(1000) }
    }
    val timeFmt = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    val dateFmt = remember { SimpleDateFormat("M月d日 EEEE", Locale.CHINA) }
    Column {
        Text(
            timeFmt.format(Date(now)),
            fontSize = 56.sp,
            fontWeight = FontWeight.Light,
            color = Color.White,
        )
        Text(
            dateFmt.format(Date(now)),
            fontSize = 13.sp,
            color = Color(0xB3FFFFFF),
        )
    }
}

@Composable
private fun FunctionIsland(
    title: String,
    modifier: Modifier = Modifier,
    dragHandle: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0x33000000))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(title, fontSize = 11.sp, color = Color(0x99FFFFFF))
            // 拖拽把手 —— 24dp 触发区，仅从这里能拖
            Box(
                modifier = dragHandle
                    .size(width = 24.dp, height = 18.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("⋮⋮", fontSize = 14.sp, color = Color(0xB3FFFFFF))
            }
        }
        content()
    }
}

@Composable
private fun IslandIconGrid(
    items: List<Pair<String, String>>,  // (icon, label)
    cols: Int,
    onClick: (String) -> Unit,
) {
    val rows = items.chunked(cols)
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                row.forEach { (icon, label) ->
                    Column(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { onClick(label) }
                            .padding(horizontal = 6.dp, vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(icon, fontSize = 18.sp)
                        Text(label, fontSize = 9.sp, color = Color(0xCCFFFFFF))
                    }
                }
            }
        }
    }
}

@Composable
private fun MediaCompact(state: com.xyl.launcher.media.MediaState, hasAccess: Boolean) {
    val app = App.instance
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0x33FFFFFF)),
            contentAlignment = Alignment.Center,
        ) { Text("♪", fontSize = 22.sp, color = Color.White) }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                state.title ?: if (!hasAccess) "未授权" else "未播放",
                fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium,
                maxLines = 1,
            )
            Text(
                state.artist ?: "",
                fontSize = 10.sp, color = Color(0xB3FFFFFF),
                maxLines = 1,
            )
        }
        if (hasAccess && state.available) {
            Row {
                MediaSmallBtn("⏮") { app.mediaRepository.previous() }
                MediaSmallBtn(if (state.isPlaying) "⏸" else "▶") { app.mediaRepository.playPause() }
                MediaSmallBtn("⏭") { app.mediaRepository.next() }
            }
        }
    }
}

@Composable
private fun MediaSmallBtn(icon: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(icon, fontSize = 14.sp, color = Color.White) }
}

/* ────────────────────────────────────────────────────────────
 *  第 2 页 —— 车况详情
 * ──────────────────────────────────────────────────────────── */

@Composable
private fun PageCar(
    settings: AppSettingsSnapshot,
    vehicleState: VehicleState,
    vehicleProvider: String,
    vehicleAvail: Boolean,
    hudModeAvail: Boolean,
    hudModeCurrent: com.xyl.launcher.vehicle.hud.HudMode?,
    tireState: com.xyl.launcher.vehicle.tire.TirePressureState,
    tireProvider: String,
    fuelState: com.xyl.launcher.vehicle.fuel.FuelState,
    fuelProvider: String,
    safeMode: Boolean,
    driving: Boolean,
) {
    val app = App.instance
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val leftOrder = remember(settings.carLeftCardOrder) {
        parseCardOrder(settings.carLeftCardOrder,
            listOf(CardId.VEHICLE_STATUS, CardId.HUD_MODE))
    }
    val rightOrder = remember(settings.carRightCardOrder) {
        parseCardOrder(settings.carRightCardOrder,
            listOf(CardId.TIRE_PRESSURE, CardId.FUEL))
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 32.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        DraggableLane(
            items = leftOrder,
            onReorder = { newOrder ->
                scope.launch { app.settings.setCarLeftCardOrder(newOrder.joinToString(",") { it.name }) }
            },
            modifier = Modifier.weight(1f).fillMaxSize(),
            orientation = Orientation.Vertical,
            spacing = 10.dp,
            keyOf = { it.name },
        ) { id, handle ->
            DraggableCardSlot(dragHandle = handle) {
                when (id) {
                    CardId.VEHICLE_STATUS -> VehicleStatusCard(vehicleState, vehicleProvider, vehicleAvail)
                    CardId.HUD_MODE -> HudModeCard(
                        available = hudModeAvail,
                        current = hudModeCurrent,
                        safeMode = safeMode,
                        drivingLockout = driving,
                        onSelect = { app.hudModeRepository.setMode(it) },
                        onRefresh = { app.hudModeRepository.refresh() },
                    )
                    else -> {}
                }
            }
        }
        DraggableLane(
            items = rightOrder,
            onReorder = { newOrder ->
                scope.launch { app.settings.setCarRightCardOrder(newOrder.joinToString(",") { it.name }) }
            },
            modifier = Modifier.weight(1f).fillMaxSize(),
            orientation = Orientation.Vertical,
            spacing = 10.dp,
            keyOf = { it.name },
        ) { id, handle ->
            DraggableCardSlot(dragHandle = handle) {
                when (id) {
                    CardId.TIRE_PRESSURE -> TirePressureCard(tireState, tireProvider)
                    CardId.FUEL -> FuelConsumptionCard(fuelState, fuelProvider)
                    else -> {}
                }
            }
        }
    }
}

/* ────────────────────────────────────────────────────────────
 *  第 3 页 —— 舒适 + 信息
 * ──────────────────────────────────────────────────────────── */

@Composable
private fun PageComfortInfo(
    settings: AppSettingsSnapshot,
    hvacState: com.xyl.launcher.vehicle.hvac.HvacState,
    hvacProvider: String,
    driveMode: com.xyl.launcher.vehicle.drivemode.DriveMode,
    driveModeAvail: Boolean,
    seatState: com.xyl.launcher.vehicle.seatmemory.SeatMemoryState,
    seatAvail: Boolean,
    safeMode: Boolean,
    driving: Boolean,
) {
    val app = App.instance
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val rightOrder = remember(settings.comfortRightCardOrder) {
        parseCardOrder(settings.comfortRightCardOrder,
            listOf(CardId.DRIVE_MODE, CardId.SEAT_MEMORY, CardId.BLUETOOTH))
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 32.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(modifier = Modifier.weight(1.4f)) {
            HvacCard(hvacState, hvacProvider, app.hvacRepository)
        }
        DraggableLane(
            items = rightOrder,
            onReorder = { newOrder ->
                scope.launch { app.settings.setComfortRightCardOrder(newOrder.joinToString(",") { it.name }) }
            },
            modifier = Modifier.weight(1f).fillMaxSize(),
            orientation = Orientation.Vertical,
            spacing = 10.dp,
            keyOf = { it.name },
        ) { id, handle ->
            DraggableCardSlot(dragHandle = handle) {
                when (id) {
                    CardId.DRIVE_MODE -> DriveModeCard(
                        available = driveModeAvail,
                        current = driveMode,
                        safeMode = safeMode,
                        drivingLockout = driving,
                        onSelect = { app.driveModeRepository.setMode(it) },
                    )
                    CardId.SEAT_MEMORY -> SeatMemoryCard(
                        available = seatAvail,
                        state = seatState,
                        safeMode = safeMode,
                        drivingLockout = driving,
                        onSave = { app.seatMemoryRepository.savePosition(it) },
                        onRestore = { app.seatMemoryRepository.restorePosition(it) },
                    )
                    CardId.BLUETOOTH -> BluetoothAudioCard()
                    else -> {}
                }
            }
        }
    }
}

/* ────────────────────────────────────────────────────────────
 *  底部 HVAC 持久控制条
 * ──────────────────────────────────────────────────────────── */

@Composable
private fun BottomHvacStrip(
    state: com.xyl.launcher.vehicle.hvac.HvacState,
    repo: com.xyl.launcher.vehicle.hvac.HvacRepository,
) {
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(Color(0x66000000))
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // 电源
        BottomBtn(if (state.power) "⏻" else "○", state.power) {
            scope.launch { repo.setPower(!state.power) }
        }
        // 驾驶位温度
        TempControl(
            value = state.tempLeft,
            onMinus = { scope.launch { repo.setTemperature(1, state.tempLeft - 0.5f) } },
            onPlus = { scope.launch { repo.setTemperature(1, state.tempLeft + 0.5f) } },
        )
        // 副驾位温度
        TempControl(
            value = state.tempRight,
            onMinus = { scope.launch { repo.setTemperature(4, state.tempRight - 0.5f) } },
            onPlus = { scope.launch { repo.setTemperature(4, state.tempRight + 0.5f) } },
        )
        Box(modifier = Modifier.weight(1f))  // spacer
        // 风量条
        Text("风量 ${state.fanSpeed}/9", fontSize = 11.sp, color = Color(0xB3FFFFFF))
        BottomBtn("❄", state.acOn) { scope.launch { repo.setAirConditioner(!state.acOn) } }
        BottomBtn("AUTO", state.autoMode) { scope.launch { repo.setAutoMode(!state.autoMode) } }
        BottomBtn(if (state.innerCirculation) "↻" else "↺", state.innerCirculation) {
            scope.launch { repo.setInnerCirculation() }
        }
    }
}

@Composable
private fun BottomBtn(text: String, active: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(if (active) Color(0xFF4A9EFF) else Color(0x33FFFFFF))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(text, fontSize = 13.sp, color = Color.White) }
}

@Composable
private fun TempControl(value: Float, onMinus: () -> Unit, onPlus: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            "<",
            fontSize = 14.sp, color = Color.White,
            modifier = Modifier.clickable(onClick = onMinus).padding(6.dp),
        )
        Text(
            "${"%.1f".format(value)}°",
            fontSize = 15.sp, color = Color.White, fontWeight = FontWeight.Medium,
        )
        Text(
            ">",
            fontSize = 14.sp, color = Color.White,
            modifier = Modifier.clickable(onClick = onPlus).padding(6.dp),
        )
    }
}

/* ────────────────────────────────────────────────────────────
 *  页码指示器
 * ──────────────────────────────────────────────────────────── */

@Composable
private fun PageIndicator(
    pageCount: Int, current: Int,
    labels: List<String>,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        for (i in 0 until pageCount) {
            val isCurrent = i == current
            Row(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(if (isCurrent) Color(0x66000000) else Color.Transparent)
                    .padding(horizontal = if (isCurrent) 10.dp else 4.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(if (isCurrent) 6.dp else 5.dp)
                        .clip(CircleShape)
                        .background(if (isCurrent) Color.White else Color(0x66FFFFFF))
                )
                if (isCurrent) {
                    Text(
                        "  ${labels.getOrNull(i) ?: ""}",
                        fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}

