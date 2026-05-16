# ECARX 车控 API（基于小八 dex 完整逆向）

来源：脱壳后的 com.xiaoba.launcher v2.6.5 dex，关键类 `Lcom/xiaoba/launcher/h1;`、
`Lcom/xiaoba/launcher/PassengerScreenKeepOnService;`、`Lcom/xiaoba/launcher/aa;`。

银河 OS 实际上暴露了**两套并行的车控 API**：

---

## API A: `com.ecarx.xui.adaptapi.*` — 高层

用于 HVAC、车窗、座椅、氛围灯、副驾屏控制等"功能"调用。

### 入口

```kotlin
val car = Class.forName("com.ecarx.xui.adaptapi.car.Car")
    .getMethod("create", Context::class.java)
    .invoke(null, context)
```

**注意**：方法名是 `create`，不是 `createCar`（小八里的真实写法）。

### 获取 ICarFunction

```kotlin
val iCarFunction = Class.forName("com.ecarx.xui.adaptapi.car.ICar")
    .getMethod("getICarFunction")
    .invoke(car)
```

### ICarFunction 关键方法

| 方法 | 签名 | 用途 |
|------|------|------|
| `getFunctionValue(int functionId)` | `(I)Object` | 读功能值 |
| `setFunctionValue(int functionId, int value)` | `(II)V` | 设置功能值 |
| `setCustomizeFunctionValue(int id, int value, float floatValue)` | `(IIF)V` | 自定义设置 |

### 连接监听（IConnectable）

```kotlin
val iConnectable = Class.forName("com.ecarx.xui.adaptapi.binder.IConnectable")
val iConnectWatcher = Class.forName("com.ecarx.xui.adaptapi.binder.IConnectable\$IConnectWatcher")
iConnectable.getMethod("registerConnectWatcher", iConnectWatcher).invoke(car, watcher)
iConnectable.getMethod("connect").invoke(car)
```

### 已知样本调用（来自 PassengerScreenKeepOnService.a()）

```
setFunctionValue(539495936=0x20284800, Integer.MIN_VALUE, 1)  // 副驾屏常亮，循环 100 次保持
```

---

## API B: `ecarx.car.hardware.signal.*` — 低层信号

用于读取车速、转速、档位、油量等**原始车辆信号**。
这才是 21 个 dataSource 实际的数据源。

### 完整连接链（来自 h1.k() + h1.p()）

```kotlin
// 1. 通过 ServiceManager 拿到 Binder
val binder = Class.forName("android.os.ServiceManager")
    .getMethod("getService", String::class.java)
    .invoke(null, "ecarxcar_service") as IBinder

// 2. 用 Stub.asInterface 转成 IECarXCar
val iECarXCarStub = Class.forName("ecarx.car.IECarXCar\$Stub")
val iECarXCarCls = Class.forName("ecarx.car.IECarXCar")
val iECarXCar = iECarXCarStub
    .getMethod("asInterface", IBinder::class.java)
    .invoke(null, binder)

// 3. 创建 ECarXCar 实例
val eCarXCarCls = Class.forName("ecarx.car.ECarXCar")
val carInst = eCarXCarCls
    .getMethod("createCar", Context::class.java, iECarXCarCls)
    .invoke(null, context, iECarXCar)

// 4. 拿 CarSignalManager
val signalMgr = carInst.javaClass
    .getMethod("getCarManager", String::class.java, iECarXCarCls)
    .invoke(carInst, "car_signal", iECarXCar)
```

### 订阅信号

```kotlin
// 1. 创建 SignalFilter
val filterCls = Class.forName("ecarx.car.hardware.signal.SignalFilter")
val filter = filterCls.getDeclaredConstructor().newInstance()
filterCls.getMethod("add", Integer::class.java).invoke(filter, 0x21400009)
filterCls.getMethod("add", Integer::class.java).invoke(filter, 0x2140000A)

// 2. 创建 Callback 代理
val callbackCls = Class.forName("ecarx.car.hardware.signal.CarSignalManager\$CarSignalEventCallback")
val proxy = Proxy.newProxyInstance(callbackCls.classLoader, arrayOf(callbackCls)) { _, method, args ->
    // method.name == "onSignalChanged" 或类似
    // args[0] = signal ID (Int), args[1] = value
    null
}

// 3. 注册
signalMgr.javaClass.getMethod("registerCallback", filterCls, callbackCls)
    .invoke(signalMgr, filter, proxy)
```

### 已知信号 ID 样本

| ID (hex) | ID (dec) | 出处 | 待确认对应的 dataSource |
|----------|----------|------|----------------------|
| `0x21400009` | 557873481 | h1.p() | ? (filter 第一项，疑似 gear 或 speed) |
| `0x2140000A` | 557873482 | h1.p() | ? |
| `0x20284800` | 539495936 | PassengerScreenKeepOnService | API A 的功能 ID（副驾屏常亮） |

**ID 段规律**：
- `0x20xxxxxx` —— API A 的功能 ID
- `0x21xxxxxx` —— API B 的信号 ID

完整 21 个映射需要回车上用 frida 抓 `CarSignalEventCallback.onSignalChanged()` 调用得到。

---

## 系统服务 / Binder 名字

| 服务名 | 含义 |
|--------|------|
| `ecarxcar_service` | ServiceManager 里 ECARX 车机 IBinder 的名字 |
| `car_signal` | CarSignalManager 的 manager key |
| `com.geely.mediacenterservice` | 媒体中心 |
| `com.ecarx.pas.avmservice` | 360 全景影像 |

---

## 银河 OS 私有 Manifest 标签

```xml
<!-- 防止系统强制停止 -->
<meta-data android:name="com.geely.recent.prop.force_stop" android:value="false" />
```

无官方文档，只有逆向得知。

---

## Geely OneOS API（备用）

文档外这套也存在，主要管 Dock 栏、控制面板、媒体小部件：

| 类 | 用途 |
|---|------|
| `com.geely.lib.oneosapi.OneOSApiManager` | OneOS 入口 |
| `com.geely.lib.oneosapi.systemui.DockBarManager` | Dock 控制 |
| `com.geely.dockbar.manager.DockManager` | 另一个 Dock 接口 |
| `com.geely.controlboard.viewmodel.SplitScreenViewModel` | 分屏 |
| `com.geely.controlboard.viewmodel.ThemeViewModel` | 主题 |
| `com.geely.mediawidget.viewmodel.MediaViewModel` | 媒体小部件 |
| `com.geely.systemui.plugin.nav.DynamicDockBar` | 动态 Dock 栏 |

---

## TODO 清单

- [ ] 回车上抓 `CarSignalEventCallback.onSignalChanged` 实际签名（参数顺序、value 类型）
- [ ] 抓 21 个 dataSource 的真实 signalId（开车 30 分钟，frida 把所有回调记下来按变化推断）
- [ ] 找 ICarFunction 的 ID 常量（HVAC、车窗等高层功能）
- [ ] 验证 `ecarx.car.IECarXCar$Stub` 在实际车机里的全名是不是这个
- [ ] 抓 `IConnectable.connect()` 之后是不是立刻收回调
