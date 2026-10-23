#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'Packaging an iOS device app requires the macOS build runner.' >&2
  exit 1
fi

build_root="$(mktemp -d "${TMPDIR:-/tmp}/traceability-ios.XXXXXX")"
info_plist='ios/App/App/Info.plist'
icon_dir='ios/App/App/Assets.xcassets/AppIcon.appiconset'
test -f "$info_plist"
test -d ios/App/App.xcodeproj

camera_description='Scan QR codes using the camera.'
if /usr/libexec/PlistBuddy -c 'Print :NSCameraUsageDescription' "$info_plist" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription $camera_description" "$info_plist"
else
  /usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string $camera_description" "$info_plist"
fi

# JPEG conversion flattens transparency before creating the iOS app icon.
sips -s format jpeg public/icon-512x512.png --out "$build_root/icon.jpg" >/dev/null
sips -s format png -z 1024 1024 "$build_root/icon.jpg" --out "$icon_dir/AppIcon.png" >/dev/null
cat > "$icon_dir/Contents.json" <<'JSON'
{
  "images": [
    {
      "filename": "AppIcon.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": { "author": "xcode", "version": 1 }
}
JSON

plutil -lint "$info_plist"
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$build_root/DerivedData" \
  -clonedSourcePackagesDirPath "$build_root/SourcePackages" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  build

app_bundle="$build_root/DerivedData/Build/Products/Release-iphoneos/App.app"
test -d "$app_bundle"
test -f "$app_bundle/public/index.html"
xcrun lipo -archs "$app_bundle/App"

mkdir -p "$build_root/Payload" artifacts
ditto "$app_bundle" "$build_root/Payload/App.app"
ditto -c -k --keepParent "$build_root/Payload" "$repo_root/artifacts/Traceability-unsigned.ipa"
unzip -tq artifacts/Traceability-unsigned.ipa
shasum -a 256 artifacts/Traceability-unsigned.ipa
