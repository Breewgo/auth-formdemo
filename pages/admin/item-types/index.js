import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ActivityIndicator, Text, View } from "react-native";
import RequireRole from "../../../components/RequireRole";
import { Button, Card, ErrorText, Screen, colors, styles } from "../../../components/ui";
import { supabase } from "../../../lib/supabase";

function ItemTypeList() {
  const router = useRouter();
  const [types, setTypes] = useState(null);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteErrors, setDeleteErrors] = useState({});

  function load() {
    supabase
      .from("item_types")
      .select("id, name, child_type_id, field_definitions(id, label, field_type, required, is_public, sort_order), items(count)")
      .order("name")
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setTypes(data);
      });
  }

  useEffect(load, []);

  // Field definitions are removed with the type (on delete cascade); types that
  // contained it have child_type_id cleared. Items block the delete (on delete restrict).
  async function handleDelete(t) {
    setDeletingId(t.id);
    setDeleteErrors((errs) => ({ ...errs, [t.id]: "" }));
    const { data, error: e } = await supabase.from("item_types").delete().eq("id", t.id).select("id");
    setDeletingId(null);
    setConfirmingId(null);
    let message = "";
    if (e) {
      message = e.code === "23503"
        ? `Can't delete ${t.name}: items of this type are already registered.`
        : e.message;
    } else if (!data || data.length === 0) {
      message = "Nothing was deleted. You may not have permission.";
    }
    if (message) setDeleteErrors((errs) => ({ ...errs, [t.id]: message }));
    else load();
  }

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
        const itemCount = t.items?.[0]?.count ?? 0;
        const confirming = confirmingId === t.id;
        return (
          <Card key={t.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", flexShrink: 1 }}>{t.name}</Text>
              {!confirming && (
                <Button title="Delete" variant="secondary" onPress={() => setConfirmingId(t.id)} />
              )}
            </View>
            {confirming && (
              <View style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "#fdecea" }}>
                <Text style={{ color: colors.error, marginBottom: 8 }}>
                  {itemCount > 0
                    ? `${itemCount} item${itemCount === 1 ? " is" : "s are"} registered as ${t.name}, so it can't be deleted. Delete those first under View registered.`
                    : `Delete ${t.name} and its ${fields.length} field${fields.length === 1 ? "" : "s"}? This can't be undone.`}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button title="Cancel" variant="secondary" onPress={() => setConfirmingId(null)} />
                  {itemCount === 0 && (
                    <Button
                      title={deletingId === t.id ? "Deleting…" : "Yes, delete"}
                      disabled={deletingId === t.id}
                      onPress={() => handleDelete(t)}
                    />
                  )}
                </View>
              </View>
            )}
            <ErrorText>{deleteErrors[t.id]}</ErrorText>
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
            <Button
              title={`View registered (${itemCount})`}
              variant="secondary"
              onPress={() => router.push(`/admin/item-types/${t.id}`)}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            />
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
