package com.xyl.launcher.vehicle.hud

import android.content.Context
import android.util.Log
import com.xyl.launcher.App
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.lang.reflect.Method

/**
 * 吉利 AR-HUD 控制器 —— 调用 ECARX 私有 API 切换 AR-HUD 显示模式 + 读取当前模式。
 *
 * 逆向自小八桌面 `Lcom/xiaoba/launcher/me;` 类。
 *
 * 三条路径：
 *   写模式（主）: ECarXCarProfiletransferManager.CB_HudDispModSetgReq(int)
 *   写模式（备）: ECarXCarVfhudManager.CB_HUD_DispModSet(int)
 *   读模式: IUserProfile → getCurrentId → getUserProfileData → IProfile.getProfileFuncValue
 *           funcId = 0x0F006800 (251660288)，subId = Int.MIN_VALUE
 */
class EcarxVfhudController(private val context: Context) {

    private val _currentMode = MutableStateFlow<HudMode?>(null)
    val currentMode: StateFlow<HudMode?> = _currentMode.asStateFlow()

    private val _available = MutableStateFlow(false)
    val available: StateFlow<Boolean> = _available.asStateFlow()

    // 写路径
    private var profileTransferMgr: Any? = null
    private var profileTransferMethod: Method? = null
    private var vfhudMgr: Any? = null
    private var vfhudMethod: Method? = null

    // 读路径
    private var userProfileMgr: Any? = null
    private var getCurrentIdMethod: Method? = null
    private var getUserProfileDataMethod: Method? = null
    private var getProfileFuncValueMethod: Method? = null
    private var containsProfileFuncIdMethod: Method? = null

    fun init(iCarInstance: Any?): Boolean {
        if (iCarInstance == null) return false
        return try {
            initWritePath(iCarInstance)
            initReadPath(iCarInstance)

            val writeOk = profileTransferMethod != null || vfhudMethod != null
            val readOk = getProfileFuncValueMethod != null
            _available.value = writeOk
            Log.i(TAG, "VFHUD init write=$writeOk read=$readOk")

            if (readOk) refreshCurrentMode()
            writeOk
        } catch (t: Throwable) {
            Log.w(TAG, "VFHUD 初始化失败: ${t.message}")
            _available.value = false
            false
        }
    }

    private fun initWritePath(iCar: Any) {
        val carSignal = findAbsCarSignal(iCar) ?: return

        val absCarSignal = Class.forName("com.ecarx.xui.adaptapi.AbsCarSignal")
        val setMgrField = absCarSignal.getDeclaredField("mECarXCarSetManager").apply {
            isAccessible = true
        }
        val setMgr = setMgrField.get(carSignal) ?: return

        val setMgrCls = Class.forName("ecarx.car.hardware.vehicle.ECarXCarSetManager")

        // 主：ProfileTransfer
        profileTransferMgr = runCatching {
            setMgrCls.getMethod("getECarXCarProfiletransferManager").invoke(setMgr)
        }.getOrNull()
        profileTransferMethod = runCatching {
            Class.forName("ecarx.car.hardware.vehicle.ECarXCarProfiletransferManager")
                .getMethod("CB_HudDispModSetgReq", Int::class.javaPrimitiveType)
        }.getOrNull()

        // 备：VFHUD
        vfhudMgr = runCatching {
            setMgrCls.getMethod("getECarXCarVfhudManager").invoke(setMgr)
        }.getOrNull()
        vfhudMethod = runCatching {
            Class.forName("ecarx.car.hardware.vehicle.ECarXCarVfhudManager")
                .getMethod("CB_HUD_DispModSet", Int::class.javaPrimitiveType)
        }.getOrNull()
    }

    private fun initReadPath(iCar: Any) {
        val iCarCls = Class.forName("com.ecarx.xui.adaptapi.car.ICar")
        userProfileMgr = runCatching {
            iCarCls.getMethod("getUserProfileManager").invoke(iCar)
        }.getOrNull() ?: return

        val iUserProfileCls = Class.forName("com.ecarx.xui.adaptapi.car.userprofile.IUserProfile")
        val iProfileCls = Class.forName("com.ecarx.xui.adaptapi.car.userprofile.IProfile")
        val intP = Int::class.javaPrimitiveType

        getCurrentIdMethod = runCatching {
            iUserProfileCls.getMethod("getCurrentId")
        }.getOrNull()
        getUserProfileDataMethod = runCatching {
            iUserProfileCls.getMethod("getUserProfileData", intP)
        }.getOrNull()
        getProfileFuncValueMethod = runCatching {
            iProfileCls.getMethod("getProfileFuncValue", intP, intP)
        }.getOrNull()
        containsProfileFuncIdMethod = runCatching {
            iProfileCls.getMethod("containsProfileFuncId", intP, intP)
        }.getOrNull()
    }

