package com.xyl.launcher.vehicle.tire

data class TireData(
    val pressureKpa: Float? = null,
    val tempCelsius: Float? = null,
)

data class TirePressureState(
    val frontLeft: TireData = TireData(),
    val frontRight: TireData = TireData(),
    val rearLeft: TireData = TireData(),
    val rearRight: TireData = TireData(),
    val updateTimeMs: Long = 0,
) {
    /** 整体状态：正常 / 异常（任一胎气压超出 [200, 280] kPa） */
    val isAbnormal: Boolean
        get() = listOfNotNull(
            frontLeft.pressureKpa, frontRight.pressureKpa,
            rearLeft.pressureKpa, rearRight.pressureKpa,
        ).any { it < 200f || it > 280f }

    val available: Boolean
        get() = listOf(frontLeft, frontRight, rearLeft, rearRight)
            .any { it.pressureKpa != null }

    companion object {
        val EMPTY = TirePressureState()
    }
}
