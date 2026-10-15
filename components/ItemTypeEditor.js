import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Pressable, Switch, Text, View } from "react-native";
import { Button, Card, Choice, ErrorText, Input, Label, Screen, colors, styles } from "./ui";
import { toKey, validateItemType } from "../lib/fields";
import { saveItemType, wouldCreateCycle } from "../lib/itemTypes";
import { supabase } from "../lib/supabase";

const FIELD_TYPES = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Date", value: "date" },
  { label: "Dropdown", value: "select" },
];

let nextLocalId = 1;
export function newLocalId() {
  return nextLocalId++;
}

function blankField() {
  return { localId: newLocalId(), label: "", field_type: "text", optionsText: "", required: false, is_public: false };
}

function FieldEditor({ field, index, count, error, onChange, onRemove, onMove }) {
  const set = (patch) => onChange({ ...field, ...patch });
  const typeChanged = field.id && field.originalType !== field.field_type;
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
      {field.id ? (
        <Text style={[styles.muted, { fontSize: 12 }]}>key: {field.key} (stays the same so saved items still match)</Text>
      ) : (
        field.label.trim() !== "" && <Text style={[styles.muted, { fontSize: 12 }]}>key: {toKey(field.label)}</Text>
      )}

      <Label>Type</Label>
      <Choice options={FIELD_TYPES} value={field.field_type} onChange={(field_type) => set({ field_type })} />
      {typeChanged && (
        <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>
          Items already saved keep their old values; they'll be checked against the new type when edited.
        </Text>
      )}

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

/**
 * Item Creation screen (Screen 14), for both new and existing item types.
 *
 * Props:
 *   profile  – signed-in admin's profile (company_id)
 *   initial  – optional { id, name, child_type_id, fields } to edit an existing type
 */
export default function ItemTypeEditor({ profile, initial }) {
  const router = useRouter();
  const typeId = initial?.id || null;
  const [name, setName] = useState(initial?.name || "");
  const [childTypeId, setChildTypeId] = useState(initial?.child_type_id || null);
  const [fields, setFields] = useState(initial?.fields?.length ? initial.fields : [blankField()]);
  const [originalFieldIds] = useState(() => (initial?.fields || []).map((f) => f.id));
  const [types, setTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("item_types").select("id, name, child_type_id").order("name")
      .then(({ data }) => setTypes(data || []));
  }, []);

  const updateField = (i, f) => setFields((fs) => fs.map((x, j) => (j === i ? f : x)));
  const removeField = (i) => setFields((fs) => fs.filter((_, j) => j !== i));
  const moveField = (i, dir) =>
    setFields((fs) => {
      const copy = [...fs];
      [copy[i], copy[i + dir]] = [copy[i + dir], copy[i]];
      return copy;
    });

  // A type can't contain itself, or anything that (eventually) contains it.
  const childOptions = types.filter((t) => t.id !== typeId && !wouldCreateCycle(typeId, t.id, types));
  const removedCount = originalFieldIds.filter((id) => !fields.some((f) => f.id === id)).length;

  async function handleSubmit() {
    const errs = validateItemType(name, fields);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await saveItemType({
        companyId: profile.company_id,
        typeId,
        name,
        childTypeId,
        fields,
        originalFieldIds,
      });
      router.push("/admin/item-types");
    } catch (e) {
      setErrors({ form: e.message });
      setSaving(false);
    }
  }

  return (
    <Screen title={typeId ? `Edit ${initial.name}` : "New Item Type"}>
      <Card>
        <Label>Type name</Label>
        <Input value={name} onChangeText={setName} placeholder="e.g. Juice Batch" />
        <ErrorText>{errors.name}</ErrorText>

        <Label>Contains (sub-item type scanned into it)</Label>
        <Choice
          options={[{ label: "None", value: null }, ...childOptions.map((t) => ({ label: t.name, value: t.id }))]}
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

      {removedCount > 0 && (
        <Text style={[styles.muted, { marginTop: 12 }]}>
          {removedCount} field{removedCount === 1 ? "" : "s"} will be removed. Values already saved on items are kept
          and still shown under View registered.
        </Text>
      )}
      <ErrorText>{errors.form}</ErrorText>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 40 }}>
        <Button title="Cancel" variant="secondary" onPress={() => router.push("/admin/item-types")} style={{ flex: 1 }} />
        <Button
          title={saving ? "Saving…" : typeId ? "Save changes" : "Submit"}
          onPress={handleSubmit}
          disabled={saving}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
