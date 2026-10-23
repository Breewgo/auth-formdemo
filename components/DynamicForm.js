import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { validateValues } from "../lib/fields";
import { cachedQuery } from "../lib/offlineDb";
import { supabase } from "../lib/supabase";
import { Button, Choice, DateInput, ErrorText, Input, Label, colors, todayString } from "./ui";

/**
 * Builds a form from an item type's field_definitions.
 *
 * Props:
 *   itemTypeId  – item_types.id to render
 *   userId      – stamped into created_by
 *   companyId   – stamped into company_id
 *   onSubmit    – async (payload) => void. This component never writes to the
 *                 database itself, so the caller decides: insert now, or queue offline
 *                 (lib/offlineDb.js saveItem does both).
 *   item        – optional existing item to edit; the form starts with its values
 *                 and the payload keeps its id, created_by and created_at.
 *   onCancel    – optional; shows a Cancel button.
 *
 * payload = { id, company_id, item_type_id, data: {fieldKey: value}, created_by, created_at }
 */
export default function DynamicForm({ itemTypeId, userId, companyId, onSubmit, item, onCancel, submitLabel = "Submit" }) {
  const [definitions, setDefinitions] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDefinitions(null);
    setValues(initialValues(item));
    setErrors({});
    setLoadError("");
    // Falls back to the copy saved in IndexedDB, so the form still renders offline.
    cachedQuery(`fields:${itemTypeId}`, () =>
      supabase
        .from("field_definitions")
        .select("key, label, field_type, options, required, is_public")
        .eq("item_type_id", itemTypeId)
        .order("sort_order")
    ).then(({ data, error }) => {
      if (error) setLoadError(error.message || "Couldn't load this form.");
      else setDefinitions(data);
    });
  }, [itemTypeId, item]);

  const setValue = (key, v) => setValues((vs) => ({ ...vs, [key]: v }));

  async function handleSubmit() {
    setSubmitError("");
    const { errors: errs, data } = validateValues(definitions, values);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = item
      ? { ...item, data }
      : {
          id: crypto.randomUUID(),
          company_id: companyId,
          item_type_id: itemTypeId,
          data,
          created_by: userId,
          created_at: new Date().toISOString(),
        };
    setSubmitting(true);
    try {
      await onSubmit(payload);
      if (!item) setValues({});
    } catch (e) {
      setSubmitError(e.message || "Couldn't submit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <ErrorText>{loadError}</ErrorText>;
  if (!definitions) return <ActivityIndicator />;
  if (definitions.length === 0) return <Text>This item type has no fields yet.</Text>;

  return (
    <View>
      {definitions.map((def) => (
        <View key={def.key}>
          <Label>
            {def.label}
            {def.required && <Text style={{ color: colors.error }}> *</Text>}
          </Label>
          <FieldInput def={def} value={values[def.key] ?? ""} onChange={(v) => setValue(def.key, v)} />
          <ErrorText>{errors[def.key]}</ErrorText>
        </View>
      ))}
      <ErrorText>{submitError}</ErrorText>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        {onCancel && (
          <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={submitting} style={{ flex: 1 }} />
        )}
        <Button
          title={submitting ? "Saving…" : submitLabel}
          onPress={handleSubmit}
          disabled={submitting}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

// Stored values are typed (numbers etc.); inputs work with strings.
function initialValues(item) {
  if (!item) return {};
  return Object.fromEntries(Object.entries(item.data || {}).map(([k, v]) => [k, String(v)]));
}

function FieldInput({ def, value, onChange }) {
  switch (def.field_type) {
    case "number":
      return <Input value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0" />;
    case "date":
      return (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <DateInput value={value} onChange={onChange} />
          </View>
          <Button title="Today" variant="secondary" onPress={() => onChange(todayString())} />
        </View>
      );
    case "select":
      return <Choice options={def.options} value={value} onChange={onChange} />;
    default:
      return <Input value={value} onChangeText={onChange} />;
  }
}
