package com.xyl.launcher.vehicle.providers

import android.content.Context
import android.os.IBinder
import android.util.Log
import com.xyl.launcher.vehicle.VehicleDataProvider
import com.xyl.launcher.vehicle.VehicleState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.lang.reflect.Proxy

/**
 * ECARX 实现 —— 调用银河 OS 的真实车控 API。
 *
 * 银河 OS 实际上暴露了**两套并行的 API**（从小八 dex 逆向得知）：
 *
 *   1. com.ecarx.xui.adaptapi.*  ——  高层 API，用于 HVAC、车窗、氛围灯、座椅
 *      入口: Car.create(Context) -> ICar -> getICarFunction() -> ICarFunction
 *      方法: setFunctionValue(id, value)、setCustomizeFunctionValue(id, value, float)、
 *           getFunctionValue(id)
 *
 *   2. ecarx.car.hardware.signal.* —— 低层 API，用于读取车速/转速/档位/油量等原始信号
 *      入口走 ServiceManager:
 *        ServiceManager.getService("ecarxcar_service") -> IBinder
 *          -> IECarXCar$Stub.asInterface(binder) -> IECarXCar
 *          -> ECarXCar.createCar(context, iECarXCar) -> ECarXCar 实例
 *          -> getCarManager("car_signal", iECarXCar) -> CarSignalManager
 *      订阅: new SignalFilter().add(signalId) + registerCallback(filter, callback)
 *      回调: CarSignalManager$CarSignalEventCallback 单方法接口（用 Proxy 实现）
 *
 * 全部用反射，编译期不依赖 ECARX SDK。
 *
 * 当前实现：搭好两路连接框架，预留信号注册位置；具体 21 个 dataSource 的
 * 信号 ID 待回车上 frida 抓取后填入 [SignalIds] 表。
 */
class EcarxVehicleProvider(private val context: Context) : VehicleDataProvider {
    override val name = "ECARX"

    private val _state = MutableStateFlow(VehicleState.EMPTY)
    override val state: StateFlow<VehicleState> = _state.asStateFlow()

    private val _available = MutableStateFlow(false)
    override val available: StateFlow<Boolean> = _available.asStateFlow()

    // Adapt API 句柄
    private var car: Any? = null
    private var iCarFunction: Any? = null

    // Signal API 句柄
    private var signalManager: Any? = null
    private var signalCallbackProxy: Any? = null

    override suspend fun connect(): Boolean {
        val gotAdapt = runCatching { initAdaptApi() }.getOrDefault(false)
        val gotSignal = runCatching { initSignalApi() }.getOrDefault(false)

        if (!gotAdapt && !gotSignal) {
            Log.w(TAG, "ECARX 两套 API 都没拿到，回落到 Mock")
            return false
        }
        Log.i(TAG, "ECARX 连接：adaptApi=$gotAdapt  signalApi=$gotSignal")
        _available.value = true
        return true
    }

    private fun initAdaptApi(): Boolean {
        val carCls = Class.forName("com.ecarx.xui.adaptapi.car.Car")
        val create = carCls.getMethod("create", Context::class.java)
        val carInst = create.invoke(null, context) ?: return false

        val iCarCls = Class.forName("com.ecarx.xui.adaptapi.car.ICar")
        val getICarFunction = iCarCls.getMethod("getICarFunction")
        val funcInst = getICarFunction.invoke(carInst) ?: return false

        car = carInst
        iCarFunction = funcInst
        return true
    }

    private fun initSignalApi(): Boolean {
        val sm = Class.forName("android.os.ServiceManager")
        val getService = sm.getMethod("getService", String::class.java)
        val binder = getService.invoke(null, "ecarxcar_service") as? IBinder ?: return false

        val iCarStub = Class.forName("ecarx.car.IECarXCar\$Stub")
        val asInterface = iCarStub.getMethod("asInterface", IBinder::class.java)
        val iCar = asInterface.invoke(null, binder) ?: return false

        val iCarCls = Class.forName("ecarx.car.IECarXCar")
        val eCarXCar = Class.forName("ecarx.car.ECarXCar")
        val createCar = eCarXCar.getMethod("createCar", Context::class.java, iCarCls)
        val carInst = createCar.invoke(null, context, iCar) ?: return false

        val getCarManager = carInst.javaClass.getMethod("getCarManager", String::class.java, iCarCls)
        val mgr = getCarManager.invoke(carInst, "car_signal", iCar) ?: return false

        signalManager = mgr
        registerSignalCallback(mgr)
        return true
    }

    private fun registerSignalCallback(mgr: Any) {
        val filterCls = Class.forName("ecarx.car.hardware.signal.SignalFilter")
        val filter = filterCls.getDeclaredConstructor().newInstance()
        val addMethod = filterCls.getMethod("add", Integer::class.java)

        // 注册我们关心的信号 ID
        for (id in SignalIds.allKnown()) {
            runCatching { addMethod.invoke(filter, id) }
        }

        val cbCls = Class.forName("ecarx.car.hardware.signal.CarSignalManager\$CarSignalEventCallback")
        signalCallbackProxy = Proxy.newProxyInstance(
            cbCls.classLoader, arrayOf(cbCls)
        ) { _, method, args ->
            onSignalEvent(method.name, args)
            null
        }

        val registerCallback = mgr.javaClass.getMethod("registerCallback", filterCls, cbCls)
        registerCallback.invoke(mgr, filter, signalCallbackProxy)
    }

    private fun onSignalEvent(methodName: String, args: Array<out Any?>?) {
        // CarSignalEventCallback 的回调签名是 onSignalChanged(int signalId, Object value) 或类似
        // 这里先打 log，等抓到真实回调签名后再做映射
        Log.d(TAG, "signal event: $methodName  args=${args?.joinToString { it?.toString() ?: "null" }}")
        if (args == null || args.size < 2) return

        val id = (args[0] as? Int) ?: return
        val value = args[1]
        SignalIds.toUpdate(id, value)?.let { update -> _state.value = update(_state.value) }
    }

    override fun getCarInstance(): Any? = car

    override fun disconnect() {
        // TODO: unregister callback
        car = null
        iCarFunction = null
        signalManager = null
        signalCallbackProxy = null
        _available.value = false
    }

    companion object {
        private const val TAG = "EcarxProvider"
    }
}
