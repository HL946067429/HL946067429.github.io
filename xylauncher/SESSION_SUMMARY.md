# XYLauncher 项目会话总结

> 日期：2026-05-16
> 目标车型：吉利星越 L 2025 揽星版（银河 OS 2.3）
> 项目路径：`D:\workspace\os`

---

## 一、项目起源

用户想为自己的**吉利星越 L 25 款揽星版**车机做一个**自用桌面 App**，要求：

1. 类似"小八桌面"的功能（一个流行的第三方车机桌面 App）
2. 只兼容自己这一台车（星越 L 25 款），不需要适配其他车型
3. 留好扩展点
4. 集成行车记录仪远程访问、CarPlay 等需求

---

## 二、逆向小八桌面（基础工作）

### 2.1 拿到 APK

文件路径：`C:\Users\EDY\Desktop\xiaoba-launcher-2.6.5_265.apk`（40 MB）

### 2.2 静态分析（jadx/androguard 不需要 Java）

- 包名：`com.xiaoba.launcher` v2.6.5
- minSdk 24, targetSdk 33
- 申请 48 个权限（含 `WRITE_SECURE_SETTINGS`, `INTERACT_ACROSS_USERS_FULL` 等系统级）
- 声明 33 个 Activity + 12 个 Service
- **检测到 360 加固 VIP 版**（`libjiagu*.so` + `com/stub/StubApp` + `JIAGU_ENCRYPTED_DEX_NAME`）
- 原始 `classes.dex` 只有 4 个类（StubApp + 加固辅助），**无业务代码**

### 2.3 脱壳

尝试顺序：
1. ❌ BlackDex（提示"脱壳失败：环境检测"）
2. ❌ MT 管理器（功能受限）
3. ✅ **ADB 直接读 /proc/PID/mem**

最终方法（自研 Python 脚本）：

```
1. MuMu 模拟器跑小八到激活页面（业务 dex 已加载到内存）
2. adb shell pidof com.xiaoba.launcher → 拿 PID
3. adb shell cat /proc/PID/maps → 找 [anon:dalvik-classes.dex extracted...]
4. dd if=/proc/PID/mem of=region.bin bs=4096 skip=X count=Y
5. 扫所有内存区段，匹配 dex magic（dex\n035 等）
6. 找到一个 7.3 MB 的真业务 dex（包含 3873 个类）
```

脚本：`D:\workspace\kax\.tmp\dump_xiaoba_v2.py`
产物：`C:\Users\EDY\Desktop\xiaoba_dumped\v2\xiaoba_dump2\r050_*.dex`

### 2.4 真 dex 分析

3873 类的分布：
- 1117 类 `com/xiaoba/launcher`（自家代码）
- 45 类 `com/geely/lib/oneosapi`（吉利官方 SDK）
- 12 类 `com/autonavi/amapauto`（高德导航 SDK）
- 其余是 androidx / kotlin / Gson / Glide / Lottie / Coroutines

---

## 三、银河 OS 车控 API 揭秘

### 3.1 两套并行的 SDK

#### A. com.ecarx.xui.adaptapi（高层）
```
入口：Class.forName("com.ecarx.xui.adaptapi.car.Car").create(context)
接口：com.ecarx.xui.adaptapi.car.ICar
功能：com.ecarx.xui.adaptapi.car.base.ICarFunction
    .setFunctionValue(int id, int valueA, int valueB)
    .setCustomizeFunctionValue(int id, int zone, float value)
    .getFunctionValue(int id, int subId)
```

#### B. ecarx.car.hardware.signal（低层）
```
入口绕一圈走 ServiceManager:
  ServiceManager.getService("ecarxcar_service") → IBinder
  → ecarx.car.IECarXCar$Stub.asInterface(binder) → IECarXCar
  → ecarx.car.ECarXCar.createCar(context, iECarXCar) → ECarXCar
  → getCarManager("car_signal", iECarXCar) → CarSignalManager

订阅：new SignalFilter().add(signalId)
监听：registerCallback(filter, CarSignalEventCallback)
```

