import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Pressable, Switch, Text, View } from "react-native";
import RequireRole from "../../../components/RequireRole";
import { Button, Card, Choice, ErrorText, Input, Label, Screen, colors, styles } from "../../../components/ui";
import { parseOptions, toKey, validateItemType } from "../../../lib/fields";
import { supabase } from "../../../lib/supabase";

const FIELD_TYPES = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Date", value: "date" },
  { label: "Dropdown", value: "select" },
];

let nextLocalId = 1;
function blankField() {
  return { localId: nextLocalId++, label: "", field_type: "text", optionsText: "", required: false, is_public: false };
}

function FieldEditor({ field, index, count, error, onChange, onRemove, onMove }) {
  const set = (patch) => onChange({ ...field, ...patch });
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "600" }}>Field {index + 1}</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {index > 0 && <Pressable onPress={() => onMove(-1)}><Text style={styles.muted}>↑</Text></Pressable>}
          {index < count - 1 && <Pressable onPress={() => onMove(1)}><Text style={styles.muted}>↓</Text></Pressable>}
          <Pressable onPress={onRemove} accessibilityLabel="Remove field">
            <Text style={{ color: colors.error, fontWeight: "700" }}>✕</Text>
          </Pressable>
        </View>
      </View>

      <Label>Label</Label>
      <Input value={field.label} onChangeText={(label) => set({ label })} placeholder="e.g. Harvest Date" />
      {field.label.trim() !== "" && <Text style={[styles.muted, { fontSize: 12 }]}>key: {toKey(field.label)}</Text>}

      <Label>Type</Label>
      <Choice options={FIELD_TYPES} value={field.field_type} onChange={(field_type) => set({ field_type })} />

      {field.field_type === "select" && (
        <>
          <Label>Options (comma-separated)</Label>
          <Input
            value={field.optionsText}
            onChangeText={(optionsText) => set({ optionsText })}
            placeholder="Wonderful, Granada, Parfianka"
          />
        </>
      )}

      <View style={{ flexDirection: "row", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Switch value={field.required} onValueChange={(required) => set({ required })} />
          <Text>Required</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Switch value={field.is_public} onValueChange={(is_public) => set({ is_public })} />
          <Text>{field.is_public ? "Public (consumers see it)" : "Private"}</Text>
        </View>
      </View>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function NewItemTypeForm({ profile }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [childTypeId, setChildTypeId] = useState(null);
  const [fields, setFields] = useState([blankField()]);
  const [existingTypes, setExistingTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("item_types").select("id, name").order("name")
      .then(({ data }) => setExistingTypes(data || []));
  }, []);

  const updateField = (i, f) => setFields((fs) => fs.map((x, j) => (j === i ? f : x)));
  const removeField = (i) => setFields((fs) => fs.filter((_, j) => j !== i));
  const moveField = (i, dir) =>
    setFields((fs) => {
      const copy = [...fs];
      [copy[i], copy[i + dir]] = [copy[i + dir], copy[i]];
      return copy;
    });

  async function handleSubmit() {
    const errs = validateItemType(name, fields);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const { data: type, error: typeErr } = await supabase
      .from("item_types")
      .insert({ company_id: profile.company_id, name: name.trim(), child_type_id: childTypeId })
      .select("id")
      .single();
    if (typeErr) {
      setSaving(false);
      setErrors({ form: typeErr.code === "23505" ? "An item type with that name already exists." : typeErr.message });
      return;
    }

    const rows = fields.map((f, i) => ({
      item_type_id: type.id,
      key: toKey(f.label),
      label: f.label.trim(),
      field_type: f.field_type,
      options: f.field_type === "select" ? parseOptions(f.optionsText) : [],
      required: f.required,
      is_public: f.is_public,
      sort_order: i,
    }));
    const { error: fieldErr } = await supabase.from("field_definitions").insert(rows);
    if (fieldErr) {
      // Don't leave a type with no fields behind.
      await supabase.from("item_types").delete().eq("id", type.id);
      setSaving(false);
      setErrors({ form: fieldErr.message });
      return;
    }
    router.push("/admin/item-types");
  }

  return (
    <Screen title="New Item Type">
      <Card>
        <Label>Type name</Label>
        <Input value={name} onChangeText={setName} placeholder="e.g. Juice Batch" />
        <ErrorText>{errors.name}</ErrorText>

        <Label>Contains (sub-item type scanned into it)</Label>
        <Choice
          options={[{ label: "None", value: null }, ...existingTypes.map((t) => ({ label: t.name, value: t.id }))]}
          value={childTypeId}
          onChange={setChildTypeId}
        />
      </Card>

      <Text style={{ fontSize: 18, fontWeight: "600", marginVertical: 8 }}>Data points</Text>
      {fields.map((f, i) => (
        <FieldEditor
          key={f.localId}
          field={f}
          index={i}
          count={fields.length}
          error={errors[f.localId]}
          onChange={(nf) => updateField(i, nf)}
          onRemove={() => removeField(i)}
          onMove={(dir) => moveField(i, dir)}
        />
      ))}
      <Button title="+ Add field" variant="secondary" onPress={() => setFields((fs) => [...fs, blankField()])} />

      <ErrorText>{errors.form}</ErrorText>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 40 }}>
        <Button title="Cancel" variant="secondary" onPress={() => router.push("/admin/item-types")} style={{ flex: 1 }} />
        <Button title={saving ? "Saving…" : "Submit"} onPress={handleSubmit} disabled={saving} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

export default function NewItemTypePage() {
  return (
    <RequireRole role="admin">
      {({ profile }) => <NewItemTypeForm profile={profile} />}
    </RequireRole>
  );
}
