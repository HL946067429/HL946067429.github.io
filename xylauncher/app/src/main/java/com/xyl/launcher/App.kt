package com.xyl.launcher

import android.app.Application
import com.xyl.launcher.apps.AppRepository
import com.xyl.launcher.dashcam.DashCamRepository
import com.xyl.launcher.hud.HudRepository
import com.xyl.launcher.media.MediaRepository
import com.xyl.launcher.settings.AppSettings
import com.xyl.launcher.vehicle.VehicleRepository
import com.xyl.launcher.vehicle.hud.HudModeRepository
import com.xyl.launcher.vehicle.hvac.HvacRepository
import com.xyl.launcher.vehicle.drivemode.DriveModeRepository
import com.xyl.launcher.vehicle.fuel.FuelConsumptionRepository
import com.xyl.launcher.vehicle.seatmemory.SeatMemoryRepository
import com.xyl.launcher.vehicle.tire.TirePressureRepository
import com.xyl.launcher.weather.WeatherRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class App : Application() {

    lateinit var settings: AppSettings; private set
    lateinit var vehicleRepository: VehicleRepository; private set
    lateinit var hvacRepository: HvacRepository; private set
    lateinit var mediaRepository: MediaRepository; private set
    lateinit var appRepository: AppRepository; private set
    lateinit var dashCamRepository: DashCamRepository; private set
    lateinit var hudRepository: HudRepository; private set
    lateinit var hudModeRepository: HudModeRepository; private set
    lateinit var tireRepository: TirePressureRepository; private set
    lateinit var fuelRepository: FuelConsumptionRepository; private set
    lateinit var driveModeRepository: DriveModeRepository; private set
    lateinit var seatMemoryRepository: SeatMemoryRepository; private set
    lateinit var weatherRepository: WeatherRepository; private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        settings = AppSettings(applicationContext)
        vehicleRepository = VehicleRepository(applicationContext).also { it.start() }
        hvacRepository = HvacRepository(applicationContext).also { it.start() }
        mediaRepository = MediaRepository(applicationContext)
        appRepository = AppRepository(applicationContext)
        dashCamRepository = DashCamRepository(applicationContext, settings).also { it.start() }
        hudRepository = HudRepository(applicationContext).also { it.load() }
        hudModeRepository = HudModeRepository(applicationContext)
        tireRepository = TirePressureRepository(applicationContext)
        fuelRepository = FuelConsumptionRepository(applicationContext)
        driveModeRepository = DriveModeRepository(applicationContext)
        seatMemoryRepository = SeatMemoryRepository(applicationContext)
        weatherRepository = WeatherRepository(applicationContext).also { it.start() }

        // 把 ECARX ICar 实例自动接通到下游模块
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        scope.launch {
            vehicleRepository.carInstance.collect { car ->
                hudModeRepository.bind(car)
                tireRepository.start(car)
                fuelRepository.start(car)
                driveModeRepository.bind(car)
                seatMemoryRepository.bind(car)
            }
        }
    }

    companion object {
        lateinit var instance: App
            private set
    }
}