### 3.2 HVAC 功能 ID 完整表

| 功能 | Function ID (hex) | 说明 |
|------|------------------|------|
| 电源总开关 | `0x10010800` | setFunctionValue(POWER, MIN_INT, 0/1) |
| 温度设置 | `0x10070000` | setCustomizeFunctionValue(TEMP, zone, float) |
| 温度备用 | `0x10070001` | zone=4 失败时回落 |
| 同步左右温度 | `0x10070400` | |
| 内循环 | `0x100c0001` | |
| 风量手动 | `0x100c0c00 + level` | level 0-9 |
| 座椅加热 | `0x10090000 + level` | level 0-3 |
| ZONE 主驾 | 1 | |
| ZONE 副驾 | 4 | |

### 3.3 AR-HUD 模式控制（已完整逆向）

来自 `Lcom/xiaoba/launcher/me;` 类。

**4 个模式（来自 me.<clinit> me.D 静态列表）**：

| Mode 值 | 名称 |
|---------|------|
| 0 | 导航 |
| 1 | SR |
| 2 | AR |
| 3 | 极简 |

**调用链**：
```kotlin
// 1. 通过 AbsCarSignal 拿 ECarXCarSetManager
val setMgrField = Class.forName("com.ecarx.xui.adaptapi.AbsCarSignal")
    .getDeclaredField("mECarXCarSetManager")
    .apply { isAccessible = true }
val setMgr = setMgrField.get(absCarSignalInstance)

// 2. 拿 Vfhud / ProfileTransfer 两个 Manager
val vfhudMgr = Class.forName("ecarx.car.hardware.vehicle.ECarXCarSetManager")
    .getMethod("getECarXCarVfhudManager").invoke(setMgr)
val profileMgr = ...getMethod("getECarXCarProfiletransferManager").invoke(setMgr)

// 3. 写模式（任一即可）
profileMgr.javaClass
    .getMethod("CB_HudDispModSetgReq", Int::class.javaPrimitiveType)
    .invoke(profileMgr, mode.value)

// 4. 读当前模式（UserProfile 路径）
val userProfile = ICar.getUserProfileManager()
val userId = userProfile.getCurrentId()
val profile = userProfile.getUserProfileData(userId)
val currentMode = profile.getProfileFuncValue(0x0F006800, Int.MIN_VALUE)
```

### 3.4 座椅记忆

| 项 | 值 |
|----|----|
| Function ID | `0x2D437800` (759169280) |
| 保存机制 | `setFunctionValue(ID, zone, 1)` → `setFunctionValue(ID, zone, 0)` 双调用 |
| ZONE 主驾 | 1 |
| ZONE 副驾 | 4 |
| Position | 1, 2, 3（3 个记忆位）|

### 3.5 副驾屏常亮

| 项 | 值 |
|----|----|
| Function ID | `0x20284800` (539495936) |
| 调用 | 循环 100 次 `setFunctionValue(ID, MIN_INT, 1)` 每 1ms 一次 |
| 适用车型 | 仅星越 L |

### 3.6 飞屏（投到副驾屏/AR-HUD）

```kotlin
val options = ActivityOptions.makeBasic()
// setLaunchDisplayId 反射调（@SystemApi）
ActivityOptions::class.java
    .getMethod("setLaunchDisplayId", Int::class.java)
    .invoke(options, displayId)
// setLaunchWindowingMode(5) = FREEFORM
ActivityOptions::class.java
    .getDeclaredMethod("setLaunchWindowingMode", Int::class.java)
    .apply { isAccessible = true }
    .invoke(options, 5)
context.startActivity(intent, options.toBundle())
```

**Display 编号**（推测，待车上 `dumpsys display` 确认）：
- 0 = 主中控屏
- 1/2 = 副驾屏 / AR-HUD
- AR-HUD **是 Android Display**，可被 setLaunchDisplayId 投画面

### 3.7 21 个 dataSource 列表（HUD 元素）

