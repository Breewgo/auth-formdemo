// Pure helpers shared by the form builder and the form renderer.

// "Harvest Date" → "harvest_date"
export function toKey(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseOptions(text) {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

// Builder validation. fields: [{ localId, key?, label, field_type, optionsText }]
// Existing fields carry a fixed key; new ones get theirs from the label.
// Returns { name?, form?, [localId]? } — empty object means valid.
export function validateItemType(name, fields) {
  const errors = {};
  if (!name.trim()) errors.name = "Type name is required.";
  if (fields.length === 0) errors.form = "Add at least one field.";
  const seen = new Set();
  for (const f of fields) {
    const key = f.key || toKey(f.label);
    if (!f.label.trim() || !key) errors[f.localId] = "Field label is required.";
    else if (seen.has(key)) errors[f.localId] = "Duplicate field name.";
    else if (f.field_type === "select" && parseOptions(f.optionsText).length === 0)
      errors[f.localId] = "Dropdown needs at least one option.";
    seen.add(key);
  }
  return errors;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Renderer validation. Returns { errors: {key: msg}, data: {key: typedValue} }.
export function validateValues(definitions, values) {
  const errors = {};
  const data = {};
  for (const def of definitions) {
    const raw = values[def.key];
    const empty = raw === undefined || raw === null || String(raw).trim() === "";
    if (empty) {
      if (def.required) errors[def.key] = `${def.label} is required.`;
      continue;
    }
    const str = String(raw).trim();
    if (def.field_type === "number") {
      const n = Number(str);
      if (Number.isNaN(n)) errors[def.key] = `${def.label} must be a number.`;
      else data[def.key] = n;
    } else if (def.field_type === "date") {
      if (!DATE_RE.test(str) || Number.isNaN(Date.parse(str)))
        errors[def.key] = `${def.label} must be a date like 2026-10-07.`;
      else data[def.key] = str;
    } else if (def.field_type === "select") {
      if (!def.options.includes(str)) errors[def.key] = `Pick a ${def.label}.`;
      else data[def.key] = str;
    } else {
      data[def.key] = str;
    }
  }
  return { errors, data };
}
