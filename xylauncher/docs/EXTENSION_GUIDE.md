# 扩展指南

## 加一个新卡片

例：加一个"音乐"卡片，显示当前播放的歌名 + 封面。

### Step 1 — 数据源

如果车控相关，加到 `VehicleState`：
```kotlin
data class VehicleState(
    // ... 原有
    val musicTitle: String? = null,
    val musicArtist: String? = null,
    val musicCoverUri: Uri? = null,
)
```

如果是 Android 标准 API（MediaSession），单独写一个 Repository，
不要硬塞进 `VehicleRepository`。

### Step 2 — Composable

`app/src/main/java/com/xyl/launcher/ui/components/MusicCard.kt`：
```kotlin
@Composable
fun MusicCard(title: String?, artist: String?, modifier: Modifier = Modifier) {
    // 用 Card / Column + Text + AsyncImage
}
```

### Step 3 — 接到 HomeScreen

```kotlin
Column { 
    ClockCard()
    VehicleStatusCard(...)
    MusicCard(...)   // ← 加在这
    AppGridCard(...)
}
```

## 加一个新车控信号

### 例：加车窗状态

1. `VehicleSignal.kt` 加枚举：
```kotlin
enum class VehicleSignal {
    // ... 原有
    WINDOW_FRONT_LEFT,
    WINDOW_FRONT_RIGHT,
    WINDOW_REAR_LEFT,
    WINDOW_REAR_RIGHT,
}
```

2. `VehicleState.kt` 加字段：
```kotlin
data class VehicleState(
    // ... 原有
    val windowFrontLeftOpen: Boolean = false,
    // ...
)
```

3. `MockVehicleProvider.kt` 给 Mock 数据。

4. `EcarxVehicleProvider.kt` 实现真实读取：
```kotlin
val function = iCarFunction.getFunction(ECARX_WINDOW_FRONT_LEFT_ID)
function.registerWatcher(myWatcher)
```

## 加一个新车型 Provider

例：领克车机（Flyme Auto）。

1. 写 `vehicle/providers/FlymeAutoProvider.kt`：
```kotlin
class FlymeAutoProvider(private val context: Context) : VehicleDataProvider {
    override val name = "Flyme Auto"
    // ... 实现 connect()，反射调用 Flyme Auto 的车控 SDK
}
```

2. 在 `ProviderFactory.detect()` 里加：
```kotlin
suspend fun detect(context: Context): VehicleDataProvider {
    // 先试领克（Flyme Auto）
    if (isLynkCo()) {
        val p = FlymeAutoProvider(context)
        if (p.connect()) return p
    }
    // 再试 ECARX（吉利）
    val ecarx = EcarxVehicleProvider(context)
    if (ecarx.connect()) return ecarx
    // 兜底 Mock
    return MockVehicleProvider().also { it.connect() }
}

private fun isLynkCo(): Boolean {
    return runCatching {
        Class.forName("com.flyme.auto.SOMETHING")
        true
    }.getOrDefault(false)
}
```

## 加 DashCam 同步功能

### Step 1 — 找文件路径

回车上 adb：
```bash
adb shell find /sdcard /storage -name "*.mp4" -size +5M 2>/dev/null | head
```

### Step 2 — 写监视 Service

`apps/dashcam/DashCamSyncService.kt`：
```kotlin
class DashCamSyncService : Service() {
    override fun onCreate() {
        val observer = object : FileObserver(File("/sdcard/dvr"), CREATE or CLOSE_WRITE) {
            override fun onEvent(event: Int, path: String?) {
                if (path?.endsWith(".mp4") == true) {
                    enqueueUpload(File("/sdcard/dvr/$path"))
                }
            }
        }
        observer.startWatching()
    }
}
```

### Step 3 — 后台上传

用 WorkManager + 任意云存储 SDK（阿里 OSS / WebDAV / 自建 HTTP 上传接口）。

## 加 Zlink CarPlay 入口

不需要自己实现 CarPlay，只是在桌面上放个图标启动 Zlink：

```kotlin
@Composable
fun CarPlayShortcut() {
    Button(onClick = {
        val intent = packageManager.getLaunchIntentForPackage("com.zlink.carplay.android.auto")
        if (intent != null) startActivity(intent)
        else Toast.makeText(context, "请先装 Zlink", Toast.LENGTH_SHORT).show()
    }) {
        Text("CarPlay")
    }
}
```

Zlink 实际包名以你装的版本为准，可以用 `adb shell pm list packages | grep zlink` 确认。