    /**
     * 从 ICar 找 AbsCarSignal 实例。
     */
    private fun findAbsCarSignal(iCar: Any): Any? {
        val absCarSignalCls = runCatching {
            Class.forName("com.ecarx.xui.adaptapi.AbsCarSignal")
        }.getOrNull() ?: return null

        if (absCarSignalCls.isInstance(iCar)) return iCar

        val tryNames = listOf("getICarSignal", "getCarSignal", "getAbsCarSignal", "getSignal")
        for (name in tryNames) {
            val c = runCatching { iCar.javaClass.getMethod(name).invoke(iCar) }.getOrNull()
            if (c != null && absCarSignalCls.isInstance(c)) return c
        }

        for (method in iCar.javaClass.methods) {
            if (method.parameterCount != 0) continue
            if (!absCarSignalCls.isAssignableFrom(method.returnType)) continue
            val c = runCatching { method.invoke(iCar) }.getOrNull() ?: continue
            return c
        }
        return null
    }

    fun setMode(mode: HudMode): Boolean {
        if (!_available.value) return false
        if (isSafeModeOn()) {
            Log.w(TAG, "安全模式开启，拦截 setMode(${mode.displayName})")
            return false
        }

        val ok1 = tryInvoke(profileTransferMgr, profileTransferMethod, mode.value)
        if (ok1) {
            _currentMode.value = mode
            Log.i(TAG, "切换到 ${mode.displayName} (Profile)")
            return true
        }
        val ok2 = tryInvoke(vfhudMgr, vfhudMethod, mode.value)
        if (ok2) {
            _currentMode.value = mode
            Log.i(TAG, "切换到 ${mode.displayName} (VFHUD)")
            return true
        }
        Log.w(TAG, "切换 ${mode.displayName} 失败")
        return false
    }

    /** 主动从硬件读当前 HUD 模式 */
    fun refreshCurrentMode(): HudMode? {
        val mgr = userProfileMgr ?: return null
        val getId = getCurrentIdMethod ?: return null
        val getData = getUserProfileDataMethod ?: return null
        val getValue = getProfileFuncValueMethod ?: return null

        return try {
            val userId = (getId.invoke(mgr) as? Number)?.toInt() ?: return null
            if (userId < 0) return null

            val profile = getData.invoke(mgr, userId) ?: return null

            containsProfileFuncIdMethod?.let { check ->
                val supported = check.invoke(profile, HUD_FUNC_ID, Int.MIN_VALUE) as? Boolean
                if (supported != true) return null
            }

            val rawValue = getValue.invoke(profile, HUD_FUNC_ID, Int.MIN_VALUE) as? Number
                ?: return null
            val mode = HudMode.fromValue(rawValue.toInt())
            if (mode != null) _currentMode.value = mode
            mode
        } catch (t: Throwable) {
            Log.w(TAG, "refreshCurrentMode 失败: ${t.message}")
            null
        }
    }

    private fun tryInvoke(obj: Any?, method: Method?, mode: Int): Boolean {
        if (obj == null || method == null) return false
        return try {
            val result = method.invoke(obj, mode)
            parseSuccess(result)
        } catch (t: Throwable) {
            Log.e(TAG, "${method.name} invoke 失败", t)
            false
        }
    }

    private fun parseSuccess(result: Any?): Boolean = when {
        result == null -> false
        result is Boolean -> result
        result is Number -> result.toInt() == 0
        result.toString() == "SUCCEED" -> true
        else -> runCatching {
            (result.javaClass.getField("V").get(result) as? Number)?.toInt() == 0
        }.getOrDefault(false)
    }

    private fun isSafeModeOn(): Boolean = runCatching {
        App.instance.settings.current.value.safeMode
    }.getOrDefault(true)

    companion object {
        private const val TAG = "EcarxVfhud"

        /** HUD 模式功能 ID —— 从小八 me.h() 字节码常量提取（0x0F006800） */
        const val HUD_FUNC_ID = 0x0F006800
    }
}
