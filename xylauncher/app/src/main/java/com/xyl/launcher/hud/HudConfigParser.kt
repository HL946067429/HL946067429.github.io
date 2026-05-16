package com.xyl.launcher.hud

import org.json.JSONArray
import org.json.JSONObject

object HudConfigParser {

    fun toJson(config: HudConfig): String {
        val arr = JSONArray()
        config.elements.forEach { e ->
            arr.put(JSONObject().apply {
                put("id", e.id)
                put("name", e.name)
                put("type", e.type.name)
                put("dataSource", e.dataSource)
                put("text", e.staticText)
                put("x", e.x.toDouble())
                put("y", e.y.toDouble())
                put("width", e.width.toDouble())
                put("height", e.height.toDouble())
                put("textSize", e.textSize)
                put("textColor", e.textColor)
                put("textBold", e.textBold)
                put("iconScale", e.iconScale.toDouble())
                put("horizontalAlignment", e.horizontalAlign.name)
                put("verticalAlignment", e.verticalAlign.name)
                put("visible", e.visible)
                put("alpha", e.alpha.toDouble())
            })
        }
        return JSONObject().apply {
            put("version", config.version)
            put("autoStartHud", config.autoStartHud)
            put("snowMode", config.snowMode)
            put("elements", arr)
        }.toString()
    }


    fun parse(json: String): HudConfig {
        val root = JSONObject(json)
        val arr = root.optJSONArray("elements") ?: return HudConfig()
        val elements = (0 until arr.length()).map { i ->
            val e = arr.getJSONObject(i)
            HudElement(
                id = e.optString("id"),
                name = e.optString("name"),
                type = parseType(e.optString("type")),
                dataSource = e.optString("dataSource"),
                staticText = e.optString("text", ""),
                x = e.optDouble("x", 0.0).toFloat(),
                y = e.optDouble("y", 0.0).toFloat(),
                width = e.optDouble("width", 0.1).toFloat(),
                height = e.optDouble("height", 0.05).toFloat(),
                textSize = e.optInt("textSize", 24),
                textColor = e.optInt("textColor", -1),
                textBold = e.optBoolean("textBold", false),
                iconScale = e.optDouble("iconScale", 1.0).toFloat(),
                horizontalAlign = parseAlign(e.optString("horizontalAlignment", "CENTER")),
                verticalAlign = parseAlign(e.optString("verticalAlignment", "CENTER")),
                visible = e.optBoolean("visible", true),
                alpha = e.optDouble("alpha", 1.0).toFloat(),
            )
        }
        return HudConfig(
            version = root.optInt("version", 2),
            elements = elements,
            autoStartHud = root.optBoolean("autoStartHud", false),
            snowMode = root.optBoolean("snowMode", false),
        )
    }

    private fun parseType(s: String): HudElementType = when (s.uppercase()) {
        "TEXT" -> HudElementType.TEXT
        "ICON" -> HudElementType.ICON
        "IMAGE" -> HudElementType.IMAGE
        "CUSTOM_VIEW" -> HudElementType.CUSTOM_VIEW
        else -> HudElementType.UNKNOWN
    }

    private fun parseAlign(s: String): Align = when (s.uppercase()) {
        "LEFT" -> Align.LEFT
        "RIGHT" -> Align.RIGHT
        "TOP" -> Align.TOP
        "BOTTOM" -> Align.BOTTOM
        else -> Align.CENTER
    }
}