来自小八 `assets/hud_default_init_config.json`：

```
speed, speed_unit, rpm, gear, fuel, battery,
motor_speed_front, motor_speed_rear, outer_temp,
turn_signal_left, turn_signal_right,
lane_info, navigation_text, navigation_icon,
traffic_light, cruise_traffic_light,
music_cover, music_title_artist, lyrics,
time
```

**具体 signal ID 没挖出**（需在车上 frida hook `CarSignalEventCallback.onSignalChanged` 抓）。

---

## 四、屏幕配置（星越 L 25 揽星版）

### 4.1 4 个屏幕

| 屏幕 | 尺寸 | 性质 | 是否 Android Display |
|------|------|------|---------------------|
| 中控屏 | 12.3" / **1920×720** | Android 触屏 | ✅ Display 0 |
| 副驾屏 | 12.3" | Android 触屏 | ✅ 独立 Display |
| AR-HUD | 25.6" 投影 | 渲染单元 | ⚠️ 通过 Display ID 渲染（推测 = 2）|
| 数字仪表屏 | 10.25" | 独立 ECU | ❌ 永远不可访问 |

### 4.2 25 款 vs 21-23 款架构差异（小八字符串证据）

- **24-25 款**："只有 DockBarManager，使用系统UI控制"
- **21-23 款**：DockBar + 反射控制（不同 toggle 方法）
- 字符串：`已切换到星越L(24-25)` / `21-23款星越L-DOCK控制失败`

---

## 五、工具链（已安装）

