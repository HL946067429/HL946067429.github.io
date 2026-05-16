package com.xyl.launcher.weather

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class WeatherState(
    val available: Boolean = false,
    val tempCelsius: Int? = null,
    val feelsLikeCelsius: Int? = null,
    val condition: String = "",
    val location: String = "",
    val humidity: Int? = null,
    val windKph: Int? = null,
    val updateTimeMs: Long = 0,
) {
    companion object { val EMPTY = WeatherState() }
}

/**
 * 天气 Repository —— 用 wttr.in 公共 API（免 API key）。
 *
 * 接入 `https://wttr.in/?format=j1` 返回 JSON。
 * 缺点：定位是基于 IP，国内可能不准；
 * 优点：免 key 免注册，骨架完美。
 *
 * 生产用：换成和风天气 / 心知天气 + API key + 位置。
 */
class WeatherRepository(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _state = MutableStateFlow(WeatherState.EMPTY)
    val state: StateFlow<WeatherState> = _state.asStateFlow()

    fun start() {
        scope.launch {
            while (true) {
                fetchOnce()
                delay(30 * 60 * 1000L)  // 30 分钟
            }
        }
    }

    fun refresh() = scope.launch { fetchOnce() }

    private suspend fun fetchOnce() = withContext(Dispatchers.IO) {
        try {
            val url = URL("https://wttr.in/?format=j1&lang=zh")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)

            val current = json.getJSONArray("current_condition").getJSONObject(0)
            val area = json.getJSONArray("nearest_area").getJSONObject(0)

            _state.value = WeatherState(
                available = true,
                tempCelsius = current.optString("temp_C").toIntOrNull(),
                feelsLikeCelsius = current.optString("FeelsLikeC").toIntOrNull(),
                condition = current.getJSONArray("lang_zh").optJSONObject(0)
                    ?.optString("value") ?: current.optString("weatherDesc"),
                location = area.getJSONArray("areaName").getJSONObject(0).optString("value")
                    + ", " + area.getJSONArray("country").getJSONObject(0).optString("value"),
                humidity = current.optString("humidity").toIntOrNull(),
                windKph = current.optString("windspeedKmph").toIntOrNull(),
                updateTimeMs = System.currentTimeMillis(),
            )
            Log.i(TAG, "天气更新成功: ${_state.value.tempCelsius}℃ ${_state.value.condition}")
        } catch (t: Throwable) {
            Log.w(TAG, "天气拉取失败: ${t.message}")
        }
    }

    companion object {
        private const val TAG = "Weather"
    }
}
