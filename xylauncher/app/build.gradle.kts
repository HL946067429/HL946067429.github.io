plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.xyl.launcher"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.xyl.launcher"
        minSdk = 28
        targetSdk = 33
        versionCode = 1
        versionName = "0.1.0"
    }

    signingConfigs {
        create("release") {
            val ksFile = file("${rootDir}/xyl-release.keystore")
            val ksProps = file("${rootDir}/keystore.properties")
            if (ksFile.exists() && ksProps.exists()) {
                val props = java.util.Properties().apply { ksProps.inputStream().use { load(it) } }
                storeFile = ksFile
                storePassword = props.getProperty("storePassword")
                keyAlias = props.getProperty("keyAlias")
                keyPassword = props.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // 不要开 minify —— ECARX 反射调用一旦被 R8 重命名会全部挂掉
            isMinifyEnabled = false
            isShrinkResources = false
            // keystore.properties 配齐时用 release 签名；否则回落 debug 签名（CI / 没配 keystore 也能跑）
            val rel = signingConfigs.getByName("release")
            signingConfig = if (rel.storeFile?.exists() == true && !rel.storePassword.isNullOrEmpty())
                rel else signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    lint {
        // 整个项目就是靠反射跟 ECARX / @SystemApi 打交道，BlockedPrivateApi 这类
        // 提示不该中断打包。release 也不要 abort。
        abortOnError = false
        checkReleaseBuilds = false
        disable += setOf("BlockedPrivateApi", "PrivateApi", "SoonBlockedPrivateApi")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")

    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
