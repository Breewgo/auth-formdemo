import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { validateValues } from "../lib/fields";
import { supabase } from "../lib/supabase";
import { Button, Choice, ErrorText, Input, Label, colors } from "./ui";

/**
 * Builds a form from an item type's field_definitions.
 *
 * Props:
 *   itemTypeId  – item_types.id to render
 *   userId      – stamped into created_by
 *   companyId   – stamped into company_id
 *   onSubmit    – async (payload) => void. This component never writes to the
 *                 database itself, so the caller decides: insert now, or queue offline.
 *
 * payload = { id, company_id, item_type_id, data: {fieldKey: value}, created_by, created_at }
 */
export default function DynamicForm({ itemTypeId, userId, companyId, onSubmit, submitLabel = "Submit" }) {
  const [definitions, setDefinitions] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDefinitions(null);
    setValues({});
    setErrors({});
    supabase
      .from("field_definitions")
      .select("key, label, field_type, options, required, is_public")
      .eq("item_type_id", itemTypeId)
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) setLoadError(error.message);
        else setDefinitions(data);
      });
  }, [itemTypeId]);

  const setValue = (key, v) => setValues((vs) => ({ ...vs, [key]: v }));

  async function handleSubmit() {
    setSubmitError("");
    const { errors: errs, data } = validateValues(definitions, values);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
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
      setValues({});
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
      <Button
        title={submitting ? "Submitting…" : submitLabel}
        onPress={handleSubmit}
        disabled={submitting}
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

function FieldInput({ def, value, onChange }) {
  switch (def.field_type) {
    case "number":
      return <Input value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0" />;
    case "date":
      return (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Input value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
          <Button title="Today" variant="secondary" onPress={() => onChange(new Date().toISOString().slice(0, 10))} />
        </View>
      );
    case "select":
      return <Choice options={def.options} value={value} onChange={onChange} />;
    default:
      return <Input value={value} onChangeText={onChange} />;
  }
}