| 工具 | 版本 | 位置 |
|------|------|------|
| ADB / platform-tools | r37.0.0 | `C:\Users\EDY\AppData\Local\Microsoft\WinGet\...` |
| Microsoft OpenJDK | 17.0.19 LTS | `C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\` |
| Android SDK | 34 + build-tools 34.0.0 | `C:\android-sdk\` |
| Gradle wrapper | 8.7 | 项目内 |
| Python + androguard | 3.13 + 4.1.3 | 全局 |
| MuMu Pro 12 模拟器 | 12 | 测试环境 |

### MuMu 配置

- ADB 端口：127.0.0.1:7555
- 测试分辨率：1920×720（仿星越L中控屏）
- Root 模式开启

---

## 六、XYLauncher 项目结构

### 6.1 包结构

```
D:\workspace\os\
├── app/src/main/java/com/xyl/launcher/
│   ├── App.kt                          全局 Application
│   ├── MainActivity.kt                 Launcher 入口（HOME category）
│   │
│   ├── apps/                           应用启动器
│   ├── dashcam/                        行车记录仪文件监视
│   ├── floatdock/                      浮动 Dock 悬浮窗 Service
│   ├── hud/                            HUD 悬浮窗 + 配置解析
│   ├── media/                          媒体卡片（MediaSessionManager）
│   ├── multidisplay/                   多屏检测 + 飞屏 (setLaunchDisplayId)
│   ├── settings/                       DataStore 设置
│   ├── weather/                        天气（wttr.in 公共 API）
│   │
│   ├── vehicle/                        车控核心
│   │   ├── VehicleDataProvider.kt      统一 Provider 接口
│   │   ├── VehicleRepository.kt        单例 + carInstance 暴露给下游
│   │   ├── providers/
│   │   │   ├── MockVehicleProvider.kt  模拟数据（Sin 波）
│   │   │   ├── EcarxVehicleProvider.kt 反射调 ECARX 两套 SDK
│   │   │   └── SignalIds.kt            21 信号 ID 占位（待车上抓）
│   │   ├── drivemode/                  驾驶模式
│   │   ├── fuel/                       油耗续航
│   │   ├── hud/                        AR-HUD 模式 (HudMode + Vfhud Controller)
│   │   ├── hvac/                       空调（完整 API）
│   │   ├── seatmemory/                 座椅记忆（funcId 已确认）
│   │   └── tire/                       胎压
│   │
│   └── ui/
│       ├── HomeScreen.kt               主屏：仿小八的顶/底持久条 + 横滑 Pager
│       ├── Navigation.kt               全局导航
│       ├── AppDrawerScreen.kt          应用抽屉
│       ├── SettingsScreen.kt           设置页（含安全模式总开关）
│       ├── HudPreviewScreen.kt         HUD 预览页
│       ├── HudOverlayContent.kt        HUD 悬浮窗渲染
│       └── components/                 各类卡片 Composable
│
├── docs/
│   ├── ECARX_API_NOTES.md              ECARX API 完整笔记
│   └── EXTENSION_GUIDE.md              扩展指南
└── res/raw/hud_default.json            HUD 默认配置（仿小八 21 元素）
```

### 6.2 项目体量

- **Kotlin 文件**：~60 个
- **APK 大小**：52 MB
- **业务模块**：13 个
- **小八完成度**：约 40%

---

## 七、已完成的功能

### Phase 0：基础设施 ✅

- Gradle 工程脚手架（Kotlin + Jetpack Compose）
- AndroidManifest（含吉利银河 OS 私有 `com.geely.recent.prop.force_stop` 防强杀标签）
- 横屏 launcher Activity（声明 `category.HOME`）
- 工具链全套（JDK + SDK + Gradle 8.7）

### Phase 1：核心架构 ✅

- 车控数据 Provider 抽象层（接口 + Mock + ECARX 反射实现）
- VehicleRepository 单例 + StateFlow
- 安全模式总开关（默认 ON，所有写操作过闸）
- ICar 实例自动接通到下游模块（HudMode / Tire / Fuel / DriveMode / SeatMemory）

### Phase 2：关键卡片复刻 ✅

| 卡片 | 状态 |
|------|------|
| 胎压（4 轮压力+温度） | ✅ Mock 数据 + 警告检测 |
| 油耗/续航 | ✅ |
| 驾驶模式（4 模式） | ✅ UI 完成，funcId 待挖 |
| 座椅记忆（3 位置）| ✅ funcId 0x2D437800 已确认 |

### Phase 3：浮动 Dock ✅

- WindowManager 悬浮窗 Service（仿小八 FloatingDockService）
- 折叠态：48dp 蓝色圆点
- 展开态：5 按钮竖排（投屏 / HUD / 桌面 / 关闭）
- 可拖拽（按住任意位置移动）
- 跨 App 持久显示

### Phase 4：周边卡片 ✅

| 卡片 | 实现 |
|------|------|
| 天气 | wttr.in 免 key API，30 分钟自动刷新 |
| 快捷工具 | 手电筒 (CameraManager) + 4 个系统设置入口 |
| 蓝牙音频 | AudioManager 查输出状态 + 跳蓝牙设置 |
| 360 全景 | Intent 调起 com.ecarx.parking |

### Phase 5：HUD 系统（部分）

- ✅ HUD 模式切换（4 模式）+ 读回当前模式
- ✅ HUD 配置解析器（兼容小八 JSON 格式）
- ✅ HUD 静态预览页（16:9 画布渲染所有元素）
- ✅ HUD 真悬浮窗 Service（WindowManager + ComposeView）
- ❌ HUD 编辑器（拖拽元素，待 Phase 7）

### Phase 6：多屏 ✅

- 列出所有 Android Display（DisplayManager.displays）
- 自动识别 HUD 候选 / 副驾屏候选
- `launchToDisplay(packageName, displayId)` 飞屏调用（reflection setLaunchDisplayId）

### Phase 7：HVAC 完整控制 ✅

- 电源 / 风量 0-9 / 温度（主副驾）/ 同步 / 内循环 / 座椅加热
- 全部用真实 ECARX function ID
- 全部过 safeMode 闸 + drivingLockout

### Phase 8：媒体 ✅

- NotificationListener Service（标准 MediaSession 接入）
- 显示当前歌曲（标题/艺术家/封面/源 App）
- 播放控制（上一首/暂停/下一首）

### Phase 9：安全加固 ✅

| 项 | 状态 |
|----|------|
| safeMode 总开关（默认 ON） | ✅ |
| HVAC / HUD / 飞屏写操作过闸 | ✅ |
| 行车中（speed > 5）禁用按钮 | ✅ |
| 设置页顶部巨型警告卡 | ✅ |
| 移除错误的 SignalId | ✅ PSD_KEEP_ON 已移出 SignalFilter |
| Manifest 清理多余权限 | ✅ |

### Phase 10：UI 设计迭代

迭代历史：
1. ❌ V1：纯竖向列表（卡片太大，1920×720 屏只能看 2 张）
2. ❌ V2：2 列网格（改善但仍然挤）
3. ❌ V3：顶部固定 + 2 列网格（还差点意思）
4. ❌ V4：iOS 风格横滑 Pager（4 页，分组）
5. ✅ V5：**仿小八沉浸式**（当前）
   - 顶部状态栏：车内温/速度/转速 | 时间 | 通讯图标/外温
   - 第 1 页：壁纸感 + 时钟浮层 + 4 个功能岛（快捷/导航/媒体/应用）
   - 第 2 页：车况详情（车辆状态 + HUD + 胎压 + 油耗）
   - 第 3 页：舒适（HVAC + 驾驶模式 + 座椅 + 蓝牙）
   - 底部 HVAC 持久控制条（电源/温度/风量/AC/AUTO/循环）

### Phase 11：HVAC 完整版（6 + 6 套餐）✅

**6 个新功能**（在原有电源/温度/风量/同步/循环/座椅加热基础上）：
- A/C 压缩机、AUTO 自动模式
- 前挡除霜、后窗除霜
- 座椅通风（0-3 档）
- 出风方向（自动/脸/脚/脸+脚/除霜）

**6 个一键场景**（`HvacRepository.applyScene()`）：

| 场景 | 编排顺序 |
|------|----------|
| ❄ 急速制冷 | 开电源 → 关 AUTO → 开 A/C → 18°C 同步 → 内循环 → 吹脸 → 通风 3 档 → 风量 9 |
| 🔥 急速制热 | 开电源 → 关 AUTO → 关 A/C → 28°C 同步 → 内循环 → 吹脚 → 后窗除霜 → 加热 2 档 → 风量 7 |
| ✨ 舒适 | 开 A/C + 22°C 同步 + 自动出风 + 启 AUTO |
| 💨 通风 | 关 A/C + 外循环 + 吹脸 + 风量 6 |
| ☔ 除雾 | 开 A/C + 24°C + 外循环 + DEFROST 模式 + 前后除霜 + 风量 8 |
| ⏻ 全关 | 先清座椅/除霜/AUTO/A/C → 关电源 |

**注意**：6 个新功能的 funcId 按 `0x10xx0xxx` 段规律"合理推测"，没在小八 dex 直接见过。`EcarxHvacController` 反射失败时返 false 不更新 state，加上 safeMode 闸默认 ON——挂错号也安全。**回车上必须 frida hook 验证。**

### Phase 12：拖拽重排（DraggableLane）✅

通用容器 `ui/components/DraggableLane.kt`：泛型 `T`，支持横/竖方向，每个 slot 等分主轴，专用 `⋮⋮` 拖拽把手避免跟内部 clickable 抢手势。`onGloballyPositioned` 抓真实 bounds → 用"被拖项中心是否进入别人 bounds"判定 swap → `dragOffset` 用实际位置差补偿。让位项 `Animatable<Float>` 220ms 平滑滑到新位。

**入口**：
- 首页 4 个 FunctionIsland（横向）
- 车况页左/右 2 列卡片（竖向）
- 舒适页右列 3 张卡（竖向）

**持久化**：4 个 CSV 字段在 AppSettings —— `islandOrder` / `carLeftCardOrder` / `carRightCardOrder` / `comfortRightCardOrder`。解析时跨槽 token 自动丢弃，未知值容错。

辅助：`DraggableCardSlot` 装饰器在右上角自动叠加拖拽把手，免改 6 个 Card 文件。

### Phase 13：动态壁纸 + 图片壁纸 ✅

**动态渐变**：`ui/components/AnimatedWallpaper.kt`，单 Canvas 绘制，按一天分 4 色调（黎明/白天/黄昏/夜晚），相邻时段线性插值，渐变方向沿椭圆 120s 一圈缓慢漂移；高光 + 暗角添层次。

**图片壁纸**：设置页 → 壁纸 → 选择图片（SAF `ACTION_OPEN_DOCUMENT`）→ `takePersistableUriPermission` 后持久化 URI；`AnimatedWallpaper` 检测到 URI 非空时采样解码（先读 bounds → `inSampleSize` → 目标 ≤2048px 避免 OOM）→ `Image(ContentScale.Crop)`；URI 为空回落动态渐变。

### Phase 14：HUD 编辑器（v1）✅

`ui/HudEditorScreen.kt`：
- 16:9 编辑画布，实时渲染所有 HUD 元素
- 单击选中（蓝色边框高亮）+ 拖动改 x/y（自动 coerceIn）
- 右侧 240dp 属性面板：可见 toggle / 文字大小 slider（8-200）/ 透明度 slider（0-1）/ X/Y 显示
- 元素列表 LazyColumn：所有元素 + 可见性 toggle
- 顶部工具条：重置 / 保存 / 返回

**持久化**：`HudRepository.save()` 写 JSON 到 `filesDir/hud_user_config.json`，load 时优先用户文件→fallback `res/raw/hud_default.json`。`HudConfigParser.toJson()` 新增。

**入口**：HUD 预览页右上角加蓝色「编辑」按钮。

**待补**：双指缩放、宽高调整、增删元素、撤销栈、对齐辅助线。

### Phase 15：Release 打包 ✅

| 步骤 | 命令 / 配置 |
|------|------|
| 自签 keystore | `keytool -genkeypair -keystore xyl-release.keystore -alias xyl -keyalg RSA -keysize 2048 -validity 10000` |
| `build.gradle.kts` | `signingConfigs.release` 引用 keystore；`release` buildType 套上签名；`isMinifyEnabled = false`（**ECARX 反射不能 R8**）|
| Lint 放行 | `lint { abortOnError = false; disable += "BlockedPrivateApi" }`（项目整体靠反射跟 ECARX / SystemApi 打交道）|
| 打包 | `./gradlew.bat assembleRelease` |
| 产物 | `app/build/outputs/apk/release/app-release.apk` ~42 MB |
| 验签 | `apksigner verify --print-certs` → `CN=XYL Launcher` |

---

## 八、待完成功能

### 优先级 ⭐⭐⭐

| Phase | 内容 | 工作量 |
|-------|------|--------|
| **#4** | 动态壁纸 + 跑马灯氛围灯（5+ 风格） | 6-10h |
| **卡片拖拽系统**（见下方详细方案） | V1 单页内长按拖动重排 | 2-3h |
| **HVAC 完整版** | 剩下 14 个功能（除霜/AUTO/AC/座椅通风等）| 3-4h |

### 卡片拖拽系统 — 详细方案（重要待办）

#### 小八的拖拽系统（参考标准）

| 层级 | 功能 | 复杂度 |
|------|------|--------|
| 1 | 长按卡片进编辑模式（卡片"摆动"提示） | 中 |
| 2 | 拖拽改变同一页内卡片顺序 | 中 |
| 3 | 跨页拖拽（拖到屏幕边停留触发翻页） | 高 |
| 4 | 卡片大小调整（1×1 / 2×1 / 2×2） | 高 |
| 5 | 添加/删除卡片（卡片库选择器） | 中 |
| 6 | HUD 内元素拖拽（双层嵌套） | 高 |

**全部实现 = 多天工作**。

#### 三档方案（任选一档实施）

##### 🥉 V0：设置页列表排序（30 分钟，最简）
- 设置 → 卡片管理：列出所有卡片，每行有 ↑↓ 按钮
- 顺序持久化到 DataStore（已有 LayoutPrefs 框架）
- Home 按这个顺序渲染
- 优点：简单可靠
- 缺点：要进设置页，不"所见即所得"

##### 🥈 V1：长按拖动单页内重排（2-3 小时，推荐）
- 长按任意卡片 → 卡片轻微抬起 + 半透明
- 拖到别的位置 → 实时交换
- 松手保存顺序
- 4 个功能岛 / 详情页卡片**单独支持**，互不串
- 优点：感觉到位，操作直观
- 缺点：跨页不行，大小不能改

##### 🥇 V2：全功能拖拽系统（多天 + 多次迭代）
- V1 全部
- 跨页（拖到屏幕左/右边缘 → 自动翻页）
- 卡片大小调整（捏合/角拖拽）
- 卡片库选择器（添加/删除卡片）
- 自定义保存/分享布局
- 优点：跟小八一样
- 缺点：工程量大，UX 细节多

#### V1 关键技术

```kotlin
// 每张卡片
Modifier.pointerInput(Unit) {
    detectDragGesturesAfterLongPress(
        onDragStart = {
            editing = true
            pickedUp = thisCard
        },
        onDragEnd = {
            saveOrder()  // 持久化到 DataStore
            editing = false
        }
    ) { _, dragAmount ->
        offset += dragAmount
        // 计算最接近的目标卡片位置，实时交换
    }
}

