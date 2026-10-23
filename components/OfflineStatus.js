import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { onOutboxChange, outboxItems, syncOutbox } from "../lib/offlineDb";
import { Button, Card, colors, styles } from "./ui";

// Shows whether the device is online and how many saved items are still
// waiting in the IndexedDB outbox. Renders nothing when online with an empty outbox.
export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => outboxItems().then(setQueued);
    const update = () => setOnline(navigator.onLine);
    update();
    refresh();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const unsubscribe = onOutboxChange(refresh);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      unsubscribe();
    };
  }, []);

  async function handleSync() {
    setSyncing(true);
    setMessage("");
    const { uploaded, failed } = await syncOutbox();
    setSyncing(false);
    if (failed) setMessage(`${failed} item${failed === 1 ? "" : "s"} couldn't be uploaded.`);
    else if (uploaded) setMessage(`Uploaded ${uploaded}.`);
    else setMessage("Still offline. Will retry when the signal is back.");
  }

  if (online && queued.length === 0) return null;

  const rejected = queued.filter((q) => q.last_error);

  return (
    <Card style={{ borderColor: online ? colors.border : "#e0a800", backgroundColor: online ? colors.card : "#fff8e1" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontWeight: "600" }}>{online ? "Online" : "Offline"}</Text>
          <Text style={styles.muted}>
            {queued.length === 0
              ? "You can keep registering items. They'll upload when the signal is back."
              : `${queued.length} item${queued.length === 1 ? "" : "s"} saved on this device, waiting to upload.`}
          </Text>
        </View>
        {queued.length > 0 && online && (
          <Button title={syncing ? "Uploading…" : "Upload now"} onPress={handleSync} disabled={syncing} />
        )}
      </View>
      {rejected.map((q) => (
        <Text key={q.id} style={{ color: colors.error, fontSize: 13, marginTop: 6 }}>
          #{q.id.slice(0, 8)}: {q.last_error}
        </Text>
      ))}
      {message ? <Text style={[styles.muted, { marginTop: 6 }]}>{message}</Text> : null}
    </Card>
  );
}
