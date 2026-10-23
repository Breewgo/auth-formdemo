import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ActivityIndicator, Text, View } from "react-native";
import OfflineStatus from "../components/OfflineStatus";
import RequireRole from "../components/RequireRole";
import { Button, Card, ErrorText, Input, Label, Screen, colors, styles } from "../components/ui";
import { cachedQuery, outboxItem } from "../lib/offlineDb";
import { supabase } from "../lib/supabase";

// The camera only exists in the browser, so never render the scanner on the server.
const QRScanner = dynamic(() => import("../components/QRScanner"), { ssr: false });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Item QR codes (components/ItemQR.js) hold just the item's id, so a scan is one lookup.
// Checks the device's outbox first (items registered offline that haven't uploaded yet),
// then the database, falling back to the IndexedDB cache when offline.
async function lookUp(code) {
  const id = code.trim();
  if (!UUID.test(id)) return { error: `This QR code isn't an item code: "${id}"` };

  let item = await outboxItem(id);
  const pending = Boolean(item);
  if (!item) {
    const res = await cachedQuery(`item:${id}`, () =>
      supabase.from("items").select("id, item_type_id, data, created_at").eq("id", id).maybeSingle()
    );
    if (res.error) return { error: res.error.message || "Couldn't look up this item while offline." };
    item = res.data;
  }
  if (!item) return { error: "No item has this code (or it belongs to another company)." };

  const [typesRes, fieldsRes] = await Promise.all([
    cachedQuery("item_types", () => supabase.from("item_types").select("id, name").order("name")),
    cachedQuery(`fields:${item.item_type_id}`, () =>
      supabase
        .from("field_definitions")
        .select("key, label, field_type, options, required, is_public")
        .eq("item_type_id", item.item_type_id)
        .order("sort_order")
    ),
  ]);
  const type = typesRes.data?.find((t) => t.id === item.item_type_id);
  return { item, pending, typeName: type?.name || "Item", fields: fieldsRes.data || [] };
}

function rows(item, fields) {
  const known = fields.map((f) => [f.label, item.data?.[f.key]]);
  const extra = Object.keys(item.data || {})
    .filter((k) => !fields.some((f) => f.key === k))
    .map((k) => [k, item.data[k]]);
  return [...known, ...extra];
}

function Scan({ profile }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState("");

  async function handleScan(code) {
    if (busy || result) return;
    setBusy(true);
    setResult(await lookUp(code));
    setBusy(false);
  }

  function reset() {
    setResult(null);
    setManual("");
  }

  const home = profile.role === "admin" ? "/admin" : "/form-demo";

  return (
    <Screen title="Scan QR" right={<Button title="Back" variant="secondary" onPress={() => router.push(home)} />}>
      <OfflineStatus />

      {!result && (
        <Card>
          <QRScanner onScan={handleScan} paused={busy} />
          {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
          <Label>Or type the code</Label>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input value={manual} onChangeText={setManual} placeholder="Item id" autoCapitalize="none" />
            </View>
            <Button title="Look up" onPress={() => handleScan(manual)} disabled={!manual.trim() || busy} />
          </View>
        </Card>
      )}

      {result?.error && (
        <Card>
          <ErrorText>{result.error}</ErrorText>
          <Button title="Scan again" onPress={reset} style={{ marginTop: 12 }} />
        </Card>
      )}

      {result?.item && (
        <Card style={{ borderColor: colors.primary }}>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>{result.typeName}</Text>
          <Text style={[styles.muted, { fontSize: 12 }]}>
            #{result.item.id.slice(0, 8)}
            {result.item.created_at && ` · ${new Date(result.item.created_at).toLocaleString()}`}
          </Text>
          {result.pending && (
            <Text style={{ color: "#8a6d00", marginTop: 6 }}>Saved on this device, not uploaded yet.</Text>
          )}
          <View style={{ marginTop: 8 }}>
            {rows(result.item, result.fields).map(([label, value]) => (
              <Text key={label} style={{ fontSize: 15, marginTop: 4 }}>
                <Text style={styles.muted}>{label}: </Text>
                {value === undefined || value === "" ? "—" : String(value)}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <Button title="Scan again" onPress={reset} />
            {profile.role === "admin" && !result.pending && (
              <Button
                title={`All ${result.typeName} items`}
                variant="secondary"
                onPress={() => router.push(`/admin/item-types/${result.item.item_type_id}`)}
              />
            )}
          </View>
        </Card>
      )}
    </Screen>
  );
}

export default function ScanPage() {
  return <RequireRole>{(ctx) => <Scan {...ctx} />}</RequireRole>;
}
