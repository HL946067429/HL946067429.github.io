# XYLauncher — 吉利星越 L 车机自研桌面

为吉利星越 L 25 揽星版（银河 OS）开发的个人自研桌面 App。
设计目标是自用，但车控数据层做了抽象，未来可扩展到其他银河 OS / Flyme Auto 车型。

## 当前进度（Phase 1）

- ✅ Kotlin + Jetpack Compose 工程脚手架
- ✅ Launcher（声明 `category.HOME`，可设为默认桌面）
- ✅ 车控数据抽象层（`VehicleDataProvider` 接口）
- ✅ Mock Provider（用于模拟器和无车环境开发）
- ✅ ECARX Provider 骨架（基于逆向小八得到的类名，反射调用）
- ✅ 时钟卡片、车辆状态卡片、应用网格（基础三件套）
- ⏳ ECARX Provider 具体方法签名（需在真车上 adb 探测后补全）
- ⏳ HUD 投屏、悬浮地图、壁纸库等（后续 Phase）

## 构建

需要 Android Studio Hedgehog（2023.1）或更高，JDK 17。

首次打开：
```
1. Android Studio → File → Open → D:\workspace\os
2. AS 会提示需要 Gradle wrapper，让它自动下载
3. 等同步完成，点 Run
```

如果命令行构建（已装 gradle 8.7+）：
```powershell
cd D:\workspace\os
gradle wrapper       # 第一次：生成 gradlew
.\gradlew assembleDebug
```

产物：`app\build\outputs\apk\debug\app-debug.apk`

## 装到 MuMu 模拟器（开发期）

```powershell
adb -s 127.0.0.1:7555 install -r app\build\outputs\apk\debug\app-debug.apk
adb -s 127.0.0.1:7555 shell am start -n com.xyl.launcher/.MainActivity
```

在模拟器里能跑就代表 UI 没问题。**Mock Provider 会自动激活**，车控卡片显示模拟数据。

## 装到真车（生产）

前提：车机已开 USB 调试。

```powershell
adb connect <车机IP>:5555
adb install -r app-debug.apk

# 给敏感权限（普通 install 不会自动给）
adb shell pm grant com.xyl.launcher android.permission.PACKAGE_USAGE_STATS
adb shell pm grant com.xyl.launcher android.permission.SYSTEM_ALERT_WINDOW

# 设为默认桌面（系统设置里手动选一下也行）
adb shell cmd package set-home-activity com.xyl.launcher/.MainActivity
```

## 项目结构

```
app/src/main/java/com/xyl/launcher/
├── App.kt                              全局 Application
├── MainActivity.kt                     Launcher 入口
├── vehicle/                            车控数据抽象层
│   ├── VehicleSignal.kt                21 信号枚举（来自小八 HUD 配置逆向）
│   ├── VehicleState.kt                 数据快照
│   ├── VehicleDataProvider.kt          Provider 接口
│   ├── VehicleRepository.kt            单例 Repository
│   ├── ProviderFactory.kt              自动探测最佳 Provider
│   └── providers/
│       ├── MockVehicleProvider.kt      模拟数据
│       └── EcarxVehicleProvider.kt     ECARX 反射调用 (TODO: 补全方法签名)
├── apps/                               应用启动器
└── ui/                                 Compose UI
```

## 扩展指南

### 接入真实 ECARX API

`EcarxVehicleProvider.connect()` 已经能尝试拿到 `Car` 实例。下一步是在 `connect()` 成功后：

1. 反射获取 `ICar` 接口的某个具体 Manager（如 `getCarFunctionManager()`、`getSensorManager()`）
2. 注册 `IFunctionValueWatcher` 监听需要的 Property ID
3. 在 watcher 回调里更新 `_state.value`

**找方法签名的路径**：
- `adb pull /system/app/EcarxCarService/EcarxCarService.apk`（或类似系统 App）
- jadx 反编译，搜 `ICarFunction` / `IFunctionValueWatcher` 实现
- 或在小八的 dex 里搜 `initEcarxCar()` 方法体看具体调用

### 加新车型 Provider

```kotlin
// 1. 实现 VehicleDataProvider
class FlymeAutoProvider(...) : VehicleDataProvider { ... }

// 2. 在 ProviderFactory.detect() 里加探测分支
suspend fun detect(context: Context): VehicleDataProvider {
    if (isLynkCo()) FlymeAutoProvider(context).takeIf { it.connect() }?.let { return it }
    EcarxVehicleProvider(context).takeIf { it.connect() }?.let { return it }
    return MockVehicleProvider().also { it.connect() }
}
```

### 加新卡片

1. 在 `ui/components/` 写一个 Composable
2. 在 `HomeScreen.kt` 的 Column 里加进去
3. 如果需要新车控信号，先在 `VehicleSignal` 加枚举，再在 `VehicleState` 加字段

## 文档

- [docs/ECARX_API_NOTES.md](docs/ECARX_API_NOTES.md) — ECARX SDK 已知信息（逆向得来）
- [docs/EXTENSION_GUIDE.md](docs/EXTENSION_GUIDE.md) — 扩展方法详细说明

## 已知技术债务 / TODO

- ECARX 具体方法签名（getICarFunction、registerWatcher 等）
- DashCam 文件目录监视 + 上传（在车上确定路径后实现）
- Zlink CarPlay 启动器入口（如果你装了 Zlink，加个 Intent 跳板）
- HUD 投屏（最复杂的功能，单独 Phase）
- 配置持久化（DataStore，目前是写死的）
- Launcher 默认桌面引导（首次启动检测并引导用户去设置）