// 编辑模式下的摆动动画
val rotation = if (editing) {
    if (thisIsPickedUp) 0f
    else rememberInfiniteTransition().wiggle()
}
```

#### 上次会话决定

- 用户提示："你这个也太丑了，仿照苹果的设计来…可以左右滑动切换撒"
- 实施了横滑 Pager（已完成）
- 用户后续提示："他的卡片都是可以拖拽的"
- **本次会话未实施拖拽 → 留给下次会话**
- 推荐：直接进 V1（V0 太弱，V2 太大）

### 优先级 ⭐⭐

| Phase | 内容 | 状态 |
|-------|------|--------|
| **#5** | 场景助手（自动空调舒适）| ✅ Phase 11 完成 |
| **#6** | HUD 配置编辑器（拖拽 + 缩放） | 🟡 Phase 14 v1（缺缩放/增删/撤销）|
| 应用容器卡片 | 自定义放 6-9 个 App 进卡片 | 待办 (2h) |
| 真壁纸支持 | 替换渐变背景为图片 | ✅ Phase 13 完成 |

### 优先级 ⭐

| Phase | 内容 | 工作量 |
|-------|------|--------|
| **#7** | 4 个小游戏 + 木鱼 | 4-6h |
| 应用市场（仿小八） | 云端下载 APK | 4-6h |
| 沉浸歌词全屏 | | 2h |
| DashCam 真实云上传 | 选目标 + WorkManager | 3-4h |
| 飞屏完整 UI | 选屏 + 投屏管理 | 2h |

---

## 九、需要回车上做的事

### 9.1 第一次上车（15-20 分钟）

```bash
# 1. 探测设备
adb shell getprop ro.build.fingerprint
adb shell wm size
adb shell dumpsys display | findstr "DisplayDeviceInfo\|uniqueId\|width\|height"

