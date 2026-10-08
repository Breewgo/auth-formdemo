import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ActivityIndicator, Text, View } from "react-native";
import RequireRole from "../../../components/RequireRole";
import { Button, Card, ErrorText, Screen, styles } from "../../../components/ui";
import { supabase } from "../../../lib/supabase";

function ItemTypeList() {
  const router = useRouter();
  const [types, setTypes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("item_types")
      .select("id, name, child_type_id, field_definitions(id, label, field_type, required, is_public, sort_order)")
      .order("name")
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setTypes(data);
      });
  }, []);

  const nameById = Object.fromEntries((types || []).map((t) => [t.id, t.name]));

  return (
    <Screen
      title="Item Types"
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="Back" variant="secondary" onPress={() => router.push("/admin")} />
          <Button title="+ New type" onPress={() => router.push("/admin/item-types/new")} />
        </View>
      }
    >
      <ErrorText>{error}</ErrorText>
      {!types && !error && <ActivityIndicator />}
      {types && types.length === 0 && <Text style={styles.muted}>No item types yet.</Text>}
      {types?.map((t) => {
        const fields = [...t.field_definitions].sort((a, b) => a.sort_order - b.sort_order);
        return (
          <Card key={t.id}>
            <Text style={{ fontSize: 17, fontWeight: "600" }}>{t.name}</Text>
            {t.child_type_id && (
              <Text style={styles.muted}>Contains: {nameById[t.child_type_id] || "—"}</Text>
            )}
            <View style={{ marginTop: 8 }}>
              {fields.map((f) => (
                <Text key={f.id} style={{ fontSize: 14, marginTop: 2 }}>
                  • {f.label} <Text style={styles.muted}>({f.field_type}
                  {f.required ? ", required" : ""}
                  {f.is_public ? ", public" : ", private"})</Text>
                </Text>
              ))}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

export default function ItemTypesPage() {
  return (
    <RequireRole role="admin">
      <ItemTypeList />
    </RequireRole>
  );
}
