import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ActivityIndicator, Text, View } from "react-native";
import DynamicForm from "../../../../components/DynamicForm";
import RequireRole from "../../../../components/RequireRole";
import { Button, Card, ErrorText, Screen, colors, styles } from "../../../../components/ui";
import { supabase } from "../../../../lib/supabase";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// All items registered under one item type; admins can edit or delete each.
function RegisteredItems({ typeId }) {
  const router = useRouter();
  const [type, setType] = useState(null);
  const [fields, setFields] = useState([]);
  const [items, setItems] = useState(null);
  const [names, setNames] = useState({});
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [itemErrors, setItemErrors] = useState({});

  async function load() {
    const [typeRes, fieldRes, itemRes, profileRes] = await Promise.all([
      supabase.from("item_types").select("id, name").eq("id", typeId).single(),
      supabase.from("field_definitions").select("key, label").eq("item_type_id", typeId).order("sort_order"),
      supabase.from("items").select("*").eq("item_type_id", typeId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);
    const firstError = [typeRes, fieldRes, itemRes, profileRes].find((r) => r.error)?.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }
    setType(typeRes.data);
    setFields(fieldRes.data);
    setItems(itemRes.data);
    setNames(Object.fromEntries(profileRes.data.map((p) => [p.id, p.full_name])));
  }

  useEffect(() => {
    load();
  }, [typeId]);

  const setItemError = (id, msg) => setItemErrors((errs) => ({ ...errs, [id]: msg }));

  async function saveEdit(payload) {
    const { data, error: e } = await supabase
      .from("items")
      .update({ data: payload.data })
      .eq("id", payload.id)
      .select("*");
    if (e) throw e;
    if (!data?.length) throw new Error("Nothing was saved. You may not have permission.");
    setItems((list) => list.map((it) => (it.id === payload.id ? data[0] : it)));
    setEditingId(null);
  }

  async function handleDelete(item) {
    setDeletingId(item.id);
    setItemError(item.id, "");
    const { data, error: e } = await supabase.from("items").delete().eq("id", item.id).select("id");
    setDeletingId(null);
    setConfirmingId(null);
    if (e) setItemError(item.id, e.message);
    else if (!data?.length) setItemError(item.id, "Nothing was deleted. You may not have permission.");
    else setItems((list) => list.filter((it) => it.id !== item.id));
  }

  // Show values for current fields first, then any leftover keys from older versions of the type.
  function rows(item) {
    const known = fields.map((f) => [f.label, item.data?.[f.key]]);
    const extra = Object.keys(item.data || {})
      .filter((k) => !fields.some((f) => f.key === k))
      .map((k) => [k, item.data[k]]);
    return [...known, ...extra];
  }

  return (
    <Screen
      title={type ? `Registered: ${type.name}` : "Registered items"}
      right={<Button title="Back" variant="secondary" onPress={() => router.push("/admin/item-types")} />}
    >
      <ErrorText>{error}</ErrorText>
      {!items && !error && <ActivityIndicator />}
      {items && items.length === 0 && (
        <Text style={styles.muted}>Nothing has been registered as {type?.name} yet.</Text>
      )}
      {items && items.length > 0 && (
        <Text style={[styles.muted, { marginBottom: 8 }]}>
          {items.length} item{items.length === 1 ? "" : "s"}
        </Text>
      )}

      {items?.map((item) => {
        const editing = editingId === item.id;
        const confirming = confirmingId === item.id;
        return (
          <Card key={item.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ fontWeight: "600" }}>{formatDate(item.created_at)}</Text>
                <Text style={[styles.muted, { fontSize: 12 }]}>
                  by {names[item.created_by] || "unknown"} · #{item.id.slice(0, 8)}
                </Text>
              </View>
              {!editing && !confirming && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button title="Edit" variant="secondary" onPress={() => setEditingId(item.id)} />
                  <Button title="Delete" variant="secondary" onPress={() => setConfirmingId(item.id)} />
                </View>
              )}
            </View>

            {editing ? (
              <DynamicForm
                itemTypeId={typeId}
                item={item}
                onSubmit={saveEdit}
                onCancel={() => setEditingId(null)}
                submitLabel="Save changes"
              />
            ) : (
              <View style={{ marginTop: 8 }}>
                {rows(item).map(([label, value]) => (
                  <Text key={label} style={{ fontSize: 14, marginTop: 2 }}>
                    <Text style={styles.muted}>{label}: </Text>
                    {value === undefined || value === "" ? "—" : String(value)}
                  </Text>
                ))}
              </View>
            )}

            {confirming && (
              <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: "#fdecea" }}>
                <Text style={{ color: colors.error, marginBottom: 8 }}>
                  Delete this {type?.name}? This can't be undone.
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button title="Cancel" variant="secondary" onPress={() => setConfirmingId(null)} />
                  <Button
                    title={deletingId === item.id ? "Deleting…" : "Yes, delete"}
                    disabled={deletingId === item.id}
                    onPress={() => handleDelete(item)}
                  />
                </View>
              </View>
            )}
            <ErrorText>{itemErrors[item.id]}</ErrorText>
          </Card>
        );
      })}
    </Screen>
  );
}

export default function RegisteredItemsPage() {
  const router = useRouter();
  const { id } = router.query;
  return (
    <RequireRole role="admin">
      {id ? <RegisteredItems typeId={id} /> : <ActivityIndicator />}
    </RequireRole>
  );
}