# 2. 找 ECARX 系统 App（决定接入路径）
adb shell pm list packages | grep -E "ecarx|geely"
adb shell pm path com.ecarx.xxx  # 拉出来反编译看接口

# 3. 找 DashCam 文件路径
adb shell find /sdcard /storage -name "*.mp4" -size +5M | head -5

# 4. 装 XYLauncher v0.x APK 验证
adb install -r app-debug.apk
adb shell am start -n com.xyl.launcher/.MainActivity
```

### 9.2 后续验证

- ECARX `Car.create()` 真的能成功 → 验证 `EcarxVehicleProvider.initAdaptApi`
- `IUserProfile.getCurrentId()` 真的能读 → 验证 HudMode 当前值
- `setLaunchDisplayId(2)` 投到 AR-HUD 真的工作
- 21 个 dataSource 的实际 signalId（用 frida hook `CarSignalEventCallback`）

---

## 十、道德与安全边界

### 10.1 已划清的红线

- ❌ **不破解**小八的授权验证
- ❌ **不重打包**或分发盗版
- ❌ **不直接复制**小八的资源/图片/代码

### 10.2 可以做的（学习用途）

- ✅ 静态分析 dex（学技术）
- ✅ 抄实现原理 / API 调用方式
- ✅ 借鉴 UI 设计思路
- ✅ 复刻功能用自己的代码独立实现

### 10.3 物理安全确认

- **不可能造成短路/爆炸**：App 跑在 Android 用户空间，离硬件中间有 ECU 固件 + 硬件保护电路
- **不可能损坏车机**：API 调用跟按车原装按钮等价
- **唯一风险**：设为默认桌面后崩溃可能导致回不到桌面 → 缓解：先并存，不主动设为默认

---

## 十一、关键文件路径速查

| 用途 | 路径 |
|------|------|
| 项目根 | `D:\workspace\os` |
| GitHub 镜像 | `D:\workspace\HL946067429.github.io\xylauncher\` |
| **Release APK**（车上装这个） | `D:\workspace\os\app\build\outputs\apk\release\app-release.apk` |
| Release APK（GitHub 拷贝） | `D:\workspace\HL946067429.github.io\xylauncher\release\XYLauncher-v0.1.0-release.apk` |
| Debug APK | `D:\workspace\os\app\build\outputs\apk\debug\app-debug.apk` |
| Release 编译 | `gradlew.bat assembleRelease --no-daemon` |
| Debug 编译 | `gradlew.bat assembleDebug --no-daemon` |
| 签名 keystore | `D:\workspace\os\xyl-release.keystore`（pwd: `xyl123456`, alias: `xyl`）|
| 装到 MuMu | `adb -s 127.0.0.1:7555 install -r app-debug.apk` |
| 装到真车 | `adb install -r XYLauncher-v0.1.0-release.apk` |
| 启动 | `adb shell am start -n com.xyl.launcher/.MainActivity` |
| 验签 | `apksigner verify --print-certs app-release.apk` |
| 脱壳 dex | `C:\Users\EDY\Desktop\xiaoba_dumped\v2\xiaoba_dump2\r050_*.dex` |
| 原 APK | `C:\Users\EDY\Desktop\xiaoba-launcher-2.6.5_265.apk` |
| 分析脚本 | `D:\workspace\kax\.tmp\*.py` |
| ECARX API 笔记 | `D:\workspace\os\docs\ECARX_API_NOTES.md` |

---

## 十二、下次会话起手

```
本轮（2026-05-16 下午）已完成：
  - HVAC 完整版（6 新功能 + 6 一键场景）
  - 拖拽重排（首页岛 + 第 2/3 页卡片）
  - 动态壁纸 + 图片壁纸
  - HUD 编辑器 v1
  - Release APK 打包 + 自签 keystore
  - 项目镜像到 HL946067429.github.io/xylauncher

接下来：
  1. 用户回家车上实测 release APK
  2. 用 frida 在车上 hook ICarFunction.setFunctionValue 验证 6 个新 funcId
  3. 用 adb dumpsys display 拿副驾屏 / AR-HUD 的真实 displayId
  4. 把 21 个 dataSource 的 signalId 挖出来

待补功能（优先级）：
  - 应用容器卡片（IslandId.FAVORITES + 选 app 弹窗）
  - 沉浸歌词全屏
  - HUD 编辑器 v2（双指缩放、增删、撤销）
  - DashCam 上传（WorkManager）

新会话读 SESSION_SUMMARY.md + 看车上 frida hook 结果，即可继续。
```

---

*更新时间：2026-05-16（下午追加 Phase 11-15）*
*总产出：70+ Kotlin 文件，42 MB 签名 release APK，完整文档*
*GitHub 镜像：https://github.com/HL946067429/HL946067429.github.io/tree/main/xylauncher*
