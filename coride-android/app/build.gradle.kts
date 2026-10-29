plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.example.coride"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.coride"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation(libs.appcompat)
    implementation(libs.material)
    implementation(libs.constraintlayout)
    implementation(libs.recyclerview)
    
    implementation(libs.room.runtime)
    annotationProcessor(libs.room.compiler)
    
    implementation(libs.lifecycle.viewmodel)
    implementation(libs.lifecycle.livedata)
    
    implementation(libs.navigation.fragment)
    implementation(libs.navigation.ui)
    
    implementation(libs.camera.core)
    implementation(libs.camera.camera2)
    implementation(libs.camera.lifecycle)
    implementation(libs.camera.view)
    
    implementation(libs.barcode.scanning)
    
    testImplementation(libs.junit)
    androidTestImplementation(libs.test.ext.junit)
    androidTestImplementation(libs.test.espresso)
}
