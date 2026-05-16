package com.xyl.launcher.vehicle

data class VehicleState(
    val speed: Float? = null,
    val speedUnit: SpeedUnit = SpeedUnit.KMH,
    val rpm: Int? = null,
    val gear: Gear = Gear.UNKNOWN,
    val fuelPercent: Float? = null,
    val batteryPercent: Float? = null,
    val motorSpeedFront: Int? = null,
    val motorSpeedRear: Int? = null,
    val outerTempCelsius: Float? = null,
    val turnSignalLeft: Boolean = false,
    val turnSignalRight: Boolean = false,
) {
    companion object {
        val EMPTY = VehicleState()
    }
}
