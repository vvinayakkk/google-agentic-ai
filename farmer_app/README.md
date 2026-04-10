# farmer_app

Flutter mobile app for the Google Agentic AI stack.

## APK setup (real phone on Wi-Fi, no adb reverse)

The app uses Android LAN mode by default and currently points to:

- Host IP: `192.168.0.103`
- Base URL on Android: `http://192.168.0.103:8000`

If your PC IP changes, update it before building.

## Check your current IP (Windows)

Run:

```powershell
ipconfig
```

Use the `IPv4 Address` under your active `Wi-Fi` adapter.

## Where to replace IP in code

File:

- `lib/core/network/api_client.dart`

Constants:

- `ANDROID_NETWORK_MODE` default should be `lan`
- `ANDROID_LAN_HOST` default should be your current Wi-Fi IPv4

## Build APK

From `farmer_app` folder:

```powershell
flutter clean
flutter pub get
flutter build apk --release
```

Optional explicit build (recommended if you do not want to edit defaults):

```powershell
flutter build apk --release --dart-define=ANDROID_NETWORK_MODE=lan --dart-define=ANDROID_LAN_HOST=192.168.0.103
```

APK output path:

- `build/app/outputs/flutter-apk/app-release.apk`

## Important

- Phone and backend host machine must be on the same Wi-Fi network.
- Backend server must be running and reachable on port `8000`.
- If your IP changes, rebuild APK with updated host/IP.
