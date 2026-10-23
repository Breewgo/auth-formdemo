import React, { useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, styles } from "./ui";

// Camera QR scanner. From the team demo (github.com/Optivat/nextjstest,
// components/QRScanner.js), changed to hand the scanned text to `onScan`
// instead of alerting it, and to use the app's buttons.
//
// The barCode* prop spellings are the ones expo-camera 15's *web* camera reads,
// so keep them as they are.
//
// Phones only allow the camera on a secure page: https://, or localhost on the
// same machine. Over plain http on your LAN the permission prompt never appears.
export default function QRScanner({ onScan, paused }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");

  if (!permission) {
    return <Text style={styles.muted}>Checking camera permission…</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={styles.muted}>The camera is needed to scan QR codes.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ borderRadius: 8, overflow: "hidden", backgroundColor: "#000" }}>
        <CameraView
          facing={facing}
          type={facing}
          style={{ width: "100%", height: 360 }}
          barCodeScannerSettings={{ barCodeTypes: ["qr"] }}
          onBarCodeScanned={paused ? undefined : ({ nativeEvent: { data } }) => onScan(data)}
        />
      </View>
      <Button
        title="Flip camera"
        variant="secondary"
        onPress={() => setFacing(facing === "back" ? "front" : "back")}
      />
    </View>
  );
}
