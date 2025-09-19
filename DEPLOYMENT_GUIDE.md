# React Native Expo App Deployment Guide

## Overview
This guide explains how to deploy your React Native Expo app to Android devices without using EAS Build (Expo's paid service).

## Prerequisites

### Required Software
1. **Node.js** (v18 or higher)
2. **Android Studio** (latest version)
3. **Java Development Kit (JDK)** 17 or higher
4. **Git** (to clone your repository)

### Android Studio Setup
1. Download and install Android Studio from https://developer.android.com/studio
2. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform-Tools
   - Android Virtual Device (AVD)
3. Open Android Studio and go to SDK Manager
4. Install the latest Android SDK Platform (API 34 recommended)
5. Install Android SDK Build-Tools

### Environment Variables
Add these to your system PATH:
- `ANDROID_HOME` = path to Android SDK (usually `~/Android/Sdk` on Mac/Linux or `%LOCALAPPDATA%\Android\Sdk` on Windows)
- Add `$ANDROID_HOME/platform-tools` to PATH
- Add `$ANDROID_HOME/tools` to PATH

## Deployment Methods

### Method 1: Expo Development Build (Recommended)

1. **Clone your repository:**
   ```bash
   git clone [your-repo-url]
   cd [your-project-folder]
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Install Expo CLI:**
   ```bash
   npm install -g @expo/cli
   ```

4. **Create development build:**
   ```bash
   npx expo install expo-dev-client
   npx expo run:android
   ```
   This will:
   - Generate Android native code
   - Build the APK
   - Install it on connected device/emulator

### Method 2: Ejecting to React Native CLI

1. **Eject from Expo:**
   ```bash
   npx expo eject
   ```
   Choose "React Native CLI" when prompted

2. **Install React Native CLI:**
   ```bash
   npm install -g @react-native-community/cli
   ```

3. **Build for Android:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   APK will be generated at: `android/app/build/outputs/apk/release/app-release.apk`

### Method 3: Using Expo Application Services (EAS) - Free Tier

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS:**
   ```bash
   eas build:configure
   ```

4. **Build APK:**
   ```bash
   eas build --platform android --profile preview
   ```
   Note: Free tier has build limits but should work for testing

## Common Issues and Solutions

### Missing Dependencies
If you get dependency errors:
```bash
npx expo install --fix
```

### Android SDK Issues
1. Open Android Studio
2. Go to Tools > SDK Manager
3. Install missing SDK components
4. Restart terminal/IDE

### Gradle Build Failures
1. Clean build:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

2. If still failing, delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Metro Bundle Issues
```bash
npx expo start --clear
```

## Testing on Device

### Physical Android Device
1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run `adb devices` to verify connection
5. Run your build command

### Android Emulator
1. Open Android Studio
2. Go to Tools > AVD Manager
3. Create new virtual device
4. Start emulator
5. Run your build command

## File Structure After Ejection
```
your-project/
├── android/          # Native Android code
├── ios/             # Native iOS code (if needed)
├── app/             # Your React Native code
├── assets/          # Static assets
├── package.json     # Dependencies
└── app.json         # Expo configuration
```

## Important Notes

1. **Expo Go Limitations:** Your app uses custom native code, so it won't work with Expo Go app
2. **Development vs Production:** Use development builds for testing, release builds for distribution
3. **Signing:** For Play Store, you'll need to generate a signing key
4. **Permissions:** Make sure all required permissions are in `app.json`

## Troubleshooting Commands

```bash
# Check Expo CLI version
expx expo --version

# Check Android setup
adb devices

# Clear Metro cache
npx expo start --clear

# Reset project
npx expo install --fix

# Check Java version
java -version

# Check Android SDK
echo $ANDROID_HOME
```

## Alternative: Direct APK Generation

If you just want an APK file without all the setup:

1. Use GitHub Actions or similar CI/CD
2. Set up automated builds that generate APK files
3. Download APK from build artifacts

This requires setting up CI/CD pipeline but eliminates local environment issues.

---

**Bottom Line:** The complexity comes from React Native requiring native Android toolchain. Expo Go was the simple solution, but custom native code (like your OBD functionality) requires full Android development setup.